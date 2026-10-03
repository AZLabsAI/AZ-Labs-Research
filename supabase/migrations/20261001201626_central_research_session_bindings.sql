-- REVIEW ONLY: apply only after the central pre-issuance identity gate is active.
-- Existing unbound Supabase sessions lose profile access until verified adoption.
create table public.azlabs_research_sessions (
  -- Retain revoked bindings when GoTrue deletes auth.sessions, so signed logout
  -- delivery/replay still has durable ownership evidence after local sign-out.
  local_session_id uuid primary key,
  local_subject uuid not null references auth.users(id) on delete cascade,
  central_issuer text not null check (central_issuer = 'https://azlabs.ai/api/auth'),
  central_subject text not null,
  central_sid text not null,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index research_sessions_central_subject on public.azlabs_research_sessions (central_issuer, central_subject);
create index research_sessions_central_sid on public.azlabs_research_sessions (central_issuer, central_sid);
alter table public.azlabs_research_sessions enable row level security;
revoke all on public.azlabs_research_sessions from public, anon, authenticated;
grant select on public.azlabs_research_sessions to authenticated;
grant all on public.azlabs_research_sessions to service_role;
create policy research_read_current_binding on public.azlabs_research_sessions
  for select to authenticated using (
    local_subject = (select auth.uid()) and
    local_session_id::text = (select auth.jwt()->>'session_id')
  );

create table public.azlabs_research_logout_events (
  issuer text not null,
  jti text not null,
  central_subject text not null,
  central_sid text,
  issued_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  primary key (issuer, jti)
);
create index research_logout_subject on public.azlabs_research_logout_events (issuer, central_subject, issued_at);
alter table public.azlabs_research_logout_events enable row level security;
revoke all on public.azlabs_research_logout_events from public, anon, authenticated;
grant all on public.azlabs_research_logout_events to service_role;

-- SECURITY INVOKER: only service_role has both EXECUTE and table write privileges.
create function public.research_bind_session(
  p_local_session_id uuid, p_local_subject uuid, p_issuer text,
  p_subject text, p_sid text, p_issued_at timestamptz, p_expires_at timestamptz
) returns boolean language plpgsql security invoker set search_path = '' as $$
begin
  if p_issuer <> 'https://azlabs.ai/api/auth' or p_subject = '' or p_sid = '' or
    p_expires_at <= now() or p_expires_at > now() + interval '8 hours' or
    p_issued_at > now() + interval '30 seconds' then return false; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_issuer || ':' || p_subject, 0));
  -- The service caller has verified the Supabase JWT/session and audited mapping.
  -- No auth.sessions grant is required and deletion cannot erase logout evidence.
  if exists (select 1 from public.azlabs_research_logout_events where issuer = p_issuer and
    central_subject = p_subject and (central_sid = p_sid or
      (central_sid is null and issued_at >= p_issued_at))) then return false; end if;
  if exists (select 1 from public.azlabs_research_sessions where local_session_id = p_local_session_id and
    (local_subject <> p_local_subject or central_issuer <> p_issuer or
      central_subject <> p_subject or central_sid <> p_sid or revoked_at is not null)) then return false; end if;
  insert into public.azlabs_research_sessions (local_session_id, local_subject, central_issuer, central_subject, central_sid, issued_at, expires_at)
  values (p_local_session_id, p_local_subject, p_issuer, p_subject, p_sid, p_issued_at, p_expires_at)
  on conflict (local_session_id) do update set expires_at = excluded.expires_at;
  return true;
end;
$$;
revoke execute on function public.research_bind_session(uuid,uuid,text,text,text,timestamptz,timestamptz) from public, anon, authenticated;
grant execute on function public.research_bind_session(uuid,uuid,text,text,text,timestamptz,timestamptz) to service_role;

