import test from 'node:test'
import assert from 'node:assert/strict'
import { validationResult } from 'express-validator'
import { brisbaneNow, ruleBlockedDays, dropOffError, isSameDayEnabled } from '../lib/bookingWindow.js'
import { validate, parseDropOff } from '../routes/createBooking.js'

const ON = { SAME_DAY_BOOKING_WORKSHOPS: 'woolloongabba' }
const OFF = {}
const at = (hh, mm, ymd = '2026-11-04') => ({ ymd, minutes: hh * 60 + mm }) // a Wednesday
const slot = (hh, mm) => hh * 60 + mm

// ── switch ────────────────────────────────────────────────────────────────
test('same-day is off unless the workshop is listed', () => {
  assert.equal(isSameDayEnabled('woolloongabba', OFF), false)
  assert.equal(isSameDayEnabled('woolloongabba', ON), true)
  assert.equal(isSameDayEnabled('WOOLLOONGABBA', { SAME_DAY_BOOKING_WORKSHOPS: ' Woolloongabba , ' }), true)
  assert.equal(isSameDayEnabled('hendra', ON), false)
})

test('brisbaneNow reads Brisbane wall time (UTC+10, no DST)', () => {
  assert.deepEqual(brisbaneNow(new Date('2026-11-04T03:00:00Z')), at(13, 0))
  assert.deepEqual(brisbaneNow(new Date('2026-11-03T14:30:00Z')), at(0, 30)) // just after midnight
})

// ── Woolloongabba (on) ────────────────────────────────────────────────────
test('Gabba at 1:00 PM: 3:00 PM is bookable today, 2:30 PM is not', () => {
  const now = at(13, 0)
  assert.equal(dropOffError({ workshopId: 'woolloongabba', dateYmd: now.ymd, slotMinutes: slot(15, 0), now, env: ON }), '')
  // 2:30 PM is 1h30m away — outside even the 15-min grace.
  assert.match(dropOffError({ workshopId: 'woolloongabba', dateYmd: now.ymd, slotMinutes: slot(14, 30), now, env: ON }), /no longer available/)
})

test('Gabba at 1:20 PM: 3:30 PM bookable; 3:00 PM (1h40m) refused', () => {
  const now = at(13, 20)
  assert.equal(dropOffError({ workshopId: 'woolloongabba', dateYmd: now.ymd, slotMinutes: slot(15, 30), now, env: ON }), '')
  assert.match(dropOffError({ workshopId: 'woolloongabba', dateYmd: now.ymd, slotMinutes: slot(15, 0), now, env: ON }), /no longer available/)
})

test('Gabba grace edge: 1h45m accepted, 1h44m refused', () => {
  assert.equal(dropOffError({ workshopId: 'woolloongabba', dateYmd: '2026-11-04', slotMinutes: slot(15, 0), now: at(13, 15), env: ON }), '')
  assert.match(dropOffError({ workshopId: 'woolloongabba', dateYmd: '2026-11-04', slotMinutes: slot(15, 0), now: at(13, 16), env: ON }), /no longer available/)
})

test('Gabba: today stays open until 2:30 PM, closes at 2:31 PM', () => {
  assert.deepEqual(ruleBlockedDays('woolloongabba', at(14, 30), ON), [])
  assert.deepEqual(ruleBlockedDays('woolloongabba', at(14, 31), ON), ['2026-11-04'])
})

test('Gabba: tomorrow stays open after 4 PM (no next-day cutoff)', () => {
  assert.deepEqual(ruleBlockedDays('woolloongabba', at(16, 1), ON), ['2026-11-04'])
  assert.equal(dropOffError({ workshopId: 'woolloongabba', dateYmd: '2026-11-05', slotMinutes: slot(8, 0), now: at(16, 1), env: ON }), '')
})

test('Gabba: a past date is refused', () => {
  assert.match(dropOffError({ workshopId: 'woolloongabba', dateYmd: '2026-11-03', slotMinutes: slot(16, 0), now: at(9, 0), env: ON }), /passed/)
})

