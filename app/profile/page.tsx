'use client'

import { useAuth } from '@/app/contexts/auth-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { User, Mail, Calendar, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

interface ProfileData {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

class ProfileRequestError extends Error {
  constructor(public status: number, message: string) { super(message) }
}

async function readProfile(response: Response, ownerId: string): Promise<ProfileData> {
  const body = await response.json().catch(() => null) as { profile?: ProfileData; error?: string } | null
  if (!response.ok) {
    const message = response.status === 401 ? 'Your session has ended. Sign in again to access your profile.'
      : response.status === 403 ? 'Your AZ Labs account does not currently have Research access.'
      : response.status === 404 ? 'Your Research profile is not available yet. Contact AZ Labs support.'
      : response.status === 429 ? 'Your Research limit has been reached. Try again after it resets.'
      : response.status === 400 ? body?.error || 'Check your display name and avatar URL.'
      : 'We cannot check Research access right now. Try again shortly.'
    throw new ProfileRequestError(response.status, message)
  }
  if (!body?.profile || body.profile.id !== ownerId) throw new ProfileRequestError(503, 'Your Research profile could not be confirmed. Try again shortly.')
  return body.profile
}

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState<ProfileRequestError | null>(null)
  const [retry, setRetry] = useState(0)
  const requestVersion = useRef(0)
  const ownerId = user?.id

  const [formData, setFormData] = useState({
    full_name: '',
    avatar_url: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const version = ++requestVersion.current
    const controller = new AbortController()
    setProfile(null)
    setProfileError(null)
    setFormData({ full_name: '', avatar_url: '' })
    setSaving(false)
    if (loading || !ownerId) {
      setProfileLoading(false)
      return () => controller.abort()
    }
    setProfileLoading(true)
    void (async () => {
      try {
        const response = await fetch('/api/account/profile', { cache: 'no-store', credentials: 'same-origin', signal: controller.signal })
        const data = await readProfile(response, ownerId)
        if (controller.signal.aborted || requestVersion.current !== version) return
        setProfile(data)
        setFormData({ full_name: data.full_name || '', avatar_url: data.avatar_url || '' })
      } catch (error) {
        if (controller.signal.aborted || requestVersion.current !== version) return
        setProfileError(error instanceof ProfileRequestError ? error : new ProfileRequestError(503, 'Your Research profile could not be loaded. Try again shortly.'))
      } finally {
        if (!controller.signal.aborted && requestVersion.current === version) setProfileLoading(false)
      }
    })()
    return () => controller.abort()
  }, [ownerId, loading, retry])

