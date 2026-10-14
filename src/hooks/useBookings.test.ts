import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import * as api from '../api/bookings'
import { TODAY, TOMORROW, draft } from '../test/helpers'
import type { Booking } from '../types'
import { useBookings } from './useBookings'

const todayBooking: Booking = { id: 'today', ...draft() }
const tomorrowBooking: Booking = { id: 'tomorrow', ...draft({ date: TOMORROW }) }

/** Промис, который мы разрешаем вручную — чтобы управлять порядком ответов */
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useBookings', () => {
  it('загружает брони выбранной даты', async () => {
    vi.spyOn(api, 'getBookings').mockResolvedValue([todayBooking])

    const { result } = renderHook(() => useBookings(TODAY))

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.bookings).toEqual([todayBooking])
  })

  it('игнорирует запоздавший ответ по предыдущей дате', async () => {
    const todayRequest = deferred<Booking[]>()
    const tomorrowRequest = deferred<Booking[]>()
    vi.spyOn(api, 'getBookings').mockImplementation((date) =>
      date === TODAY ? todayRequest.promise : tomorrowRequest.promise,
    )

    const { result, rerender } = renderHook(({ date }) => useBookings(date), {
      initialProps: { date: TODAY },
    })
    rerender({ date: TOMORROW })

    // Ответ за «завтра» пришёл первым, за «сегодня» — позже
    await act(async () => tomorrowRequest.resolve([tomorrowBooking]))
    await act(async () => todayRequest.resolve([todayBooking]))

    expect(result.current.bookings).toEqual([tomorrowBooking])
  })

  it('показывает ошибку и после reload загружает данные заново', async () => {
    const getBookings = vi
      .spyOn(api, 'getBookings')
      .mockRejectedValueOnce(new Error('Сеть недоступна'))
      .mockResolvedValueOnce([todayBooking])

    const { result } = renderHook(() => useBookings(TODAY))

    await waitFor(() => expect(result.current.error).toBe('Сеть недоступна'))
    expect(result.current.loading).toBe(false)

    act(() => result.current.reload())

    await waitFor(() => expect(result.current.bookings).toEqual([todayBooking]))
    expect(result.current.error).toBeNull()
    expect(getBookings).toHaveBeenCalledTimes(2)
  })

  it('при ошибке перезагрузки не стирает уже показанные брони', async () => {
    vi.spyOn(api, 'getBookings')
      .mockResolvedValueOnce([todayBooking])
      .mockRejectedValueOnce(new Error('Сеть недоступна'))

    const { result } = renderHook(() => useBookings(TODAY))
    await waitFor(() => expect(result.current.bookings).toEqual([todayBooking]))

    act(() => result.current.reload())

    await waitFor(() => expect(result.current.error).toBe('Сеть недоступна'))
    expect(result.current.bookings).toEqual([todayBooking])
  })
})
