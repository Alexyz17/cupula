import { http, HttpResponse } from 'msw'
import { API_URL } from '../api/client'
import type { Equipment, EquipmentType } from '../api/types'
import { addDays, clubTimeToIso, overlaps } from '../lib/time'
import type { DemoStore, StoredUser } from './db'

// Mismas reglas que config/cupula.php en la API.
const RULES = { slot: 30, minMinutes: 30, maxMinutes: 360, maxDaysAhead: 60, maxActive: 3 }
const TYPES: EquipmentType[] = ['telescope', 'mount', 'camera', 'binoculars', 'accessory']

const invalid = (field: string, message: string) =>
  HttpResponse.json({ message, errors: { [field]: [message] } }, { status: 422 })
const fail = (status: number, message: string) => HttpResponse.json({ message }, { status })

const iso = (d: Date) => d.toISOString().replace('.000Z', 'Z')

export function createHandlers(store: DemoStore) {
  const db = () => store.data

  const currentUser = (request: Request): StoredUser | null => {
    const token = request.headers.get('Authorization')?.replace(/^Bearer /, '')
    const id = token ? db().tokens[token] : undefined
    return db().users.find((u) => u.id === id) ?? null
  }

  const issueToken = (user: StoredUser) => {
    const token = `demo|${user.id}|${Math.random().toString(36).slice(2)}`
    db().tokens[token] = user.id
    store.save()
    return token
  }

  const url = (path: string) => `${API_URL}${path}`

  return [
    http.post(url('/auth/register'), async ({ request }) => {
      const body = (await request.json()) as Record<string, string>
      const errors: Record<string, string[]> = {}
      if (!body.name?.trim()) errors.name = ['Escribe tu nombre.']
      if (!/^\S+@\S+\.\S+$/.test(body.email ?? '')) errors.email = ['El email no es válido.']
      else if (db().users.some((u) => u.email === body.email)) errors.email = ['Ya existe una cuenta con este email.']
      if ((body.password ?? '').length < 8) errors.password = ['La contraseña debe tener al menos 8 caracteres.']
      else if (!/[a-zA-Z]/.test(body.password) || !/\d/.test(body.password)) errors.password = ['La contraseña debe incluir letras y números.']
      else if (body.password !== body.password_confirmation) errors.password = ['Las contraseñas no coinciden.']
      if (Object.keys(errors).length) return HttpResponse.json({ message: Object.values(errors)[0][0], errors }, { status: 422 })

      // El rol nunca viene de la petición.
      const user: StoredUser = { id: store.nextId(), name: body.name.trim(), email: body.email, role: 'member', password: body.password }
      db().users.push(user)
      return HttpResponse.json({ token: issueToken(user), user: store.publicUser(user) }, { status: 201 })
    }),

    http.post(url('/auth/login'), async ({ request }) => {
      const { email, password } = (await request.json()) as Record<string, string>
      const user = db().users.find((u) => u.email === email && u.password === password)
      if (!user) return invalid('email', 'El email o la contraseña no son correctos.')
      return HttpResponse.json({ token: issueToken(user), user: store.publicUser(user) })
    }),

    http.post(url('/auth/logout'), ({ request }) => {
      const token = request.headers.get('Authorization')?.replace(/^Bearer /, '')
      if (token) delete db().tokens[token]
      store.save()
      return new HttpResponse(null, { status: 204 })
    }),

    http.get(url('/me'), ({ request }) => {
      const user = currentUser(request)
      return user ? HttpResponse.json({ data: store.publicUser(user) }) : fail(401, 'Inicia sesión para continuar.')
    }),

    http.get(url('/equipment'), ({ request }) => {
      const params = new URL(request.url).searchParams
      const isAdmin = currentUser(request)?.role === 'admin'
      const showInactive = isAdmin && params.get('include_inactive') === '1'
      const type = params.get('type')
      const data = db()
        .equipment.filter((e) => (showInactive || e.is_active) && (!type || e.type === type))
        .sort((a, b) => TYPES.indexOf(a.type) - TYPES.indexOf(b.type) || a.name.localeCompare(b.name))
      return HttpResponse.json({ data })
    }),

    http.get(url('/equipment/:id'), ({ params, request }) => {
      const e = db().equipment.find((x) => x.id === Number(params.id))
      if (!e || (!e.is_active && currentUser(request)?.role !== 'admin')) return fail(404, 'No encontrado.')
      return HttpResponse.json({ data: e })
    }),

    http.get(url('/equipment/:id/availability'), ({ params, request }) => {
      const date = new URL(request.url).searchParams.get('date') ?? ''
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return invalid('date', 'El día debe tener el formato AAAA-MM-DD.')
      const e = db().equipment.find((x) => x.id === Number(params.id))
      if (!e?.is_active) return fail(404, 'No encontrado.')
      const dayStart = clubTimeToIso(date, '00:00')
      const dayEnd = clubTimeToIso(addDays(date, 1), '00:00')
      const busy = db()
        .reservations.filter((r) => r.equipment_id === e.id && r.status === 'confirmed' && overlaps(r.starts_at, r.ends_at, dayStart, dayEnd))
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
        .map(({ starts_at, ends_at }) => ({ starts_at, ends_at }))
      return HttpResponse.json({ data: { equipment_id: e.id, date, timezone: 'Europe/Madrid', slot_minutes: RULES.slot, busy } })
    }),

    http.post(url('/equipment'), async ({ request }) => {
      const user = currentUser(request)
      if (!user) return fail(401, 'Inicia sesión para continuar.')
      if (user.role !== 'admin') return fail(403, 'No tienes permiso para hacer esto.')
      const body = (await request.json()) as Partial<Equipment>
      if (!body.name?.trim()) return invalid('name', 'Escribe el nombre del equipo.')
      if (!body.type || !TYPES.includes(body.type)) return invalid('type', 'El tipo de equipo no es válido.')
      const e: Equipment = {
        id: store.nextId(),
        name: body.name.trim(),
        type: body.type,
        description: body.description ?? null,
        aperture_mm: body.aperture_mm ?? null,
        focal_length_mm: body.focal_length_mm ?? null,
        is_active: true,
      }
      db().equipment.push(e)
      store.save()
      return HttpResponse.json({ data: e }, { status: 201 })
    }),

    http.patch(url('/equipment/:id'), async ({ params, request }) => {
      const user = currentUser(request)
      if (!user) return fail(401, 'Inicia sesión para continuar.')
      if (user.role !== 'admin') return fail(403, 'No tienes permiso para hacer esto.')
      const e = db().equipment.find((x) => x.id === Number(params.id))
      if (!e) return fail(404, 'No encontrado.')
      Object.assign(e, (await request.json()) as Partial<Equipment>, { id: e.id })
      store.save()
      return HttpResponse.json({ data: e })
    }),

    http.get(url('/reservations'), ({ request }) => {
      const user = currentUser(request)
      if (!user) return fail(401, 'Inicia sesión para continuar.')
      const p = new URL(request.url).searchParams
      const scope = p.get('scope') ?? 'mine'
      if (scope === 'all' && user.role !== 'admin') return fail(403, 'No tienes permiso para hacer esto.')
      const from = p.get('from')
      const status = p.get('status')
      const list = db()
        .reservations.filter(
          (r) =>
            (scope === 'all' || r.user_id === user.id) &&
            (!status || r.status === status) &&
            (!from || new Date(r.ends_at) > new Date(from)),
        )
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
        .map((r) => store.toReservation(r))
      return HttpResponse.json({ data: list, meta: { current_page: 1, last_page: 1, per_page: 50, total: list.length } })
    }),

    http.post(url('/reservations'), async ({ request }) => {
      const user = currentUser(request)
      if (!user) return fail(401, 'Inicia sesión para continuar.')
      const body = (await request.json()) as { equipment_id: number; starts_at: string; ends_at: string; notes?: string }
      const start = new Date(body.starts_at)
      const end = new Date(body.ends_at)
      const minutes = (end.getTime() - start.getTime()) / 60000

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return invalid('starts_at', 'La fecha no es válida.')
      if (minutes <= 0) return invalid('ends_at', 'La reserva tiene que terminar después de empezar.')
      if (start.getUTCMinutes() % RULES.slot || end.getUTCMinutes() % RULES.slot || start.getUTCSeconds() || end.getUTCSeconds())
        return invalid('starts_at', `Las reservas empiezan y terminan en franjas de ${RULES.slot} minutos.`)
      if (start.getTime() <= Date.now()) return invalid('starts_at', 'La reserva tiene que empezar en el futuro.')
      if (start.getTime() > Date.now() + RULES.maxDaysAhead * 86400000)
        return invalid('starts_at', `Solo se puede reservar con ${RULES.maxDaysAhead} días de antelación como máximo.`)
      if (minutes < RULES.minMinutes) return invalid('ends_at', `La reserva debe durar al menos ${RULES.minMinutes} minutos.`)
      if (minutes > RULES.maxMinutes) return invalid('ends_at', `La reserva no puede durar más de ${RULES.maxMinutes / 60} horas.`)

      const e = db().equipment.find((x) => x.id === Number(body.equipment_id))
      if (!e) return invalid('equipment_id', 'El equipo no existe.')
      if (!e.is_active) return invalid('equipment_id', 'Este equipo no está disponible para reservas.')

      const now = new Date()
      const active = db().reservations.filter((r) => r.user_id === user.id && r.status === 'confirmed' && new Date(r.ends_at) > now)
      if (user.role !== 'admin' && active.length >= RULES.maxActive)
        return invalid('starts_at', `Ya tienes ${RULES.maxActive} reservas activas. Cancela alguna antes de hacer otra.`)

      const startsAt = iso(start)
      const endsAt = iso(end)
      const clash = db().reservations.some(
        (r) => r.equipment_id === e.id && r.status === 'confirmed' && overlaps(r.starts_at, r.ends_at, startsAt, endsAt),
      )
      if (clash) return invalid('starts_at', 'El equipo ya está reservado en esa franja.')

      const reservation = {
        id: store.nextId(),
        user_id: user.id,
        equipment_id: e.id,
        starts_at: startsAt,
        ends_at: endsAt,
        status: 'confirmed' as const,
        notes: body.notes?.trim() || null,
        cancelled_at: null,
        created_at: iso(now),
      }
      db().reservations.push(reservation)
      store.save()
      return HttpResponse.json({ data: store.toReservation(reservation) }, { status: 201 })
    }),

    http.post(url('/reservations/:id/cancel'), ({ params, request }) => {
      const user = currentUser(request)
      if (!user) return fail(401, 'Inicia sesión para continuar.')
      const r = db().reservations.find((x) => x.id === Number(params.id))
      if (!r) return fail(404, 'No encontrado.')
      if (user.role !== 'admin' && r.user_id !== user.id) return fail(403, 'No tienes permiso para hacer esto.')
      if (r.status === 'cancelled') return invalid('reservation', 'La reserva ya estaba cancelada.')
      if (new Date(r.starts_at).getTime() <= Date.now()) return invalid('reservation', 'No se puede cancelar una reserva que ya ha empezado.')
      r.status = 'cancelled'
      r.cancelled_at = iso(new Date())
      store.save()
      return HttpResponse.json({ data: store.toReservation(r) })
    }),
  ]
}
