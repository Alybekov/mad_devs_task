import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { TODAY, TOMORROW, draft, freezeTime, seedBookings, storedBookings } from '../test/helpers'
import {
  ApiError,
  createBooking,
  deleteBooking,
  getBookings,
  setConflictSimulation,
  updateBooking,
} from './bookings'

beforeEach(() => {
  freezeTime()
})

afterEach(() => {
  setConflictSimulation(false)
})

/** Ждёт ошибку API и возвращает её HTTP-статус */
async function statusOf(request: Promise<unknown>): Promise<number> {
  try {
    await request
  } catch (error) {
    if (error instanceof ApiError) return error.status
    throw error
  }
  throw new Error('Запрос завершился без ошибки')
}

describe('getBookings', () => {
  it('возвращает брони только за выбранную дату, отсортированные по началу', async () => {
    seedBookings([
      { id: '1', ...draft({ start: '14:00', end: '15:00' }) },
      { id: '2', ...draft({ start: '11:00', end: '12:00' }) },
      { id: '3', ...draft({ date: TOMORROW }) },
    ])

    const bookings = await getBookings(TODAY)

    expect(bookings.map((b) => b.id)).toEqual(['2', '1'])
  })

  it('не падает на повреждённых данных в хранилище', async () => {
    localStorage.setItem('meeting-room-bookings', '{не json')
    await expect(getBookings(TODAY)).resolves.toEqual([])
  })
})

describe('createBooking', () => {
  it('сохраняет бронь и выдаёт ей id', async () => {
    const booking = await createBooking(draft())

    expect(booking.id).toEqual(expect.any(String))
    expect(storedBookings()).toEqual([booking])
  })

  it('400 — сервер сам проверяет правила и не доверяет клиенту', async () => {
    expect(await statusOf(createBooking(draft({ start: '11:00', end: '14:00' })))).toBe(400)
    expect(await statusOf(createBooking(draft({ start: '09:00', end: '10:00' })))).toBe(400)
    expect(storedBookings()).toEqual([])
  })

  it('409 — время пересекается с существующей бронью', async () => {
    await createBooking(draft({ start: '11:00', end: '12:00' }))

    expect(await statusOf(createBooking(draft({ start: '11:30', end: '12:30' })))).toBe(409)
    expect(storedBookings()).toHaveLength(1)
  })

  it('соседние брони, касающиеся границами, допустимы', async () => {
    await createBooking(draft({ start: '10:30', end: '11:00' }))
    await createBooking(draft({ start: '11:00', end: '12:00' }))
    await createBooking(draft({ start: '12:00', end: '13:00' }))

    expect(storedBookings()).toHaveLength(3)
  })
})

describe('updateBooking', () => {
  it('сдвиг брони внутри собственного времени — не конфликт', async () => {
    const booking = await createBooking(draft({ start: '11:00', end: '12:00' }))

    const updated = await updateBooking(booking.id, draft({ start: '11:30', end: '12:30' }))

    expect(updated).toEqual({ ...booking, start: '11:30', end: '12:30' })
    expect(storedBookings()).toEqual([updated])
  })

  it('409 — новое время занято другой бронью', async () => {
    const booking = await createBooking(draft({ start: '11:00', end: '12:00' }))
    await createBooking(draft({ start: '13:00', end: '14:00' }))

    expect(await statusOf(updateBooking(booking.id, draft({ start: '12:30', end: '13:30' })))).toBe(
      409,
    )
  })

  it('404 — брони уже нет', async () => {
    expect(await statusOf(updateBooking('missing', draft()))).toBe(404)
  })
})

describe('deleteBooking', () => {
  it('удаляет бронь', async () => {
    const booking = await createBooking(draft())

    await deleteBooking(booking.id)

    expect(storedBookings()).toEqual([])
  })

  it('404 — повторное удаление', async () => {
    const booking = await createBooking(draft())
    await deleteBooking(booking.id)

    expect(await statusOf(deleteBooking(booking.id))).toBe(404)
  })

  it('400 — закончившуюся бронь удалить нельзя', async () => {
    seedBookings([{ id: 'old', ...draft({ start: '09:00', end: '10:00' }) }])

    expect(await statusOf(deleteBooking('old'))).toBe(400)
    expect(storedBookings()).toHaveLength(1)
  })
})

describe('имитация конфликта', () => {
  it('«другой сотрудник» занимает время раньше нас, и сервер отвечает 409', async () => {
    setConflictSimulation(true)

    expect(await statusOf(createBooking(draft({ title: 'Моя встреча' })))).toBe(409)

    const [foreign] = storedBookings()
    expect(storedBookings()).toHaveLength(1)
    expect(foreign).toMatchObject({ start: '11:00', end: '12:00' })
    expect(foreign.title).not.toBe('Моя встреча')
  })
})
