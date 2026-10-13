import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'
import { AuthProvider } from './auth/AuthContext'
import { IS_DEMO } from './lib/demo'
import { createRouter } from './router'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
})

async function start() {
  // Demo sin servidor: MSW intercepta las peticiones a la API y las resuelve en el navegador.
  if (IS_DEMO) {
    const { worker } = await import('./mocks/browser')
    await worker.start({
      serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
      onUnhandledFrame: 'bypass',
      quiet: true,
    })
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={createRouter()} />
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
}

start()
