import test from 'node:test'
import assert from 'node:assert/strict'
import {
  classifyMechanicDeskOutcome,
  httpForOutcome,
  responseForExistingRow,
  getMechanicDeskTimeoutMs,
} from '../routes/createBooking.js'

// ── classifyMechanicDeskOutcome ──────────────────────────────────────────────
test('MechanicDesk 2xx → confirmed', () => {
  assert.deepEqual(classifyMechanicDeskOutcome({ ok: true, status: 200 }), { state: 'confirmed', errorCategory: null })
})
test('MechanicDesk 4xx rejection → sync_failed (md_rejected)', () => {
  assert.deepEqual(classifyMechanicDeskOutcome({ ok: false, status: 422 }), { state: 'sync_failed', errorCategory: 'md_rejected' })
})
test('MechanicDesk 5xx → sync_failed (md_5xx)', () => {
  assert.deepEqual(classifyMechanicDeskOutcome({ ok: false, status: 503 }), { state: 'sync_failed', errorCategory: 'md_5xx' })
})
test('Timeout/abort → sync_unknown (timeout), never sync_failed', () => {
  assert.deepEqual(classifyMechanicDeskOutcome({ aborted: true }), { state: 'sync_unknown', errorCategory: 'timeout' })
})
test('Network error without response → sync_unknown (network) — safest, no blind retry', () => {
  assert.deepEqual(classifyMechanicDeskOutcome({ networkError: true }), { state: 'sync_unknown', errorCategory: 'network' })
})

// ── httpForOutcome (success-state contract) ──────────────────────────────────
test('confirmed + stored → 200, confirmed:true, booking_reference = booking_id', () => {
  const { status, body } = httpForOutcome({ state: 'confirmed', stored: true, bookingId: 'uuid-1', idempotencyKey: 'key-1' })
  assert.equal(status, 200)
  assert.equal(body.confirmed, true)
  assert.equal(body.synced, true)
  assert.equal(body.booking_reference, 'uuid-1')
})
test('confirmed + storage FAILED → 200, confirmed:true, booking_reference = idempotency_key', () => {
  const { status, body } = httpForOutcome({ state: 'confirmed', stored: false, bookingId: null, idempotencyKey: 'key-2' })
  assert.equal(status, 200)
  assert.equal(body.confirmed, true)
  assert.equal(body.booking_reference, 'key-2')
  assert.equal(body.stored, false)
})
test('sync_failed + stored → 202, confirmed:false (recovery lead, no conversion)', () => {
  const { status, body } = httpForOutcome({ state: 'sync_failed', stored: true, bookingId: 'uuid-3', idempotencyKey: 'key-3' })
  assert.equal(status, 202)
  assert.equal(body.confirmed, false)
  assert.equal(body.pending, true)
})
test('sync_unknown + stored → 202, confirmed:false (no conversion)', () => {
  const { status, body } = httpForOutcome({ state: 'sync_unknown', stored: true, bookingId: 'uuid-4', idempotencyKey: 'key-4' })
  assert.equal(status, 202)
  assert.equal(body.confirmed, false)
})
test('neither stored nor confirmed → 502, confirmed:false', () => {
  const { status, body } = httpForOutcome({ state: 'sync_failed', stored: false, bookingId: null, idempotencyKey: 'key-5' })
  assert.equal(status, 502)
  assert.equal(body.confirmed, false)
})
test('confirmed response carries NO customer PII keys', () => {
  const { body } = httpForOutcome({ state: 'confirmed', stored: true, bookingId: 'uuid-6', idempotencyKey: 'key-6' })
  for (const k of ['name', 'email', 'phone', 'registration_number', 'make', 'model', 'vin', 'address']) {
    assert.equal(k in body, false, `response must not contain '${k}'`)
  }
})

// ── responseForExistingRow (duplicate / retry — never re-calls MechanicDesk) ──
test('duplicate of a confirmed row → 200 confirmed:true duplicate:true', () => {
  const { status, body } = responseForExistingRow({ id: 'uuid-7', idempotency_key: 'key-7', booking_state: 'confirmed' })
  assert.equal(status, 200)
  assert.equal(body.confirmed, true)
  assert.equal(body.duplicate, true)
})
test('duplicate of a still-syncing row → 202 confirmed:false duplicate:true', () => {
  const { status, body } = responseForExistingRow({ id: 'uuid-8', idempotency_key: 'key-8', booking_state: 'syncing' })
  assert.equal(status, 202)
  assert.equal(body.confirmed, false)
  assert.equal(body.duplicate, true)
})
test('duplicate of a sync_unknown row → 202 confirmed:false (no second MechanicDesk call implied)', () => {
  const { status, body } = responseForExistingRow({ id: 'uuid-9', idempotency_key: 'key-9', booking_state: 'sync_unknown' })
  assert.equal(status, 202)
  assert.equal(body.confirmed, false)
})

// ── getMechanicDeskTimeoutMs (configurable, validated) ───────────────────────
test('timeout defaults to 12000', () => {
  delete process.env.MECHANICDESK_TIMEOUT_MS
  assert.equal(getMechanicDeskTimeoutMs(), 12000)
})
test('timeout honours a valid env override', () => {
  process.env.MECHANICDESK_TIMEOUT_MS = '8000'
  assert.equal(getMechanicDeskTimeoutMs(), 8000)
  delete process.env.MECHANICDESK_TIMEOUT_MS
})
test('timeout rejects out-of-range / invalid env (falls back to default)', () => {
  process.env.MECHANICDESK_TIMEOUT_MS = '999999'
  assert.equal(getMechanicDeskTimeoutMs(), 12000)
  process.env.MECHANICDESK_TIMEOUT_MS = 'abc'
  assert.equal(getMechanicDeskTimeoutMs(), 12000)
  delete process.env.MECHANICDESK_TIMEOUT_MS
})
