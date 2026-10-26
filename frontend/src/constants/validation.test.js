import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  sanitizePhone, sanitizeName, sanitizeEmail, sanitizeRegistration,
  validateName, validateEmail, validatePhone, validateRegistration, validateMake,
  validateModel, validateYear, validateVin, validateVipNumber, validateAdditionalInfo,
} from './validation.js'

test('sanitizePhone keeps digits only, max 10', () => {
  assert.equal(sanitizePhone('0412 345 678'), '0412345678')
  assert.equal(sanitizePhone('04a1b2-345678999'), '0412345678')
  assert.equal(sanitizePhone('+61 412 345 678'), '0412345678')
  assert.equal(sanitizePhone('6141234'), '6141234') // still typing a 61 number
})

test('sanitizeName / sanitizeEmail / sanitizeRegistration strip disallowed characters', () => {
  assert.equal(sanitizeName('John2 Smith!'), 'John Smith')
  assert.equal(sanitizeName("Mary-Jane O'Neil"), "Mary-Jane O'Neil")
  assert.equal(sanitizeEmail(' a b@x.com '), 'ab@x.com')
  assert.equal(sanitizeRegistration('abc-12 3'), 'ABC123')
})

test('validateEmail', () => {
  for (const ok of ['a@b.co', 'john.smith+car@example.com.au', 'x_y@sub.domain.io']) {
    assert.equal(validateEmail(ok), '', ok)
  }
  for (const bad of ['', 'abc', 'a@b', 'a@b.c', 'a..b@x.com', '.a@x.com', 'a@-x.com', 'a@x..com', 'a b@x.com', 'a@x.c0m']) {
    assert.notEqual(validateEmail(bad), '', bad)
  }
})

test('validatePhone', () => {
  assert.equal(validatePhone('0412345678'), '')
  assert.equal(validatePhone('0736070215'), '')
  assert.notEqual(validatePhone('041234567'), '')
  assert.notEqual(validatePhone('0112345678'), '')
  assert.notEqual(validatePhone('abcdefghij'), '')
})

test('validateName', () => {
  assert.equal(validateName('John Smith'), '')
  assert.equal(validateName('Zoë D’Arcy-Lee'), '')
  assert.notEqual(validateName('John'), '')
  assert.notEqual(validateName('John Sm1th'), '')
  assert.notEqual(validateName('- -'), '')
})

test('vehicle fields', () => {
  assert.equal(validateRegistration('ABC123'), '')
  assert.notEqual(validateRegistration('A'), '')
  assert.notEqual(validateRegistration('ABC$12'), '')
  assert.equal(validateMake('Mercedes-Benz'), '')
  assert.notEqual(validateMake('1234'), '')
  assert.equal(validateModel('3'), '')
  assert.equal(validateModel('Hilux SR5, 4x4'), '')
  assert.notEqual(validateModel('<script>'), '')
  const now = new Date('2026-10-26')
  assert.equal(validateYear('2020', now), '')
  assert.equal(validateYear('2027', now), '')
  assert.notEqual(validateYear('2028', now), '')
  assert.notEqual(validateYear('1899', now), '')
  assert.equal(validateVin(''), '')
  assert.equal(validateVin('JTHBK262405191074'), '')
  assert.notEqual(validateVin('SHORT'), '')
})

test('vip number and additional info', () => {
  assert.equal(validateVipNumber('VIP-1234'), '')
  assert.notEqual(validateVipNumber('ab'), '')
  assert.equal(validateAdditionalInfo('x'.repeat(1000)), '')
  assert.notEqual(validateAdditionalInfo('x'.repeat(1001)), '')
})
