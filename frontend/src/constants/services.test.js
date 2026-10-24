import test from 'node:test'
import assert from 'node:assert/strict'
import { SERVICES, QUOTE_PAGE_PATHS, AC_LANDING_PATH, getServiceByValue, deriveConversionFields } from './services.js'
import { HENDRA_ADDONS, GABBA_ADDONS } from './addons.js'

const AC = getServiceByValue('air_conditioning_service')

test('AC is a top-level service (shared list → available at both workshops)', () => {
  assert.ok(AC, 'AC service exists')
  assert.equal(AC.name, 'Air Conditioning Service')
  assert.equal(AC.value, 'air_conditioning_service')
  assert.equal(AC.priceLabel, 'A$249 incl. GST')
  assert.match(AC.note, /Inspection first/)
})

test('approved wording excludes forbidden claims', () => {
  for (const bad of [/refrigerant/i, /warranty/i, /mobile/i, /all makes/i, /all models/i, /same.?day/i]) {
    assert.doesNotMatch(AC.note, bad, `must not mention ${bad}`)
  }
})

test('AC landing path is a recognised paid path', () => {
  assert.ok(QUOTE_PAGE_PATHS.includes(AC_LANDING_PATH))
})

test('AC paid-LP classification → paid_landing + /ac-service-new-brisbane/ + air_conditioning_service', () => {
  const r = deriveConversionFields({ parentUrl: 'https://carone-booking-parent-staging.vercel.app/ac-service-new-brisbane/', service: AC })
  assert.equal(r.bookingEntryPoint, 'paid_landing')
  assert.equal(r.landingPageType, '/ac-service-new-brisbane/')
  assert.equal(r.serviceType, 'air_conditioning_service')
})

test('non-paid main_site → main_site/none; stable value emitted (not display name)', () => {
  const r = deriveConversionFields({ parentUrl: 'https://car-one.com.au/book/', service: getServiceByValue('general_service') })
  assert.equal(r.bookingEntryPoint, 'main_site')
  assert.equal(r.landingPageType, 'none')
  assert.equal(r.serviceType, 'general_service')
})

test('no parent url → direct', () => {
  assert.equal(deriveConversionFields({ parentUrl: '', service: AC }).bookingEntryPoint, 'direct')
})

test('derived conversion fields contain NO PII keys', () => {
  const r = deriveConversionFields({ parentUrl: AC_LANDING_PATH, service: AC })
  for (const k of ['name', 'email', 'phone', 'registration', 'registration_number', 'vin', 'address']) {
    assert.equal(k in r, false)
  }
})

test('obsolete "A/C re-gas & full service" / "AC Regas" add-on removed from BOTH workshops', () => {
  for (const [label, list] of [['Hendra', HENDRA_ADDONS], ['Woolloongabba', GABBA_ADDONS]]) {
    const hit = list.find((a) => /re-gas\s*&\s*full service/i.test(a.name) || /^ac regas$/i.test(a.name))
    assert.equal(hit, undefined, `${label} still offers a removed re-gas add-on`)
  }
})

test('distinct AC cleaning products are retained (not the removed re-gas service)', () => {
  assert.ok(HENDRA_ADDONS.some((a) => /clean & deodoriser/i.test(a.name)))
  assert.ok(GABBA_ADDONS.some((a) => /cabin filter/i.test(a.name)))
})
