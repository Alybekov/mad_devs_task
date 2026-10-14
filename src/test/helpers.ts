import { vi } from 'vitest'
import type { Booking, BookingDraft } from '../types'

/** Все тесты живут в одном и том же «сегодня»: 10 января 2030, 10:05 */
export const TODAY = '2030-01-10'
export const YESTERDAY = '2030-01-09'
export const TOMORROW = '2030-01-11'
export const NOW = new Date(2030, 0, 10, 10, 5)

/**
 * Подменяем только Date: setTimeout и setInterval остаются настоящими,
 * чтобы не ломать waitFor из Testing Library и анимации MUI.
 */
export function freezeTime(date: Date = NOW) {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(date)
}

export function draft(overrides: Partial<BookingDraft> = {}): BookingDraft {
  return { date: TODAY, start: '11:00', end: '12:00', title: 'Планёрка', ...overrides }
}

/** Кладёт брони прямо в «базу» мок-сервера — как будто их создал кто-то другой */
export function seedBookings(bookings: Booking[]) {
  localStorage.setItem('meeting-room-bookings', JSON.stringify(bookings))
}

export function storedBookings(): Booking[] {
  return JSON.parse(localStorage.getItem('meeting-room-bookings') ?? '[]') as Booking[]
}
