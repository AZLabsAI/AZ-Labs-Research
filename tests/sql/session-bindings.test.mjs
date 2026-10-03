import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { generateKeyPairSync, sign } from 'node:crypto'
import { verifyCentralToken } from '../../lib/auth/token-verifier.ts'
import { resolveLogoutSubject } from '../../lib/auth/logout-subject.ts'
import { checkResearchAccess } from '../../lib/auth/platform-access.ts'
import { handleResearchProfile } from '../../lib/account/profile.ts'

const require = createRequire(import.meta.url)
const postgresModule = process.env.AZLABS_TEST_PGLITE_MODULE || require.resolve('@electric-sql/pglite')
const { PGlite } = await import(postgresModule)
const issuer = 'https://azlabs.ai/api/auth'
const userA = '00000000-0000-4000-8000-000000000001'
const userB = '00000000-0000-4000-8000-000000000002'
const localSessionA = '10000000-0000-4000-8000-000000000001'
const localSessionB = '10000000-0000-4000-8000-000000000002'
const localSessionA2 = '10000000-0000-4000-8000-000000000003'
const subjectA = 'synthetic-central-owner-a'
const subjectB = 'synthetic-central-owner-b'
const sidA = 'synthetic-central-session-a'
const sidB = 'synthetic-central-session-b'
const { publicKey, privateKey } = generateKeyPairSync('ed25519')
const jwks = { keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'fixture-key', alg: 'EdDSA' }] }
const baseline = await readFile(new URL('../../supabase/migrations/20250823145332_create_profiles_table.sql', import.meta.url), 'utf8')
const migration = await readFile(new URL('../../supabase/migrations/20261001201626_central_research_session_bindings.sql', import.meta.url), 'utf8')
const profileBoundary = await readFile(new URL('../../supabase/migrations/20261001232848_research_profile_server_authorization.sql', import.meta.url), 'utf8')

const fixture = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  grant usage on schema auth, public to anon, authenticated, service_role;
  create table auth.users (id uuid primary key, email text not null, raw_user_meta_data jsonb not null default '{}');
  create table auth.sessions (id uuid primary key, user_id uuid not null references auth.users(id));
  create function auth.jwt() returns jsonb language sql stable as $$
    select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
  $$;
  create function auth.uid() returns uuid language sql stable as $$
    select (auth.jwt()->>'sub')::uuid;
  $$;
  grant execute on function auth.jwt(), auth.uid() to anon, authenticated, service_role;
`

async function asRole(db, role, claims, operation) {
  assert(['anon', 'authenticated', 'service_role'].includes(role))
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${role}`)
    await tx.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)])
    return operation(tx)
  })
}

function rawProfile(db, user = userA, localSession = localSessionA) {
  return asRole(db, 'authenticated', { sub: user, session_id: localSession },
    (tx) => tx.query('select id, email, full_name from public.profiles order by id'))
}

async function bind(db, { user = userA, localSession = localSessionA, subject = subjectA, sid = sidA,
  issuedAt = new Date(Date.now() - 1000).toISOString(), expiresAt = new Date(Date.now() + 60000).toISOString() } = {}) {
  const result = await asRole(db, 'service_role', {}, (tx) => tx.query(
    'select public.research_bind_session($1::uuid,$2::uuid,$3,$4,$5,$6::timestamptz,$7::timestamptz) as bound',
    [localSession, user, issuer, subject, sid, issuedAt, expiresAt],
  ))
  return result.rows[0].bound
}

function signedLogout(options = {}) {
  const subject = Object.hasOwn(options, 'subject') ? options.subject : subjectA
  const sid = Object.hasOwn(options, 'sid') ? options.sid : sidA
  const { jti = 'synthetic-logout-before-bind', iat = Math.floor(Date.now() / 1000) } = options
  const payload = { iss: issuer, aud: 'azlabs-research', sub: subject, sid, jti, iat,
    events: { 'http://schemas.openid.net/event/backchannel-logout': {} } }
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const unsigned = `${encode({ alg: 'EdDSA', kid: 'fixture-key', typ: 'logout+jwt' })}.${encode(payload)}`
  return `${unsigned}.${sign(null, Buffer.from(unsigned), privateKey).toString('base64url')}`
}

