import 'server-only'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClient as createAdminClient, type User } from '@supabase/supabase-js'
import type { JsonWebKey } from 'node:crypto'
import { createClient } from '@/utils/supabase/server'
import { DELEGATION_COOKIE, openDelegation, sealDelegation, type ResearchDelegation } from './delegation-cookie'
import { verifyCentralToken, decodeLocalSessionId, RESEARCH_CLIENT_ID, type AccessTokenClaims } from './token-verifier'
import { AccessDeniedError, checkResearchAccess, researchRequestId, type ResearchAccess } from './platform-access'
import { bindingIsActive, type SessionBinding } from './session-binding'
import { resolveLogoutSubject } from './logout-subject'

export function authConfiguration() {
  const platformOrigin = process.env.AZLABS_PLATFORM_ORIGIN || 'https://azlabs.ai'
  const appOrigin = process.env.AZLABS_RESEARCH_ORIGIN || 'https://research.azlabs.ai'
  const issuer = `${platformOrigin}/api/auth`
  const secret = process.env.RESEARCH_SESSION_ENCRYPTION_KEY || ''
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (process.env.NEXT_PUBLIC_AZLABS_AUTH_MODE !== 'central' ||
    process.env.RESEARCH_CENTRAL_ISSUANCE_GATE_VERIFIED !== '1' ||
    process.env.RESEARCH_SESSION_BINDINGS_READY !== '1' ||
    !supabaseUrl || !adminKey || Buffer.from(secret, 'base64').length !== 32 || Buffer.from(secret, 'base64').toString('base64') !== secret) {
    throw new AccessDeniedError(503, 'adoption_not_ready')
  }
  for (const origin of [platformOrigin, appOrigin]) {
    const parsed = new URL(origin)
    if (parsed.origin !== origin || (parsed.protocol !== 'https:' &&
      !(process.env.NODE_ENV !== 'production' && parsed.hostname === 'localhost'))) {
      throw new AccessDeniedError(503, 'invalid_auth_origin')
    }
  }
  return { platformOrigin, appOrigin, issuer, secret, supabaseUrl, adminKey }
}

function admin() {
  const config = authConfiguration()
  return createAdminClient(config.supabaseUrl, config.adminKey, { auth: { persistSession: false, autoRefreshToken: false } })
}

type Metadata = { issuer: string; jwks_uri: string; end_session_endpoint?: string }
let cachedKeys: { issuer: string; expires: number; metadata: Metadata; keys: JsonWebKey[] } | null = null

async function centralKeys(): Promise<{ metadata: Metadata; jwks: { keys: JsonWebKey[] } }> {
  const config = authConfiguration()
  if (cachedKeys?.issuer === config.issuer && cachedKeys.expires > Date.now()) return {
    metadata: cachedKeys.metadata, jwks: { keys: cachedKeys.keys },
  }
  try {
    const response = await fetch(`${config.issuer}/.well-known/openid-configuration`, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000) })
    if (!response.ok) throw new Error('Discovery unavailable')
    const metadata = await response.json() as Metadata
    if (metadata.issuer !== config.issuer || new URL(metadata.jwks_uri).origin !== config.platformOrigin) throw new Error('Unexpected issuer')
    const keyResponse = await fetch(metadata.jwks_uri, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(10000) })
    const jwks = await keyResponse.json() as { keys: JsonWebKey[] }
    if (!keyResponse.ok || !Array.isArray(jwks.keys) || jwks.keys.length > 20) throw new Error('JWKS unavailable')
    cachedKeys = { issuer: config.issuer, expires: Date.now() + 300000, metadata, keys: jwks.keys }
    return { metadata, jwks }
  } catch { throw new AccessDeniedError(503, 'authority_unavailable') }
}

async function verifyAccessToken(token: string): Promise<AccessTokenClaims> {
  const { issuer } = authConfiguration()
  const { jwks } = await centralKeys()
  try { return verifyCentralToken(token, 'access', { issuer, jwks }) }
  catch { throw new AccessDeniedError(401, 'not_authenticated') }
}

