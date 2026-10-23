import test from 'node:test'
import assert from 'node:assert/strict'
import { processBooking } from '../routes/createBooking.js'
import { makeFakeMechanicDesk } from '../lib/fakeMechanicDesk.js'

/**
 * In-memory store double that mirrors bookingsStore.claimBooking's contract and the
 * DB unique-index semantics: the first claim for an idempotency_key wins (created:true);
 * any later/concurrent claim for the same key loses (created:false, returns existing).
 *
 * NOTE: this proves the ORCHESTRATION honours an atomic claim. True cross-connection
 * atomicity (two Postgres sessions racing the unique index) must be re-verified against
 * the real staging Supabase once it exists — see the staging validation notes.
 */
function makeMemoryStore() {
  const byKey = new Map()
  let seq = 0
  return {
    configured: true,
    // No `await` between the has()-check and the set(): atomic within one microtask,
    // the same guarantee the DB unique index gives.
    claimBooking: async function (payload, idemKey) {
      if (this.configured === false) return { configured: false }
      if (byKey.has(idemKey)) return { configured: true, created: false, row: byKey.get(idemKey) }
      const row = { id: `mem-${++seq}`, idempotency_key: idemKey, booking_state: 'syncing' }
      byKey.set(idemKey, row)
      return { configured: true, created: true, row }
    },
    getBookingByIdemKey: async (idemKey) => byKey.get(idemKey) || null,
    updateBookingState: async (id, state, extra = {}) => {
      for (const row of byKey.values()) {
        if (row.id === id) {
          row.booking_state = state
          if (extra.mechanicdeskRef) row.mechanicdesk_ref = extra.mechanicdeskRef
          if (extra.errorCategory) row.error_category = extra.errorCategory
        }
      }
    },
    _byKey: byKey,
  }
}

const basePayload = () => ({ workshop: 'hendra', name: 'QA Tester', phone: '0412345678', email: 'qa@example.test', registration_number: 'QA123' })

function depsFor(store, scenario, counters = {}) {
  counters.md = counters.md || 0
  const md = makeFakeMechanicDesk({ scenario, delayMs: scenario === 'delayed' ? 50 : 0 })
  return {
    deps: {
      claimBooking: store.claimBooking.bind(store),
      getBookingByIdemKey: store.getBookingByIdemKey,
      postMechanicDesk: async (t, f) => { counters.md++; return md(t, f) },
      updateBookingState: store.updateBookingState,
      sendBookingWebhook: async () => {},
    },
    counters,
  }
}

// 1) Successful claim happens BEFORE the MechanicDesk request
test('P4: claim precedes MechanicDesk call', async () => {
  const store = makeMemoryStore()
  const order = []
  const md = makeFakeMechanicDesk({ scenario: 'confirmed' })
  const deps = {
    claimBooking: async (...a) => { order.push('claim'); return store.claimBooking(...a) },
    getBookingByIdemKey: store.getBookingByIdemKey,
    postMechanicDesk: async (...a) => { order.push('md'); return md(...a) },
    updateBookingState: store.updateBookingState,
    sendBookingWebhook: async () => {},
  }
  await processBooking({ payload: basePayload(), token: 't', idemKey: 'k-order', deps })
  assert.deepEqual(order, ['claim', 'md'])
})

// 2) Confirmed → 200 confirmed:true
test('P4: confirmed success → 200 confirmed:true', async () => {
  const store = makeMemoryStore()
  const { deps } = depsFor(store, 'confirmed')
  const r = await processBooking({ payload: basePayload(), token: 't', idemKey: 'k-ok', deps })
  assert.equal(r.status, 200)
  assert.equal(r.body.confirmed, true)
})

// 2b) Delayed success → still 200 confirmed:true
test('P4: delayed success → 200 confirmed:true', async () => {
  const store = makeMemoryStore()
  const { deps } = depsFor(store, 'delayed')
  const r = await processBooking({ payload: basePayload(), token: 't', idemKey: 'k-delay', deps })
  assert.equal(r.status, 200)
  assert.equal(r.body.confirmed, true)
})

// 3) rejection / failure / timeout → confirmed:false
for (const [scenario, label] of [['rejected', 'validation rejection'], ['server_error', 'non-2xx failure'], ['timeout', 'timeout'], ['network', 'network-unknown']]) {
  test(`P4: ${label} → confirmed:false (recovery lead)`, async () => {
    const store = makeMemoryStore()
    const { deps } = depsFor(store, scenario)
    const r = await processBooking({ payload: basePayload(), token: 't', idemKey: `k-${scenario}`, deps })
    assert.equal(r.body.confirmed, false)
    assert.equal(r.status, 202) // stored recovery lead
  })
}

