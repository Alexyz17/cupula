export type Theme = 'night' | 'red' | 'day'

export const THEMES: { id: Theme; label: string; hint: string }[] = [
  { id: 'night', label: 'Noche', hint: 'Tema oscuro' },
  { id: 'red', label: 'Visión nocturna', hint: 'Todo en rojo para no perder la adaptación a la oscuridad mientras observas' },
  { id: 'day', label: 'Día', hint: 'Tema claro' },
]

export function currentTheme(): Theme {
  const t = document.documentElement.dataset.theme
  return t === 'red' || t === 'day' ? t : 'night'
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  const color = { night: '#0a0f1f', red: '#0a0000', day: '#f6f7fb' }[theme]
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color)
  try {
    localStorage.setItem('cupula-theme', theme)
  } catch {
    // Sin almacenamiento: el tema dura lo que la pestaña.
  }
}
