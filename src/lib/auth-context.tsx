'use client'
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'

export interface SessionUser {
  id: string
  email: string
  fullName: string
  role: string
  facilityId: string | null
  facilityName?: string | null
  facilityType?: string | null
}

interface AuthCtx {
  user: SessionUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const Ctx = createContext<AuthCtx>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      setUser(data.user ?? null)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error ?? 'Login failed' }
    setUser(data.user)
    return { ok: true }
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
    if (typeof window !== 'undefined') window.location.hash = ''
  }, [])

  return <Ctx.Provider value={{ user, loading, login, logout, refresh }}>{children}</Ctx.Provider>
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
