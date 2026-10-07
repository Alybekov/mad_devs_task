export type Booking = {
  id: string
  date: string
  start: string
  end: string
  title: string
}

export type BookingDraft = Omit<Booking, 'id'>

export type BookingFormValues = {
  bookingId: string | null
  title: string
  start: string
  end: string
}

export type Notice = { type: 'success' | 'error'; text: string }
