import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { applyTheme, currentTheme, THEMES, type Theme } from '../lib/theme'
import { IS_DEMO } from '../lib/demo'

export function Logo() {
  return (
    <svg viewBox="0 0 64 64" className="h-8 w-8" aria-hidden="true">
      <path d="M14 44a18 18 0 0 1 36 0z" fill="var(--surface-2)" stroke="var(--accent)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M32 26v18" stroke="var(--bg)" strokeWidth="4" />
      <path d="M12 44h40" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
      <path d="M46 12l1.8 4.2L52 18l-4.2 1.8L46 24l-1.8-4.2L40 18l4.2-1.8z" fill="var(--accent)" />
    </svg>
  )
}

function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>(currentTheme)
  return (
    <div role="radiogroup" aria-label="Tema" className="flex rounded-lg border border-line p-0.5">
      {THEMES.map((t) => (
        <button
          key={t.id}
          role="radio"
          aria-checked={theme === t.id}
          title={t.hint}
          onClick={() => {
            applyTheme(t.id)
            setTheme(t.id)
          }}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${theme === t.id ? 'bg-accent text-accent-ink' : 'text-muted hover:text-ink'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

const navClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium transition ${isActive ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink'}`

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col">
      {IS_DEMO && (
        <p className="bg-accent px-4 py-1.5 text-center text-xs font-medium text-accent-ink">
          Demo: la API se simula en tu navegador y los datos se guardan solo aquí. Cuentas de prueba en «Entrar».
        </p>
      )}
      <header className="border-b border-line/70 bg-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="font-display text-xl font-bold tracking-tight">Cúpula</span>
          </Link>
          <nav aria-label="Principal" className="flex flex-wrap gap-1">
            <NavLink to="/" end className={navClass}>
              Equipos
            </NavLink>
            {user && (
              <NavLink to="/mis-reservas" className={navClass}>
                Mis reservas
              </NavLink>
            )}
            {user?.role === 'admin' && (
              <NavLink to="/admin" className={navClass}>
                Coordinación
              </NavLink>
            )}
          </nav>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <ThemeSwitch />
            {user ? (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted">{user.name}</span>
                <button
                  className="font-medium text-accent hover:underline"
                  onClick={async () => {
                    await logout()
                    navigate('/')
                  }}
                >
                  Salir
                </button>
              </div>
            ) : (
              <Link to="/entrar" className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink">
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <Outlet />
      </main>

      <footer className="border-t border-line/70 py-6 text-center text-xs text-muted">
        Cúpula · reservas para clubs de astronomía · hecho por{' '}
        <a className="text-accent hover:underline" href="https://alexvillar10.gitlab.io/" target="_blank" rel="noreferrer">
          Alex Villar
        </a>
      </footer>
    </div>
  )
}