create function public.research_record_logout(
  p_issuer text, p_jti text, p_subject text, p_sid text, p_issued_at timestamptz
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare affected integer; existing public.azlabs_research_logout_events%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_issuer || ':' || p_subject, 0));
  select * into existing from public.azlabs_research_logout_events where issuer = p_issuer and jti = p_jti;
  if found then
    if existing.central_subject <> p_subject or existing.central_sid is distinct from p_sid or existing.issued_at <> p_issued_at then
      raise exception 'Logout replay mismatch';
    end if;
    return jsonb_build_object('replayed', true, 'revoked', 0);
  end if;
  if p_issuer <> 'https://azlabs.ai/api/auth' or p_jti = '' or p_subject = '' then
    raise exception 'Invalid verified logout';
  end if;
  -- A validated signed subject-bearing event must leave a tombstone even when
  -- logout wins the race against the first local callback/binding transaction.
  insert into public.azlabs_research_logout_events (issuer, jti, central_subject, central_sid, issued_at)
  values (p_issuer, p_jti, p_subject, p_sid, p_issued_at);
  update public.azlabs_research_sessions set revoked_at = coalesce(revoked_at, now())
  where central_issuer = p_issuer and central_subject = p_subject and
    (p_sid is null and issued_at <= p_issued_at or central_sid = p_sid);
  get diagnostics affected = row_count;
  return jsonb_build_object('replayed', false, 'revoked', affected);
end;
$$;
revoke execute on function public.research_record_logout(text,text,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.research_record_logout(text,text,text,text,timestamptz) to service_role;

-- Stop if a newer deployment added policies; permissive RLS policies are ORed.
do $$
begin
  if exists (select 1 from pg_catalog.pg_policies where schemaname = 'public' and tablename = 'profiles' and
    policyname not in ('Users can view their own profile', 'Users can update their own profile', 'Users can insert their own profile')) then
    raise exception 'Review additional profile policies before adopting central session bindings';
  end if;
end;
$$;
drop policy "Users can view their own profile" on public.profiles;
drop policy "Users can update their own profile" on public.profiles;
drop policy "Users can insert their own profile" on public.profiles;
revoke all on public.profiles from public, anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
create policy "Users can view their own profile" on public.profiles for select to authenticated using (
  id = (select auth.uid()) and exists (select 1 from public.azlabs_research_sessions s where
    s.local_subject = (select auth.uid()) and s.local_session_id::text = (select auth.jwt()->>'session_id') and
    s.revoked_at is null and s.expires_at > now())
);
create policy "Users can insert their own profile" on public.profiles for insert to authenticated with check (
  id = (select auth.uid()) and exists (select 1 from public.azlabs_research_sessions s where
    s.local_subject = (select auth.uid()) and s.local_session_id::text = (select auth.jwt()->>'session_id') and
    s.revoked_at is null and s.expires_at > now())
);
create policy "Users can update their own profile" on public.profiles for update to authenticated using (
  id = (select auth.uid()) and exists (select 1 from public.azlabs_research_sessions s where
    s.local_subject = (select auth.uid()) and s.local_session_id::text = (select auth.jwt()->>'session_id') and
    s.revoked_at is null and s.expires_at > now())
) with check (
  id = (select auth.uid()) and exists (select 1 from public.azlabs_research_sessions s where
    s.local_subject = (select auth.uid()) and s.local_session_id::text = (select auth.jwt()->>'session_id') and
    s.revoked_at is null and s.expires_at > now())
);

create function public.research_auth_readiness() returns jsonb
language sql security invoker set search_path = '' as $$
  select jsonb_build_object(
    'version', 'research-session-binding-v1',
    'profilesGuarded', exists (select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'profiles' and c.relrowsecurity) and
      (select count(*) = 3 and bool_and((coalesce(qual, '') || coalesce(with_check, '')) like '%azlabs_research_sessions%')
        from pg_catalog.pg_policies where schemaname = 'public' and tablename = 'profiles'),
    'writesRestricted', not pg_catalog.has_table_privilege('authenticated', 'public.azlabs_research_sessions', 'INSERT') and
      not pg_catalog.has_table_privilege('anon', 'public.profiles', 'SELECT') and
      not pg_catalog.has_table_privilege('authenticated', 'public.azlabs_research_logout_events', 'SELECT')
  );
$$;
revoke execute on function public.research_auth_readiness() from public, anon, authenticated;
grant execute on function public.research_auth_readiness() to service_role;
