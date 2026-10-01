import { handleResearchProfile } from '@/lib/account/profile'
import { authConfiguration, authFailure, currentResearchSession, researchProfileStore } from '@/lib/auth/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function handle(request: Request): Promise<Response> {
  try {
    return await handleResearchProfile(request, {
      origin: authConfiguration().appOrigin,
      authorize: async () => {
        const { delegation } = await currentResearchSession()
        return { subject: delegation.subject, localSubject: delegation.localSubject }
      },
      store: researchProfileStore(),
    })
  } catch (error) { return authFailure(error) }
}

export const GET = handle
export const PATCH = handle
