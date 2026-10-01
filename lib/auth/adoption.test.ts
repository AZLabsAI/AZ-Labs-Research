import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { generateKeyPairSync, sign } from 'node:crypto'
import { verifyCentralToken } from './token-verifier.ts'
import { openDelegation, sealDelegation } from './delegation-cookie.ts'
import { bindingIsActive } from './session-binding.ts'
import { AccessDeniedError, checkResearchAccess, researchRequestId, type ResearchAccess } from './platform-access.ts'
import { approvedResearchOperation } from './provider-operation.ts'

const issuer = 'https://azlabs.ai/api/auth'
const now = 2000000000000
const seconds = Math.floor(now / 1000)
const { publicKey, privateKey } = generateKeyPairSync('ed25519')
const jwks = { keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'synthetic-key', alg: 'EdDSA' }] }
const claims = { iss: issuer, aud: 'https://azlabs.ai/api/platform', sub: 'synthetic-subject', sid: 'synthetic-session',
  iat: seconds - 1, exp: seconds + 60, client_id: 'azlabs-research', azp: 'azlabs-research', 'https://azlabs.ai/identity_gate': 'pre_issuance_v1' }

function jwt(payload: Record<string, unknown>, typ = 'at+jwt') {
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url')
  const signed = `${encode({ alg: 'EdDSA', kid: 'synthetic-key', typ })}.${encode(payload)}`
  return `${signed}.${sign(null, Buffer.from(signed), privateKey).toString('base64url')}`
}

describe('central delegation verification', () => {
  it('accepts a signed platform access token for the Research client', () => {
    assert.equal(verifyCentralToken(jwt(claims), 'access', { issuer, jwks, now }).sub, claims.sub)
  })
  it('rejects ID tokens, the former userinfo audience, wrong issuers/clients and expired or unsigned values', () => {
    for (const token of [jwt(claims, 'JWT'), jwt({ ...claims, aud: `${issuer}/oauth2/userinfo` }),
      jwt({ ...claims, iss: 'https://other.example' }), jwt({ ...claims, azp: 'other-client' }),
      jwt({ ...claims, client_id: 'other-client' }), jwt({ ...claims, exp: seconds - 1 }), jwt({ ...claims, sid: '' }),
      jwt({ ...claims, 'https://azlabs.ai/identity_gate': undefined }), jwt({ ...claims, 'https://azlabs.ai/identity_gate': 'legacy' }),
      jwt({ ...claims, exp: undefined }), 'not-a-signed-token']) {
      assert.throws(() => verifyCentralToken(token, 'access', { issuer, jwks, now }))
    }
  })
  it('checks logout audience, event, jti, freshness and the absence of nonce', () => {
    const event = { iss: issuer, aud: 'azlabs-research', sub: claims.sub, sid: claims.sid, iat: seconds,
      jti: 'synthetic-logout', events: { 'http://schemas.openid.net/event/backchannel-logout': {} } }
    assert.equal(verifyCentralToken(jwt(event, 'logout+jwt'), 'logout', { issuer, jwks, now }).jti, event.jti)
    assert.equal(verifyCentralToken(jwt({ ...event, sid: undefined }, 'logout+jwt'), 'logout', { issuer, jwks, now }).sub, claims.sub)
    for (const invalid of [{ ...event, aud: 'other-client' }, { ...event, events: {} }, { ...event, jti: '' },
      { ...event, iat: seconds - 301 }, { ...event, nonce: 'not-permitted' }, { ...event, sid: undefined, sub: undefined }]) {
      assert.throws(() => verifyCentralToken(jwt(invalid, 'logout+jwt'), 'logout', { issuer, jwks, now }))
    }
  })
})

