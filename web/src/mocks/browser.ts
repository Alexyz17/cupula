import { setupWorker } from 'msw/browser'
import { DemoStore } from './db'
import { createHandlers } from './handlers'

export const store = new DemoStore(true)
export const worker = setupWorker(...createHandlers(store))