async function receiveSignedLogout(db, token) {
  const claims = verifyCentralToken(token, 'logout', { issuer, jwks })
  let sidLookups = 0
  const subject = await resolveLogoutSubject(claims, async (sid) => {
    sidLookups += 1
    const bindings = await asRole(db, 'service_role', {}, (tx) => tx.query(
      'select central_subject from public.azlabs_research_sessions where central_issuer=$1 and central_sid=$2 limit 2',
      [issuer, sid],
    ))
    return bindings.rows.map((row) => row.central_subject)
  })
  const receipt = await asRole(db, 'service_role', {}, (tx) => tx.query(
    'select public.research_record_logout($1,$2,$3,$4,$5::timestamptz) as receipt',
    [claims.iss, claims.jti, subject, claims.sid || null, new Date(claims.iat * 1000).toISOString()],
  ))
  return { ...receipt.rows[0].receipt, sidLookups }
}

describe('original session-binding migration with real Postgres roles and profile RLS', () => {
  let db
  beforeEach(async () => {
    db = new PGlite()
    await db.exec(fixture)
    // Apply both complete repository migrations to a fresh fixture every time.
    await db.exec(baseline)
    await db.exec(migration)
    await db.query('insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3),($4,$5,$6)',
      [userA, 'owner-a@synthetic.invalid', { full_name: 'Owner A' }, userB, 'owner-b@synthetic.invalid', { full_name: 'Owner B' }])
    await db.query('insert into auth.sessions(id,user_id) values ($1,$2),($3,$4),($5,$2)', [localSessionA, userA, localSessionB, userB, localSessionA2])
  })
  afterEach(async () => { await db?.close() })

  it('reports guarded policies and denies raw unbound/anonymous access and authenticated binding writes', async () => {
    const readiness = await asRole(db, 'service_role', {}, (tx) => tx.query('select public.research_auth_readiness() as readiness'))
    assert.deepEqual(readiness.rows[0].readiness, { version: 'research-session-binding-v1', profilesGuarded: true, writesRestricted: true })
    assert.deepEqual((await rawProfile(db)).rows, [])
    await assert.rejects(asRole(db, 'anon', {}, (tx) => tx.query('select * from public.profiles')), (error) => error.code === '42501')
    await assert.rejects(asRole(db, 'authenticated', { sub: userA, session_id: localSessionA },
      (tx) => tx.query('select public.research_bind_session($1::uuid,$2::uuid,$3,$4,$5,now(),now()+interval \'1 minute\')',
        [localSessionA, userA, issuer, subjectA, sidA])), (error) => error.code === '42501')
    await assert.rejects(asRole(db, 'authenticated', { sub: userA, session_id: localSessionA },
      (tx) => tx.query('select * from public.azlabs_research_logout_events')), (error) => error.code === '42501')
  })

  it('allows only an active owner/session to select, insert and update; rejects cross-owner transfer', async () => {
    assert.equal(await bind(db), true)
    assert.deepEqual((await rawProfile(db)).rows.map((row) => row.id), [userA])
    assert.deepEqual((await rawProfile(db, userA, localSessionB)).rows, [])
    assert.deepEqual((await rawProfile(db, userB, localSessionA)).rows, [])
    const updated = await asRole(db, 'authenticated', { sub: userA, session_id: localSessionA },
      (tx) => tx.query('update public.profiles set full_name=$1 where id=$2 returning id', ['Owned preference', userA]))
    assert.deepEqual(updated.rows, [{ id: userA }])
    const other = await asRole(db, 'authenticated', { sub: userA, session_id: localSessionA },
      (tx) => tx.query('update public.profiles set full_name=$1 where id=$2 returning id', ['Wrong owner', userB]))
    assert.deepEqual(other.rows, [])
    await assert.rejects(asRole(db, 'authenticated', { sub: userA, session_id: localSessionA },
      (tx) => tx.query('update public.profiles set id=$1 where id=$2', [userB, userA])), (error) => error.code === '42501')
    await db.query('delete from public.profiles where id=$1', [userA])
    const inserted = await asRole(db, 'authenticated', { sub: userA, session_id: localSessionA },
      (tx) => tx.query('insert into public.profiles(id,email) values ($1,$2) returning id', [userA, 'owner-a@synthetic.invalid']))
    assert.deepEqual(inserted.rows, [{ id: userA }])
  })

  it('blocks late adoption when central check succeeds then signed logout arrives before any local binding', async () => {
    const access = { allowed: true, product: 'research', identityGate: 'pre_issuance_v1', subject: subjectA,
      sessionId: sidA, localSubject: userA, tier: 'approved', limits: { daily: 5, monthly: 20 } }
    const checked = await checkResearchAccess('synthetic-delegation', {
      origin: 'https://azlabs.ai', subject: subjectA, sessionId: sidA, localSubject: userA,
      fetcher: async () => Response.json(access),
    })
    assert.equal(checked.allowed, true)
    const { rows: before } = await db.query('select * from public.azlabs_research_sessions')
    assert.equal(before.length, 0)
    const receipt = await receiveSignedLogout(db, signedLogout())
    assert.deepEqual(receipt, { replayed: false, revoked: 0, sidLookups: 0 })
    const { rows: tombstones } = await db.query('select central_subject,central_sid from public.azlabs_research_logout_events')
    assert.deepEqual(tombstones, [{ central_subject: subjectA, central_sid: sidA }])
    assert.equal(await bind(db), false)
    assert.deepEqual((await rawProfile(db)).rows, [])
    const updated = await asRole(db, 'authenticated', { sub: userA, session_id: localSessionA },
      (tx) => tx.query('update public.profiles set full_name=$1 where id=$2 returning id', ['Late callback cannot write', userA]))
    assert.deepEqual(updated.rows, [])
  })

  it('revokes raw existing RLS access and prevents rebind after signed logout, even after GoTrue deletes its session', async () => {
    assert.equal(await bind(db), true)
    assert.equal(await bind(db, { user: userB, localSession: localSessionB, subject: subjectB, sid: sidB }), true)
    assert.equal((await rawProfile(db)).rows.length, 1)
    const token = signedLogout({ jti: 'synthetic-existing-binding-logout' })
    assert.deepEqual(await receiveSignedLogout(db, token), { replayed: false, revoked: 1, sidLookups: 0 })
    assert.deepEqual((await rawProfile(db)).rows, [])
    assert.deepEqual((await rawProfile(db, userB, localSessionB)).rows.map((row) => row.id), [userB])
    await db.query('delete from auth.sessions where id=$1', [localSessionA])
    assert.equal(await bind(db), false)
    assert.deepEqual(await receiveSignedLogout(db, token), { replayed: true, revoked: 0, sidLookups: 0 })
    await assert.rejects(receiveSignedLogout(db, signedLogout({ jti: 'synthetic-existing-binding-logout', sid: sidB })), /Logout replay mismatch/)
  })

  it('records subject-only pre-adoption logout, rejects earlier tokens, and permits a later new central session', async () => {
    const seconds = Math.floor(Date.now() / 1000)
    assert.deepEqual(await receiveSignedLogout(db, signedLogout({ sid: undefined, iat: seconds })),
      { replayed: false, revoked: 0, sidLookups: 0 })
    assert.equal(await bind(db, { issuedAt: new Date((seconds - 1) * 1000).toISOString() }), false)
    assert.equal(await bind(db, { localSession: localSessionA2, sid: 'synthetic-other-earlier-session', issuedAt: new Date((seconds - 1) * 1000).toISOString() }), false)
    assert.equal(await bind(db, { sid: 'synthetic-new-session-after-logout', issuedAt: new Date((seconds + 1) * 1000).toISOString() }), true)
    assert.equal((await rawProfile(db)).rows.length, 1)
  })

  it('uses binding lookup only for sid-only logout and denies unknown sid-only events', async () => {
    assert.equal(await bind(db), true)
    assert.deepEqual(await receiveSignedLogout(db, signedLogout({ subject: undefined })),
      { replayed: false, revoked: 1, sidLookups: 1 })
    assert.deepEqual((await rawProfile(db)).rows, [])
    await assert.rejects(receiveSignedLogout(db, signedLogout({ subject: undefined, sid: 'unknown-sid', jti: 'synthetic-unknown-logout' })), /Unknown logout binding/)
  })

  it('denies expired raw session bindings and callback attempts to change an existing binding owner', async () => {
    assert.equal(await bind(db), true)
    assert.equal(await bind(db, { user: userB, subject: subjectB, sid: sidB }), false)
    await db.query("update public.azlabs_research_sessions set expires_at=now()-interval '1 second' where local_session_id=$1", [localSessionA])
    assert.deepEqual((await rawProfile(db)).rows, [])
    assert.equal(await bind(db, { localSession: localSessionB, expiresAt: new Date(Date.now() - 1000).toISOString() }), false)
  })
})

