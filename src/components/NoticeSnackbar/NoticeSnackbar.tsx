import { useState } from 'react'
import { Alert, Snackbar } from '@mui/material'
import type { Notice } from '../../types.ts'

type Props = {
  notice: Notice | null
  onClose: () => void
}

export function NoticeSnackbar({ notice, onClose }: Props) {
  // Как и в диалоге: держим последнее сообщение, пока снекбар уезжает
  const [lastNotice, setLastNotice] = useState(notice)
  if (notice && notice !== lastNotice) setLastNotice(notice)
  const shown = notice ?? lastNotice

  return (
    <Snackbar
      open={notice !== null}
      autoHideDuration={4000}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      onClose={(_, reason) => {
        if (reason !== 'clickaway') onClose()
      }}
    >
      <Alert severity={shown?.type ?? 'success'} variant="filled" onClose={onClose}>
        {shown?.text}
      </Alert>
    </Snackbar>
  )
}
