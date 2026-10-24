import test from 'node:test'
import assert from 'node:assert/strict'
import { AC_ADDON, addonsForPrimary, getAddonLookupByWorkshopId, applyAcAddonRule } from './addons.js'

const PRIMARIES = ['general_service', 'vehicle_repair', 'roadworthy_certificate', 'pre_purchase_inspection', 'other_enquiry']

test('AC add-on: label + stable value + image, and NO price/description', () => {
  assert.equal(AC_ADDON.value, 'air_conditioning_service')
  assert.equal(AC_ADDON.name, 'Air Conditioning Service')
  assert.match(AC_ADDON.image, /svc-air-conditioning\.png$/)
  assert.equal(AC_ADDON.priceLabel, '$249.00')
  assert.equal('note' in AC_ADDON, false)
})

for (const ws of ['hendra', 'woolloongabba']) {
  test(`${ws}: A/C add-on shown for every non-A/C primary, once`, () => {
    for (const p of PRIMARIES) {
      const list = addonsForPrimary(ws, p)
      assert.equal(list.filter((a) => a.id === AC_ADDON.id).length, 1, `${p} shows the A/C add-on exactly once`)
    }
  })
  test(`${ws}: A/C add-on HIDDEN when primary is Air Conditioning Service`, () => {
    assert.equal(addonsForPrimary(ws, 'air_conditioning_service').some((a) => a.id === AC_ADDON.id), false)
  })
  test(`${ws}: lookup resolves the A/C add-on id → name (reaches job_type_names)`, () => {
    assert.equal(getAddonLookupByWorkshopId(ws)[AC_ADDON.id]?.name, 'Air Conditioning Service')
  })
  test(`${ws}: no re-gas/regas product is offered as a substitute`, () => {
    const names = addonsForPrimary(ws, 'general_service').map((a) => a.name)
    assert.equal(names.some((n) => /re-gas\s*&\s*full service/i.test(n) || /^ac regas$/i.test(n)), false)
  })
}

test('changing primary to A/C removes the A/C add-on from extras (no duplication)', () => {
  const prev = { extras: [AC_ADDON.id, 3], service: { value: 'general_service' } }
  const next = applyAcAddonRule(prev, 'service', { value: 'air_conditioning_service' })
  assert.equal(next.extras.includes(AC_ADDON.id), false)
  assert.deepEqual(next.extras, [3])
})

test('changing primary to a non-A/C service keeps the A/C add-on selected', () => {
  const prev = { extras: [AC_ADDON.id], service: { value: 'air_conditioning_service' } }
  const next = applyAcAddonRule(prev, 'service', { value: 'general_service' })
  assert.deepEqual(next.extras, [AC_ADDON.id])
})

test('non-service updates never touch extras', () => {
  const prev = { extras: [AC_ADDON.id] }
  assert.deepEqual(applyAcAddonRule(prev, 'date', '2026-12-25').extras, [AC_ADDON.id])
})