async function assertLocalReadiness() {
  const { data, error } = await admin().rpc('research_auth_readiness')
  if (error || data?.version !== 'research-session-binding-v1' || data.profilesGuarded !== true || data.writesRestricted !== true) {
    throw new AccessDeniedError(503, 'local_policy_not_ready')
  }
  const probes = await Promise.all([
    admin().from('azlabs_research_sessions').select('local_session_id').limit(0),
    admin().from('azlabs_research_logout_events').select('jti').limit(0),
  ])
  if (probes.some((probe) => probe.error)) throw new AccessDeniedError(503, 'local_binding_api_not_ready')
}

export async function publicAuthReadiness(): Promise<boolean> {
  try {
    authConfiguration()
    await assertLocalReadiness()
    return true
  } catch { return false }
}

export async function adoptResearchSession(accessToken: string, localAccessToken: string, localUser: User) {
  const config = authConfiguration()
  const claims = await verifyAccessToken(accessToken)
  const localSessionId = decodeLocalSessionId(localAccessToken)
  if (!localSessionId) throw new AccessDeniedError(403, 'local_session_unverified')
  await assertLocalReadiness()
  const access = await checkResearchAccess(accessToken, {
    origin: config.platformOrigin, subject: claims.sub, sessionId: claims.sid, localSubject: localUser.id,
  })
  const delegation: ResearchDelegation = {
    accessToken, subject: claims.sub, sessionId: claims.sid, localSubject: localUser.id, localSessionId, expiresAt: claims.exp,
  }
  const { data: bound, error } = await admin().rpc('research_bind_session', {
    p_local_session_id: localSessionId, p_local_subject: localUser.id, p_issuer: config.issuer,
    p_subject: claims.sub, p_sid: claims.sid, p_issued_at: new Date(claims.iat * 1000).toISOString(),
    p_expires_at: new Date(claims.exp * 1000).toISOString(),
  })
  if (error || bound !== true) throw new AccessDeniedError(403, 'session_binding_denied')
  ;(await cookies()).set(DELEGATION_COOKIE, sealDelegation(delegation, config.secret), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/',
    maxAge: Math.max(0, claims.exp - Math.floor(Date.now() / 1000)),
  })
  return access
}

export async function currentResearchSession(): Promise<{ delegation: ResearchDelegation; access: ResearchAccess; user: User }> {
  const config = authConfiguration()
  const delegation = openDelegation((await cookies()).get(DELEGATION_COOKIE)?.value, config.secret)
  if (!delegation) throw new AccessDeniedError(401, 'not_authenticated')
  const claims = await verifyAccessToken(delegation.accessToken)
  if (claims.sub !== delegation.subject || claims.sid !== delegation.sessionId) throw new AccessDeniedError(403, 'identity_mismatch')
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  const { data: { session } } = await supabase.auth.getSession()
  if (userError || !user || user.id !== delegation.localSubject || !session ||
    decodeLocalSessionId(session.access_token) !== delegation.localSessionId) throw new AccessDeniedError(401, 'not_authenticated')
  await assertLocalReadiness()
  const { data: binding, error: bindingError } = await admin().from('azlabs_research_sessions')
    .select('local_session_id,local_subject,central_issuer,central_subject,central_sid,expires_at,revoked_at')
    .eq('local_session_id', delegation.localSessionId).maybeSingle()
  if (bindingError || !bindingIsActive(binding as SessionBinding | null, { issuer: config.issuer, ...delegation })) {
    throw new AccessDeniedError(401, 'session_revoked')
  }
  const access = await checkResearchAccess(delegation.accessToken, {
    origin: config.platformOrigin, subject: delegation.subject, sessionId: delegation.sessionId, localSubject: user.id,
  })
  return { delegation, access, user }
}

export function assertSameOrigin(request: Request) {
  const { appOrigin } = authConfiguration()
  if (request.headers.get('origin') !== appOrigin) throw new AccessDeniedError(403, 'invalid_origin')
}

