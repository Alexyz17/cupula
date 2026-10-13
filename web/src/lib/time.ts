// El club funciona en la hora de Madrid; la API guarda y devuelve UTC.
export const CLUB_TZ = 'Europe/Madrid'

const parts = (ts: number, tz: string) => {
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(ts)
  const get = (type: string) => Number(p.find((x) => x.type === type)?.value)
  return { y: get('year'), m: get('month'), d: get('day'), h: get('hour'), min: get('minute') }
}

/** Minutos que la zona horaria va por delante de UTC en ese instante (60 en invierno en Madrid, 120 en verano). */
function offsetMinutes(ts: number, tz: string): number {
  const { y, m, d, h, min } = parts(ts, tz)
  return Math.round((Date.UTC(y, m - 1, d, h, min) - Math.floor(ts / 60000) * 60000) / 60000)
}

/** "2026-11-05" + "21:30" en hora del club → instante UTC en ISO. */
export function clubTimeToIso(date: string, time: string, tz = CLUB_TZ): string {
  const [y, m, d] = date.split('-').map(Number)
  const [h, min] = time.split(':').map(Number)
  const guess = Date.UTC(y, m - 1, d, h, min)
  let ts = guess - offsetMinutes(guess, tz) * 60000
  // Segunda pasada para los días de cambio de hora.
  ts = guess - offsetMinutes(ts, tz) * 60000
  return new Date(ts).toISOString().replace('.000Z', 'Z')
}

/** Día de hoy en el calendario del club, como "AAAA-MM-DD". */
export function clubToday(now = Date.now(), tz = CLUB_TZ): string {
  const { y, m, d } = parts(now, tz)
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

export const formatTime = (iso: string) =>
  new Intl.DateTimeFormat('es-ES', { timeZone: CLUB_TZ, hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

export const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('es-ES', { timeZone: CLUB_TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(iso))

export const formatDay = (date: string) =>
  new Intl.DateTimeFormat('es-ES', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T00:00:00Z`))

/** Horas "HH:MM" de un día cada `step` minutos. */
export function dayTimes(step = 30): string[] {
  return Array.from({ length: (24 * 60) / step }, (_, i) => {
    const minutes = i * step
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  })
}

export const durationLabel = (minutes: number) => {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return [h ? `${h} h` : '', m ? `${m} min` : ''].filter(Boolean).join(' ')
}

/** ¿Se solapan [aStart, aEnd) y [bStart, bEnd)? Dos franjas contiguas no se solapan. */
export const overlaps = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  new Date(aStart) < new Date(bEnd) && new Date(aEnd) > new Date(bStart)
