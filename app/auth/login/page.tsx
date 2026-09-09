'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Github } from 'lucide-react'
import type { Provider } from '@supabase/supabase-js'
import {
  AZLABS_AUTH_PROVIDER,
  buildAuthCallbackUrl,
  isCentralAuthEnabled,
  safeNext,
} from '@/lib/auth/azlabs'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const centralAuthEnabled = isCentralAuthEnabled()
  const next = safeNext(searchParams.get('next'))

  const handleCentralSignIn = async () => {
    setIsLoading(true)
    setError(null)
    setMessage(null)

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: AZLABS_AUTH_PROVIDER as Provider,
      options: {
        redirectTo: buildAuthCallbackUrl(window.location.origin, next),
      },
    })

    if (oauthError) {
      setError(oauthError.message)
      setIsLoading(false)
    }
  }

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
      } else if (data?.user) {
        setMessage('Login successful! Redirecting...')
        router.push(next)
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignUp = async () => {
    setIsLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: buildAuthCallbackUrl(window.location.origin, next),
        },
      })

      if (signUpError) {
        setError(signUpError.message)
      } else if (data?.user) {
        setMessage('Check your email for the confirmation link!')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: buildAuthCallbackUrl(window.location.origin, next),
        },
      })

      if (oauthError) setError(oauthError.message)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGithubSignIn = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: buildAuthCallbackUrl(window.location.origin, next),
        },
      })

      if (oauthError) setError(oauthError.message)
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white/10 backdrop-blur-lg border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to AZ Labs Research</h1>
          <p className="text-slate-300">
            {centralAuthEnabled
              ? 'Use your AZ Labs account to continue to Research.'
              : 'Sign in to access advanced AI research tools'}
          </p>
        </div>

        {centralAuthEnabled ? (
          <div className="space-y-4">
            <Button
              type="button"
              onClick={() => void handleCentralSignIn()}
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? 'Opening AZ Labs sign-in...' : 'Continue with AZ Labs'}
            </Button>
            <p className="text-center text-sm text-slate-300">
              One account, with Research access checked here after sign-in.
            </p>
          </div>
        ) : (
          <>
            <form onSubmit={(event) => void handleSignIn(event)} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-300"
                />
              </div>

              <div>
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-300"
                />
              </div>

              {error && (
                <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-md border border-red-500/20">
                  {error}
                </div>
              )}

              {message && (
                <div className="text-green-400 text-sm bg-green-900/20 p-3 rounded-md border border-green-500/20">
                  {message}
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading} className="flex-1 bg-purple-600 hover:bg-purple-700">
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSignUp()}
                  disabled={isLoading}
                  variant="outline"
                  className="flex-1 border-white/20 text-white hover:bg-white/10"
                >
                  {isLoading ? 'Signing Up...' : 'Sign Up'}
                </Button>
              </div>
            </form>

            <div className="space-y-2 mt-4">
              <Button type="button" onClick={() => void handleGoogleSignIn()} disabled={isLoading} variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                Continue with Google
              </Button>
              <Button type="button" onClick={() => void handleGithubSignIn()} disabled={isLoading} variant="outline" className="w-full border-white/20 text-white hover:bg-white/10 flex items-center gap-2">
                <Github className="h-4 w-4" />
                Continue with GitHub
              </Button>
            </div>
          </>
        )}

        {error && centralAuthEnabled && (
          <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded-md border border-red-500/20 mt-4">
            {error}
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/" className="text-slate-300 hover:text-white text-sm">
            Back to Home
          </Link>
        </div>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading sign-in...</div>
      </main>
    }>
      <LoginForm />
    </Suspense>
  )
}
