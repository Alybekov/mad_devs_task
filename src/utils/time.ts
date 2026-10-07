export const WORK_DAY_START = 9 * 60
export const WORK_DAY_END = 18 * 60
export const SLOT_MINUTES = 30
export const MIN_DURATION = 30
export const MAX_DURATION = 120

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

export function toTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  return `${pad(hours)}:${pad(minutes % 60)}`
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function shiftDateKey(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  return toDateKey(new Date(year, month - 1, day + days))
}

export function formatDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function isPast(dateKey: string, time: string, now: Date): boolean {
  const today = toDateKey(now)
  if (dateKey !== today) return dateKey < today
  return toMinutes(time) < now.getHours() * 60 + now.getMinutes()
}

export function getDaySlots(): string[] {
  const slots: string[] = []
  for (let m = WORK_DAY_START; m < WORK_DAY_END; m += SLOT_MINUTES) {
    slots.push(toTime(m))
  }
  return slots
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}
