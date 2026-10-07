import type { Booking, BookingDraft } from '../types'
import {
  MAX_DURATION,
  MIN_DURATION,
  WORK_DAY_END,
  WORK_DAY_START,
  isPast,
  toDateKey,
  toMinutes,
} from './time'

export function validateBooking(draft: BookingDraft, now: Date): string | null {
  if (!draft.title.trim()) return 'Укажите название встречи'

  const start = toMinutes(draft.start)
  const end = toMinutes(draft.end)

  if (start < WORK_DAY_START || end > WORK_DAY_END) {
    return 'Бронировать можно только в рабочее время: с 09:00 до 18:00'
  }
  if (start >= end) return 'Время начала должно быть раньше времени окончания'
  if (end - start < MIN_DURATION) return 'Минимальная длительность брони — 30 минут'
  if (end - start > MAX_DURATION) return 'Максимальная длительность брони — 2 часа'

  if (draft.date < toDateKey(now)) return 'Нельзя бронировать на прошедшую дату'
  if (isPast(draft.date, draft.start, now)) return 'Это время уже прошло, выберите более позднее'

  return null
}

export function findConflict(
  range: Pick<Booking, 'date' | 'start' | 'end'>,
  bookings: Booking[],
  ignoreId?: string | null,
): Booking | undefined {
  const start = toMinutes(range.start)
  const end = toMinutes(range.end)

  return bookings.find(
    (b) =>
      b.id !== ignoreId &&
      b.date === range.date &&
      start < toMinutes(b.end) &&
      toMinutes(b.start) < end,
  )
}

export function conflictMessage(booking: Booking): string {
  return `Время пересекается с бронью «${booking.title}» (${booking.start}–${booking.end})`
}

export function canEditBooking(booking: Booking, now: Date): boolean {
  return !isPast(booking.date, booking.start, now)
}

export function canDeleteBooking(booking: Booking, now: Date): boolean {
  return !isPast(booking.date, booking.end, now)
}
