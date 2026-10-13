import { IS_DEMO } from '../lib/demo'

const TOKEN_KEY = 'cupula-token'

// En la demo la API simulada vive en el mismo origen que la web (/cupula/api/v1): el navegador nunca llama a
// localhost, que en una web pública dispararía el aviso de acceso a la red local.
const DEFAULT_API = IS_DEMO ? `${import.meta.env.BASE_URL}api/v1` : 'http://localhost:8000/api/v1'

export const API_URL = (import.meta.env.VITE_API_URL ?? DEFAULT_API).replace(/\/$/, '')

/** Error de la API con el formato de Laravel: { message, errors: { campo: [mensajes] } }. */
export class ApiError extends Error {
  readonly status: number
  readonly errors: Record<string, string[]>

  constructor(status: number, message: string, errors: Record<string, string[]> = {}) {
    super(message)
    this.status = status
    this.errors = errors
  }

  /** Primer mensaje de un campo, o el mensaje general. */
  first(field?: string): string {
    return (field && this.errors[field]?.[0]) || Object.values(this.errors)[0]?.[0] || this.message
  }
}

export const tokenStore = {
  get(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY)
    } catch {
      return null
    }
  },
  set(token: string | null) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token)
      else localStorage.removeItem(TOKEN_KEY)
    } catch {
      // Sin almacenamiento (modo privado): la sesión dura lo que la pestaña.
    }
  },
}

type Query = Record<string, string | number | boolean | undefined | null>

export async function api<T>(path: string, init: { method?: string; body?: unknown; query?: Query } = {}): Promise<T> {
  const url = new URL(API_URL + path, window.location.origin)
  for (const [key, value] of Object.entries(init.query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }

  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = tokenStore.get()
  if (token) headers.Authorization = `Bearer ${token}`
  if (init.body !== undefined) headers['Content-Type'] = 'application/json'

  let response: Response
  try {
    response = await fetch(url, {
      method: init.method ?? 'GET',
      headers,
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    })
  } catch {
    throw new ApiError(0, 'No se puede conectar con el servidor. Revisa tu conexión.')
  }

  if (response.status === 204) return undefined as T

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    if (response.status === 401) tokenStore.set(null)
    throw new ApiError(response.status, data.message ?? 'Ha ocurrido un error inesperado.', data.errors)
  }
  return data as T
}
