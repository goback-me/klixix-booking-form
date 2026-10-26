import test from 'node:test'
import assert from 'node:assert/strict'
import { noticeForPendingState, SUPPORT_PHONE_DISPLAY } from './notices.js'

test('sync_failed → "not confirmed" + support number, no success wording', () => {
  const m = noticeForPendingState('sync_failed')
  assert.match(m, /could.?n.t submit your booking request to the workshop/i)
  assert.match(m, /not confirmed/i)
  assert.ok(m.includes(SUPPORT_PHONE_DISPLAY))
  assert.doesNotMatch(m, /received your request and will call|has been received|booking summary|confirmed appointment/i)
})

test('sync_unknown → "could not confirm whether it reached" + call before resubmitting', () => {
  const m = noticeForPendingState('sync_unknown')
  assert.match(m, /could.?n.t confirm whether your request reached the workshop/i)
  assert.match(m, /before submitting again/i)
  assert.ok(m.includes(SUPPORT_PHONE_DISPLAY))
  assert.doesNotMatch(m, /has been received!|booking summary/i)
})

test('both pending notices never claim success and always give the support number', () => {
  for (const s of ['sync_failed', 'sync_unknown', 'received', undefined]) {
    const m = noticeForPendingState(s)
    assert.ok(m.includes(SUPPORT_PHONE_DISPLAY), `${s} must include support number`)
    assert.doesNotMatch(m, /booking summary|appointment is confirmed|successfully booked/i)
  }
})
