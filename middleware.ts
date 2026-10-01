import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { safeNext } from '@/lib/auth/azlabs'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next') || pathname.includes('.')) return NextResponse.next()
  const protectedEntry = ['/dashboard', '/profile', '/settings'].some((path) => pathname === path || pathname.startsWith(path + '/'))
  let response = NextResponse.next({ request })
  const signIn = () => {
    const destination = new URL('/auth/login', request.url)
    destination.searchParams.set('next', safeNext(pathname + request.nextUrl.search))
    const redirect = NextResponse.redirect(destination)
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie))
    return redirect
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return protectedEntry ? signIn() : response
  try {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    })
    const { data, error } = await supabase.auth.getClaims()
    if (protectedEntry && (error || !data?.claims?.sub || !request.cookies.has('azlabs-research-delegation'))) return signIn()
    // Validity and grants are checked again by the server API and durable profile RLS.
    return response
  } catch {
    return protectedEntry ? signIn() : response
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
