import { useEffect, useState } from 'react'

/** Instante actual, que se refresca cada minuto: así "pasada" o "en el pasado" cambian solos sin recargar. */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