export async function requireResearchSpend(request: Request) {
  assertSameOrigin(request)
  const requestId = researchRequestId(request.headers.get('x-research-request-id'))
  const { delegation } = await currentResearchSession()
  return checkResearchAccess(delegation.accessToken, {
    origin: authConfiguration().platformOrigin, subject: delegation.subject, sessionId: delegation.sessionId,
    localSubject: delegation.localSubject, requestId,
  })
}

export async function signOutResearch(request: Request): Promise<string> {
  assertSameOrigin(request)
  const config = authConfiguration()
  const store = await cookies()
  const delegation = openDelegation(store.get(DELEGATION_COOKIE)?.value, config.secret)
  if (delegation) {
    const { error } = await admin().from('azlabs_research_sessions').update({ revoked_at: new Date().toISOString() })
      .eq('local_session_id', delegation.localSessionId).eq('local_subject', delegation.localSubject)
    if (error) throw new AccessDeniedError(503, 'local_logout_unavailable')
  }
  store.set(DELEGATION_COOKIE, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 })
  const supabase = await createClient()
  await supabase.auth.signOut({ scope: 'local' })
  const { metadata } = await centralKeys()
  const endSession = metadata.end_session_endpoint
  if (!endSession || new URL(endSession).origin !== config.platformOrigin) throw new AccessDeniedError(503, 'central_logout_unavailable')
  const destination = new URL(endSession)
  destination.searchParams.set('client_id', RESEARCH_CLIENT_ID)
  destination.searchParams.set('post_logout_redirect_uri', `${config.appOrigin}/`)
  // Supabase does not preserve the provider ID token. The OP confirms this logout.
  return destination.toString()
}

export async function receiveCentralLogout(token: string) {
  const config = authConfiguration()
  const { jwks } = await centralKeys()
  let claims
  try { claims = verifyCentralToken(token, 'logout', { issuer: config.issuer, jwks }) }
  catch { throw new AccessDeniedError(400, 'invalid_logout_token') }
  await assertLocalReadiness()
  const { data: recorded, error: replayError } = await admin().from('azlabs_research_logout_events')
    .select('central_subject,central_sid,issued_at').eq('issuer', config.issuer).eq('jti', claims.jti).maybeSingle()
  if (replayError) throw new AccessDeniedError(503, 'logout_recording_unavailable')
  if (recorded) {
    if ((claims.sub && recorded.central_subject !== claims.sub) ||
      recorded.central_sid !== (claims.sid || null) || Date.parse(recorded.issued_at) !== claims.iat * 1000) {
      throw new AccessDeniedError(400, 'logout_replay_mismatch')
    }
    return { accepted: true, replayed: true }
  }
  let subject: string
  try {
    subject = await resolveLogoutSubject(claims, async (sid) => {
      const { data: bindings, error } = await admin().from('azlabs_research_sessions')
        .select('central_subject').eq('central_issuer', config.issuer).eq('central_sid', sid).limit(2)
      if (error) throw new AccessDeniedError(503, 'logout_recording_unavailable')
      return bindings?.map((binding) => binding.central_subject) ?? []
    })
  } catch (error) {
    if (error instanceof AccessDeniedError) throw error
    throw new AccessDeniedError(400, 'unknown_logout_binding')
  }
  const { data, error: logoutError } = await admin().rpc('research_record_logout', {
    p_issuer: claims.iss, p_jti: claims.jti, p_subject: subject, p_sid: claims.sid || null,
    p_issued_at: new Date(claims.iat * 1000).toISOString(),
  })
  if (logoutError) throw new AccessDeniedError(503, 'logout_recording_unavailable')
  return { accepted: true, replayed: data?.replayed === true }
}

export function authFailure(error: unknown): NextResponse {
  const denied = error instanceof AccessDeniedError ? error : new AccessDeniedError(503, 'authority_unavailable')
  return NextResponse.json({ error: denied.message, reason: denied.reason }, {
    status: denied.status, headers: { 'Cache-Control': 'no-store' },
  })
}
