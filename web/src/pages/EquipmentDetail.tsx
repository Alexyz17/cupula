import { useMemo, useState, type FormEvent } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { ApiError } from '../api/client'
import { useAvailability, useCreateReservation, useEquipment } from '../api/hooks'
import { EQUIPMENT_TYPE_LABEL } from '../api/types'
import { useAuth } from '../auth/useAuth'
import DayTimeline from '../components/DayTimeline'
import { Alert, Button, Card, Field, Input, Loading, Select, Textarea } from '../components/ui'
import { addDays, clubTimeToIso, clubToday, dayTimes, durationLabel, formatDay, formatTime, overlaps } from '../lib/time'
import { useNow } from '../lib/useNow'
import { Specs } from './Catalog'

const DURATIONS = Array.from({ length: 12 }, (_, i) => (i + 1) * 30)
const MAX_DAYS_AHEAD = 60
const EVENING = '21:00'

function slotRange(date: string, time: string, duration: number) {
  const starts_at = clubTimeToIso(date, time)
  const ends_at = new Date(new Date(starts_at).getTime() + duration * 60000).toISOString().replace('.000Z', 'Z')
  return { starts_at, ends_at }
}

/** Primera hora libre y futura desde las 21:00 (la hora típica de observación); si no hay, las 21:00. */
function suggestStart(date: string, duration: number, busy: { starts_at: string; ends_at: string }[], now: number): string {
  const candidate = dayTimes(30)
    .filter((t) => t >= EVENING)
    .find((t) => {
      const w = slotRange(date, t, duration)
      return new Date(w.starts_at).getTime() > now && !busy.some((b) => overlaps(w.starts_at, w.ends_at, b.starts_at, b.ends_at))
    })
  return candidate ?? EVENING
}

export default function EquipmentDetail() {
  const id = Number(useParams().id)
  const location = useLocation()
  const { user } = useAuth()
  const equipment = useEquipment(id)

  const today = clubToday()
  const [params, setParams] = useSearchParams()
  const requested = params.get('dia') ?? ''
  const date = /^\d{4}-\d{2}-\d{2}$/.test(requested) && requested >= today ? requested : today
  // null = la persona aún no ha elegido hora: se propone la primera franja libre de la noche.
  const [chosenTime, setChosenTime] = useState<string | null>(null)
  const setDate = (d: string) => {
    setChosenTime(null)
    setParams(d === today ? {} : { dia: d }, { replace: true })
  }
  const [duration, setDuration] = useState(120)
  const [notes, setNotes] = useState('')
  const availability = useAvailability(id, date)
  const create = useCreateReservation()
  const now = useNow()

  const busy = useMemo(() => availability.data?.busy ?? [], [availability.data])
  const time = useMemo(
    () => chosenTime ?? suggestStart(date, duration, busy, now),
    [chosenTime, date, duration, busy, now],
  )
  const setTime = setChosenTime

  const selection = useMemo(() => slotRange(date, time, duration), [date, time, duration])

  const clash = busy.some((b) => overlaps(selection.starts_at, selection.ends_at, b.starts_at, b.ends_at))
  const inPast = new Date(selection.starts_at).getTime() <= now
  const serverError = create.error instanceof ApiError ? create.error : null

  if (equipment.isPending) return <Loading />
  if (equipment.error || !equipment.data) {
    return <Alert>{equipment.error instanceof ApiError && equipment.error.status === 404 ? 'Este equipo no existe o no está disponible.' : 'No se ha podido cargar el equipo.'}</Alert>
  }
  const e = equipment.data

  const submit = (ev: FormEvent) => {
    ev.preventDefault()
    create.mutate({ equipment_id: id, ...selection, notes: notes || undefined }, { onSuccess: () => setNotes('') })
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.15fr]">
      <section className="space-y-4">
        <Link to="/" className="mb-2 inline-block text-sm text-muted hover:text-ink">
          ← Todos los equipos
        </Link>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-accent">{EQUIPMENT_TYPE_LABEL[e.type]}</p>
        <h1 className="font-display text-4xl font-bold">{e.name}</h1>
        <Specs equipment={e} />
        {e.description && <p className="text-muted">{e.description}</p>}
      </section>

      <Card className="space-y-6">
        <div className="space-y-3">
          <Field label="Día" hint="Hora del club (Madrid). Puedes reservar hasta 60 días antes.">
            <Input type="date" value={date} min={today} max={addDays(today, MAX_DAYS_AHEAD)} onChange={(ev) => setDate(ev.target.value || today)} />
          </Field>
          <h2 className="font-display text-lg font-bold first-letter:uppercase">{formatDay(date)}</h2>
          {availability.isPending ? <Loading label="Consultando disponibilidad…" /> : <DayTimeline date={date} busy={busy} selection={selection} />}
        </div>

        {!user ? (
          <Alert tone="info">
            <Link to="/entrar" state={{ from: location.pathname }} className="font-semibold text-accent underline">
              Entra con tu cuenta
            </Link>{' '}
            para reservar este equipo.
          </Alert>
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Hora de inicio">
                <Select value={time} onChange={(ev) => setTime(ev.target.value)}>
                  {dayTimes(30).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Duración" hint={`Termina a las ${formatTime(selection.ends_at)}`}>
                <Select value={duration} onChange={(ev) => setDuration(Number(ev.target.value))}>
                  {DURATIONS.map((d) => (
                    <option key={d} value={d}>
                      {durationLabel(d)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Notas (opcional)" hint="Por ejemplo, qué quieres observar.">
              <Textarea rows={2} maxLength={500} value={notes} onChange={(ev) => setNotes(ev.target.value)} />
            </Field>

            {inPast && <Alert>Esa hora ya ha pasado. Elige otra.</Alert>}
            {!inPast && clash && <Alert>Esa franja se solapa con otra reserva. Prueba otra hora.</Alert>}
            {serverError && <Alert>{serverError.first()}</Alert>}
            {create.isSuccess && (
              <Alert tone="info">
                ¡Reservado! {formatDay(date)} de {formatTime(create.data.starts_at)} a {formatTime(create.data.ends_at)}.{' '}
                <Link to="/mis-reservas" className="font-semibold text-accent underline">
                  Ver mis reservas
                </Link>
              </Alert>
            )}

            <Button type="submit" disabled={create.isPending || clash || inPast} className="w-full">
              {create.isPending ? 'Reservando…' : `Reservar ${durationLabel(duration)}`}
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}
