"use client"

import React from "react"
import { AlertCircle, RefreshCw, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface GracefulErrorProps {
  error: Error & { digest?: string; statusCode?: number }
  reset?: () => void
}

export function GracefulError({ error, reset }: GracefulErrorProps) {
  const statusCode = error.statusCode || 500

  const errorMessages: Record<number, { title: string; description: string }> = {
    401: {
      title: "Authentication Required",
      description: "There is an issue with your API key. Verify your configuration and try again.",
    },
    402: {
      title: "Out of Credits",
      description: "Your Firecrawl credits are exhausted. Update your plan and retry.",
    },
    429: {
      title: "Rate Limited",
      description: "Too many requests were sent in a short period. Wait briefly, then retry.",
    },
    500: {
      title: "Unexpected Error",
      description: "The request failed unexpectedly. Retry once, then check logs if it persists.",
    },
    504: {
      title: "Request Timed Out",
      description: "This request took too long. Try a narrower prompt or shorter source list.",
    },
  }

  const { title, description } = errorMessages[statusCode] || errorMessages[500]

  return (
    <div className="flex min-h-[420px] items-center justify-center p-4">
      <div className="surface-panel w-full max-w-md rounded-[var(--radius-card)] p-6 text-center">
        <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--destructive))/0.15]">
          <AlertCircle className="h-7 w-7 text-[hsl(var(--destructive))]" />
        </div>

        <h2 className="text-xl font-semibold text-[var(--on-surface)]">{title}</h2>
        <p className="mt-2 text-sm text-[var(--on-surface-variant)]">{description}</p>

        {error.digest && (
          <p className="mt-4 text-xs text-[var(--on-surface-variant)]">Error ID: {error.digest}</p>
        )}

        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          {reset && (
            <Button onClick={reset} variant="outline">
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
          )}

          <Button asChild>
            <Link href="/">
              <Home className="h-4 w-4" />
              Go home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
