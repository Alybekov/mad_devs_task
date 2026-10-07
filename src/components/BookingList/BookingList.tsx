import {
  Chip,
  CircularProgress,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import type { Booking } from '../../types.ts'
import { canDeleteBooking, canEditBooking } from '../../utils/validation.ts'

type Props = {
  bookings: Booking[]
  now: Date
  editingId: string | null
  deletingId: string | null
  onEdit: (booking: Booking) => void
  onDelete: (booking: Booking) => void
}

export function BookingList({ bookings, now, editingId, deletingId, onEdit, onDelete }: Props) {
  if (bookings.length === 0) {
    return <Typography color="text.secondary">На эту дату бронирований нет</Typography>
  }

  return (
    <List disablePadding>
      {bookings.map((booking) => {
        const canEdit = canEditBooking(booking, now)
        const canDelete = canDeleteBooking(booking, now)
        const isEditing = booking.id === editingId
        const isDeleting = booking.id === deletingId

        const actions =
          canEdit || canDelete ? (
            <Stack direction="row">
              {canEdit && (
                <Tooltip title="Изменить">
                  <span>
                    <IconButton
                      size="small"
                      aria-label="Изменить"
                      disabled={isEditing}
                      onClick={() => onEdit(booking)}
                    >
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              )}
              {canDelete && (
                <Tooltip title="Удалить">
                  <span>
                    <IconButton
                      size="small"
                      color="error"
                      aria-label="Удалить"
                      disabled={isDeleting}
                      onClick={() => onDelete(booking)}
                    >
                      {isDeleting ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        <DeleteOutlinedIcon fontSize="small" />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
              )}
            </Stack>
          ) : (
            <Chip size="small" label="Прошла" />
          )

        return (
          <ListItem
            key={booking.id}
            divider
            secondaryAction={actions}
            sx={{
              pr: 12,
              borderRadius: 1,
              bgcolor: isEditing ? 'action.selected' : undefined,
            }}
          >
            <ListItemText
              primary={`${booking.start}–${booking.end}`}
              secondary={booking.title}
              slotProps={{
                primary: { sx: { fontWeight: 600, fontVariantNumeric: 'tabular-nums' } },
                secondary: { sx: { overflowWrap: 'anywhere' } },
              }}
            />
          </ListItem>
        )
      })}
    </List>
  )
}
