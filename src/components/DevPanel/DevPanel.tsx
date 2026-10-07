import { useState } from 'react'
import { FormControlLabel, Paper, Switch, Typography } from '@mui/material'
import { setConflictSimulation } from '../../api/bookings.ts'

export function DevPanel() {
  const [enabled, setEnabled] = useState(false)

  function handleChange(checked: boolean) {
    setEnabled(checked)
    setConflictSimulation(checked)
  }

  return (
    <Paper component="footer" variant="outlined" sx={{ mt: 4, p: 2, borderStyle: 'dashed' }}>
      <FormControlLabel
        control={<Switch checked={enabled} onChange={(e) => handleChange(e.target.checked)} />}
        label="Имитировать конфликт на сервере"
      />
      <Typography variant="body2" color="text.secondary">
        Перед сохранением «другой сотрудник» займёт выбранное время, и сервер ответит 409. Ещё один
        способ — открыть приложение в двух вкладках.
      </Typography>
    </Paper>
  )
}
