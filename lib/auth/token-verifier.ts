import { createPublicKey, verify, type JsonWebKey } from 'node:crypto'

export const RESEARCH_CLIENT_ID = 'azlabs-research'
export const PLATFORM_AUDIENCE = 'https://azlabs.ai/api/platform'

export type TokenClaims = Record<string, unknown> & {
  iss: string
  sub?: string
  sid?: string
  iat: number
  exp?: number
  jti?: string
}

export type AccessTokenClaims = TokenClaims & { sub: string; sid: string; exp: number }
export type LogoutTokenClaims = TokenClaims & { jti: string }

export class InvalidDelegationError extends Error {
  constructor() { super('The AZ Labs session is invalid or expired.') }
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function nonempty(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 256
}

type VerificationOptions = { issuer: string; jwks: { keys: JsonWebKey[] }; now?: number }

export function verifyCentralToken(token: string, kind: 'access', options: VerificationOptions): AccessTokenClaims
export function verifyCentralToken(token: string, kind: 'logout', options: VerificationOptions): LogoutTokenClaims
export function verifyCentralToken(
  token: string,
  kind: 'access' | 'logout',
  options: VerificationOptions,
): TokenClaims {
  const invalid = () => { throw new InvalidDelegationError() }
  if (token.length > 12000) return invalid()
  const parts = token.split('.')
  if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) return invalid()
  let header: unknown
  let payload: unknown
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'))
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'))
  } catch { return invalid() }
  if (!object(header) || !object(payload) || !nonempty(header.kid)) return invalid()
  if (header.typ !== (kind === 'access' ? 'at+jwt' : 'logout+jwt')) return invalid()
  if (!['EdDSA', 'RS256', 'ES256'].includes(String(header.alg))) return invalid()
  const keys = options.jwks.keys.filter((key) => key.kid === header.kid)
  if (keys.length !== 1) return invalid()
  const jwk = keys[0]
  if ((jwk.use && jwk.use !== 'sig') || (jwk.alg && jwk.alg !== header.alg)) return invalid()
  if (jwk.key_ops && (!Array.isArray(jwk.key_ops) || !jwk.key_ops.includes('verify'))) return invalid()
  if (header.alg === 'EdDSA' && (jwk.kty !== 'OKP' || jwk.crv !== 'Ed25519')) return invalid()
  if (header.alg === 'RS256' && jwk.kty !== 'RSA') return invalid()
  if (header.alg === 'ES256' && (jwk.kty !== 'EC' || jwk.crv !== 'P-256')) return invalid()
  try {
    const key = createPublicKey({ key: jwk, format: 'jwk' })
    const signed = Buffer.from(`${parts[0]}.${parts[1]}`)
    const signature = Buffer.from(parts[2], 'base64url')
    const verified = header.alg === 'EdDSA'
      ? verify(null, signed, key, signature)
      : verify('sha256', signed, { key, dsaEncoding: 'ieee-p1363' }, signature)
    if (!verified) return invalid()
  } catch { return invalid() }
  const now = Math.floor((options.now ?? Date.now()) / 1000)
  if (payload.iss !== options.issuer) return invalid()
  if (kind === 'access' && (!nonempty(payload.sub) || !nonempty(payload.sid))) return invalid()
  if (kind === 'logout' && (!nonempty(payload.sub) && !nonempty(payload.sid))) return invalid()
  if ((payload.sub !== undefined && !nonempty(payload.sub)) || (payload.sid !== undefined && !nonempty(payload.sid))) return invalid()
  if (!Number.isInteger(payload.iat) || Number(payload.iat) > now + 30) return invalid()
  if (payload.nbf !== undefined && (!Number.isInteger(payload.nbf) || Number(payload.nbf) > now + 30)) return invalid()
  if (payload.exp !== undefined && (!Number.isInteger(payload.exp) || Number(payload.exp) <= now)) return invalid()
  const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud]
  if (kind === 'access') {
    if (payload['https://azlabs.ai/identity_gate'] !== 'pre_issuance_v1') return invalid()
    if (!audiences.includes(PLATFORM_AUDIENCE)) return invalid()
    if (payload.client_id !== RESEARCH_CLIENT_ID || payload.azp !== RESEARCH_CLIENT_ID || !Number.isInteger(payload.exp)) return invalid()
    if (Number(payload.exp) <= Number(payload.iat)) return invalid()
  } else {
    if (!audiences.includes(RESEARCH_CLIENT_ID) || !nonempty(payload.jti) || Number(payload.iat) < now - 300) return invalid()
    if (Object.hasOwn(payload, 'nonce') || !object(payload.events) ||
      !object(payload.events['http://schemas.openid.net/event/backchannel-logout'])) return invalid()
  }
  return payload as TokenClaims
}

export function decodeLocalSessionId(token: string): string | null {
  // Call only after Supabase getUser/getClaims has verified this local JWT.
  try {
    const payload: unknown = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'))
    return object(payload) && typeof payload.session_id === 'string' &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.session_id)
      ? payload.session_id : null
  } catch { return null }
}