  const handleSave = async () => {
    if (!ownerId || !profile || profile.id !== ownerId) return
    const version = requestVersion.current

    try {
      setSaving(true)
      const response = await fetch('/api/account/profile', {
        method: 'PATCH', cache: 'no-store', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: formData.full_name.trim() || null, avatar_url: formData.avatar_url.trim() || null }),
      })
      const data = await readProfile(response, ownerId)
      if (requestVersion.current !== version) return
      setProfile(data)
      setFormData({ full_name: data.full_name || '', avatar_url: data.avatar_url || '' })
      toast.success('Profile updated.')
    } catch (error) {
      if (requestVersion.current !== version) return
      const denied = error instanceof ProfileRequestError ? error : new ProfileRequestError(503, 'Your profile update could not be confirmed. Try again shortly.')
      if (denied.status !== 400) {
        setProfile(null)
        setFormData({ full_name: '', avatar_url: '' })
        setProfileError(denied)
      }
      toast.error(denied.message)
    } finally {
      if (requestVersion.current === version) setSaving(false)
    }
  }

  if (loading || profileLoading) {
    return (
      <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary-accent)]" aria-hidden="true" />
        <span role="status" className="sr-only">Loading your profile.</span>
      </div>
    )
  }

  if (profileError || !profile || profile.id !== ownerId) {
    return (
      <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center px-4">
        <Card className="surface-panel max-w-md rounded-[var(--radius-card)] p-8 text-center">
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-[var(--on-surface)]">Profile unavailable</h1>
          <p role="alert" className="mb-6 text-sm text-[var(--on-surface-variant)]">{profileError?.message || 'Your Research profile could not be confirmed.'}</p>
          <div className="flex flex-wrap justify-center gap-3">
            {profileError?.status === 401 ? <Button asChild><Link href="/auth/login?next=/profile">Sign in</Link></Button>
              : profileError?.status === 403 ? <Button asChild><a href="https://azlabs.ai/account">Review AZ Labs access</a></Button>
              : <Button onClick={() => setRetry((value) => value + 1)}>Try again</Button>}
            <Button asChild variant="outline"><a href="https://azlabs.ai/contact">Contact support</a></Button>
          </div>
        </Card>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center px-4">
        <Card className="surface-panel max-w-md rounded-[var(--radius-card)] p-8 text-center animate-fade-up">
          <h1 className="mb-2 text-2xl font-semibold tracking-tight text-[var(--on-surface)]">Access Denied</h1>
          <p className="mb-6 text-sm text-[var(--on-surface-variant)]">
            You need to be signed in to access your profile.
          </p>
          <Button asChild>
            <Link href="/auth/login?next=/profile">Sign In</Link>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 animate-fade-up">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--on-surface)]">
            Profile Settings
          </h1>
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
        <p className="text-[var(--on-surface-variant)]">
          Manage your personal information and preferences
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="surface-panel rounded-[var(--radius-card)] p-6 animate-fade-up" style={{ animationDelay: '60ms' }}>
            <h2 className="mb-6 text-xl font-semibold tracking-tight text-[var(--on-surface)]">
              Personal Information
            </h2>

            <div className="space-y-6">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-[var(--on-surface)]">
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  disabled
                />
                <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
                  Email comes from your AZ Labs account and can&apos;t be changed here.
                </p>
              </div>

              <div>
                <label htmlFor="full_name" className="mb-2 block text-sm font-medium text-[var(--on-surface)]">
                  Full Name
                </label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.full_name}
                  maxLength={200}
                  onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                />
              </div>

              <div>
                <label htmlFor="avatar_url" className="mb-2 block text-sm font-medium text-[var(--on-surface)]">
                  Avatar URL
                </label>
                <Input
                  id="avatar_url"
                  type="url"
                  placeholder="https://example.com/avatar.jpg"
                  value={formData.avatar_url}
                  maxLength={2048}
                  onChange={(e) => setFormData(prev => ({ ...prev, avatar_url: e.target.value }))}
                />
                <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
                  Optional: Link to your profile picture
                </p>
              </div>

              <div className="pt-4">
                <Button onClick={() => void handleSave()} loading={saving} disabled={saving} className="w-full sm:w-auto">
                  {saving ? (
                    'Saving...'
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div>
          <Card className="surface-panel rounded-[var(--radius-card)] p-6 animate-fade-up" style={{ animationDelay: '120ms' }}>
            <h3 className="mb-4 text-lg font-semibold tracking-tight text-[var(--on-surface)]">
              Account Overview
            </h3>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {formData.avatar_url ? (
                  <img
                    src={formData.avatar_url}
                    alt="Avatar"
                    className="h-12 w-12 rounded-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                      const sibling = e.currentTarget.nextElementSibling as HTMLElement
                      if (sibling) {
                        sibling.style.display = 'flex'
                      }
                    }}
                  />
                ) : null}
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--primary-accent)_14%,transparent)]"
                  style={{ display: formData.avatar_url ? 'none' : 'flex' }}
                >
                  <User className="h-6 w-6 text-[var(--primary-accent)]" />
                </div>
                <div>
                  <p className="font-medium text-[var(--on-surface)]">
                    {formData.full_name || user.email?.split('@')[0]}
                  </p>
                  <p className="text-sm text-[var(--on-surface-variant)]">
                    {user.email}
                  </p>
                </div>
              </div>

              <div className="border-t border-[hsl(var(--border))] pt-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-[var(--on-surface-variant)]" />
                    <span className="text-[var(--on-surface-variant)]">
                      Member since {new Date(user.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-[var(--on-surface-variant)]" />
                    <span className="text-[var(--on-surface-variant)]">
                      {user.email_confirmed_at ? 'Email verified' : 'Email not verified'}
                    </span>
                  </div>
                </div>
              </div>

              {profile && (
                <div className="border-t border-[hsl(var(--border))] pt-4">
                  <p className="text-xs text-[var(--on-surface-variant)]">
                    Profile last updated: {new Date(profile.updated_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
