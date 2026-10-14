import { describe, expect, it } from 'vitest'
import { NOW, TODAY, TOMORROW, YESTERDAY, draft } from '../test/helpers'
import type { Booking } from '../types'
import {
  canDeleteBooking,
  canEditBooking,
  conflictMessage,
  findConflict,
  validateBooking,
} from './validation'

describe('validateBooking', () => {
  it.each([
    ['обычная бронь', draft()],
    [
      'начало рабочего дня (завтра 09:00–09:30)',
      draft({ date: TOMORROW, start: '09:00', end: '09:30' }),
    ],
    ['конец рабочего дня 17:00–18:00', draft({ start: '17:00', end: '18:00' })],
    ['ровно 30 минут', draft({ start: '11:00', end: '11:30' })],
    ['ровно 2 часа', draft({ start: '11:00', end: '13:00' })],
    ['начало в текущую минуту', draft({ start: '10:05', end: '10:35' })],
    ['будущая дата', draft({ date: TOMORROW })],
  ])('пропускает: %s', (_, value) => {
    expect(validateBooking(value, NOW)).toBeNull()
  })

  it.each([
    ['пустое название', draft({ title: '' }), 'Укажите название'],
    ['название из пробелов', draft({ title: '   ' }), 'Укажите название'],
    ['раньше 09:00', draft({ date: TOMORROW, start: '08:30', end: '09:30' }), 'рабочее время'],
    ['позже 18:00', draft({ start: '17:30', end: '18:30' }), 'рабочее время'],
    ['start === end', draft({ start: '11:00', end: '11:00' }), 'раньше времени окончания'],
    ['start > end', draft({ start: '12:00', end: '11:00' }), 'раньше времени окончания'],
    ['меньше 30 минут', draft({ start: '11:00', end: '11:15' }), '30 минут'],
    ['больше 2 часов', draft({ start: '11:00', end: '13:30' }), '2 часа'],
    ['прошедшая дата', draft({ date: YESTERDAY }), 'прошедшую дату'],
    ['прошедшее время сегодня', draft({ start: '10:00', end: '11:00' }), 'уже прошло'],
  ])('отклоняет: %s', (_, value, message) => {
    expect(validateBooking(value, NOW)).toContain(message)
  })
})

describe('findConflict', () => {
  const existing: Booking = { id: 'a', ...draft({ start: '11:00', end: '12:00', title: 'Занято' }) }
  const range = (start: string, end: string, date = TODAY) => ({ date, start, end })

  it.each([
    ['касание сверху: 10:00–11:00', range('10:00', '11:00')],
    ['касание снизу: 12:00–13:00', range('12:00', '13:00')],
    ['другая дата', range('11:00', '12:00', TOMORROW)],
  ])('нет конфликта — %s', (_, value) => {
    expect(findConflict(value, [existing])).toBeUndefined()
  })

  it.each([
    ['то же время', range('11:00', '12:00')],
    ['заходит сверху', range('10:30', '11:30')],
    ['заходит снизу', range('11:30', '12:30')],
    ['внутри чужой брони', range('11:15', '11:45')],
    ['накрывает чужую бронь', range('10:00', '13:00')],
  ])('конфликт — %s', (_, value) => {
    expect(findConflict(value, [existing])).toBe(existing)
  })

  it('при редактировании бронь не конфликтует сама с собой', () => {
    expect(findConflict(range('11:00', '12:30'), [existing], 'a')).toBeUndefined()
  })

  it('но всё ещё конфликтует с остальными', () => {
    const other: Booking = { id: 'b', ...draft({ start: '12:00', end: '13:00' }) }
    expect(findConflict(range('11:00', '12:30'), [existing, other], 'a')).toBe(other)
  })

  it('сообщение называет занятую бронь и её время', () => {
    expect(conflictMessage(existing)).toBe('Время пересекается с бронью «Занято» (11:00–12:00)')
  })
})

describe('canEditBooking / canDeleteBooking', () => {
  // NOW = 10:05
  const booking = (start: string, end: string): Booking => ({
    id: 'x',
    ...draft({ start, end }),
  })

  it('будущую бронь можно и изменить, и удалить', () => {
    expect(canEditBooking(booking('11:00', '12:00'), NOW)).toBe(true)
    expect(canDeleteBooking(booking('11:00', '12:00'), NOW)).toBe(true)
  })

  it('идущую бронь нельзя изменить, но можно удалить (освободить комнату)', () => {
    expect(canEditBooking(booking('10:00', '11:00'), NOW)).toBe(false)
    expect(canDeleteBooking(booking('10:00', '11:00'), NOW)).toBe(true)
  })

  it('закончившуюся бронь нельзя ни изменить, ни удалить', () => {
    expect(canEditBooking(booking('09:00', '10:00'), NOW)).toBe(false)
    expect(canDeleteBooking(booking('09:00', '10:00'), NOW)).toBe(false)
  })
})
