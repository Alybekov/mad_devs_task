import { ButtonBase, Skeleton, Stack, Typography } from '@mui/material'
import { alpha, type SxProps, type Theme } from '@mui/material/styles'
import type { Booking } from '../../types.ts'
import { SLOT_MINUTES, getDaySlots, isPast, toMinutes, toTime } from '../../utils/time.ts'
import { canEditBooking, findConflict } from '../../utils/validation.ts'

type Props = {
  date: string
  bookings: Booking[]
  now: Date
  loading: boolean
  selection: { start: string; end: string } | null
  onSelectFree: (start: string) => void
  onSelectBooking: (booking: Booking) => void
}

type SlotStatus = 'free' | 'busy' | 'past'

const SLOTS = getDaySlots()

function getSlotSx(status: SlotStatus, selected: boolean): SxProps<Theme> {
  return (theme) => {
    const primary = theme.palette.primary.main
    const warning = theme.palette.warning.main

    return {
      width: '100%',
      minHeight: 40,
      px: 1.5,
      justifyContent: 'flex-start',
      gap: 2,
      border: 1,
      borderColor: 'divider',
      borderRadius: 1,
      textAlign: 'left',
      ...(status === 'free' && {
        bgcolor: 'background.paper',
        '&:hover': { borderColor: 'primary.main', bgcolor: alpha(primary, 0.06) },
      }),
      ...(status === 'busy' && {
        bgcolor: alpha(warning, 0.12),
        borderColor: alpha(warning, 0.5),
        fontWeight: 500,
        '&.Mui-disabled': { opacity: 0.6 },
      }),
      ...(status === 'past' && {
        background: `repeating-linear-gradient(-45deg, ${theme.palette.action.hover} 0 6px, transparent 6px 12px)`,
      }),
      ...(selected && {
        borderColor: 'primary.main',
        bgcolor: alpha(primary, 0.1),
        boxShadow: `inset 3px 0 0 ${primary}`,
      }),
    }
  }
}

export function DaySchedule({
  date,
  bookings,
  now,
  loading,
  selection,
  onSelectFree,
  onSelectBooking,
}: Props) {
  if (loading) {
    return (
      <Stack spacing={0.5}>
        {SLOTS.map((time) => (
          <Skeleton key={time} variant="rounded" height={40} />
        ))}
      </Stack>
    )
  }

  return (
    <Stack component="ul" spacing={0.5} sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {SLOTS.map((time) => {
        const end = toTime(toMinutes(time) + SLOT_MINUTES)
        const booking = findConflict({ date, start: time, end }, bookings)
        const selected = selection !== null && time >= selection.start && end <= selection.end

        let status: SlotStatus = 'free'
        let label = 'Свободно'
        let onClick: (() => void) | undefined

        if (booking) {
          status = 'busy'
          label = booking.start >= time ? `${booking.title} · ${booking.start}–${booking.end}` : ''
          if (canEditBooking(booking, now)) onClick = () => onSelectBooking(booking)
        } else if (isPast(date, time, now)) {
          status = 'past'
          label = ''
        } else {
          onClick = () => onSelectFree(time)
        }

        return (
          <li key={time}>
            <ButtonBase disabled={!onClick} onClick={onClick} sx={getSlotSx(status, selected)}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ width: 44, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}
              >
                {time}
              </Typography>
              <Typography
                variant="body2"
                noWrap
                color={status === 'free' ? 'text.secondary' : 'text.primary'}
                sx={{ fontWeight: 'inherit' }}
              >
                {label}
              </Typography>
            </ButtonBase>
          </li>
        )
      })}
    </Stack>
  )
}
