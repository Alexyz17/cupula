import type { Availability } from '../api/types'
import { addDays, clubTimeToIso, formatTime } from '../lib/time'

/** Barra de 24 h con las franjas ocupadas y la selección actual. */
export default function DayTimeline({
  date,
  busy,
  selection,
}: {
  date: string
  busy: Availability['busy']
  selection?: { starts_at: string; ends_at: string } | null
}) {
  const dayStart = new Date(clubTimeToIso(date, '00:00')).getTime()
  const dayEnd = new Date(clubTimeToIso(addDays(date, 1), '00:00')).getTime()
  const span = dayEnd - dayStart

  const box = (startIso: string, endIso: string) => {
    const s = Math.max(new Date(startIso).getTime(), dayStart)
    const e = Math.min(new Date(endIso).getTime(), dayEnd)
    return { left: `${((s - dayStart) / span) * 100}%`, width: `${(Math.max(e - s, 0) / span) * 100}%` }
  }

  return (
    <figure className="space-y-2">
      <div className="relative h-10 overflow-hidden rounded-lg bg-free" aria-hidden="true">
        {busy.map((b) => (
          <div key={b.starts_at} className="absolute inset-y-0 bg-busy/85" style={box(b.starts_at, b.ends_at)} />
        ))}
        {selection && <div className="absolute inset-y-1 rounded-md border-2 border-accent bg-accent/25" style={box(selection.starts_at, selection.ends_at)} />}
        {[3, 6, 9, 12, 15, 18, 21].map((h) => (
          <div key={h} className="absolute inset-y-0 w-px bg-line" style={{ left: `${(h / 24) * 100}%` }} />
        ))}
      </div>
      <div className="flex justify-between font-mono text-[11px] text-muted" aria-hidden="true">
        {['00', '06', '12', '18', '24'].map((h) => (
          <span key={h}>{h}:00</span>
        ))}
      </div>
      <figcaption className="text-sm text-muted">
        {busy.length === 0
          ? 'Libre todo el día.'
          : `Ocupado: ${busy.map((b) => `${formatTime(b.starts_at)}–${formatTime(b.ends_at)}`).join(', ')}.`}
      </figcaption>
    </figure>
  )
}
