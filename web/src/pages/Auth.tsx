import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { Alert, Button, Card, Field, Input } from '../components/ui'
import { IS_DEMO } from '../lib/demo'

function useAfterAuth() {
  const navigate = useNavigate()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/'
  return () => navigate(from, { replace: true })
}

function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-6 text-center font-display text-3xl font-bold">{title}</h1>
      <Card className="space-y-5">{children}</Card>
    </div>
  )
}

export function Login() {
  const { user, login } = useAuth()
  const done = useAfterAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<ApiError | null>(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(email, password)
      done()
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'Ha ocurrido un error inesperado.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard title="Entrar">
      {IS_DEMO && (
        <Alert tone="info">
          Cuentas de prueba (contraseña <code className="font-mono">cupula2026</code>):
          <br />
          socia: <code className="font-mono">socia@cupula.test</code> · coordinación: <code className="font-mono">admin@cupula.test</code>
        </Alert>
      )}
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Email" error={error?.errors.email?.[0]}>
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Contraseña" error={error?.errors.password?.[0]}>
          <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && !error.errors.email && !error.errors.password && <Alert>{error.message}</Alert>}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
      <p className="text-center text-sm text-muted">
        ¿Aún no tienes cuenta?{' '}
        <Link to="/registro" className="font-semibold text-accent hover:underline">
          Únete al club
        </Link>
      </p>
    </AuthCard>
  )
}

export function Register() {
  const { user, register } = useAuth()
  const done = useAfterAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' })
  const [error, setError] = useState<ApiError | null>(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [field]: e.target.value })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await register(form)
      done()
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, 'Ha ocurrido un error inesperado.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard title="Únete al club">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <Field label="Nombre" error={error?.errors.name?.[0]}>
          <Input autoComplete="name" required value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Email" error={error?.errors.email?.[0]}>
          <Input type="email" autoComplete="email" required value={form.email} onChange={set('email')} />
        </Field>
        <Field label="Contraseña" hint="Mínimo 8 caracteres, con letras y números." error={error?.errors.password?.[0]}>
          <Input type="password" autoComplete="new-password" required value={form.password} onChange={set('password')} />
        </Field>
        <Field label="Repite la contraseña">
          <Input type="password" autoComplete="new-password" required value={form.password_confirmation} onChange={set('password_confirmation')} />
        </Field>
        {error && Object.keys(error.errors).length === 0 && <Alert>{error.message}</Alert>}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? 'Creando cuenta…' : 'Crear cuenta'}
        </Button>
      </form>
      <p className="text-center text-sm text-muted">
        ¿Ya tienes cuenta?{' '}
        <Link to="/entrar" className="font-semibold text-accent hover:underline">
          Entra
        </Link>
      </p>
    </AuthCard>
  )
}
