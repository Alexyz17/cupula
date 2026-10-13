import { createBrowserRouter } from 'react-router'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import Admin from './pages/Admin'
import { Login, Register } from './pages/Auth'
import Catalog from './pages/Catalog'
import EquipmentDetail from './pages/EquipmentDetail'
import MyReservations from './pages/MyReservations'
import NotFound from './pages/NotFound'

export const routes = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <Catalog /> },
      { path: 'equipos/:id', element: <EquipmentDetail /> },
      { path: 'entrar', element: <Login /> },
      { path: 'registro', element: <Register /> },
      { path: 'mis-reservas', element: <RequireAuth><MyReservations /></RequireAuth> },
      { path: 'admin', element: <RequireAuth admin><Admin /></RequireAuth> },
      { path: '*', element: <NotFound /> },
    ],
  },
]

export const createRouter = () => createBrowserRouter(routes, { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || '/' })