describe('encrypted product session and durable ownership', () => {
  const session = { accessToken: 'synthetic-delegation', subject: claims.sub, sessionId: claims.sid,
    localSubject: 'synthetic-local-user', localSessionId: 'synthetic-local-session', expiresAt: seconds + 60 }
  const secret = Buffer.alloc(32, 7).toString('base64')
  it('keeps delegation opaque and rejects tampering, wrong encryption keys and expired sessions', () => {
    const sealed = sealDelegation(session, secret)
    assert(!sealed.includes(session.accessToken))
    assert.deepEqual(openDelegation(sealed, secret, now), session)
    const tampered = Buffer.from(sealed, 'base64url')
    tampered[0] ^= 1
    assert.equal(openDelegation(tampered.toString('base64url'), secret, now), null)
    assert.equal(openDelegation(sealed, Buffer.alloc(32, 8).toString('base64'), now), null)
    assert.equal(openDelegation(sealed, secret, now + 61000), null)
  })
  it('requires matching local UUID/session and central issuer/subject/session with an active binding', () => {
    const binding = { local_subject: session.localSubject, local_session_id: session.localSessionId,
      central_issuer: issuer, central_subject: claims.sub, central_sid: claims.sid,
      expires_at: new Date(now + 60000).toISOString(), revoked_at: null }
    const identity = { issuer, ...session }
    assert(bindingIsActive(binding, identity, now))
    assert(!bindingIsActive(null, identity, now))
    assert(!bindingIsActive({ ...binding, local_subject: 'another-user' }, identity, now))
    assert(!bindingIsActive({ ...binding, central_subject: 'another-subject' }, identity, now))
    assert(!bindingIsActive({ ...binding, central_sid: 'another-session' }, identity, now))
    assert(!bindingIsActive({ ...binding, revoked_at: new Date(now).toISOString() }, identity, now))
    assert(!bindingIsActive(binding, identity, now + 61000))
  })
})

describe('provider spend boundary', () => {
  const access: ResearchAccess = { allowed: true, subject: claims.sub, product: 'research', identityGate: 'pre_issuance_v1', sessionId: claims.sid,
    localSubject: 'synthetic-local-user', tier: 'approved', limits: { daily: 5, monthly: 20 },
    consumption: { requestId: 'research:synthetic-operation', replayed: false } }
  const options = { origin: 'https://azlabs.ai', subject: claims.sub, sessionId: claims.sid,
    localSubject: access.localSubject, requestId: 'research:synthetic-operation' }
  const response = (body: unknown, status = 200) => async () => Response.json(body, { status })
  it('never calls a provider for denied, revoked, mismatched, uncapped, replayed or unavailable authority results', async () => {
    const cases = [response({}, 401), response({}, 403), response({}, 429), response({}, 503),
      response({ ...access, allowed: false }), response({ ...access, identityGate: undefined }),
      response({ ...access, identityGate: 'legacy' }), response({ ...access, localSubject: undefined }),
      response({ ...access, sessionId: undefined }), response({ ...access, localSubject: 'other-local-user' }),
      response({ ...access, subject: 'other-central-user' }), response({ ...access, sessionId: 'revoked-session' }),
      response({ ...access, limits: { daily: null, monthly: 20 } }), response({ ...access, limits: { daily: 0, monthly: 20 } }),
      response({ ...access, consumption: { requestId: options.requestId, replayed: true } }),
      response({ ...access, consumption: undefined }), async () => { throw new Error('offline') }]
    for (const fetcher of cases) {
      let providerCalls = 0
      await assert.rejects(approvedResearchOperation(
        () => checkResearchAccess('synthetic-access-token', { ...options, fetcher }),
        async () => { providerCalls += 1 },
      ), AccessDeniedError)
      assert.equal(providerCalls, 0)
    }
  })
  it('consumes an idempotent allowance before exactly one authorized provider operation', async () => {
    const order: string[] = []
    const fetcher: typeof fetch = async (url, init) => {
      assert.equal(url, 'https://azlabs.ai/api/platform/access/check')
      assert.equal(init?.cache, 'no-store')
      assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer synthetic-access-token')
      assert.deepEqual(JSON.parse(String(init?.body)), { product: 'research', consume: { kind: 'research', requestId: options.requestId } })
      order.push('consume')
      return Response.json(access)
    }
    const result = await approvedResearchOperation(
      () => checkResearchAccess('synthetic-access-token', { ...options, fetcher }),
      async () => { order.push('provider'); return 'synthetic-answer' },
    )
    assert.equal(result, 'synthetic-answer')
    assert.deepEqual(order, ['consume', 'provider'])
  })
  it('requires a bounded request ID, so duplicates can be accounted for centrally', () => {
    assert.equal(researchRequestId(options.requestId), options.requestId)
    assert.equal(researchRequestId(`narration:${'x'.repeat(36)}`), `narration:${'x'.repeat(36)}`)
    assert.equal(researchRequestId('x'.repeat(16)), 'x'.repeat(16))
    assert.equal(researchRequestId('x'.repeat(128)), 'x'.repeat(128))
    for (const invalid of [null, '', 'short', 'x'.repeat(15), 'bad request with spaces', 'x'.repeat(129)]) assert.throws(() => researchRequestId(invalid))
  })
})
