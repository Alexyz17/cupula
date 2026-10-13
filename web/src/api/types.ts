// Tipos de la API v1 (ver docs/openapi.yaml en la raíz del repositorio).

export type Role = 'member' | 'admin'
export type EquipmentType = 'telescope' | 'mount' | 'camera' | 'binoculars' | 'accessory'
export type ReservationStatus = 'confirmed' | 'cancelled'

export interface User {
  id: number
  name: string
  email: string
  role: Role
}

export interface Equipment {
  id: number
  name: string
  type: EquipmentType
  description: string | null
  aperture_mm: number | null
  focal_length_mm: number | null
  is_active: boolean
}

export interface Reservation {
  id: number
  equipment: Equipment
  user: { id: number; name: string }
  starts_at: string
  ends_at: string
  status: ReservationStatus
  notes: string | null
  cancelled_at: string | null
  created_at: string | null
}

export interface Availability {
  equipment_id: number
  date: string
  timezone: string
  slot_minutes: number
  busy: { starts_at: string; ends_at: string }[]
}

export interface AuthResponse {
  token: string
  user: User
}

export interface Paginated<T> {
  data: T[]
  meta: { current_page: number; last_page: number; per_page: number; total: number }
}

export const EQUIPMENT_TYPE_LABEL: Record<EquipmentType, string> = {
  telescope: 'Telescopio',
  mount: 'Montura',
  camera: 'Cámara',
  binoculars: 'Prismáticos',
  accessory: 'Accesorio',
}
