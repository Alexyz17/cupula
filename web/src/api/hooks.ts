import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'
import type { Availability, Equipment, EquipmentType, Paginated, Reservation } from './types'

export const keys = {
  equipment: (filters: object = {}) => ['equipment', filters] as const,
  equipmentOne: (id: number) => ['equipment', 'one', id] as const,
  availability: (id: number, date: string) => ['availability', id, date] as const,
  reservations: (filters: object = {}) => ['reservations', filters] as const,
}

export function useEquipmentList(filters: { type?: EquipmentType | ''; includeInactive?: boolean } = {}) {
  return useQuery({
    queryKey: keys.equipment(filters),
    queryFn: () =>
      api<{ data: Equipment[] }>('/equipment', {
        query: { type: filters.type, include_inactive: filters.includeInactive ? 1 : undefined },
      }).then((r) => r.data),
  })
}

export function useEquipment(id: number) {
  return useQuery({
    queryKey: keys.equipmentOne(id),
    queryFn: () => api<{ data: Equipment }>(`/equipment/${id}`).then((r) => r.data),
  })
}

export function useAvailability(id: number, date: string) {
  return useQuery({
    queryKey: keys.availability(id, date),
    queryFn: () => api<{ data: Availability }>(`/equipment/${id}/availability`, { query: { date } }).then((r) => r.data),
    enabled: Boolean(date),
  })
}

export function useReservations(filters: { scope?: 'mine' | 'all'; from?: string; status?: string } = {}) {
  return useQuery({
    queryKey: keys.reservations(filters),
    queryFn: () => api<Paginated<Reservation>>('/reservations', { query: { ...filters, per_page: 50 } }),
  })
}

export function useCreateReservation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { equipment_id: number; starts_at: string; ends_at: string; notes?: string }) =>
      api<{ data: Reservation }>('/reservations', { method: 'POST', body }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['availability'] })
      qc.invalidateQueries({ queryKey: ['reservations'] })
    },
  })
}

export function useCancelReservation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api<{ data: Reservation }>(`/reservations/${id}/cancel`, { method: 'POST' }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['availability'] })
      qc.invalidateQueries({ queryKey: ['reservations'] })
    },
  })
}

export function useSaveEquipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<Equipment> & { id?: number }) =>
      api<{ data: Equipment }>(id ? `/equipment/${id}` : '/equipment', { method: id ? 'PATCH' : 'POST', body }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipment'] }),
  })
}
