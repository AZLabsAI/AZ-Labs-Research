import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    try {
      // Create Supabase client at runtime with environment variables
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!error) {
        // Successful authentication - redirect to home or next URL
        return NextResponse.redirect(`${origin}${next}`)
      } else {
        // Handle authentication error
        return NextResponse.redirect(`${origin}/auth/login?error=Authentication failed`)
      }
    } catch (err) {
      // Handle unexpected errors
      return NextResponse.redirect(`${origin}/auth/login?error=Unexpected error occurred`)
    }
  }

  // No code provided - redirect to login
  return NextResponse.redirect(`${origin}/auth/login?error=No authentication code provided`)
}