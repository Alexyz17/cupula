import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { tokenStore } from './api/client'
import { store } from './test/setup'
import { renderApp } from './test/render'

describe('catálogo', () => {
  it('muestra los equipos del club y filtra por tipo', async () => {
    const user = userEvent.setup()
    renderApp('/')

    expect(await screen.findByRole('heading', { name: 'Dobson 254/1200' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Montura ecuatorial EQ6' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cámara' }))

    expect(await screen.findByRole('heading', { name: 'Cámara planetaria color' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Dobson 254/1200' })).not.toBeInTheDocument())
  })

  it('no ofrece los equipos desactivados', async () => {
    store.data.equipment[0].is_active = false
    renderApp('/')

    expect(await screen.findByRole('heading', { name: 'Montura ecuatorial EQ6' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Refractor apocromático 80/480' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Dobson 254/1200' })).not.toBeInTheDocument()
  })
})

describe('reservar un equipo', () => {
  it('pide iniciar sesión para reservar', async () => {
    renderApp('/equipos/1')

    expect(await screen.findByRole('link', { name: 'Entra con tu cuenta' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Reservar/ })).not.toBeInTheDocument()
  })

  it('avisa de un solape antes de enviar y reserva una franja libre', async () => {
    const user = userEvent.setup()
    // Mañana a las 21:00 el Dobson (id 1) ya está reservado en la demo.
    renderApp('/equipos/1', { as: 'socia@cupula.test' })

    fireEvent.change(await screen.findByLabelText('Día'), { target: { value: '2026-11-03' } })
    expect(await screen.findByText(/Ocupado: 21:00–23:00/)).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Hora de inicio'), '22:00')
    expect(screen.getByText('Esa franja se solapa con otra reserva. Prueba otra hora.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reservar/ })).toBeDisabled()

    await user.selectOptions(screen.getByLabelText('Hora de inicio'), '23:00')
    await user.selectOptions(screen.getByLabelText('Duración'), '90')
    await user.type(screen.getByLabelText(/Notas/), 'Saturno')
    await user.click(screen.getByRole('button', { name: 'Reservar 1 h 30 min' }))

    expect(await screen.findByText(/¡Reservado!/)).toBeInTheDocument()
    expect(store.data.reservations.at(-1)).toMatchObject({
      equipment_id: 1,
      starts_at: '2026-11-03T22:00:00Z',
      ends_at: '2026-11-03T23:30:00Z',
      notes: 'Saturno',
    })
  })

  it('propone la primera franja libre de la noche', async () => {
    // Mañana el Dobson está ocupado de 21:00 a 23:00: la ficha propone empezar a las 23:00.
    renderApp('/equipos/1?dia=2026-11-03', { as: 'socia@cupula.test' })

    expect(await screen.findByText(/Ocupado: 21:00–23:00/)).toBeInTheDocument()
    expect(screen.getByLabelText('Hora de inicio')).toHaveValue('23:00')
    expect(screen.getByRole('button', { name: 'Reservar 2 h' })).toBeEnabled()
  })

  it('muestra el mensaje de la API cuando se supera el límite de reservas', async () => {
    const user = userEvent.setup()
    // La socia ya tiene 2 reservas en la demo; le añadimos una tercera.
    store.data.reservations.push({ ...store.data.reservations[0], id: 99, equipment_id: 6 })
    renderApp('/equipos/7', { as: 'socia@cupula.test' })

    await user.click(await screen.findByRole('button', { name: /Reservar/ }))

    expect(await screen.findByText('Ya tienes 3 reservas activas. Cancela alguna antes de hacer otra.')).toBeInTheDocument()
  })
})

describe('sesión', () => {
  it('rechaza credenciales incorrectas y entra con las correctas', async () => {
    const user = userEvent.setup()
    const { router } = renderApp('/entrar')

    await user.type(await screen.findByLabelText('Email'), 'socia@cupula.test')
    await user.type(screen.getByLabelText('Contraseña'), 'mala')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('El email o la contraseña no son correctos.')).toBeInTheDocument()

    await user.clear(screen.getByLabelText('Contraseña'))
    await user.type(screen.getByLabelText('Contraseña'), 'cupula2026')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(await screen.findByText('Laura Martín')).toBeInTheDocument()
    expect(tokenStore.get()).toBeTruthy()
  })

  it('manda a iniciar sesión al entrar en una página privada', async () => {
    const { router } = renderApp('/mis-reservas')

    await waitFor(() => expect(router.state.location.pathname).toBe('/entrar'))
  })

  it('un socio no puede entrar en el panel de coordinación', async () => {
    const { router } = renderApp('/admin', { as: 'socia@cupula.test' })

    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
    expect(screen.queryByRole('link', { name: 'Coordinación' })).not.toBeInTheDocument()
  })
})

describe('mis reservas', () => {
  it('cancela una reserva propia', async () => {
    const user = userEvent.setup()
    window.confirm = () => true
    renderApp('/mis-reservas', { as: 'socia@cupula.test' })

    const upcoming = await screen.findByRole('heading', { name: 'Próximas' })
    const list = within(upcoming.parentElement!).getAllByRole('listitem')
    expect(list).toHaveLength(2)

    await user.click(within(list[0]).getByRole('button', { name: 'Cancelar' }))

    expect(await screen.findByRole('heading', { name: 'Historial' })).toBeInTheDocument()
    expect(screen.getByText('Cancelada')).toBeInTheDocument()
    expect(store.data.reservations.find((r) => r.id === 1)?.status).toBe('cancelled')
  })
})

describe('coordinación', () => {
  it('ve las reservas de todo el club y desactiva un equipo', async () => {
    const user = userEvent.setup()
    renderApp('/admin', { as: 'admin@cupula.test' })

    expect(await screen.findAllByText('Reserva de Pau Serra')).toHaveLength(2)

    const row = (await screen.findByText('Prismáticos 15x70')).closest('li')!
    await user.click(within(row).getByRole('button', { name: 'Desactivar' }))

    expect(await within(row).findByText('Fuera de servicio')).toBeInTheDocument()
    expect(store.data.equipment.find((e) => e.name === 'Prismáticos 15x70')?.is_active).toBe(false)
  })
})
