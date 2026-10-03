'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import { GracefulError } from '@/components/graceful-error'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string; statusCode?: number }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return <GracefulError error={error} reset={reset} />
}
