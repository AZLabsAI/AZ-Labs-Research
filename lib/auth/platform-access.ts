export interface ResearchAccess {
  allowed: boolean
  subject: string
  product: 'research'
  identityGate: 'pre_issuance_v1'
  localSubject: string
  sessionId: string
  tier: string
  limits: { daily: number; monthly: number | null }
  reason?: string
  consumption?: { requestId: string; replayed: boolean }
}

export class AccessDeniedError extends Error {
  status: number
  reason: string
  constructor(status: number, reason: string) {
    super(reason === 'quota_exceeded' ? 'Your Research limit has been reached.' :
      reason === 'request_replayed' ? 'This request already ran. Start a new request to continue.' :
      reason === 'not_authenticated' ? 'Sign in with your AZ Labs account to continue.' :
      status === 503 ? 'Research access is temporarily unavailable.' : 'Research access needs approval in your AZ Labs account.')
    this.status = status
    this.reason = reason
  }
}

export async function checkResearchAccess(
  accessToken: string,
  options: { origin: string; subject: string; sessionId: string; localSubject: string; requestId?: string; fetcher?: typeof fetch },
): Promise<ResearchAccess> {
  const response = await (options.fetcher ?? fetch)(`${options.origin}/api/platform/access/check`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ product: 'research', ...(options.requestId ? { consume: { kind: 'research', requestId: options.requestId } } : {}) }),
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
  }).catch(() => { throw new AccessDeniedError(503, 'authority_unavailable') })
  if (!response.ok) {
    const status = [401, 403, 429].includes(response.status) ? response.status : 503
    throw new AccessDeniedError(status, status === 401 ? 'not_authenticated' : status === 429 ? 'quota_exceeded' : status === 403 ? 'access_denied' : 'authority_unavailable')
  }
  const value: unknown = await response.json().catch(() => null)
  if (typeof value !== 'object' || value === null) throw new AccessDeniedError(503, 'invalid_authority_response')
  const access = value as ResearchAccess
  if (access.allowed !== true) throw new AccessDeniedError(403, 'access_denied')
  if (access.identityGate !== 'pre_issuance_v1' || access.product !== 'research' || access.subject !== options.subject || access.sessionId !== options.sessionId ||
    access.localSubject !== options.localSubject || typeof access.tier !== 'string') throw new AccessDeniedError(403, 'identity_mismatch')
  if (!Number.isSafeInteger(access.limits?.daily) || access.limits.daily <= 0 ||
    (access.limits.monthly !== null && (!Number.isSafeInteger(access.limits.monthly) || access.limits.monthly <= 0))) {
    throw new AccessDeniedError(503, 'capacity_not_configured')
  }
  if (options.requestId) {
    if (access.consumption?.requestId !== options.requestId || typeof access.consumption.replayed !== 'boolean') {
      throw new AccessDeniedError(503, 'consumption_not_confirmed')
    }
    if (access.consumption.replayed) throw new AccessDeniedError(409, 'request_replayed')
  }
  return access
}

export function researchRequestId(value: string | null): string {
  if (!value || !/^[A-Za-z0-9:_-]{16,128}$/.test(value)) throw new AccessDeniedError(400, 'request_id_required')
  return value
}
