'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

type UserProfile = {
  id: string
  full_name: string
  role: string
  language: string
  email: string
  active: boolean
  avatar_url: string | null
}

type UserContextType = {
  profile: UserProfile | null
  loading: boolean
  refresh: () => void
}

const UserContext = createContext<UserContextType>({ profile: null, loading: true, refresh: () => {} })

export function UserProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      // Always refresh session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        setProfile(null)
        setLoading(false)
        return
      }

      // Refresh token if needed
      if (session.expires_at && session.expires_at * 1000 < Date.now() + 60000) {
        await supabase.auth.refreshSession()
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setProfile(null); setLoading(false); return }

      const { data: p, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()

      if (error || !p) {
        setProfile(null)
        setLoading(false)
        return
      }

      setProfile({ ...p, email: user.email ?? p.email })
    } catch (e) {
      console.error('UserContext load error:', e)
      setProfile(null)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setProfile(null)
        setLoading(false)
        window.location.href = '/login'
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        load()
      }
    })

    // Refresh session every 4 minutes to prevent expiry
    const interval = setInterval(() => {
      supabase.auth.refreshSession()
    }, 4 * 60 * 1000)

    return () => {
      subscription.unsubscribe()
      clearInterval(interval)
    }
  }, [])

  return (
    <UserContext.Provider value={{ profile, loading, refresh: load }}>
      {loading ? (
        <div style={{
          position: 'fixed', inset: 0, background: '#f9f7f5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{ textAlign: 'center' }}>
            <img src="/logo.png" alt="TP Translator" style={{ width: '100px', marginBottom: '24px', opacity: 0.8 }} />
            <div style={{
              width: '32px', height: '32px', border: '2px solid #f0e9e5',
              borderTopColor: '#ce0100', borderRadius: '50%',
              animation: 'spin 0.8s linear infinite', margin: '0 auto',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        </div>
      ) : (
        children
      )}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)