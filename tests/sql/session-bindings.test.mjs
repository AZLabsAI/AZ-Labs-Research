import assert from 'node:assert/strict'
import { afterEach, beforeEach, describe, it } from 'node:test'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { generateKeyPairSync, sign } from 'node:crypto'
import { verifyCentralToken } from '../../lib/auth/token-verifier.ts'
import { resolveLogoutSubject } from '../../lib/auth/logout-subject.ts'
import { checkResearchAccess } from '../../lib/auth/platform-access.ts'

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

describe('complete Research migration with real Postgres roles and profile RLS', () => {
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
