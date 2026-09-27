'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/contexts/auth-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, Search, Clock, TrendingUp, RotateCcw, Trash2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { clearSearchHistory, getSearchHistory, getSearchStats } from '@/lib/search-history'
import type { SearchHistoryEntry, SearchStats } from '@/lib/search-history'
import { toast } from 'sonner'

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [history, setHistory] = useState<SearchHistoryEntry[]>([])
  const [stats, setStats] = useState<SearchStats>({ total: 0, thisMonth: 0, lastAt: null })

  useEffect(() => {
    setHistory(getSearchHistory())
    setStats(getSearchStats())
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary-accent)]" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center px-4">
        <Card className="surface-panel max-w-md rounded-[var(--radius-card)] p-8 text-center animate-fade-up">
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-[var(--on-surface)]">Access Denied</h1>
          <p className="mb-6 text-sm text-[var(--on-surface-variant)]">
            You need to be signed in to access your dashboard.
          </p>
          <Button asChild>
            <Link href="/auth/login?next=/dashboard">Sign In</Link>
          </Button>
        </Card>
      </div>
    )
  }

  const handleClearHistory = () => {
    clearSearchHistory()
    setHistory([])
    setStats(getSearchStats())
    toast.success('Search history cleared')
  }

  const statCards = [
    {
      label: 'Total Searches',
      value: String(stats.total),
      icon: Search,
    },
    {
      label: 'This Month',
      value: String(stats.thisMonth),
      icon: TrendingUp,
    },
    {
      label: 'Last Search',
      value: stats.lastAt ? formatRelative(stats.lastAt) : 'Never',
      icon: Clock,
    },
    {
      label: 'Account Status',
      value: 'Active',
      icon: User,
      accent: true,
    },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 animate-fade-up">
        <h1 className="mb-2 text-3xl font-semibold tracking-tight text-[var(--on-surface)]">
          Welcome back, {user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0]}!
        </h1>
        <p className="text-[var(--on-surface-variant)]">
          Here&apos;s an overview of your AZ Labs Research activity
        </p>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card
            key={stat.label}
            className="surface-panel rounded-[var(--radius-card)] p-6 animate-fade-up"
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[var(--on-surface-variant)]">{stat.label}</p>
                <p
                  className={`text-2xl font-semibold tracking-tight ${
                    stat.accent ? 'text-[var(--success)]' : 'text-[var(--on-surface)]'
                  }`}
                >
                  {stat.value}
                </p>
              </div>
              <stat.icon className="h-8 w-8 text-[var(--primary-accent)]" />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="surface-panel rounded-[var(--radius-card)] p-6 animate-fade-up" style={{ animationDelay: '120ms' }}>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-[var(--on-surface)]">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/">
                <Search className="mr-2 h-4 w-4" />
                New Search
              </Link>
            </Button>
            <Button asChild className="w-full justify-start" variant="outline">
              <Link href="/profile">
                <User className="mr-2 h-4 w-4" />
                Edit Profile
              </Link>
            </Button>
          </div>
        </Card>

        <Card className="surface-panel rounded-[var(--radius-card)] p-6 animate-fade-up" style={{ animationDelay: '180ms' }}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold tracking-tight text-[var(--on-surface)]">
              Recent Searches
            </h2>
            {history.length > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={handleClearHistory}>
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
          {history.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-[var(--on-surface-variant)]">
                No searches yet
              </p>
              <p className="mt-2 text-sm text-[var(--on-surface-variant)]">
                Run your first search to see it here
              </p>
              <Button asChild className="mt-4" variant="outline">
                <Link href="/">Start researching</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-2">
              {history.slice(0, 8).map((entry) => (
                <li key={`${entry.at}-${entry.query}`}>
                  <button
                    type="button"
                    onClick={() => router.push(`/?q=${encodeURIComponent(entry.query)}`)}
                    className="focus-ring group flex w-full items-center gap-3 rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[var(--surface-container-low)] px-3 py-2 text-left transition-colors duration-[var(--duration-fast)] hover:border-[color-mix(in_srgb,var(--primary-accent)_35%,transparent)]"
                    title={`Re-run: ${entry.query}`}
                  >
                    <RotateCcw className="h-3.5 w-3.5 shrink-0 text-[var(--on-surface-variant)] transition-transform duration-[var(--duration-base)] ease-[var(--ease-standard)] group-hover:-rotate-180" />
                    <span className="min-w-0 flex-1 truncate text-sm text-[var(--on-surface)]">
                      {entry.query}
                    </span>
                    <span className="shrink-0 text-xs text-[var(--on-surface-variant)]">
                      {entry.sourceCount > 0 ? `${entry.sourceCount} sources · ` : ''}
                      {formatRelative(entry.at)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4">
        <Card className="surface-panel rounded-[var(--radius-card)] p-6 animate-fade-up" style={{ animationDelay: '240ms' }}>
          <h2 className="mb-4 text-xl font-semibold tracking-tight text-[var(--on-surface)]">
            Account Information
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-1 text-sm font-medium text-[var(--on-surface-variant)]">Email</p>
              <p className="text-[var(--on-surface)]">{user.email}</p>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-[var(--on-surface-variant)]">Member Since</p>
              <p className="text-[var(--on-surface)]">
                {new Date(user.created_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-[var(--on-surface-variant)]">Last Sign In</p>
              <p className="text-[var(--on-surface)]">
                {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }) : 'N/A'}
              </p>
            </div>
            <div>
              <p className="mb-1 text-sm font-medium text-[var(--on-surface-variant)]">Sign-in Method</p>
              <p className="text-[var(--on-surface)]">
                {user.app_metadata?.provider === 'custom' || (user.app_metadata?.providers as string[] | undefined)?.some((p) => p.startsWith('custom:'))
                  ? 'AZ Labs account'
                  : user.app_metadata?.provider
                    ? `Supabase (${user.app_metadata.provider})`
                    : 'AZ Labs account'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
