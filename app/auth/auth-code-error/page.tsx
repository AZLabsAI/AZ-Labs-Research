'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white/10 backdrop-blur-lg border border-white/20">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Authentication Error</h1>
          <p className="text-slate-300 mb-6">
            There was an error during the authentication process. This could be due to:
          </p>
          
          <ul className="text-slate-300 text-sm text-left mb-6 space-y-2">
            <li>• Invalid or expired authentication code</li>
            <li>• Network connectivity issues</li>
            <li>• OAuth provider configuration problems</li>
          </ul>

          <div className="space-y-3">
            <Button asChild className="w-full bg-purple-600 hover:bg-purple-700">
              <Link href="/auth/login">
                Try Again
              </Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
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
