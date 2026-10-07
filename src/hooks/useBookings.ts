import { useEffect, useState } from 'react'
import { getBookings } from '../api/bookings'
import type { Booking } from '../types'
import { getErrorMessage } from '../utils/errors'

type LoadResult = {
  date: string
  bookings: Booking[]
  error: string | null
}

export function useBookings(date: string) {
  const [result, setResult] = useState<LoadResult | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let cancelled = false

    getBookings(date)
      .then((bookings) => {
        if (!cancelled) setResult({ date, bookings, error: null })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setResult((prev) => ({
          date,
          bookings: prev?.date === date ? prev.bookings : [],
          error: getErrorMessage(error),
        }))
      })

    return () => {
      cancelled = true
    }
  }, [date, version])

  const isActual = result?.date === date

  return {
    bookings: isActual ? result.bookings : [],
    loading: !isActual,
    error: isActual ? result.error : null,
    reload: () => setVersion((v) => v + 1),
  }
}
