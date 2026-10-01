-- REVIEW ONLY: profile access must recheck the current parent grant per request.
-- An old local JWT/binding cannot serve as a cached Research authorization grant.
revoke all on public.profiles from public, anon, authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
drop policy "Users can view their own profile" on public.profiles;
drop policy "Users can update their own profile" on public.profiles;
drop policy "Users can insert their own profile" on public.profiles;
create policy research_profiles_no_direct_access on public.profiles
  as restrictive for all to anon, authenticated using (false) with check (false);

-- Only the fresh-authorized application service may read/write these rows.
create or replace function public.research_auth_readiness() returns jsonb
language sql security invoker set search_path = '' as $$
  select jsonb_build_object(
    'version', 'research-profile-api-v2',
    'profilesGuarded', exists (select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = 'profiles' and c.relrowsecurity) and
      exists (select 1 from pg_catalog.pg_policies p where p.schemaname = 'public' and p.tablename = 'profiles' and
        p.policyname = 'research_profiles_no_direct_access' and p.permissive = 'RESTRICTIVE' and
        'anon' = any(p.roles) and 'authenticated' = any(p.roles) and p.qual = 'false' and p.with_check = 'false'),
    'writesRestricted',
      not pg_catalog.has_table_privilege('authenticated', 'public.profiles', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') and
      not pg_catalog.has_table_privilege('anon', 'public.profiles', 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE') and
      not pg_catalog.has_table_privilege('authenticated', 'public.azlabs_research_sessions', 'INSERT') and
      not pg_catalog.has_table_privilege('authenticated', 'public.azlabs_research_logout_events', 'SELECT')
  );
$$;
revoke execute on function public.research_auth_readiness() from public, anon, authenticated;
grant execute on function public.research_auth_readiness() to service_role;
