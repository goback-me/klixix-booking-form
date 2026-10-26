// Field rules for the booking form. The backend mirrors these in
// backend/lib/validation.js — change both together.

export const LIMITS = {
  name: 60,
  email: 254,
  phone: 10,
  registration: 9,
  make: 40,
  model: 50,
  vin: 17,
  vipNumber: 30,
  additionalInfo: 1000,
}

/** Reduce any AU phone input to canonical 0-leading digits (handles +61 / 61 forms). */
export function toAuPhoneDigits(raw) {
  let s = String(raw || '').replace(/[^\d+]/g, '')
  if (s.startsWith('+61')) s = '0' + s.slice(3)
  else if (s.startsWith('61') && s.length === 11) s = '0' + s.slice(2)
  return s.replace(/\D/g, '')
}

/** A valid AU number: 10 digits, 0 + a mobile (4) or landline (2/3/7/8) prefix. */
export function isValidAuPhone(raw) {
  return /^0[234578]\d{8}$/.test(toAuPhoneDigits(raw))
}

// ── As-you-type filters: drop characters a field can never contain. ────────

/** Digits only. A pasted +61 / 61 number is converted to its 0-leading form. */
export function sanitizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.startsWith('61') && digits.length >= 11) return ('0' + digits.slice(2)).slice(0, LIMITS.phone)
  // Leave room to finish typing a 61-prefixed number before converting it.
  return digits.slice(0, digits.startsWith('61') ? 11 : LIMITS.phone)
}

/** Letters, spaces, apostrophes, hyphens and dots. */
export function sanitizeName(value) {
  return String(value || '').replace(/[^\p{L}\p{M} '’.-]/gu, '').replace(/\s{2,}/g, ' ').slice(0, LIMITS.name)
}

/** No whitespace inside an email address. */
export function sanitizeEmail(value) {
  return String(value || '').replace(/\s/g, '').slice(0, LIMITS.email)
}

/** Plates are stored without spaces or dashes. */
export function sanitizeRegistration(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, LIMITS.registration)
}

export function sanitizeMake(value) {
  return String(value || '').replace(/[^\p{L}\p{M}\d .,&'’/+-]/gu, '').slice(0, LIMITS.make)
}

export function sanitizeModel(value) {
  return String(value || '').replace(/[^\p{L}\p{M}\d .,&'’/+()-]/gu, '').slice(0, LIMITS.model)
}

export function sanitizeVipNumber(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, LIMITS.vipNumber)
}

// ── Submit-time checks: each returns an error message, or '' when valid. ──

const EMAIL_RE = /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/

export function validateName(raw) {
  const v = String(raw || '').trim()
  if (!/^[\p{L}\p{M}][\p{L}\p{M} '’.-]*$/u.test(v)) return 'Name can only contain letters, spaces, hyphens and apostrophes.'
  if (!/\S+\s+\S+/.test(v)) return 'Please enter your first and last name.'
  if (v.length > LIMITS.name) return `Name must be ${LIMITS.name} characters or fewer.`
  return ''
}

export function validateEmail(raw) {
  const v = String(raw || '').trim()
  const [local = ''] = v.split('@')
  if (v.length > LIMITS.email || local.length > 64 || !EMAIL_RE.test(v)) {
    return 'Please enter a valid email address (e.g. name@example.com).'
  }
  return ''
}

export function validatePhone(raw) {
  return isValidAuPhone(raw) ? '' : 'Please enter a valid 10-digit Australian phone number (e.g. 0412345678).'
}

export function validateRegistration(raw) {
  const v = String(raw || '').toUpperCase().replace(/[\s-]/g, '')
  return /^[A-Z0-9]{2,9}$/.test(v) ? '' : 'Registration must be 2–9 letters or numbers.'
}

export function validateMake(raw) {
  const v = String(raw || '').trim()
  if (v.length > LIMITS.make || !/^[\p{L}\p{M}\d][\p{L}\p{M}\d .,&'’/+-]*$/u.test(v) || !/\p{L}/u.test(v)) {
    return 'Please enter a valid vehicle make (e.g. Toyota).'
  }
  return ''
}

export function validateModel(raw) {
  const v = String(raw || '').trim()
  if (v.length > LIMITS.model || !/^[\p{L}\p{M}\d][\p{L}\p{M}\d .,&'’/+()-]*$/u.test(v)) {
    return 'Please enter a valid vehicle model (e.g. Corolla).'
  }
  return ''
}

export function validateYear(raw, now = new Date()) {
  const v = String(raw || '').trim()
  const n = Number.parseInt(v, 10)
  if (!/^\d{4}$/.test(v) || n < 1900 || n > now.getFullYear() + 1) {
    return `Please enter a 4-digit vehicle year between 1900 and ${now.getFullYear() + 1}.`
  }
  return ''
}

/** VIN is optional; older vehicles can have chassis numbers shorter than 17. */
export function validateVin(raw) {
  const v = String(raw || '').trim().toUpperCase()
  if (!v) return ''
  return /^[A-Z0-9]{11,17}$/.test(v) ? '' : 'VIN must be 11–17 letters or numbers.'
}

export function validateVipNumber(raw) {
  const v = String(raw || '').trim()
  return /^[A-Za-z0-9-]{3,30}$/.test(v) ? '' : 'VIP number must be 3–30 letters or numbers.'
}

export function validateAdditionalInfo(raw) {
  return String(raw || '').length > LIMITS.additionalInfo
    ? `Please keep additional information under ${LIMITS.additionalInfo} characters.`
    : ''
}
