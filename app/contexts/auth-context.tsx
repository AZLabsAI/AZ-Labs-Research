'use client'

import { Fragment, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

interface VerifiedAccess {
  subject: string
  tier: string
  allowed: boolean
  limits: { daily: number; monthly: number | null }
}

interface AuthContextType {
  user: User | null
  session: Session | null
  subject: string | null
  access: VerifiedAccess | null
  authError: string | null
  loading: boolean
  signOut: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null, session: null, subject: null, access: null, authError: null,
  loading: true, signOut: async () => {}, refresh: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [access, setAccess] = useState<VerifiedAccess | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const generation = useRef(0)
  const localUserId = useRef<string | null>(null)

  const clearIdentity = useCallback(() => {
    setUser(null)
    setSession(null)
    setAccess(null)
    localUserId.current = null
  }, [])

  const refresh = useCallback(async () => {
    const version = ++generation.current
    try {
      const { data: { session: candidate } } = await supabase.auth.getSession()
      if (version !== generation.current) return
      if (!candidate) {
        clearIdentity()
        setAuthError(null)
        return
      }
      if (localUserId.current !== candidate.user.id) clearIdentity()
      localUserId.current = candidate.user.id
      const response = await fetch('/api/auth/session', { cache: 'no-store' })
      const result = await response.json()
      if (version !== generation.current) return
      if (!response.ok || result.allowed !== true || typeof result.subject !== 'string') {
        clearIdentity()
        setAuthError(response.status === 401 ? null : result.error || 'Research access is unavailable.')
        return
      }
      setUser(candidate.user)
      setSession(candidate)
      setAccess(result)
      setAuthError(null)
    } catch {
      if (version === generation.current) {
        clearIdentity()
        setAuthError('Research access is temporarily unavailable.')
      }
    } finally {
      if (version === generation.current) setLoading(false)
    }
  }, [clearIdentity])

  useEffect(() => {
    void refresh()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, candidate) => {
      if (event === 'SIGNED_OUT' || (candidate && localUserId.current !== candidate.user.id)) {
        generation.current += 1
        clearIdentity()
      }
      // Avoid awaiting another auth operation while Supabase holds its auth lock.
      setTimeout(() => void refresh(), 0)
    })
    const onFocus = () => void refresh()
    const onVisibility = () => { if (document.visibilityState === 'visible') void refresh() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    const interval = setInterval(() => { if (document.visibilityState === 'visible') void refresh() }, 60000)
    return () => {
      generation.current += 1
      subscription.unsubscribe()
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [clearIdentity, refresh])

  const signOut = useCallback(async () => {
    const response = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
    const result = await response.json()
    if (!response.ok || typeof result.redirectTo !== 'string') throw new Error(result.error || 'Sign-out could not complete.')
    generation.current += 1
    clearIdentity()
    const destination = new URL(result.redirectTo)
    if (destination.origin !== 'https://azlabs.ai') throw new Error('Invalid AZ Labs logout destination.')
    window.location.assign(destination.toString())
  }, [clearIdentity])

  return <AuthContext.Provider value={{
    user, session, subject: access?.subject ?? null, access, authError, loading, signOut, refresh,
  }}><Fragment key={access?.subject ?? 'signed-out'}>{children}</Fragment></AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
