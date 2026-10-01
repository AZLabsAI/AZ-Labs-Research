import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function AccessRequiredPage() {
  return <main className="mx-auto flex min-h-[60vh] max-w-xl items-center px-4 py-12">
    <Card className="surface-panel w-full p-8">
      <h1 className="mb-3 text-2xl font-semibold">Research access needs approval</h1>
      <p className="mb-6 text-[var(--on-surface-variant)]">Your AZ Labs account needs Research access and a confirmed account connection. Existing research data stays with its original account.</p>
      <Button asChild><Link href="https://azlabs.ai/account">Manage AZ Labs access</Link></Button>
      <p className="mt-4 text-sm"><Link href="/">Back to Research</Link></p>
    </Card>
  </main>
}
