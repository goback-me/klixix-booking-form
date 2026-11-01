// Server copy of frontend/src/constants/bookingWindow.js — change both together.
// Which days/times each workshop takes online bookings for, in Brisbane time.
//
// Default (every workshop): no same-day bookings, next-day bookings close at 4:00 PM.
// Workshops listed in SAME_DAY_BOOKING_WORKSHOPS (comma-separated, e.g. "woolloongabba")
// instead take same-day bookings for slots at least 2 hours away, and next-day
// bookings stay open all day. Unset = off, so deploying this changes nothing.

export const AU_TIMEZONE = 'Australia/Brisbane'
export const NEXT_DAY_CUTOFF_HOUR = 16
export const SAME_DAY_MIN_NOTICE_MINUTES = 120
// A slot that was valid when picked is still accepted this long after it goes
// stale, so a customer filling in their details isn't bounced for a minute.
export const SAME_DAY_GRACE_MINUTES = 15
// Last bookable slot (4:30 PM). Must match the slot list in the form.
export const LAST_SLOT_MINUTES = 16 * 60 + 30

/** @param {Date} date */
export function toYmdInTimezone(date, timeZone = AU_TIMEZONE) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

/** @param {string} ymd @param {number} amount */
export function addDaysToYmd(ymd, amount) {
  const match = String(ymd).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}

/** Today's date and minutes since midnight in Brisbane. */
export function brisbaneNow(date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-AU', { timeZone: AU_TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false })
      .formatToParts(date).map((p) => [p.type, p.value])
  )
  const hour = Number.parseInt(parts.hour, 10) % 24
  return { ymd: toYmdInTimezone(date), minutes: hour * 60 + Number.parseInt(parts.minute, 10) }
}

export function sameDayWorkshops(env = process.env) {
  return new Set(String(env.SAME_DAY_BOOKING_WORKSHOPS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean))
}

/** @param {string} workshopId */
export function isSameDayEnabled(workshopId, env = process.env) {
  return sameDayWorkshops(env).has(String(workshopId || '').toLowerCase())
}

/** True while at least one of today's slots is still 2+ hours away. */
export function isTodayOpen(nowMinutes) {
  return nowMinutes + SAME_DAY_MIN_NOTICE_MINUTES <= LAST_SLOT_MINUTES
}

/**
 * Days the booking rules close on top of MechanicDesk's own blocked days.
 * @returns {string[]}
 */
export function ruleBlockedDays(workshopId, now = brisbaneNow(), env = process.env) {
  if (isSameDayEnabled(workshopId, env)) {
    return isTodayOpen(now.minutes) ? [] : [now.ymd]
  }
  const afterCutoff = now.minutes >= NEXT_DAY_CUTOFF_HOUR * 60
  return afterCutoff ? [now.ymd, addDaysToYmd(now.ymd, 1)] : [now.ymd]
}

/**
 * Check a requested drop-off against the workshop's rules.
 * @param {{ workshopId: string, dateYmd: string, slotMinutes: number, now?: { ymd: string, minutes: number }, env?: object }} args
 * @returns {string} '' when allowed, otherwise the message to show the customer
 */
export function dropOffError({ workshopId, dateYmd, slotMinutes, now = brisbaneNow(), env = process.env }) {
  if (!isSameDayEnabled(workshopId, env)) {
    const earliest = addDaysToYmd(now.ymd, now.minutes >= NEXT_DAY_CUTOFF_HOUR * 60 ? 2 : 1)
    return dateYmd < earliest ? 'Bookings for tomorrow close after 4:00 PM Brisbane time' : ''
  }
  if (dateYmd < now.ymd) return 'That date has passed. Please pick another day.'
  if (dateYmd === now.ymd && slotMinutes < now.minutes + SAME_DAY_MIN_NOTICE_MINUTES - SAME_DAY_GRACE_MINUTES) {
    return 'That time is no longer available. Please pick a later time.'
  }
  return ''
}
