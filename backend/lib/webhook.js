/**
 * Outbound booking webhook (Zapier / n8n / GoHighLevel, whatever WEBHOOK_URL points at).
 *
 * This is called server-side from create-booking AFTER the booking is stored and
 * forwarded, so the webhook:
 *   - can't be lost when a quote page redirects the browser away, and
 *   - isn't exposed as a public endpoint anyone could POST fake bookings to, and
 *   - carries the booking id so the lead can be matched back to Supabase/MechanicDesk.
 */

function toStr(value) {
  if (value === null || value === undefined) return ''
  return String(value)
}

/** Converts "22/05/2026 08:00" → "22/05/2026 8:00 AM" for webhook display */
function toAmPmTime(dropOffTime) {
  if (!dropOffTime) return toStr(dropOffTime)
  const match = String(dropOffTime).match(/^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}):(\d{2})$/)
  if (!match) return toStr(dropOffTime)
  let hours = parseInt(match[2], 10)
  const minutes = match[3]
  const period = hours >= 12 ? 'PM' : 'AM'
  if (hours === 0) hours = 12
  else if (hours > 12) hours -= 12
  return `${match[1]} ${hours}:${minutes} ${period}`
}

export function buildWebhookFields(payload) {
  const fields = {}

  const jobTypeNames = Array.isArray(payload.job_type_names) ? payload.job_type_names : []
  const serviceAddons = Array.isArray(payload.service_addons) ? payload.service_addons : []

  // Booking id first so the lead can be matched back to Supabase / MechanicDesk.
  fields['Booking Id'] = toStr(payload.booking_id)
  fields['MechanicDesk Ref'] = toStr(payload.mechanicdesk_ref)

  // Human-readable keys requested for webhook integrations.
  fields.Workshop = toStr(payload.workshop)
  fields['Page URL'] = toStr(payload.page_url)
  fields['Parent Page URL'] = toStr(payload.parent_page_url)
  fields.Name = toStr(payload.name)
  fields.Phone = toStr(payload.phone)
  fields.Email = toStr(payload.email)
  fields.State = toStr(payload.state)
  fields['Registration Number'] = toStr(payload.registration_number)
  fields.Make = toStr(payload.make)
  fields.Model = toStr(payload.model)
  fields.Year = toStr(payload.year)
  fields.VIN = toStr(payload.vin)
  fields['Drop Off Time'] = toAmPmTime(payload.drop_off_time)
  fields.Note = toStr(payload.note)
  fields['Booking Note'] = toStr(payload.booking_note)
  fields.Alert = toStr(payload.alert)
  fields['Is Flexible'] = toStr(payload.is_flexible)

  // UTM/ad params (always include, even if empty)
  const utmKeys = [
    'utm_source','utm_medium','utm_campaign','utm_content','utm_ad','utm_term','matchtype','utm_device','utm_GeoLoc','utm_placement','utm_network','utm_campaign_id','utm_adgroupid','ad_id'
  ]
  utmKeys.forEach((key) => {
    fields[key] = toStr(payload[key])
  })

  // Summary keys plus indexed keys for line-item style display.
  fields['Job Type Names'] = jobTypeNames.join(', ')
  jobTypeNames.forEach((name, idx) => {
    fields[`Job Type Names ${idx + 1}`] = toStr(name)
  })

  fields['Service Addons'] = serviceAddons.join(', ')
  serviceAddons.forEach((name, idx) => {
    fields[`Service Addons ${idx + 1}`] = toStr(name)
  })

  // Keep machine-friendly originals for downstream compatibility.
  fields.booking_id = toStr(payload.booking_id)
  fields.mechanicdesk_ref = toStr(payload.mechanicdesk_ref)
  fields.workshop = toStr(payload.workshop)
  fields.page_url = toStr(payload.page_url)
  fields.parent_page_url = toStr(payload.parent_page_url)
  fields.name = toStr(payload.name)
  fields.phone = toStr(payload.phone)
  fields.email = toStr(payload.email)
  fields.state = toStr(payload.state)
  fields.registration_number = toStr(payload.registration_number)
  fields.make = toStr(payload.make)
  fields.model = toStr(payload.model)
  fields.year = toStr(payload.year)
  fields.vin = toStr(payload.vin)
  fields.drop_off_time = toAmPmTime(payload.drop_off_time)
  fields.job_type_names = jobTypeNames.join(', ')
  fields.note = toStr(payload.note)
  fields.booking_note = toStr(payload.booking_note)
  fields.alert = toStr(payload.alert)
  fields.service_addons = serviceAddons.join(', ')
  fields.is_flexible = toStr(payload.is_flexible)

  return fields
}

/**
 * Fire the booking webhook. Never throws — a webhook failure must not fail the
 * booking (which is already saved). Returns a small result for logging.
 * @param {Record<string, any>} payload  the create-booking request body
 * @param {{ bookingId?: string | null, mechanicdeskRef?: string | null }} [extra]
 */
export async function sendBookingWebhook(payload, extra = {}) {
  const webhookUrl = (process.env.WEBHOOK_URL || process.env.ZAPIER_WEBHOOK_URL || '').trim()
  const webhookMethod = (process.env.WEBHOOK_METHOD || 'POST').trim().toUpperCase()
  if (!webhookUrl) return { skipped: true }

  try {
    const fields = buildWebhookFields({
      ...payload,
      booking_id: extra.bookingId ?? payload.booking_id ?? '',
      mechanicdesk_ref: extra.mechanicdeskRef ?? '',
    })
    const isGetMethod = webhookMethod === 'GET'
    const params = new URLSearchParams(fields)
    const separator = webhookUrl.includes('?') ? '&' : '?'
    const targetUrl = isGetMethod ? `${webhookUrl}${separator}${params.toString()}` : webhookUrl

    const fetchOptions = { method: webhookMethod, signal: AbortSignal.timeout(8000) }
    if (!isGetMethod) {
      fetchOptions.headers = { 'Content-Type': 'application/json' }
      fetchOptions.body = JSON.stringify(fields)
    }

    const response = await fetch(targetUrl, fetchOptions)
    if (!response.ok) {
      console.warn('Booking webhook failed:', response.status, response.statusText)
      return { ok: false, status: response.status }
    }
    return { ok: true, status: response.status, sentFieldCount: Object.keys(fields).length }
  } catch (error) {
    console.error('Booking webhook error:', error instanceof Error ? error.message : error)
    return { ok: false, error: 'request failed' }
  }
}
