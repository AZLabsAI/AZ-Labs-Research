export interface SessionBinding {
  local_session_id: string
  local_subject: string
  central_issuer: string
  central_subject: string
  central_sid: string
  expires_at: string
  revoked_at: string | null
}

export function bindingIsActive(binding: SessionBinding | null, identity: {
  issuer: string; subject: string; sessionId: string; localSubject: string; localSessionId: string
}, now = Date.now()): boolean {
  return Boolean(binding && binding.revoked_at === null && Date.parse(binding.expires_at) > now &&
    binding.central_issuer === identity.issuer && binding.central_subject === identity.subject &&
    binding.central_sid === identity.sessionId && binding.local_subject === identity.localSubject &&
    binding.local_session_id === identity.localSessionId)
}
