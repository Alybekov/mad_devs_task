import { describe, expect, it } from 'vitest'
import { NOW } from '../test/helpers'
import { getDaySlots, isPast, shiftDateKey, toDateKey, toMinutes, toTime } from './time'

describe('toMinutes / toTime', () => {
  it.each([
    ['00:00', 0],
    ['09:00', 540],
    ['09:30', 570],
    ['18:00', 1080],
  ])('%s ↔ %i минут', (time, minutes) => {
    expect(toMinutes(time)).toBe(minutes)
    expect(toTime(minutes)).toBe(time)
  })
})

describe('toDateKey', () => {
  it('берёт локальную дату, а не UTC', () => {
    // В 00:30 по местному времени в UTC может быть ещё вчера — toISOString() дал бы ошибку
    expect(toDateKey(new Date(2030, 0, 1, 0, 30))).toBe('2030-01-01')
    expect(toDateKey(new Date(2030, 11, 31, 23, 59))).toBe('2030-12-31')
  })

  it('дополняет месяц и день нулями', () => {
    expect(toDateKey(new Date(2030, 2, 5))).toBe('2030-03-05')
  })
})

describe('shiftDateKey', () => {
  it.each([
    ['2030-01-10', 1, '2030-01-11'],
    ['2030-01-31', 1, '2030-02-01'],
    ['2030-01-01', -1, '2029-12-31'],
    ['2028-02-28', 1, '2028-02-29'],
    ['2030-02-28', 1, '2030-03-01'],
  ])('%s %+i день → %s', (date, days, expected) => {
    expect(shiftDateKey(date, days)).toBe(expected)
  })
})

describe('isPast', () => {
  // NOW = 10.01.2030 10:05
  it.each([
    ['вчера', '2030-01-09', '17:00', true],
    ['завтра', '2030-01-11', '09:00', false],
    ['сегодня, раньше текущего времени', '2030-01-10', '10:00', true],
    ['сегодня, ровно текущая минута', '2030-01-10', '10:05', false],
    ['сегодня, позже текущего времени', '2030-01-10', '10:30', false],
  ])('%s', (_, date, time, expected) => {
    expect(isPast(date, time, NOW)).toBe(expected)
  })
})

describe('getDaySlots', () => {
  it('делит рабочий день 09:00–18:00 на 18 слотов по 30 минут', () => {
    const slots = getDaySlots()
    expect(slots).toHaveLength(18)
    expect(slots[0]).toBe('09:00')
    expect(slots.at(-1)).toBe('17:30')
  })
})
