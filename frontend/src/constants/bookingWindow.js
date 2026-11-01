// Which days/times the form offers, in Brisbane time. The backend mirrors these
// in backend/lib/bookingWindow.js — change both together.
//
// Whether a workshop takes same-day bookings comes from the API (`same_day` on
// /api/unavailable-days), so it is switched on and off in one place: the server.

export const AU_TIMEZONE = 'Australia/Brisbane'
export const NEXT_DAY_CUTOFF_HOUR = 16
export const SAME_DAY_MIN_NOTICE_MINUTES = 120

export const MORNING_SLOTS = ['8:00 AM', '8:30 AM', '9:00 AM', '9:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM']
export const AFTERNOON_SLOTS = ['1:00 PM', '1:30 PM', '2:00 PM', '2:30 PM', '3:00 PM', '3:30 PM', '4:00 PM', '4:30 PM']
const ALL_SLOTS = [...MORNING_SLOTS, ...AFTERNOON_SLOTS]

/** "3:30 PM" → minutes since midnight, or NaN. @param {string} label */
export function slotLabelToMinutes(label) {
  const m = String(label || '').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!m) return Number.NaN
  const hours = (Number(m[1]) % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0)
  return hours * 60 + Number(m[2])
}

/** @param {string} ymd @param {number} amount */
export function addDaysToYmd(ymd, amount) {
  const m = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return ''
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

/** Brisbane wall-clock date and minutes since midnight. */
export function brisbaneNow(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: AU_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(date).map((p) => [p.type, p.value])
  )
  const hour = Number.parseInt(parts.hour, 10) % 24
  return {
    ymd: `${parts.year}-${parts.month}-${parts.day}`,
    year: Number.parseInt(parts.year, 10),
    month: Number.parseInt(parts.month, 10),
    day: Number.parseInt(parts.day, 10),
    hour,
    minutes: hour * 60 + Number.parseInt(parts.minute, 10),
  }
}

/**
 * Can this slot be booked right now? Only today's slots are ever time-limited.
 * @param {{ dateYmd: string, label: string, now: { ymd: string, minutes: number }, sameDay: boolean }} args
 */
export function isSlotOpen({ dateYmd, label, now, sameDay }) {
  if (dateYmd !== now.ymd) return true
  return sameDay && slotLabelToMinutes(label) >= now.minutes + SAME_DAY_MIN_NOTICE_MINUTES
}

/** True while same-day is on and at least one of today's slots is 2+ hours away. */
export function isTodayOpen(now, sameDay) {
  return ALL_SLOTS.some((label) => isSlotOpen({ dateYmd: now.ymd, label, now, sameDay }))
}

/** First bookable slot on a date, or '' if none. */
export function firstOpenSlot({ dateYmd, now, sameDay }) {
  return ALL_SLOTS.find((label) => isSlotOpen({ dateYmd, label, now, sameDay })) || ''
}

/** Earliest date the form may offer (before skipping weekends / blocked days). */
export function earliestDateYmd(now, sameDay) {
  if (sameDay) return isTodayOpen(now, true) ? now.ymd : addDaysToYmd(now.ymd, 1)
  return addDaysToYmd(now.ymd, now.hour >= NEXT_DAY_CUTOFF_HOUR ? 2 : 1)
}
