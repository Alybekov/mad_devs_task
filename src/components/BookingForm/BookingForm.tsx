import type { FormEvent } from 'react'
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material'
import type { Booking, BookingFormValues } from '../../types.ts'
import {
  MAX_DURATION,
  MIN_DURATION,
  SLOT_MINUTES,
  WORK_DAY_END,
  getDaySlots,
  isPast,
  toMinutes,
  toTime,
} from '../../utils/time.ts'
import { findConflict } from '../../utils/validation.ts'

type Props = {
  date: string
  values: BookingFormValues
  bookings: Booking[]
  now: Date
  error: string | null
  saving: boolean
  onChange: (values: BookingFormValues) => void
  onSubmit: () => void
  onCancel: () => void
}

export function BookingForm({
  date,
  values,
  bookings,
  now,
  error,
  saving,
  onChange,
  onSubmit,
  onCancel,
}: Props) {
  const isEditing = values.bookingId !== null
  const startMinutes = toMinutes(values.start)

  const isBusy = (start: string, end: string) =>
    findConflict({ date, start, end }, bookings, values.bookingId) !== undefined

  const startOptions = getDaySlots().map((time) => ({
    value: time,
    disabled: isPast(date, time, now) || isBusy(time, toTime(toMinutes(time) + SLOT_MINUTES)),
  }))

  const endOptions = []
  const lastEnd = Math.min(startMinutes + MAX_DURATION, WORK_DAY_END)
  for (let m = startMinutes + MIN_DURATION; m <= lastEnd; m += SLOT_MINUTES) {
    const time = toTime(m)
    endOptions.push({ value: time, disabled: isBusy(values.start, time) })
  }

  function handleStartChange(start: string) {
    const duration = toMinutes(values.end) - toMinutes(start)
    const end =
      duration >= MIN_DURATION && duration <= MAX_DURATION
        ? values.end
        : toTime(toMinutes(start) + MIN_DURATION)

    onChange({ ...values, start, end })
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit()
  }

  return (
    <Stack component="form" spacing={2} noValidate onSubmit={handleSubmit}>
      <Typography variant="h6" component="h2">
        {isEditing ? 'Редактирование брони' : 'Новая бронь'}
      </Typography>

      <TextField
        label="Название встречи"
        placeholder="Например, планёрка команды"
        value={values.title}
        autoFocus
        fullWidth
        onChange={(e) => onChange({ ...values, title: e.target.value })}
        slotProps={{ htmlInput: { maxLength: 100 } }}
      />

      <Stack direction="row" spacing={2}>
        <TextField
          select
          label="Начало"
          value={values.start}
          fullWidth
          onChange={(e) => handleStartChange(e.target.value)}
        >
          {startOptions.map((option) => (
            <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
              {option.value}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          select
          label="Окончание"
          value={values.end}
          fullWidth
          onChange={(e) => onChange({ ...values, end: e.target.value })}
        >
          {endOptions.map((option) => (
            <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
              {option.value}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ mt: '4px !important' }}>
        От 30 минут до 2 часов, с 09:00 до 18:00
      </Typography>

      {error && <Alert severity="error">{error}</Alert>}

      <Stack direction="row" spacing={1}>
        <Button type="submit" variant="contained" loading={saving}>
          {isEditing ? 'Сохранить' : 'Забронировать'}
        </Button>
        <Button disabled={saving} onClick={onCancel}>
          Отмена
        </Button>
      </Stack>
    </Stack>
  )
}
