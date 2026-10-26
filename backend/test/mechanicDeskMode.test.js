import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isFakeModeRequested,
  assertFakeModeSafe,
  isFakeModeEnabled,
  resolvePostMechanicDesk,
  fakeIdentity,
  supabaseRef,
} from '../lib/mechanicDeskMode.js'

const KEYS = ['VERCEL_ENV', 'NODE_ENV', 'MECHANICDESK_FAKE', 'MECHANICDESK_FAKE_SCENARIO', 'STAGING_MODE',
  'SUPABASE_URL', 'ALLOWED_ORIGIN', 'VERCEL_PROJECT_PRODUCTION_URL', 'VERCEL_URL', 'SUPABASE_SERVICE_KEY']
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

// The exact, full staging identity.
const STAGING = {
  MECHANICDESK_FAKE: '1',
  STAGING_MODE: '1',
  SUPABASE_URL: 'https://cwdelnmbawffmfewprzz.supabase.co',
  VERCEL_PROJECT_PRODUCTION_URL: 'carone-booking-api-staging.vercel.app',
  ALLOWED_ORIGIN: 'https://carone-booking-form-staging.vercel.app',
}

// 1) exact staging identities + fake flag → fake adapter permitted
test('G1 full staging identity + fake flag → fake PERMITTED (no throw)', async () => {
  const fn = withEnv({ ...STAGING }, () => {
    assert.doesNotThrow(() => assertFakeModeSafe())
    assert.equal(isFakeModeEnabled(), true)
    return resolvePostMechanicDesk(realImpl)
  })
  const out = await fn('t', {})
  assert.equal(out.responseData.fake, true)
})

// 2) staging flag + PRODUCTION Supabase → boot failure
test('G2 staging flag + production Supabase (lhzkznzlpmegoteukkuy) → THROWS', () =>
  withEnv({ ...STAGING, SUPABASE_URL: 'https://lhzkznzlpmegoteukkuy.supabase.co' }, () => {
    assert.throws(() => assertFakeModeSafe(), /identity check failed/)
  }))

// 3) staging flag + production hostname/project → boot failure
test('G3 staging flag + production Vercel project URL → THROWS', () =>
  withEnv({ ...STAGING, VERCEL_PROJECT_PRODUCTION_URL: 'klixix-booking-form.vercel.app' }, () => {
    assert.throws(() => assertFakeModeSafe(), /not the staging API project/)
  }))
test('G3b staging flag + embed.car-one.com.au in ALLOWED_ORIGIN → THROWS', () =>
  withEnv({ ...STAGING, ALLOWED_ORIGIN: 'https://embed.car-one.com.au' }, () => {
    assert.throws(() => assertFakeModeSafe(), /production identity/)
  }))

// 4) staging flag + MISSING project identity → boot failure
test('G4 staging flag + missing/mismatched Vercel identity (on Vercel, wrong host) → THROWS', () =>
  withEnv({ MECHANICDESK_FAKE: '1', STAGING_MODE: '1', SUPABASE_URL: STAGING.SUPABASE_URL, VERCEL_URL: 'some-other-proj-abc.vercel.app' }, () => {
    assert.throws(() => assertFakeModeSafe(), /identity check failed/)
  }))
test('G4b staging flag + STAGING_MODE missing → THROWS', () =>
  withEnv({ MECHANICDESK_FAKE: '1', SUPABASE_URL: STAGING.SUPABASE_URL, VERCEL_PROJECT_PRODUCTION_URL: STAGING.VERCEL_PROJECT_PRODUCTION_URL }, () => {
    assert.throws(() => assertFakeModeSafe(), /STAGING_MODE/)
  }))

// 5) fake flag on the production Car One project → boot failure
test('G5 fake flag on production project identity (no staging mode, prod host) → THROWS', () =>
  withEnv({ MECHANICDESK_FAKE: '1', VERCEL_ENV: 'production', VERCEL_PROJECT_PRODUCTION_URL: 'klixix-booking-form.vercel.app', SUPABASE_URL: 'https://lhzkznzlpmegoteukkuy.supabase.co' }, () => {
    assert.throws(() => assertFakeModeSafe())
  }))

// 6) production Supabase reference anywhere in fake mode → boot failure
test('G6 production Supabase ref present with fake flag → THROWS (configMentionsProduction)', () =>
  withEnv({ ...STAGING, SUPABASE_URL: 'https://cwdelnmbawffmfewprzz.supabase.co', ALLOWED_ORIGIN: 'https://x.com,https://lhzkznzlpmegoteukkuy.supabase.co' }, () => {
    assert.throws(() => assertFakeModeSafe(), /production identity/)
  }))

// 7) fake disabled → real adapter unchanged
test('G7 no fake flag → real impl returned unchanged (identity), no throw', () =>
  withEnv({ VERCEL_ENV: 'production', VERCEL_PROJECT_PRODUCTION_URL: 'klixix-booking-form.vercel.app' }, () => {
    assert.doesNotThrow(() => assertFakeModeSafe())
    assert.equal(resolvePostMechanicDesk(realImpl), realImpl)
    assert.equal(isFakeModeRequested(), false)
  }))

// 8) no secret/key is logged in any failure
test('G8 failure message contains NO secret value', () =>
  withEnv({ ...STAGING, SUPABASE_URL: 'https://lhzkznzlpmegoteukkuy.supabase.co', SUPABASE_SERVICE_KEY: 'sb_secret_TOPSECRET_DO_NOT_LEAK' }, () => {
    try { assertFakeModeSafe(); assert.fail('expected throw') }
    catch (e) {
      assert.doesNotMatch(e.message, /TOPSECRET|sb_secret_/)
    }
  }))

// local/CI path (no Vercel identity) still allowed with full staging Supabase + STAGING_MODE
test('local/CI (no Vercel vars) + staging Supabase + STAGING_MODE + fake → permitted', () =>
  withEnv({ MECHANICDESK_FAKE: '1', STAGING_MODE: '1', SUPABASE_URL: STAGING.SUPABASE_URL }, () => {
    assert.doesNotThrow(() => assertFakeModeSafe())
    assert.equal(isFakeModeEnabled(), true)
  }))

test('supabaseRef parses the project ref', () =>
  withEnv({ SUPABASE_URL: 'https://cwdelnmbawffmfewprzz.supabase.co' }, () =>
    assert.equal(supabaseRef(), 'cwdelnmbawffmfewprzz')))
