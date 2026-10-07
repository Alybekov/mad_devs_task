import { useState } from 'react'
import { Alert, Box, Button, Container, Paper, Skeleton, Stack, Typography } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { createBooking, deleteBooking, updateBooking } from './api/bookings'
import { BookingForm } from './components/BookingForm/BookingForm.tsx'
import { BookingList } from './components/BookingList/BookingList.tsx'
import { ConfirmDeleteDialog } from './components/ConfirmDeleteDialog/ConfirmDeleteDialog.tsx'
import { DateSelector } from './components/DateSelector/DateSelector.tsx'
import { DaySchedule } from './components/DaySchedule/DaySchedule.tsx'
import { NoticeSnackbar } from './components/NoticeSnackbar/NoticeSnackbar.tsx'
import { useBookings } from './hooks/useBookings'
import { useNow } from './hooks/useNow'
import type { Booking, BookingFormValues, Notice } from './types'
import { getErrorMessage } from './utils/errors'
import { MIN_DURATION, getDaySlots, isPast, toDateKey, toMinutes, toTime } from './utils/time'
import { conflictMessage, findConflict, validateBooking } from './utils/validation'

function App() {
  const now = useNow()
  const today = toDateKey(now)
  const [date, setDate] = useState(today)
  const { bookings, loading, error: loadError, reload } = useBookings(date)

  const [form, setForm] = useState<BookingFormValues | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [bookingToDelete, setBookingToDelete] = useState<Booking | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  const isPastDate = date < today

  const firstFreeSlot = getDaySlots().find((start) => {
    const end = toTime(toMinutes(start) + MIN_DURATION)
    return !isPast(date, start, now) && !findConflict({ date, start, end }, bookings)
  })

  function handleDateChange(nextDate: string) {
    setDate(nextDate)
    closeForm()
  }

  function openCreateForm(start: string) {
    const end = toTime(toMinutes(start) + MIN_DURATION)
    // Если форма создания уже открыта — меняем только время, название не трогаем
    setForm((prev) =>
      prev && prev.bookingId === null
        ? { ...prev, start, end }
        : { bookingId: null, title: '', start, end },
    )
    setFormError(null)
  }

  function openEditForm(booking: Booking) {
    setForm({
      bookingId: booking.id,
      title: booking.title,
      start: booking.start,
      end: booking.end,
    })
    setFormError(null)
  }

  function closeForm() {
    setForm(null)
    setFormError(null)
  }

  async function handleSubmit() {
    if (!form) return

    const draft = { date, title: form.title.trim(), start: form.start, end: form.end }
    const conflict = findConflict(draft, bookings, form.bookingId)
    const error = validateBooking(draft, now) ?? (conflict ? conflictMessage(conflict) : null)
    if (error) {
      setFormError(error)
      return
    }

    setSaving(true)
    setFormError(null)
    try {
      if (form.bookingId) {
        await updateBooking(form.bookingId, draft)
      } else {
        await createBooking(draft)
      }
      setNotice({
        type: 'success',
        text: form.bookingId ? 'Бронь изменена' : 'Комната забронирована',
      })
      setForm(null)
      reload()
    } catch (e) {
      setFormError(getErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(booking: Booking) {
    setBookingToDelete(null)
    setDeletingId(booking.id)
    try {
      await deleteBooking(booking.id)
      setNotice({ type: 'success', text: 'Бронь удалена' })
      if (form?.bookingId === booking.id) closeForm()
    } catch (e) {
      setNotice({ type: 'error', text: getErrorMessage(e) })
    } finally {
      setDeletingId(null)
      reload()
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Box component="header" sx={{ mb: 2 }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          Переговорная
        </Typography>
        <Typography color="text.secondary">
          Рабочий день 09:00–18:00 · бронь от 30 минут до 2 часов
        </Typography>
      </Box>

      <DateSelector value={date} today={today} onChange={handleDateChange} />

      {loadError && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={reload}>
              Повторить
            </Button>
          }
        >
          Не удалось загрузить бронирования: {loadError}
        </Alert>
      )}

      <Box
        component="main"
        sx={{
          display: 'grid',
          gap: 2,
          gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 380px' },
          alignItems: 'start',
        }}
      >
        <Paper component="section" variant="outlined" sx={{ p: 2 }}>
          <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>
            Расписание
          </Typography>
          <DaySchedule
            date={date}
            bookings={bookings}
            now={now}
            loading={loading}
            selection={form}
            onSelectFree={openCreateForm}
            onSelectBooking={openEditForm}
          />
        </Paper>

        <Stack spacing={2}>
          <Paper component="section" variant="outlined" sx={{ p: 2 }}>
            {isPastDate ? (
              <Typography color="text.secondary">
                Эта дата уже прошла — создавать брони нельзя.
              </Typography>
            ) : form ? (
              <BookingForm
                date={date}
                values={form}
                bookings={bookings}
                now={now}
                error={formError}
                saving={saving}
                onChange={setForm}
                onSubmit={handleSubmit}
                onCancel={closeForm}
              />
            ) : (
              <Stack spacing={1} sx={{ alignItems: 'flex-start' }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  disabled={loading || !firstFreeSlot}
                  onClick={() => firstFreeSlot && openCreateForm(firstFreeSlot)}
                >
                  Новая бронь
                </Button>
                <Typography variant="body2" color="text.secondary">
                  {firstFreeSlot || loading
                    ? 'Или выберите свободный слот в расписании'
                    : 'На эту дату свободного времени не осталось'}
                </Typography>
              </Stack>
            )}
          </Paper>

          <Paper component="section" variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" component="h2" sx={{ mb: 1 }}>
              Бронирования
            </Typography>
            {loading ? (
              <Stack spacing={1}>
                <Skeleton variant="rounded" height={56} />
                <Skeleton variant="rounded" height={56} />
              </Stack>
            ) : (
              <BookingList
                bookings={bookings}
                now={now}
                editingId={form?.bookingId ?? null}
                deletingId={deletingId}
                onEdit={openEditForm}
                onDelete={setBookingToDelete}
              />
            )}
          </Paper>
        </Stack>
      </Box>

      <ConfirmDeleteDialog
        booking={bookingToDelete}
        onCancel={() => setBookingToDelete(null)}
        onConfirm={handleDelete}
      />
      <NoticeSnackbar notice={notice} onClose={() => setNotice(null)} />
    </Container>
  )
}

export default App
