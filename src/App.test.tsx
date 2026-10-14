import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import * as api from './api/bookings'
import { draft, freezeTime, seedBookings, storedBookings } from './test/helpers'
import type { Booking } from './types'

// «Сейчас» во всех тестах — 10.01.2030 10:05

const slot = (time: string) => screen.getByRole('button', { name: new RegExp(`^${time}`) })
const combobox = (name: string) => screen.getByRole('combobox', { name })

async function renderApp() {
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('button', { name: /^10:30/ })
  return user
}

async function selectOption(user: ReturnType<typeof userEvent.setup>, field: string, time: string) {
  await user.click(combobox(field))
  await user.click(screen.getByRole('option', { name: time }))
}

beforeEach(() => {
  freezeTime()
})

describe('расписание дня', () => {
  it('показывает прошедшие, занятые и свободные слоты', async () => {
    seedBookings([{ id: '1', ...draft({ start: '12:00', end: '13:00', title: 'Демо' }) }])
    await renderApp()

    expect(slot('09:30')).toBeDisabled()
    expect(slot('10:30')).toBeEnabled()
    expect(slot('12:00')).toHaveTextContent('Демо · 12:00–13:00')
    expect(screen.getByText('Демо')).toBeInTheDocument()
  })

  it('при занятом до конца дня времени создание недоступно', async () => {
    seedBookings([
      { id: '1', ...draft({ start: '10:30', end: '12:30' }) },
      { id: '2', ...draft({ start: '12:30', end: '14:30' }) },
      { id: '3', ...draft({ start: '14:30', end: '16:30' }) },
      { id: '4', ...draft({ start: '16:30', end: '18:00' }) },
    ])
    await renderApp()

    expect(screen.getByRole('button', { name: 'Новая бронь' })).toBeDisabled()
    expect(screen.getByText('На эту дату свободного времени не осталось')).toBeInTheDocument()
  })

  it('на прошедшую дату создавать брони нельзя', async () => {
    const user = await renderApp()

    await user.click(screen.getByRole('button', { name: 'Предыдущий день' }))

    expect(await screen.findByText(/Эта дата уже прошла/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Новая бронь' })).not.toBeInTheDocument()
  })

  it('показывает ошибку загрузки и даёт повторить запрос', async () => {
    vi.spyOn(api, 'getBookings').mockRejectedValueOnce(new Error('Сеть недоступна'))
    const user = userEvent.setup()
    render(<App />)

    expect(await screen.findByText(/Не удалось загрузить бронирования/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Повторить' }))

    await waitFor(() => expect(screen.queryByText(/Не удалось загрузить/)).not.toBeInTheDocument())
    expect(slot('10:30')).toBeEnabled()
  })
})

describe('создание брони', () => {
  it('клик по свободному слоту → форма → бронь в списке', async () => {
    const user = await renderApp()

    await user.click(slot('11:00'))
    expect(combobox('Начало')).toHaveTextContent('11:00')
    expect(combobox('Окончание')).toHaveTextContent('11:30')

    await user.type(screen.getByLabelText('Название встречи'), 'Планёрка')
    await selectOption(user, 'Окончание', '12:00')
    await user.click(screen.getByRole('button', { name: 'Забронировать' }))

    expect(await screen.findByText('Комната забронирована')).toBeInTheDocument()
    expect(screen.getByText('11:00–12:00')).toBeInTheDocument()
    expect(storedBookings()).toEqual([expect.objectContaining(draft({ title: 'Планёрка' }))])
  })

  it('в списках формы недоступны прошедшее и занятое время', async () => {
    seedBookings([{ id: '1', ...draft({ start: '12:00', end: '13:00' }) }])
    const user = await renderApp()

    await user.click(slot('11:00'))
    await user.click(combobox('Начало'))

    expect(screen.getByRole('option', { name: '09:30' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('option', { name: '12:00' })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('option', { name: '11:30' })).not.toHaveAttribute('aria-disabled')
  })

  it('не отправляет запрос, пока форма невалидна', async () => {
    const create = vi.spyOn(api, 'createBooking')
    const user = await renderApp()

    await user.click(slot('11:00'))
    await user.type(screen.getByLabelText('Название встречи'), '   ')
    await user.click(screen.getByRole('button', { name: 'Забронировать' }))

    expect(screen.getByText('Укажите название встречи')).toBeInTheDocument()
    expect(create).not.toHaveBeenCalled()
  })

  it('клик по другому слоту меняет время, но сохраняет введённое название', async () => {
    const user = await renderApp()

    await user.click(slot('11:00'))
    await user.type(screen.getByLabelText('Название встречи'), 'Созвон')
    await user.click(slot('14:00'))

    expect(combobox('Начало')).toHaveTextContent('14:00')
    expect(screen.getByLabelText('Название встречи')).toHaveValue('Созвон')
  })
})

describe('конфликт со стороны сервера', () => {
  it('409: понятное сообщение, свежий список и введённые данные на месте', async () => {
    const user = await renderApp()

    await user.click(slot('11:00'))
    await user.type(screen.getByLabelText('Название встречи'), 'Ретро')
    await selectOption(user, 'Окончание', '12:00')

    // Пока пользователь заполнял форму, коллега в другой вкладке занял часть этого времени
    seedBookings([{ id: 'foreign', ...draft({ start: '11:30', end: '12:30', title: 'Чужая' }) }])

    await user.click(screen.getByRole('button', { name: 'Забронировать' }))

    expect(await screen.findByText(/успели занять/)).toHaveTextContent('«Чужая» (11:30–12:30)')
    expect(await screen.findByText('Чужая')).toBeInTheDocument()
    expect(slot('11:30')).toHaveTextContent('Чужая')

    expect(screen.getByLabelText('Название встречи')).toHaveValue('Ретро')
    expect(combobox('Начало')).toHaveTextContent('11:00')
    expect(combobox('Окончание')).toHaveTextContent('12:00')
    expect(storedBookings()).toHaveLength(1)
  })

  it('после 409 можно выбрать другое время и сохранить', async () => {
    const user = await renderApp()

    await user.click(slot('11:00'))
    await user.type(screen.getByLabelText('Название встречи'), 'Ретро')
    seedBookings([{ id: 'foreign', ...draft({ start: '11:00', end: '11:30', title: 'Чужая' }) }])
    await user.click(screen.getByRole('button', { name: 'Забронировать' }))
    await screen.findByText(/успели занять/)

    await user.click(slot('15:00'))
    await user.click(screen.getByRole('button', { name: 'Забронировать' }))

    expect(await screen.findByText('Комната забронирована')).toBeInTheDocument()
    expect(storedBookings()).toContainEqual(
      expect.objectContaining({ title: 'Ретро', start: '15:00', end: '15:30' }),
    )
  })

  it('404: бронь удалили, пока её редактировали — можно сохранить как новую', async () => {
    seedBookings([{ id: 'mine', ...draft({ start: '12:00', end: '13:00', title: 'Обзор' }) }])
    const user = await renderApp()

    await user.click(screen.getByRole('button', { name: 'Изменить' }))
    await user.type(screen.getByLabelText('Название встречи'), ' спринта')
    seedBookings([]) // удалили в другой вкладке

    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByText(/уже удалили/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Новая бронь' })).toBeInTheDocument()
    expect(screen.getByLabelText('Название встречи')).toHaveValue('Обзор спринта')

    await user.click(screen.getByRole('button', { name: 'Забронировать' }))

    expect(await screen.findByText('Комната забронирована')).toBeInTheDocument()
    expect(storedBookings()).toEqual([
      expect.objectContaining({ title: 'Обзор спринта', start: '12:00', end: '13:00' }),
    ])
  })
})

describe('редактирование и удаление', () => {
  const booking: Booking = {
    id: 'mine',
    ...draft({ start: '12:00', end: '13:00', title: 'Обзор' }),
  }

  it('изменение брони не конфликтует с ней самой', async () => {
    seedBookings([booking])
    const user = await renderApp()

    await user.click(slot('12:00'))
    expect(screen.getByRole('heading', { name: 'Редактирование брони' })).toBeInTheDocument()

    await selectOption(user, 'Окончание', '13:30')
    await user.click(screen.getByRole('button', { name: 'Сохранить' }))

    expect(await screen.findByText('Бронь изменена')).toBeInTheDocument()
    expect(storedBookings()).toEqual([{ ...booking, end: '13:30' }])
  })

  it('идущую встречу нельзя изменить, но можно удалить', async () => {
    seedBookings([{ id: 'now', ...draft({ start: '10:00', end: '11:00', title: 'Идёт' }) }])
    await renderApp()

    expect(screen.queryByRole('button', { name: 'Изменить' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Удалить' })).toBeEnabled()
    expect(slot('10:00')).toBeDisabled()
  })

  it('удаление требует подтверждения', async () => {
    seedBookings([booking])
    const user = await renderApp()

    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Отмена' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(storedBookings()).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Удалить' }))

    expect(await screen.findByText('Бронь удалена')).toBeInTheDocument()
    expect(storedBookings()).toEqual([])
    await waitFor(() =>
      expect(screen.getByText('На эту дату бронирований нет')).toBeInTheDocument(),
    )
  })

  it('двойной клик по «Удалить» в диалоге отправляет один запрос', async () => {
    seedBookings([booking])
    const remove = vi.spyOn(api, 'deleteBooking')
    const user = await renderApp()

    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    await user.dblClick(within(screen.getByRole('dialog')).getByRole('button', { name: 'Удалить' }))

    expect(await screen.findByText('Бронь удалена')).toBeInTheDocument()
    expect(remove).toHaveBeenCalledTimes(1)
  })

  it('удаление уже удалённой брони показывает ошибку и обновляет список', async () => {
    seedBookings([booking])
    const user = await renderApp()

    seedBookings([])
    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Удалить' }))

    expect(await screen.findByText(/уже удалили/)).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByText('На эту дату бронирований нет')).toBeInTheDocument(),
    )
  })
})
