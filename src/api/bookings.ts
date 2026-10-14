import type { Booking, BookingDraft } from '../types'
import {
  canDeleteBooking,
  conflictMessage,
  findConflict,
  validateBooking,
} from '../utils/validation'

const STORAGE_KEY = 'meeting-room-bookings'
// В тестах задержка не нужна — она только замедляет прогон
const LATENCY_MS = import.meta.env.MODE === 'test' ? 0 : 400

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

let conflictSimulation = false

export function setConflictSimulation(enabled: boolean) {
  conflictSimulation = enabled
}

export async function getBookings(date: string): Promise<Booking[]> {
  await wait(LATENCY_MS)
  return readAll()
    .filter((b) => b.date === date)
    .sort((a, b) => a.start.localeCompare(b.start))
}

export async function createBooking(draft: BookingDraft): Promise<Booking> {
  await wait(LATENCY_MS)
  const all = readAll()
  simulateAnotherUser(draft, all)
  checkDraft(draft, all)

  const booking: Booking = { ...draft, id: crypto.randomUUID() }
  writeAll([...all, booking])
  return booking
}

export async function updateBooking(id: string, draft: BookingDraft): Promise<Booking> {
  await wait(LATENCY_MS)
  const all = readAll()
  if (!all.some((b) => b.id === id)) {
    throw new ApiError(404, 'Бронь не найдена — возможно, её уже удалили')
  }
  simulateAnotherUser(draft, all, id)
  checkDraft(draft, all, id)

  const booking: Booking = { ...draft, id }
  writeAll(all.map((b) => (b.id === id ? booking : b)))
  return booking
}

export async function deleteBooking(id: string): Promise<void> {
  await wait(LATENCY_MS)
  const all = readAll()
  const booking = all.find((b) => b.id === id)
  if (!booking) {
    throw new ApiError(404, 'Бронь не найдена — возможно, её уже удалили')
  }
  if (!canDeleteBooking(booking, new Date())) {
    throw new ApiError(400, 'Нельзя удалить уже прошедшую бронь')
  }
  writeAll(all.filter((b) => b.id !== id))
}

function checkDraft(draft: BookingDraft, all: Booking[], ignoreId?: string) {
  const error = validateBooking(draft, new Date())
  if (error) throw new ApiError(400, error)

  const conflict = findConflict(draft, all, ignoreId)
  if (conflict) throw new ApiError(409, conflictMessage(conflict))
}

function simulateAnotherUser(draft: BookingDraft, all: Booking[], ignoreId?: string) {
  if (!conflictSimulation || findConflict(draft, all, ignoreId)) return

  all.push({
    id: crypto.randomUUID(),
    date: draft.date,
    start: draft.start,
    end: draft.end,
    title: 'Бронь другого сотрудника',
  })
  writeAll(all)
}

function readAll(): Booking[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Booking[]) : []
  } catch {
    return []
  }
}

function writeAll(bookings: Booking[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings))
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
