'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export default function AuthCodeErrorPage() {
  return (
    <div className="relative flex min-h-[calc(100vh-6rem)] items-center justify-center overflow-hidden px-4 py-12">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-24 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(26,115,232,0.16)_0%,transparent_70%)] animate-float-slow" />
        <div className="absolute -right-28 top-20 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(138,180,248,0.2)_0%,transparent_70%)] animate-float-slower" />
      </div>

      <Card className="surface-panel relative w-full max-w-md rounded-[var(--radius-card)] p-8 animate-fade-up">
        <div className="text-center">
          <div className="mx-auto mb-4 w-fit rounded-full bg-[hsl(var(--destructive))/0.12] p-3 text-[hsl(var(--destructive))]">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-[var(--on-surface)]">
            Authentication Error
          </h1>
          <p className="mb-6 text-sm text-[var(--on-surface-variant)]">
            The sign-in didn&apos;t complete. This is usually caused by:
          </p>

          <ul className="mb-6 space-y-2 text-left text-sm text-[var(--on-surface-variant)]">
            <li className="flex gap-2">
              <span aria-hidden="true">•</span> An invalid or expired authentication code
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true">•</span> A lost network connection mid-sign-in
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true">•</span> Your AZ Labs account not having Research access
            </li>
          </ul>

          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/auth/login">
                Try Again
              </Link>
            </Button>

            <Button asChild variant="outline" className="w-full">
              <Link href="/">
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
