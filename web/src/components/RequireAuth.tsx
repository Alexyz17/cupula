import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { Loading } from './ui'

/** Protege una ruta. La API vuelve a comprobar los permisos: esto solo evita mostrar pantallas inútiles. */
export default function RequireAuth({ admin = false, children }: { admin?: boolean; children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <Loading />
  if (!user) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />
  return children
}
