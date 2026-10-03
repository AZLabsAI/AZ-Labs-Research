import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { safeNext } from '@/lib/auth/azlabs'
import { adoptResearchSession, authConfiguration } from '@/lib/auth/server'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = safeNext(searchParams.get('next'))

  if (code) {
    try {
      authConfiguration()
      const supabase = await createClient()
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (error || userError || !user || !data.session?.provider_token || user.id !== data.session.user.id) {
        await supabase.auth.signOut({ scope: 'local' })
        return NextResponse.redirect(new URL('/auth/auth-code-error', origin))
      }
      const providerToken = data.session.provider_token
      // Remove delegation from Supabase's script-readable cookie. Keep it only in
      // the encrypted HttpOnly product cookie created by the adoption step.
      const { error: resetError } = await supabase.auth.setSession({
        access_token: data.session.access_token, refresh_token: data.session.refresh_token,
      })
      if (resetError) {
        await supabase.auth.signOut({ scope: 'local' })
        return NextResponse.redirect(new URL('/auth/auth-code-error', origin))
      }
      try {
        await adoptResearchSession(providerToken, data.session.access_token, user)
      } catch {
        await supabase.auth.signOut({ scope: 'local' })
        return NextResponse.redirect(new URL('/auth/access-required', origin))
      }
      return NextResponse.redirect(new URL(next, origin))
    } catch {
      return NextResponse.redirect(new URL('/auth/access-required', origin))
    }
  }

  return NextResponse.redirect(new URL('/auth/auth-code-error', origin))
}
