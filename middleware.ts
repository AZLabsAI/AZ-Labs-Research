import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  })

  const pathname = req.nextUrl.pathname

  // Skip middleware for static files and API routes (except auth API routes)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/api/az-labs-research') ||
    pathname.includes('.')
  ) {
    return res
  }

  try {
    // Create a Supabase client configured to use cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            req.cookies.set(name, value)
            res = NextResponse.next({
              request: {
                headers: req.headers,
              },
            })
            res.cookies.set(name, value, options)
          },
          remove(name: string, options: any) {
            req.cookies.delete(name)
            res = NextResponse.next({
              request: {
                headers: req.headers,
              },
            })
            res.cookies.delete(name)
          },
        },
      }
    )
    
    // Refresh session if expired - required for Server Components
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Protected routes that require authentication
    const protectedRoutes = ['/dashboard', '/profile', '/settings']
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))

    // If accessing a protected route without authentication, redirect to login
    if (isProtectedRoute && !session) {
      const redirectUrl = new URL('/auth/login', req.url)
      redirectUrl.searchParams.set('next', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // If accessing login page while authenticated, redirect to home
    if (pathname === '/auth/login' && session) {
      return NextResponse.redirect(new URL('/', req.url))
    }

    return res
  } catch (err) {
    // If there's an error with Supabase, allow the request to continue
    // This ensures the app doesn't break if Supabase is temporarily unavailable
    return res
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
