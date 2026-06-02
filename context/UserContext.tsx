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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { data: p } = await supabase.from('users').select('*').eq('auth_user_id', user.id).single()
    setProfile(p ? { ...p, email: user.email ?? p.email } : null)
    setLoading(false)
  }

  useEffect(() => {
    load()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => load())
    return () => subscription.unsubscribe()
  }, [])

  return (
    <UserContext.Provider value={{ profile, loading, refresh: load }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => useContext(UserContext)
