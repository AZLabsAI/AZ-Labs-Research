'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { Provider } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/client'
import { AZLABS_AUTH_PROVIDER, buildAuthCallbackUrl, safeNext } from '@/lib/auth/azlabs'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

const PLATFORM_RESOURCE = 'https://azlabs.ai/api/platform'

function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [opening, setOpening] = useState(true)
  const attempted = useRef(false)
  const params = useSearchParams()
  const next = safeNext(params.get('next'))
  const [supabase] = useState(createClient)

  const continueToAZLabs = useCallback(async () => {
    setOpening(true)
    setError(null)
    try {
      const readiness = await fetch('/api/auth/readiness', { cache: 'no-store' })
      if (!readiness.ok || (await readiness.json()).ready !== true) throw new Error('Research account access is being prepared. Please return to your AZ Labs account.')
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: AZLABS_AUTH_PROVIDER as Provider,
        options: {
          redirectTo: buildAuthCallbackUrl(window.location.origin, next),
          queryParams: { resource: PLATFORM_RESOURCE },
        },
      })
      if (authError) throw new Error('AZ Labs sign-in could not open. Please try again.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AZ Labs sign-in is temporarily unavailable.')
      setOpening(false)
    }
  }, [next, supabase])

  useEffect(() => {
    if (attempted.current) return
    attempted.current = true
    void continueToAZLabs()
  }, [continueToAZLabs])

  return (
    <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center px-4 py-12">
      <Card className="surface-panel w-full max-w-md rounded-[var(--radius-card)] p-8 text-center">
        <h1 className="mb-3 text-2xl font-semibold">Continue to AZ Labs Research</h1>
        <p className="mb-6 text-sm text-[var(--on-surface-variant)]">
          {opening ? 'Opening your AZ Labs account. Your existing sign-in will be reused.' : error}
        </p>
        {!opening && <Button className="w-full" onClick={() => void continueToAZLabs()}>Try AZ Labs sign-in again</Button>}
        <p className="mt-6 text-sm"><Link className="focus-ring rounded text-[var(--primary-accent)]" href="https://azlabs.ai/account">Your AZ Labs account</Link></p>
        <p className="mt-3 text-sm"><Link className="focus-ring rounded" href="/">Back to Research</Link></p>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return <Suspense fallback={<p className="p-8 text-center">Opening AZ Labs sign-in…</p>}><LoginForm /></Suspense>
}
