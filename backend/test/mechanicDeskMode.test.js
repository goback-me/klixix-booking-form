import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isProductionEnv,
  isFakeModeRequested,
  assertFakeModeSafe,
  isFakeModeEnabled,
  resolvePostMechanicDesk,
} from '../lib/mechanicDeskMode.js'

// Snapshot/restore the env vars this guard reads.
const KEYS = ['VERCEL_ENV', 'NODE_ENV', 'MECHANICDESK_FAKE', 'MECHANICDESK_FAKE_SCENARIO', 'STAGING_MODE']
function withEnv(env, fn) {
  const saved = {}
  for (const k of KEYS) saved[k] = process.env[k]
  for (const k of KEYS) delete process.env[k]
  for (const k of Object.keys(env)) process.env[k] = env[k]
  try { return fn() } finally {
    for (const k of KEYS) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k] }
  }
}

const realImpl = async () => ({ ok: true, status: 200, responseData: { real: true } })

// ── isProductionEnv ──────────────────────────────────────────────────────────
test('VERCEL_ENV=production → production', () => withEnv({ VERCEL_ENV: 'production' }, () => assert.equal(isProductionEnv(), true)))
test('VERCEL_ENV=preview → NOT production (even with NODE_ENV=production)', () =>
  withEnv({ VERCEL_ENV: 'preview', NODE_ENV: 'production' }, () => assert.equal(isProductionEnv(), false)))
test('VERCEL_ENV=development → NOT production', () => withEnv({ VERCEL_ENV: 'development' }, () => assert.equal(isProductionEnv(), false)))
test('no VERCEL_ENV + NODE_ENV=production → production (Render/local prod)', () =>
  withEnv({ NODE_ENV: 'production' }, () => assert.equal(isProductionEnv(), true)))
test('no env → NOT production', () => withEnv({}, () => assert.equal(isProductionEnv(), false)))

// ── fail closed in production ──────────────────────────────────────────────────
test('fake flag + VERCEL_ENV=production → assertFakeModeSafe THROWS (fail closed)', () =>
  withEnv({ MECHANICDESK_FAKE: '1', VERCEL_ENV: 'production' }, () => {
    assert.throws(() => assertFakeModeSafe(), /PRODUCTION/)
    assert.throws(() => isFakeModeEnabled(), /PRODUCTION/)
    assert.throws(() => resolvePostMechanicDesk(realImpl), /PRODUCTION/)
  }))

test('fake flag + NODE_ENV=production (no VERCEL_ENV) → THROWS', () =>
  withEnv({ MECHANICDESK_FAKE: 'true', NODE_ENV: 'production' }, () => {
    assert.throws(() => assertFakeModeSafe(), /PRODUCTION/)
  }))

// ── real path unchanged when fake flag absent ──────────────────────────────────
test('no fake flag + production → resolve returns the REAL impl (identity), no throw', () =>
  withEnv({ VERCEL_ENV: 'production' }, () => {
    assert.doesNotThrow(() => assertFakeModeSafe())
    assert.equal(resolvePostMechanicDesk(realImpl), realImpl)
    assert.equal(isFakeModeRequested(), false)
  }))

test('no fake flag + non-production → still the real impl', () =>
  withEnv({ VERCEL_ENV: 'preview' }, () => assert.equal(resolvePostMechanicDesk(realImpl), realImpl)))

// ── fake enabled only in non-production ─────────────────────────────────────────
test('fake flag + VERCEL_ENV=preview → fake adapter used, confirmed scenario', async () => {
  const fn = withEnv({ MECHANICDESK_FAKE: '1', VERCEL_ENV: 'preview', MECHANICDESK_FAKE_SCENARIO: 'confirmed' }, () => {
    assert.equal(isFakeModeEnabled(), true)
    return resolvePostMechanicDesk(realImpl)
  })
  assert.notEqual(fn, realImpl)
  const out = await fn('tok', {})
  assert.equal(out.ok, true)
  assert.equal(out.responseData.fake, true)   // proves the FAKE ran, not the real impl
})

test('fake flag + no env (local dev) → fake adapter used', () =>
  withEnv({ MECHANICDESK_FAKE: 'yes' }, () => {
    assert.equal(isFakeModeEnabled(), true)
    assert.notEqual(resolvePostMechanicDesk(realImpl), realImpl)
  }))

// ── STAGING_MODE override: staging project's prod deployment may run fake ─────────
test('STAGING_MODE=1 + VERCEL_ENV=production + fake flag → fake ALLOWED (staging on a stable URL)', async () => {
  const fn = withEnv({ STAGING_MODE: '1', VERCEL_ENV: 'production', MECHANICDESK_FAKE: '1' }, () => {
    assert.doesNotThrow(() => assertFakeModeSafe())
    assert.equal(isFakeModeEnabled(), true)
    return resolvePostMechanicDesk(realImpl)
  })
  const out = await fn('tok', {})
  assert.equal(out.responseData.fake, true)
})

test('real production (no STAGING_MODE) + fake flag → still THROWS (fail closed)', () =>
  withEnv({ VERCEL_ENV: 'production', MECHANICDESK_FAKE: '1' }, () => {
    assert.throws(() => assertFakeModeSafe(), /PRODUCTION/)
  }))
