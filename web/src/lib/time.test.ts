import { describe, expect, it } from 'vitest'
import { addDays, clubTimeToIso, clubToday, dayTimes, durationLabel, overlaps } from './time'

describe('clubTimeToIso', () => {
  it('convierte la hora de Madrid a UTC en invierno (UTC+1)', () => {
    expect(clubTimeToIso('2026-11-05', '21:00')).toBe('2026-11-05T20:00:00Z')
  })

  it('convierte la hora de Madrid a UTC en verano (UTC+2)', () => {
    expect(clubTimeToIso('2026-07-15', '22:30')).toBe('2026-07-15T20:30:00Z')
  })

  it('resuelve bien la noche del cambio de hora', () => {
    // El 25 de octubre de 2026 a las 03:00 los relojes vuelven a las 02:00.
    expect(clubTimeToIso('2026-10-25', '00:00')).toBe('2026-10-24T22:00:00Z')
    expect(clubTimeToIso('2026-10-26', '00:00')).toBe('2026-10-25T23:00:00Z')
  })
})

describe('utilidades de calendario', () => {
  it('calcula el día del club aunque en UTC sea otro día', () => {
    // 23:30 UTC del 2 de noviembre ya son las 00:30 del 3 en Madrid.
    expect(clubToday(Date.parse('2026-11-02T23:30:00Z'))).toBe('2026-11-03')
  })

  it('suma días cruzando meses', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
  })

  it('genera las franjas de 30 minutos de un día', () => {
    const times = dayTimes(30)
    expect(times).toHaveLength(48)
    expect(times.slice(0, 3)).toEqual(['00:00', '00:30', '01:00'])
    expect(times.at(-1)).toBe('23:30')
  })

  it('escribe duraciones legibles', () => {
    expect(durationLabel(30)).toBe('30 min')
    expect(durationLabel(120)).toBe('2 h')
    expect(durationLabel(150)).toBe('2 h 30 min')
  })
})

describe('overlaps', () => {
  const a = ['2026-11-05T20:00:00Z', '2026-11-05T22:00:00Z'] as const

  it('detecta un solape parcial', () => {
    expect(overlaps(...a, '2026-11-05T21:00:00Z', '2026-11-05T23:00:00Z')).toBe(true)
  })

  it('dos franjas contiguas no se solapan', () => {
    expect(overlaps(...a, '2026-11-05T22:00:00Z', '2026-11-05T23:00:00Z')).toBe(false)
  })
})
