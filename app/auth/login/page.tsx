'use client'

import { useState, Suspense } from 'react'
import Image from 'next/image'
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
    <div className="relative flex min-h-[calc(100vh-6rem)] items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(26,115,232,0.16)_0%,transparent_70%)] animate-float-slow" />
        <div className="absolute -right-28 top-20 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(138,180,248,0.2)_0%,transparent_70%)] animate-float-slower" />
      </div>

      <Card className="surface-panel relative w-full max-w-md rounded-[var(--radius-card)] p-8 animate-fade-up">
        <div className="mb-8 text-center">
          <Image
            src="/brand/az-mark.png"
            alt="AZ Labs"
            width={256}
            height={256}
            className="mx-auto mb-4 h-12 w-12 brightness-0 dark:invert"
          />
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-[var(--on-surface)]">
            Welcome to AZ Labs Research
          </h1>
          <p className="text-sm text-[var(--on-surface-variant)]">
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
              loading={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? 'Opening AZ Labs sign-in...' : 'Continue with AZ Labs'}
            </Button>
            <p className="text-center text-sm text-[var(--on-surface-variant)]">
              One account across AZ Labs, with Research access checked after sign-in.
            </p>
          </div>
        ) : (
          <>
            <form onSubmit={(event) => void handleSignIn(event)} className="space-y-4">
              <Input
                type="email"
                placeholder="Email"
                aria-label="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />

              <Input
                type="password"
                placeholder="Password"
                aria-label="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />

              {error && (
                <div className="rounded-[var(--radius-md)] border border-[hsl(var(--destructive))/0.3] bg-[hsl(var(--destructive))/0.08] p-3 text-sm text-[hsl(var(--destructive))]">
                  {error}
                </div>
              )}

              {message && (
                <div className="rounded-[var(--radius-md)] border border-[var(--success)]/30 bg-[var(--success)]/10 p-3 text-sm text-[var(--success)]">
                  {message}
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" loading={isLoading} disabled={isLoading} className="flex-1">
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleSignUp()}
                  disabled={isLoading}
                  variant="outline"
                  className="flex-1"
                >
                  {isLoading ? 'Signing Up...' : 'Sign Up'}
                </Button>
              </div>
            </form>

            <div className="mt-4 space-y-2">
              <Button type="button" onClick={() => void handleGoogleSignIn()} disabled={isLoading} variant="outline" className="w-full">
                Continue with Google
              </Button>
              <Button type="button" onClick={() => void handleGithubSignIn()} disabled={isLoading} variant="outline" className="w-full">
                <Github className="h-4 w-4" />
                Continue with GitHub
              </Button>
            </div>
          </>
        )}

        {error && centralAuthEnabled && (
          <div className="mt-4 rounded-[var(--radius-md)] border border-[hsl(var(--destructive))/0.3] bg-[hsl(var(--destructive))/0.08] p-3 text-sm text-[hsl(var(--destructive))]">
            {error}
          </div>
        )}

        <div className="mt-6 text-center">
          <Link href="/" className="focus-ring rounded px-1 py-0.5 text-sm text-[var(--on-surface-variant)] hover:text-[var(--on-surface)]">
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
