'use client'

import { useAuth } from '@/app/contexts/auth-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { User, Mail, Calendar, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface ProfileData {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export default function ProfilePage() {
  const { user, loading } = useAuth()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  const [formData, setFormData] = useState({
    full_name: '',
    avatar_url: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      void fetchProfile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const fetchProfile = async () => {
    if (!user) return

    try {
      setProfileLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist, create one
          const newProfile = {
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
            avatar_url: user.user_metadata?.avatar_url || null,
          }

          const { data: insertedProfile, error: insertError } = await supabase
            .from('profiles')
            .insert(newProfile)
            .select()
            .single()

          if (insertError) throw insertError
          setProfile(insertedProfile)
          setFormData({
            full_name: insertedProfile.full_name || '',
            avatar_url: insertedProfile.avatar_url || ''
          })
        } else {
          throw error
        }
      } else {
        setProfile(data)
        setFormData({
          full_name: data.full_name || '',
          avatar_url: data.avatar_url || ''
        })
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
      toast.error('Failed to load profile data')
    } finally {
      setProfileLoading(false)
    }
  }

  const handleSave = async () => {
    if (!user || !profile) return

    try {
      setSaving(true)
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name || null,
          avatar_url: formData.avatar_url || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      // Update local state
      setProfile(prev => prev ? {
        ...prev,
        full_name: formData.full_name || null,
        avatar_url: formData.avatar_url || null,
        updated_at: new Date().toISOString()
      } : null)

      toast.success('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading || profileLoading) {
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
                  value={user.email || ''}
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
