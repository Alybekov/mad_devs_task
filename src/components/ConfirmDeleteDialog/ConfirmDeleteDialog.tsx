import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import type { Booking } from '../../types.ts'

type Props = {
  booking: Booking | null
  onCancel: () => void
  onConfirm: (booking: Booking) => void
}

export function ConfirmDeleteDialog({ booking, onCancel, onConfirm }: Props) {
  // Запоминаем бронь, чтобы текст не пропадал во время анимации закрытия
  const [lastBooking, setLastBooking] = useState(booking)
  if (booking && booking !== lastBooking) setLastBooking(booking)
  const shown = booking ?? lastBooking

  return (
    <Dialog open={booking !== null} onClose={onCancel}>
      <DialogTitle>Удалить бронь?</DialogTitle>
      {shown && (
        <DialogContent>
          <DialogContentText>
            «{shown.title}», {shown.start}–{shown.end}. Отменить удаление будет нельзя.
          </DialogContentText>
        </DialogContent>
      )}
      <DialogActions>
        <Button onClick={onCancel}>Отмена</Button>
        <Button color="error" variant="contained" onClick={() => shown && onConfirm(shown)}>
          Удалить
        </Button>
      </DialogActions>
    </Dialog>
  )
}