// 4) DB claim failure → 503, zero MechanicDesk calls
test('P4: claim DB failure → 503, zero MechanicDesk calls', async () => {
  const counters = { md: 0 }
  const deps = {
    claimBooking: async () => { throw new Error('db down') },
    getBookingByIdemKey: async () => null,
    postMechanicDesk: async () => { counters.md++; return { ok: true, status: 200 } },
    updateBookingState: async () => {},
    sendBookingWebhook: async () => {},
  }
  const r = await processBooking({ payload: basePayload(), token: 't', idemKey: 'k-503', deps })
  assert.equal(r.status, 503)
  assert.equal(counters.md, 0)
})

// 5) Same idempotency key cannot create two MechanicDesk requests (sequential replay)
test('P4: same idem key twice → one MechanicDesk call, second is duplicate', async () => {
  const store = makeMemoryStore()
  const { deps, counters } = depsFor(store, 'confirmed')
  const r1 = await processBooking({ payload: basePayload(), token: 't', idemKey: 'k-dup', deps })
  const r2 = await processBooking({ payload: basePayload(), token: 't', idemKey: 'k-dup', deps })
  assert.equal(counters.md, 1)
  assert.equal(r1.reason, 'confirmed')
  assert.equal(r2.reason, 'duplicate')
  assert.equal(r2.body.confirmed, true)      // replay returns the stored confirmed state
  assert.equal(r2.body.duplicate, true)
})

// 6) Two CONCURRENT requests with the same idem key → unique claim protects MechanicDesk
test('P4: concurrent same idem key → exactly one MechanicDesk call', async () => {
  const store = makeMemoryStore()
  const { deps, counters } = depsFor(store, 'confirmed')
  const [a, b] = await Promise.all([
    processBooking({ payload: basePayload(), token: 't', idemKey: 'k-conc', deps }),
    processBooking({ payload: basePayload(), token: 't', idemKey: 'k-conc', deps }),
  ])
  assert.equal(counters.md, 1)
  const reasons = [a.reason, b.reason].sort()
  assert.deepEqual(reasons, ['confirmed', 'duplicate'])
})

// 7) Restart/replay returns stored state without resubmission
test('P4: replay after "restart" returns stored state, no resubmission', async () => {
  const store = makeMemoryStore()
  const { deps, counters } = depsFor(store, 'confirmed')
  await processBooking({ payload: basePayload(), token: 't', idemKey: 'k-restart', deps })
  // Simulate a fresh process: brand-new deps object over the SAME store (same DB).
  const { deps: deps2, counters: c2 } = depsFor(store, 'confirmed')
  const r = await processBooking({ payload: basePayload(), token: 't', idemKey: 'k-restart', deps: deps2 })
  assert.equal(r.reason, 'duplicate')
  assert.equal(c2.md, 0)                 // the "restarted" process made no new MechanicDesk call
  assert.equal(counters.md, 1)           // only the original call ever happened
})

// 8) No automatic retry for sync_unknown (timeout), even on replay
test('P4: sync_unknown is never auto-retried', async () => {
  const store = makeMemoryStore()
  const { deps, counters } = depsFor(store, 'timeout')
  const r1 = await processBooking({ payload: basePayload(), token: 't', idemKey: 'k-unk', deps })
  assert.equal(r1.body.state, 'sync_unknown')
  assert.equal(counters.md, 1)
  // A replay must NOT call MechanicDesk again (a retry could create a duplicate booking).
  const r2 = await processBooking({ payload: basePayload(), token: 't', idemKey: 'k-unk', deps })
  assert.equal(counters.md, 1)
  assert.equal(r2.reason, 'duplicate')
})

// 9) No customer PII in response bodies
test('P4: response body carries no customer PII', async () => {
  const store = makeMemoryStore()
  const { deps } = depsFor(store, 'confirmed')
  const r = await processBooking({ payload: basePayload(), token: 't', idemKey: 'k-pii', deps })
  for (const k of ['name', 'email', 'phone', 'registration_number', 'make', 'model', 'vin', 'address']) {
    assert.equal(k in r.body, false, `response body must not contain '${k}'`)
  }
})
