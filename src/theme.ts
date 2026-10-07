import { createTheme } from '@mui/material/styles'
import { ruRU } from '@mui/material/locale'

export const theme = createTheme(
  {
    palette: {
      background: { default: '#f5f6f8' },
    },
    shape: { borderRadius: 8 },
    typography: {
      fontFamily: "system-ui, 'Segoe UI', Roboto, sans-serif",
      button: { textTransform: 'none' },
    },
  },
  ruRU,
)
