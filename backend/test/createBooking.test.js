import test from 'node:test'
import assert from 'node:assert/strict'
import {
  classifyMechanicDeskOutcome,
  httpForOutcome,
  responseForExistingRow,
  getMechanicDeskTimeoutMs,
  processBooking,
} from '../routes/createBooking.js'

// A fresh set of injectable deps with call-counting spies. Overrides win.
function makeDeps(overrides = {}) {
  const calls = { claimBooking: 0, getBookingByIdemKey: 0, postMechanicDesk: 0, updateBookingState: 0, sendBookingWebhook: 0 }
  const deps = {
    claimBooking: async () => { calls.claimBooking++; return { configured: true, created: true, row: { id: 'uuid-new', idempotency_key: 'key', booking_state: 'syncing' } } },
    getBookingByIdemKey: async () => { calls.getBookingByIdemKey++; return null },
    postMechanicDesk: async () => { calls.postMechanicDesk++; return { ok: true, status: 200, responseData: { booking_id: 'MD-1' } } },
    updateBookingState: async () => { calls.updateBookingState++ },
    sendBookingWebhook: async () => { calls.sendBookingWebhook++ },
  }
  for (const k of Object.keys(overrides)) {
    const fn = overrides[k]
    deps[k] = async (...args) => { calls[k]++; return fn(...args) }
  }
  return { deps, calls }
}

const basePayload = { workshop: 'hendra', name: 'x', phone: '0412345678', email: 'a@b.co' }
const tick = () => new Promise((r) => setTimeout(r, 0)) // let fire-and-forget .catch handlers run

// ── §1 processBooking: fail-closed atomic claim ─────────────────────────────
test('§1.1 claim DB outage → 503 and ZERO MechanicDesk calls', async () => {
  const { deps, calls } = makeDeps({ claimBooking: async () => { throw new Error('supabase down') } })
  const result = await processBooking({ payload: basePayload, token: 't', idemKey: 'key-1', deps })
  assert.equal(result.status, 503)
  assert.equal(result.body.confirmed, false)
  assert.equal(result.mechanicDeskCalled, false)
  assert.equal(calls.postMechanicDesk, 0)
})

test('§1.1b storage not configured → 503 and ZERO MechanicDesk calls', async () => {
  const { deps, calls } = makeDeps({ claimBooking: async () => ({ configured: false }) })
  const result = await processBooking({ payload: basePayload, token: 't', idemKey: 'key-1b', deps })
  assert.equal(result.status, 503)
  assert.equal(result.mechanicDeskCalled, false)
  assert.equal(calls.postMechanicDesk, 0)
})

test('§1.2 unique-key conflict → existing state returned, ZERO MechanicDesk calls', async () => {
  const { deps, calls } = makeDeps({
    claimBooking: async () => ({ configured: true, created: false, row: { id: 'uuid-dup', idempotency_key: 'key-2', booking_state: 'confirmed' } }),
  })
  const result = await processBooking({ payload: basePayload, token: 't', idemKey: 'key-2', deps })
  assert.equal(result.reason, 'duplicate')
  assert.equal(result.status, 200)            // existing row was confirmed
  assert.equal(result.body.duplicate, true)
  assert.equal(result.mechanicDeskCalled, false)
  assert.equal(calls.postMechanicDesk, 0)
})

test('§1.3 claim ok + MD confirms + final DB update FAILS → confirmed response, stable ref, recovery logged', async () => {
  const logged = []
  const origErr = console.error
  console.error = (...a) => { logged.push(a.join(' ')) }
  try {
    const { deps, calls } = makeDeps({
      claimBooking: async () => ({ configured: true, created: true, row: { id: 'uuid-stable', idempotency_key: 'key-3', booking_state: 'syncing' } }),
      postMechanicDesk: async () => ({ ok: true, status: 200, responseData: { booking_id: 'MD-3' } }),
      updateBookingState: async () => { throw new Error('state write failed') },
    })
    const result = await processBooking({ payload: basePayload, token: 't', idemKey: 'key-3', deps })
    await tick()
    assert.equal(result.status, 200)                         // customer still gets confirmed
    assert.equal(result.body.confirmed, true)
    assert.equal(result.body.booking_reference, 'uuid-stable') // stable idempotency reference
    assert.equal(calls.updateBookingState, 1)
    assert.ok(logged.some((l) => l.includes('uuid-stable') || l.toLowerCase().includes('reconcil')), 'expected recovery logging')
  } finally {
    console.error = origErr
  }
})

test('§1.4 claim ok + process fails before MD call → persistent recoverable row, no confirmation', async () => {
  const { deps, calls } = makeDeps({
    // Row persisted as 'syncing' (recoverable) by the claim, THEN a crash before/at MD.
    claimBooking: async () => ({ configured: true, created: true, row: { id: 'uuid-stuck', idempotency_key: 'key-4', booking_state: 'syncing' } }),
    postMechanicDesk: async () => { throw new Error('process crashed before/at MechanicDesk') },
  })
  await assert.rejects(() => processBooking({ payload: basePayload, token: 't', idemKey: 'key-4', deps }))
  assert.equal(calls.claimBooking, 1)   // the recoverable 'syncing' row was persisted first
  // No confirmation was produced; the row remains non-terminal for §2 recovery to surface.
})

test('§1.5 claim ok + MD outcome UNKNOWN (timeout) → 202, no automatic retry (exactly one MD call)', async () => {
  const { deps, calls } = makeDeps({
    claimBooking: async () => ({ configured: true, created: true, row: { id: 'uuid-unk', idempotency_key: 'key-5', booking_state: 'syncing' } }),
    postMechanicDesk: async () => ({ aborted: true }),
  })
  const result = await processBooking({ payload: basePayload, token: 't', idemKey: 'key-5', deps })
  await tick()
  assert.equal(result.status, 202)
  assert.equal(result.body.confirmed, false)
  assert.equal(result.body.state, 'sync_unknown')
  assert.equal(calls.postMechanicDesk, 1) // NEVER retried — a retry could create a duplicate booking
})

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
test('timeout defaults to 25000', () => {
  delete process.env.MECHANICDESK_TIMEOUT_MS
  assert.equal(getMechanicDeskTimeoutMs(), 25000)
})
test('timeout honours a valid env override', () => {
  process.env.MECHANICDESK_TIMEOUT_MS = '8000'
  assert.equal(getMechanicDeskTimeoutMs(), 8000)
  delete process.env.MECHANICDESK_TIMEOUT_MS
})
test('timeout rejects out-of-range / invalid env (falls back to default)', () => {
  process.env.MECHANICDESK_TIMEOUT_MS = '999999'
  assert.equal(getMechanicDeskTimeoutMs(), 25000)
  process.env.MECHANICDESK_TIMEOUT_MS = 'abc'
  assert.equal(getMechanicDeskTimeoutMs(), 25000)
  delete process.env.MECHANICDESK_TIMEOUT_MS
})
