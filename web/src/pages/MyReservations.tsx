import { Link } from 'react-router'
import { ApiError } from '../api/client'
import { useCancelReservation, useReservations } from '../api/hooks'
import type { Reservation } from '../api/types'
import { Alert, Button, Card, Loading, PageTitle } from '../components/ui'
import { formatDate, formatTime } from '../lib/time'
import { useNow } from '../lib/useNow'

export function ReservationRow({ r, showUser = false }: { r: Reservation; showUser?: boolean }) {
  const cancel = useCancelReservation()
  const upcoming = new Date(r.starts_at).getTime() > useNow()
  const cancelled = r.status === 'cancelled'

  return (
    <li>
      <Card className={`flex flex-wrap items-center gap-4 ${cancelled ? 'opacity-60' : ''}`}>
        <div className="min-w-48 flex-1 space-y-1">
          <p className="font-display text-lg font-bold">{r.equipment.name}</p>
          <p className="text-sm text-muted first-letter:uppercase">
            {formatDate(r.starts_at)} · <span className="font-mono">{formatTime(r.starts_at)}–{formatTime(r.ends_at)}</span>
          </p>
          {showUser && <p className="text-sm text-muted">Reserva de {r.user.name}</p>}
          {r.notes && <p className="text-sm italic text-muted">«{r.notes}»</p>}
          {cancel.error instanceof ApiError && <p className="text-sm text-danger">{cancel.error.first()}</p>}
        </div>
        {cancelled ? (
          <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">Cancelada</span>
        ) : upcoming ? (
          <Button
            variant="danger"
            disabled={cancel.isPending}
            onClick={() => {
              if (window.confirm(`¿Cancelar la reserva de ${r.equipment.name}?`)) cancel.mutate(r.id)
            }}
          >
            {cancel.isPending ? 'Cancelando…' : 'Cancelar'}
          </Button>
        ) : (
          <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">Pasada</span>
        )}
      </Card>
    </li>
  )
}

export default function MyReservations() {
  const { data, isPending, error } = useReservations({ scope: 'mine' })
  const now = useNow()
  const upcoming = data?.data.filter((r) => r.status === 'confirmed' && new Date(r.ends_at).getTime() > now) ?? []
  const history = data?.data.filter((r) => !upcoming.includes(r)).reverse() ?? []

  return (
    <>
      <PageTitle eyebrow="Tu agenda" title="Mis reservas">
        Puedes tener hasta 3 reservas activas a la vez. Si al final no vas, cancélala para que otra persona del club pueda usar el equipo.
      </PageTitle>
      {isPending && <Loading />}
      {error && <Alert>No se han podido cargar tus reservas. {error.message}</Alert>}

      {data && (
        <div className="space-y-10">
          <section className="space-y-3">
            <h2 className="font-display text-xl font-bold">Próximas</h2>
            {upcoming.length === 0 ? (
              <p className="text-muted">
                No tienes reservas próximas.{' '}
                <Link to="/" className="font-semibold text-accent hover:underline">
                  Reserva un equipo
                </Link>
              </p>
            ) : (
              <ul className="space-y-3">{upcoming.map((r) => <ReservationRow key={r.id} r={r} />)}</ul>
            )}
          </section>
          {history.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold">Historial</h2>
              <ul className="space-y-3">{history.map((r) => <ReservationRow key={r.id} r={r} />)}</ul>
            </section>
          )}
        </div>
      )}
    </>
  )
}