test('Gabba with the switch OFF behaves exactly like today (Hendra rules)', () => {
  assert.deepEqual(ruleBlockedDays('woolloongabba', at(9, 0), OFF), ['2026-11-04'])
  assert.deepEqual(ruleBlockedDays('woolloongabba', at(16, 0), OFF), ['2026-11-04', '2026-11-05'])
  assert.match(dropOffError({ workshopId: 'woolloongabba', dateYmd: '2026-11-04', slotMinutes: slot(16, 30), now: at(8, 0), env: OFF }), /close after 4:00 PM/)
})

// ── Hendra (unchanged) ─────────────────────────────────────────────────────
test('Hendra 3:59 PM: tomorrow open; today never', () => {
  const now = at(15, 59)
  assert.deepEqual(ruleBlockedDays('hendra', now, ON), ['2026-11-04'])
  assert.equal(dropOffError({ workshopId: 'hendra', dateYmd: '2026-11-05', slotMinutes: slot(8, 0), now, env: ON }), '')
  assert.match(dropOffError({ workshopId: 'hendra', dateYmd: '2026-11-04', slotMinutes: slot(16, 30), now, env: ON }), /close after 4:00 PM/)
})

test('Hendra 4:01 PM: tomorrow closed, day after open', () => {
  const now = at(16, 1)
  assert.deepEqual(ruleBlockedDays('hendra', now, ON), ['2026-11-04', '2026-11-05'])
  assert.match(dropOffError({ workshopId: 'hendra', dateYmd: '2026-11-05', slotMinutes: slot(8, 0), now, env: ON }), /close after 4:00 PM/)
  assert.equal(dropOffError({ workshopId: 'hendra', dateYmd: '2026-11-06', slotMinutes: slot(8, 0), now, env: ON }), '')
})

test('month/year rollover for the next-day cutoff', () => {
  assert.deepEqual(ruleBlockedDays('hendra', at(16, 0, '2026-12-31'), OFF), ['2026-12-31', '2027-01-01'])
})

// ── the real route validator (no HTTP, no DB, no MechanicDesk) ───────────────
test('parseDropOff reads date and time; rejects junk', () => {
  assert.deepEqual(parseDropOff('04/11/2026 15:30'), { dateYmd: '2026-11-04', slotMinutes: slot(15, 30) })
  assert.equal(parseDropOff('2026-11-04 15:30'), null)
  assert.equal(parseDropOff('04/11/2026 25:00'), null)
})

async function runValidator(body, now) {
  const req = { body: {
    workshop: 'woolloongabba', name: 'Test Person', phone: '0412345678', email: 'test@example.com',
    registration_number: 'ABC123', make: 'Toyota', model: 'Corolla', year: '2018', ...body,
  } }
  for (const chain of validate) await chain.run(req)
  return validationResult(req).array().find((e) => e.path === 'drop_off_time')?.msg || ''
}

test('route validator applies the workshop rules to drop_off_time', async (t) => {
  // 1:00 PM Brisbane on Wed 4 Nov 2026 = 03:00 UTC.
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-04T03:00:00Z') })
  const prev = process.env.SAME_DAY_BOOKING_WORKSHOPS
  try {
    process.env.SAME_DAY_BOOKING_WORKSHOPS = 'woolloongabba'
    assert.equal(await runValidator({ drop_off_time: '04/11/2026 15:00' }), '')
    assert.match(await runValidator({ drop_off_time: '04/11/2026 14:00' }), /no longer available/)
    assert.match(await runValidator({ workshop: 'hendra', drop_off_time: '04/11/2026 15:00' }), /close after 4:00 PM/)
    assert.equal(await runValidator({ workshop: 'hendra', drop_off_time: '05/11/2026 08:00' }), '')

    delete process.env.SAME_DAY_BOOKING_WORKSHOPS // switch off → Gabba same-day refused again
    assert.match(await runValidator({ drop_off_time: '04/11/2026 15:00' }), /close after 4:00 PM/)
  } finally {
    if (prev === undefined) delete process.env.SAME_DAY_BOOKING_WORKSHOPS
    else process.env.SAME_DAY_BOOKING_WORKSHOPS = prev
  }
})
