import test from 'node:test'
import assert from 'node:assert/strict'
import {
  slotLabelToMinutes, brisbaneNow, isSlotOpen, isTodayOpen, firstOpenSlot, earliestDateYmd, addDaysToYmd,
} from './bookingWindow.js'

// Wed 4 Nov 2026, Brisbane time.
const at = (hh, mm, ymd = '2026-11-04') => ({ ymd, hour: hh, minutes: hh * 60 + mm })
const TODAY = '2026-11-04'
const TOMORROW = '2026-11-05'

test('slot labels convert to minutes', () => {
  assert.equal(slotLabelToMinutes('8:00 AM'), 480)
  assert.equal(slotLabelToMinutes('12:00 PM'), 720)
  assert.equal(slotLabelToMinutes('4:30 PM'), 990)
  assert.ok(Number.isNaN(slotLabelToMinutes('soon')))
})

test('brisbaneNow is Brisbane wall time', () => {
  const now = brisbaneNow(new Date('2026-11-04T03:20:00Z'))
  assert.equal(now.ymd, TODAY)
  assert.equal(now.minutes, 13 * 60 + 20)
  assert.equal(now.hour, 13)
})

test('same-day ON at 1:00 PM: 3:00 PM is the first slot', () => {
  const now = at(13, 0)
  assert.equal(isSlotOpen({ dateYmd: TODAY, label: '2:30 PM', now, sameDay: true }), false)
  assert.equal(isSlotOpen({ dateYmd: TODAY, label: '3:00 PM', now, sameDay: true }), true)
  assert.equal(firstOpenSlot({ dateYmd: TODAY, now, sameDay: true }), '3:00 PM')
})

test('same-day ON at 1:20 PM: 3:30 PM is the first slot', () => {
  assert.equal(firstOpenSlot({ dateYmd: TODAY, now: at(13, 20), sameDay: true }), '3:30 PM')
})

test('same-day ON: today offered until 2:30 PM, gone at 2:31 PM', () => {
  assert.equal(isTodayOpen(at(14, 30), true), true)
  assert.equal(earliestDateYmd(at(14, 30), true), TODAY)
  assert.equal(isTodayOpen(at(14, 31), true), false)
  assert.equal(earliestDateYmd(at(14, 31), true), TOMORROW)
  assert.equal(firstOpenSlot({ dateYmd: TODAY, now: at(14, 31), sameDay: true }), '')
})

test('same-day ON early morning: 8:00 AM needs 6:00 AM or earlier', () => {
  assert.equal(firstOpenSlot({ dateYmd: TODAY, now: at(6, 0), sameDay: true }), '8:00 AM')
  assert.equal(firstOpenSlot({ dateYmd: TODAY, now: at(6, 1), sameDay: true }), '8:30 AM')
})

test('same-day ON: tomorrow stays bookable after 4 PM, every slot open', () => {
  assert.equal(earliestDateYmd(at(17, 0), true), TOMORROW)
  assert.equal(firstOpenSlot({ dateYmd: TOMORROW, now: at(17, 0), sameDay: true }), '8:00 AM')
})

test('same-day OFF (Hendra): today never, tomorrow until 4 PM', () => {
  assert.equal(isTodayOpen(at(7, 0), false), false)
  assert.equal(isSlotOpen({ dateYmd: TODAY, label: '4:30 PM', now: at(7, 0), sameDay: false }), false)
  assert.equal(earliestDateYmd(at(15, 59), false), TOMORROW)
  assert.equal(earliestDateYmd(at(16, 0), false), '2026-11-06')
})

test('date maths crosses month and year', () => {
  assert.equal(addDaysToYmd('2026-11-30', 1), '2026-12-01')
  assert.equal(addDaysToYmd('2026-12-31', 2), '2027-01-02')
})
