import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { tokenStore } from '../api/client'
import { AuthProvider } from '../auth/AuthContext'
import { routes } from '../router'
import { store } from './setup'

/** Monta la aplicación completa en una ruta, opcionalmente con la sesión de un usuario de la demo. */
export function renderApp(path: string, { as }: { as?: 'socia@cupula.test' | 'admin@cupula.test' } = {}) {
  if (as) {
    const user = store.data.users.find((u) => u.email === as)!
    const token = `test|${user.id}`
    store.data.tokens[token] = user.id
    tokenStore.set(token)
  }

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const router = createMemoryRouter(routes, { initialEntries: [path] })

  return {
    router,
    ...render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>,
    ),
  }
}
