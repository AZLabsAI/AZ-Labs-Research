'use client'

import { useAuth } from '@/app/contexts/auth-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, Search, Clock, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { user, loading } = useAuth()

  if (loading) {
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
            You need to be signed in to access your dashboard.
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
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Welcome back, {user.user_metadata?.full_name || user.email?.split('@')[0]}!
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Here's an overview of your AZ Labs Research activity
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Searches</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">0</p>
              </div>
              <Search className="h-8 w-8 text-purple-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">This Month</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">0</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Last Search</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">Never</p>
              </div>
              <Clock className="h-8 w-8 text-green-600" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Account Status</p>
                <p className="text-2xl font-bold text-green-600">Active</p>
              </div>
              <User className="h-8 w-8 text-orange-600" />
            </div>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
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

          <Card className="p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Recent Activity
            </h2>
            <div className="text-center py-8">
              <p className="text-slate-500 dark:text-slate-400">
                No recent activity to display
              </p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">
                Start searching to see your activity here
              </p>
            </div>
          </Card>
        </div>

        <div className="mt-8">
          <Card className="p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
              Account Information
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Email</p>
                <p className="text-slate-900 dark:text-slate-100">{user.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Member Since</p>
                <p className="text-slate-900 dark:text-slate-100">
                  {new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Last Sign In</p>
                <p className="text-slate-900 dark:text-slate-100">
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
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">User ID</p>
                <p className="text-slate-900 dark:text-slate-100 font-mono text-xs">
                  {user.id.substring(0, 8)}...
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}