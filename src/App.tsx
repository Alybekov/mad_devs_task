import { Box, Container, Typography } from '@mui/material'

function App() {
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
    </Container>
  )
}

export default App
