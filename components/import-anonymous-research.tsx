'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/app/contexts/auth-context'
import { hasAnonymousSearchHistory, importAnonymousSearchHistory } from '@/lib/search-history'
import { hasAnonymousThreads, importAnonymousThreads } from '@/lib/threads'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

export function ImportAnonymousResearch() {
  const { subject } = useAuth()
  const [available, setAvailable] = useState(false)
  useEffect(() => {
    setAvailable(Boolean(subject) && (hasAnonymousSearchHistory() || hasAnonymousThreads()))
  }, [subject])
  if (!subject || !available) return null
  const importEarlier = () => {
    if (!importAnonymousSearchHistory(subject) || !importAnonymousThreads(subject)) {
      toast.error('Earlier research could not be imported on this browser.')
      return
    }
    setAvailable(false)
    window.dispatchEvent(new Event('research-history-imported'))
    toast.success('Earlier research was copied into this account on this browser.')
  }
  return <aside className="surface-panel mx-auto mt-6 max-w-4xl rounded-[var(--radius-card)] p-4 text-sm">
    <p className="mb-3 text-[var(--on-surface-variant)]">Earlier searches exist on this browser. Import them only if they belong to you. They will be copied into your current AZ Labs account on this device.</p>
    <Button type="button" size="sm" variant="outline" onClick={importEarlier}>Import my earlier research</Button>
    <Button type="button" size="sm" variant="ghost" onClick={() => setAvailable(false)} className="ml-2">Keep them separate</Button>
  </aside>
}