describe('current profile API boundary with complete SQL migration chain', () => {
  let db
  beforeEach(async () => {
    db = new PGlite()
    await db.exec(fixture)
    await db.exec(baseline)
    await db.exec(migration)
    await db.exec(profileBoundary)
    await db.query('insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3),($4,$5,$6)',
      [userA, 'owner-a@synthetic.invalid', { full_name: 'Owner A' }, userB, 'owner-b@synthetic.invalid', { full_name: 'Owner B' }])
    await db.query('insert into auth.sessions(id,user_id) values ($1,$2),($3,$4)', [localSessionA, userA, localSessionB, userB])
    assert.equal(await bind(db), true)
  })
  afterEach(async () => { await db?.close() })

  function apiFixture() {
    let grantActive = true
    const calls = []
    const deps = {
      origin: 'https://research.azlabs.ai',
      authorize: async () => {
        if (!grantActive) throw { status: 403, reason: 'access_denied' }
        const { rows } = await asRole(db, 'service_role', {}, (tx) => tx.query(
          'select 1 from public.azlabs_research_sessions where local_session_id=$1 and local_subject=$2 and revoked_at is null and expires_at>now()',
          [localSessionA, userA]))
        if (!rows.length) throw { status: 401, reason: 'session_revoked' }
        return { subject: subjectA, localSubject: userA }
      },
      store: {
        read: async (localSubject) => {
          calls.push({ operation: 'read', localSubject })
          const { rows } = await asRole(db, 'service_role', {}, (tx) => tx.query('select * from public.profiles where id=$1', [localSubject]))
          return rows[0] ?? null
        },
        update: async (localSubject, patch) => {
          calls.push({ operation: 'update', localSubject })
          const { rows } = await asRole(db, 'service_role', {}, (tx) => tx.query(
            `update public.profiles set full_name=case when $2::boolean then $3::text else full_name end,
              avatar_url=case when $4::boolean then $5::text else avatar_url end, updated_at=now() where id=$1 returning *`,
            [localSubject, Object.hasOwn(patch, 'full_name'), patch.full_name ?? null, Object.hasOwn(patch, 'avatar_url'), patch.avatar_url ?? null]))
          return rows[0] ?? null
        },
      },
    }
    const request = (method = 'GET', body, query = '') => new Request(`${deps.origin}/api/account/profile${query}`,
      method === 'GET' ? undefined : { method, headers: { Origin: deps.origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return { deps, calls, request, setGrant: (value) => { grantActive = value } }
  }

  it('denies raw authenticated/anonymous profile SQL even with active bindings, and RLS survives accidental SELECT/UPDATE grants', async () => {
    const { rows } = await asRole(db, 'service_role', {}, (tx) => tx.query('select public.research_auth_readiness() as readiness'))
    assert.deepEqual(rows[0].readiness, { version: 'research-profile-api-v2', profilesGuarded: true, writesRestricted: true })
    await assert.rejects(rawProfile(db), (error) => error.code === '42501')
    await assert.rejects(asRole(db, 'anon', {}, (tx) => tx.query('select * from public.profiles')), (error) => error.code === '42501')
    await assert.rejects(asRole(db, 'authenticated', { sub: userA, session_id: localSessionA },
      (tx) => tx.query('update public.profiles set full_name=$1 where id=$2', ['Raw JWT cannot write', userA])), (error) => error.code === '42501')
    await db.exec('grant select, update on public.profiles to authenticated')
    assert.deepEqual((await rawProfile(db)).rows, [])
    const deniedUpdate = await asRole(db, 'authenticated', { sub: userA, session_id: localSessionA },
      (tx) => tx.query('update public.profiles set full_name=$1 where id=$2 returning id', ['RLS still denies', userA]))
    assert.deepEqual(deniedUpdate.rows, [])
  })

  it('actual profile helper performs service-role GET/PATCH only for the freshly verified owner and rejects body identity overrides', async () => {
    const api = apiFixture()
    const fetched = await handleResearchProfile(api.request('GET', undefined, `?subject=${subjectB}&id=${userB}`), api.deps)
    assert.equal(fetched.status, 200)
    assert.equal((await fetched.json()).profile.id, userA)
    const saved = await handleResearchProfile(api.request('PATCH', { full_name: 'Updated owner A', avatar_url: 'https://example.com/a.png' }), api.deps)
    assert.equal(saved.status, 200)
    assert.equal((await saved.json()).profile.full_name, 'Updated owner A')
    assert(api.calls.every((call) => call.localSubject === userA))
    const before = api.calls.length
    const rejected = await handleResearchProfile(api.request('PATCH', { id: userB, subject: subjectB, full_name: 'Wrong owner' }), api.deps)
    assert.equal(rejected.status, 400)
    assert.equal(api.calls.length, before)
    const other = await db.query('select full_name from public.profiles where id=$1', [userB])
    assert.equal(other.rows[0].full_name, 'Owner B')
  })

  it('grant revocation denies API reads/writes immediately with native sid/binding still active; restored grant then logout deny correctly', async () => {
    const api = apiFixture()
    assert.equal((await handleResearchProfile(api.request(), api.deps)).status, 200)
    const count = api.calls.length
    api.setGrant(false)
    assert.equal((await handleResearchProfile(api.request(), api.deps)).status, 403)
    assert.equal((await handleResearchProfile(api.request('PATCH', { full_name: 'Stale grant' }), api.deps)).status, 403)
    assert.equal(api.calls.length, count)
    const binding = await db.query('select central_sid,revoked_at from public.azlabs_research_sessions where local_session_id=$1', [localSessionA])
    assert.deepEqual(binding.rows, [{ central_sid: sidA, revoked_at: null }])
    await assert.rejects(rawProfile(db), (error) => error.code === '42501')
    api.setGrant(true)
    assert.equal((await handleResearchProfile(api.request(), api.deps)).status, 200)
    await receiveSignedLogout(db, signedLogout({ jti: 'synthetic-api-boundary-logout' }))
    const afterRestore = api.calls.length
    assert.equal((await handleResearchProfile(api.request(), api.deps)).status, 401)
    assert.equal((await handleResearchProfile(api.request('PATCH', { full_name: 'Stale session' }), api.deps)).status, 401)
    assert.equal(api.calls.length, afterRestore)
    assert.equal(await bind(db), false)
  })
})
