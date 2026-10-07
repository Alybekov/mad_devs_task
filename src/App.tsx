import { useState } from 'react'
import { Alert, Box, Button, Container, Paper, Typography } from '@mui/material'
import { DateSelector } from './components/DateSelector/DateSelector.tsx'
import { DaySchedule } from './components/DaySchedule/DaySchedule.tsx'
import { useBookings } from './hooks/useBookings'
import { useNow } from './hooks/useNow'
import { toDateKey } from './utils/time'

function App() {
  const now = useNow()
  const today = toDateKey(now)
  const [date, setDate] = useState(today)
  const { bookings, loading, error: loadError, reload } = useBookings(date)

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

      <DateSelector value={date} today={today} onChange={setDate} />

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

      <Paper component="section" variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>
          Расписание
        </Typography>
        <DaySchedule
          date={date}
          bookings={bookings}
          now={now}
          loading={loading}
          selection={null}
          onSelectFree={() => {}}
          onSelectBooking={() => {}}
        />
      </Paper>
    </Container>
  )
}

export default App
