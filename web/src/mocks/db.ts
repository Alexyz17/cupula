import type { Equipment, EquipmentType, Reservation, ReservationStatus, User } from '../api/types'
import { addDays, clubTimeToIso, clubToday } from '../lib/time'

export interface StoredUser extends User {
  password: string
}

export interface StoredReservation {
  id: number
  user_id: number
  equipment_id: number
  starts_at: string
  ends_at: string
  status: ReservationStatus
  notes: string | null
  cancelled_at: string | null
  created_at: string
}

export interface DemoData {
  users: StoredUser[]
  equipment: Equipment[]
  reservations: StoredReservation[]
  tokens: Record<string, number>
  seq: number
}

const CATALOG: [string, EquipmentType, number | null, number | null, string][] = [
  ['Dobson 254/1200', 'telescope', 254, 1200, 'Gran apertura para cielo profundo: galaxias, nebulosas y cúmulos. Montura altacimutal, fácil de usar.'],
  ['Refractor apocromático 80/480', 'telescope', 80, 480, 'Ligero y con colores fieles. Ideal para empezar y para astrofotografía de campo amplio.'],
  ['Schmidt-Cassegrain 203/2032', 'telescope', 203, 2032, 'Mucha focal en poco tubo: Luna, planetas y estrellas dobles.'],
  ['Montura ecuatorial EQ6', 'mount', null, null, 'Montura motorizada con seguimiento para sesiones largas y fotografía.'],
  ['Cámara planetaria color', 'camera', null, null, 'Vídeo a alta velocidad para apilar imágenes de Júpiter, Saturno y la Luna.'],
  ['Prismáticos 15x70', 'binoculars', 70, null, 'Para recorrer la Vía Láctea y buscar cometas sin montar nada.'],
  ['Filtro solar de película', 'accessory', null, null, 'Imprescindible para observar el Sol con seguridad.'],
]

/** Mismo club de ejemplo que el seeder de Laravel, con reservas a partir de mañana. */
export function seed(now = Date.now()): DemoData {
  const users: StoredUser[] = [
    { id: 1, name: 'Coordinación del club', email: 'admin@cupula.test', role: 'admin', password: 'cupula2026' },
    { id: 2, name: 'Laura Martín', email: 'socia@cupula.test', role: 'member', password: 'cupula2026' },
    { id: 3, name: 'Pau Serra', email: 'pau@cupula.test', role: 'member', password: 'cupula2026' },
    { id: 4, name: 'Nerea Gil', email: 'nerea@cupula.test', role: 'member', password: 'cupula2026' },
  ]
  const equipment: Equipment[] = CATALOG.map(([name, type, aperture_mm, focal_length_mm, description], i) => ({
    id: i + 1,
    name,
    type,
    aperture_mm,
    focal_length_mm,
    description,
    is_active: true,
  }))

  const today = clubToday(now)
  const nights: [number, number, number][] = [
    [1, 1, 2],
    [1, 2, 3],
    [2, 3, 4],
    [3, 1, 3],
    [5, 4, 2],
  ]
  const reservations: StoredReservation[] = nights.map(([day, equipmentId, userId], i) => {
    const date = addDays(today, day)
    return {
      id: i + 1,
      user_id: userId,
      equipment_id: equipmentId,
      starts_at: clubTimeToIso(date, '21:00'),
      ends_at: clubTimeToIso(date, '23:00'),
      status: 'confirmed',
      notes: null,
      cancelled_at: null,
      created_at: new Date(now).toISOString(),
    }
  })

  return { users, equipment, reservations, tokens: {}, seq: 100 }
}

const STORAGE_KEY = 'cupula-demo-v1'

/** Base de datos de la demo: en memoria y, en el navegador, guardada en localStorage. */
export class DemoStore {
  data: DemoData
  private readonly persist: boolean

  constructor(persist = false, now?: number) {
    this.persist = persist
    this.data = (persist && this.load()) || seed(now)
  }

  nextId() {
    return ++this.data.seq
  }

  save() {
    if (!this.persist) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data))
    } catch {
      // Sin almacenamiento: la demo funciona igual, pero se reinicia al recargar.
    }
  }

  reset(now?: number) {
    this.data = seed(now)
    this.save()
  }

  private load(): DemoData | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as DemoData) : null
    } catch {
      return null
    }
  }

  publicUser(u: StoredUser): User {
    return { id: u.id, name: u.name, email: u.email, role: u.role }
  }

  toReservation(r: StoredReservation): Reservation {
    const user = this.data.users.find((u) => u.id === r.user_id)!
    const { user_id: _u, equipment_id: _e, ...rest } = r
    return {
      ...rest,
      equipment: this.data.equipment.find((e) => e.id === r.equipment_id)!,
      user: { id: user.id, name: user.name },
    }
  }
}
