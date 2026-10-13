import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { setupServer } from 'msw/node'
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'
import { DemoStore } from '../mocks/db'
import { createHandlers } from '../mocks/handlers'

// "Ahora" es el lunes 2 de noviembre de 2026 a las 13:00 en Madrid, igual que en los tests de la API.
export const NOW = new Date('2026-11-02T12:00:00Z').getTime()

export const store = new DemoStore(false, NOW)
export const server = setupServer(...createHandlers(store))

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }))
beforeEach(() => {
  // Solo se falsea la fecha: las promesas y los temporizadores siguen siendo reales.
  vi.useFakeTimers({ toFake: ['Date'], now: NOW })
  store.reset(NOW)
  localStorage.clear()
})
afterEach(() => {
  cleanup()
  server.resetHandlers()
  vi.useRealTimers()
})
afterAll(() => server.close())
