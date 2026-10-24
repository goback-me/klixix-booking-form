/**
 * Customer-facing notices for the HTTP 202 "received but NOT confirmed" states.
 * These never claim a confirmed appointment, never fire a conversion, and never
 * redirect — they tell the customer exactly what happened and how to get help.
 */
export const SUPPORT_PHONE_DISPLAY = '(07) 3607 0215'
export const SUPPORT_PHONE_TEL = '+61736070215'

/**
 * @param {string|undefined} state  booking_state from the API (sync_failed | sync_unknown | …)
 * @returns {string}
 */
export function noticeForPendingState(state) {
  if (state === 'sync_failed') {
    return `We couldn’t submit your booking request to the workshop. Your appointment is not confirmed. Please call us on ${SUPPORT_PHONE_DISPLAY} so our team can help.`
  }
  if (state === 'sync_unknown') {
    return `We couldn’t confirm whether your request reached the workshop. Please call us on ${SUPPORT_PHONE_DISPLAY} before submitting again.`
  }
  // Fallback (any other non-confirmed 202) — still truthful, no success claim.
  return `We’ve received your request but it is not yet confirmed. Please call us on ${SUPPORT_PHONE_DISPLAY} to confirm your appointment.`
}
