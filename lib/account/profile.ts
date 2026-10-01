export interface ResearchProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface ResearchProfilePatch {
  full_name?: string | null
  avatar_url?: string | null
}

export interface ResearchProfileDependencies {
  origin: string
  authorize: () => Promise<{ subject: string; localSubject: string }>
  store: {
    read: (localSubject: string) => Promise<ResearchProfile | null>
    update: (localSubject: string, patch: ResearchProfilePatch) => Promise<ResearchProfile | null>
  }
}

function respond(status: number, error: string, reason: string): Response {
  return Response.json({ error, reason }, { status, headers: { 'Cache-Control': 'no-store' } })
}

function patchFrom(value: unknown): ResearchProfilePatch | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const body = value as Record<string, unknown>
  const fields = Object.keys(body)
  if (!fields.length || fields.some((field) => field !== 'full_name' && field !== 'avatar_url')) return null
  const patch: ResearchProfilePatch = {}
  if (Object.hasOwn(body, 'full_name')) {
    if (body.full_name !== null && (typeof body.full_name !== 'string' || body.full_name.length > 200)) return null
    patch.full_name = typeof body.full_name === 'string' ? body.full_name.trim() || null : null
  }
  if (Object.hasOwn(body, 'avatar_url')) {
    if (body.avatar_url !== null && (typeof body.avatar_url !== 'string' || body.avatar_url.length > 2048)) return null
    const url = typeof body.avatar_url === 'string' ? body.avatar_url.trim() : ''
    if (url) {
      try {
        const parsed = new URL(url)
        if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) return null
      } catch { return null }
    }
    patch.avatar_url = url || null
  }
  return patch
}

/** Identity and access come exclusively from the fresh server principal. */
export async function handleResearchProfile(request: Request, deps: ResearchProfileDependencies): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'PATCH') return respond(405, 'Unsupported profile operation.', 'method_not_allowed')
  if (request.method === 'PATCH' && request.headers.get('Origin') !== deps.origin) {
    return respond(403, 'Same-origin request required.', 'same_origin_required')
  }
  try {
    const principal = await deps.authorize()
    if (!principal.subject || !principal.localSubject) return respond(401, 'Sign in with your AZ Labs account.', 'not_authenticated')
    let profile: ResearchProfile | null
    if (request.method === 'PATCH') {
      const body = await request.text()
      if (body.length > 8192) return respond(400, 'Use only a display name and avatar URL.', 'invalid_profile_patch')
      let value: unknown
      try { value = JSON.parse(body) } catch { return respond(400, 'Invalid profile update.', 'invalid_profile_patch') }
      const patch = patchFrom(value)
      if (!patch) return respond(400, 'Use only a display name and avatar URL.', 'invalid_profile_patch')
      profile = await deps.store.update(principal.localSubject, patch)
    } else {
      profile = await deps.store.read(principal.localSubject)
    }
    if (!profile) return respond(404, 'Your Research profile is unavailable.', 'profile_not_found')
    if (profile.id !== principal.localSubject) return respond(503, 'Research profile is temporarily unavailable.', 'profile_store_mismatch')
    return Response.json({ profile }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    const denied = error as { status?: unknown; reason?: unknown }
    const status = typeof denied?.status === 'number' && [401, 403, 429, 503].includes(denied.status) ? denied.status : 503
    const reason = typeof denied?.reason === 'string' ? denied.reason : 'profile_authority_unavailable'
    return respond(status, status === 401 ? 'Sign in with your AZ Labs account.' : status === 403 ? 'Your AZ Labs account does not currently have Research access.' :
      status === 429 ? 'Your Research limit has been reached.' : 'Research profile is temporarily unavailable.', reason)
  }
}
