import { Button, IconButton, Stack, TextField, Typography } from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { formatDate, shiftDateKey } from '../../utils/time.ts'

type Props = {
  value: string
  today: string
  onChange: (date: string) => void
}

export function DateSelector({ value, today, onChange }: Props) {
  return (
    <Stack spacing={1} sx={{ mb: 2 }}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <IconButton aria-label="Предыдущий день" onClick={() => onChange(shiftDateKey(value, -1))}>
          <ChevronLeftIcon />
        </IconButton>
        <TextField
          type="date"
          size="small"
          label="Дата"
          value={value}
          onChange={(e) => {
            if (e.target.value) onChange(e.target.value)
          }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <IconButton aria-label="Следующий день" onClick={() => onChange(shiftDateKey(value, 1))}>
          <ChevronRightIcon />
        </IconButton>
        <Button variant="outlined" disabled={value === today} onClick={() => onChange(today)}>
          Сегодня
        </Button>
      </Stack>
      <Typography color="text.secondary" sx={{ '&::first-letter': { textTransform: 'uppercase' } }}>
        {formatDate(value)}
      </Typography>
    </Stack>
  )
}
