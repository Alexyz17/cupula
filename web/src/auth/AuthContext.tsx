import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { api, tokenStore } from '../api/client'
import type { AuthResponse, User } from '../api/types'
import { AuthContext, type AuthState } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(() => Boolean(tokenStore.get()))
  const qc = useQueryClient()

  // Si hay un token guardado, recupera el usuario. Si ha caducado, la API responde 401 y se borra.
  useEffect(() => {
    if (!tokenStore.get()) return
    api<{ data: User }>('/me')
      .then((r) => setUser(r.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const start = useCallback(
    (r: AuthResponse) => {
      tokenStore.set(r.token)
      setUser(r.user)
      qc.removeQueries({ queryKey: ['reservations'] })
      return r.user
    },
    [qc],
  )

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      login: (email, password) => api<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } }).then(start),
      register: (data) => api<AuthResponse>('/auth/register', { method: 'POST', body: data }).then(start),
      logout: async () => {
        await api('/auth/logout', { method: 'POST' }).catch(() => undefined)
        tokenStore.set(null)
        setUser(null)
        qc.removeQueries({ queryKey: ['reservations'] })
      },
    }),
    [user, loading, start, qc],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
