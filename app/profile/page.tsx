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
  const [saving, setSaving] = useState(false)
  
  const [formData, setFormData] = useState({
    full_name: '',
    avatar_url: ''
  })

  useEffect(() => {
    if (user) {
      fetchProfile()
    }
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <Card className="max-w-md p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            You need to be signed in to access your profile.
          </p>
          <Button asChild>
            <Link href="/auth/login">Sign In</Link>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
              Profile Settings
            </h1>
            <Button asChild variant="outline">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your personal information and preferences
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
                Personal Information
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Email Address
                  </label>
                  <Input
                    id="email"
                    type="email"
                    value={user.email || ''}
                    disabled
                    className="bg-slate-100 dark:bg-slate-800"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Email cannot be changed. Contact support if you need to update your email.
                  </p>
                </div>

                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
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
                  <label htmlFor="avatar_url" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Avatar URL
                  </label>
                  <Input
                    id="avatar_url"
                    type="url"
                    placeholder="https://example.com/avatar.jpg"
                    value={formData.avatar_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, avatar_url: e.target.value }))}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Optional: Link to your profile picture
                  </p>
                </div>

                <div className="pt-4">
                  <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          <div>
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900" 
                       style={{ display: formData.avatar_url ? 'none' : 'flex' }}>
                    <User className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {formData.full_name || user.email?.split('@')[0]}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600 dark:text-slate-400">
                        Member since {new Date(user.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long'
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-600 dark:text-slate-400">
                        Email verified
                      </span>
                    </div>
                  </div>
                </div>

                {profile && (
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
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
    </div>
  )
}