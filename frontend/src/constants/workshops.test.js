import test from 'node:test'
import assert from 'node:assert/strict'
import { WORKSHOPS, getPresetWorkshop } from './workshops.js'

test('preset workshop: hendra resolves to the Hendra workshop object', () => {
  const w = getPresetWorkshop('hendra')
  assert.equal(w, WORKSHOPS.find((x) => x.workshopId === 'hendra'))
  assert.equal(w?.id, 1)
})

test('preset workshop: woolloongabba and gabba alias both resolve to Woolloongabba', () => {
  assert.equal(getPresetWorkshop('woolloongabba')?.workshopId, 'woolloongabba')
  assert.equal(getPresetWorkshop('gabba')?.workshopId, 'woolloongabba')
  assert.equal(getPresetWorkshop('  GABBA ')?.workshopId, 'woolloongabba')
})

test('preset workshop: missing / unknown / tampered values fall back to null (normal flow)', () => {
  for (const v of [null, undefined, '', 'brisbane', 'hendra2', '__proto__', 'constructor', 'toString']) {
    assert.equal(getPresetWorkshop(v), null, String(v))
  }
})
