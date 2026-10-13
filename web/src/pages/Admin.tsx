import { useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { useEquipmentList, useReservations, useSaveEquipment } from '../api/hooks'
import { EQUIPMENT_TYPE_LABEL, type EquipmentType } from '../api/types'
import { Alert, Button, Card, Field, Input, Loading, PageTitle, Select, Textarea } from '../components/ui'
import { clubToday } from '../lib/time'
import { ReservationRow } from './MyReservations'

function NewEquipmentForm() {
  const save = useSaveEquipment()
  const empty = { name: '', type: 'telescope' as EquipmentType, aperture_mm: '', focal_length_mm: '', description: '' }
  const [form, setForm] = useState(empty)
  const error = save.error instanceof ApiError ? save.error : null

  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate(
      {
        name: form.name,
        type: form.type,
        description: form.description || null,
        aperture_mm: form.aperture_mm ? Number(form.aperture_mm) : null,
        focal_length_mm: form.focal_length_mm ? Number(form.focal_length_mm) : null,
      },
      { onSuccess: () => setForm(empty) },
    )
  }

  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold">Añadir equipo</h3>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Field label="Nombre" error={error?.errors.name?.[0]}>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Tipo" error={error?.errors.type?.[0]}>
          <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as EquipmentType })}>
            {Object.entries(EQUIPMENT_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Apertura (mm)" error={error?.errors.aperture_mm?.[0]}>
          <Input inputMode="numeric" value={form.aperture_mm} onChange={(e) => setForm({ ...form, aperture_mm: e.target.value })} />
        </Field>
        <Field label="Focal (mm)" error={error?.errors.focal_length_mm?.[0]}>
          <Input inputMode="numeric" value={form.focal_length_mm} onChange={(e) => setForm({ ...form, focal_length_mm: e.target.value })} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Descripción">
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Guardando…' : 'Añadir al catálogo'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

function EquipmentAdmin() {
  const { data, isPending } = useEquipmentList({ includeInactive: true })
  const save = useSaveEquipment()

  return (
    <section className="space-y-4">
      <h2 className="font-display text-xl font-bold">Equipos</h2>
      {isPending && <Loading />}
      <ul className="divide-y divide-line rounded-2xl border border-line bg-surface">
        {data?.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <div className="flex-1">
              <p className="font-medium">{e.name}</p>
              <p className="text-xs text-muted">{EQUIPMENT_TYPE_LABEL[e.type]}</p>
            </div>
            <span className={`text-xs ${e.is_active ? 'text-accent' : 'text-muted'}`}>{e.is_active ? 'Disponible' : 'Fuera de servicio'}</span>
            <Button variant="ghost" disabled={save.isPending} onClick={() => save.mutate({ id: e.id, is_active: !e.is_active })}>
              {e.is_active ? 'Desactivar' : 'Activar'}
            </Button>
          </li>
        ))}
      </ul>
      <NewEquipmentForm />
    </section>
  )
}

export default function Admin() {
  const { data, isPending, error } = useReservations({ scope: 'all', from: clubToday(), status: 'confirmed' })

  return (
    <>
      <PageTitle eyebrow="Coordinación" title="Panel del club">
        Próximas reservas de todos los socios y gestión del catálogo. Desactiva un equipo si está en revisión: deja de poder reservarse sin
        perder su historial.
      </PageTitle>
      <div className="grid gap-10 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="font-display text-xl font-bold">Próximas reservas</h2>
          {isPending && <Loading />}
          {error && <Alert>{error.message}</Alert>}
          {data?.data.length === 0 && <p className="text-muted">No hay reservas próximas.</p>}
          <ul className="space-y-3">{data?.data.map((r) => <ReservationRow key={r.id} r={r} showUser />)}</ul>
        </section>
        <EquipmentAdmin />
      </div>
    </>
  )
}
