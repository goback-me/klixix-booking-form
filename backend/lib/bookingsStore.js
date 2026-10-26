/**
 * Booking storage via Supabase (PostgREST over HTTP).
 *
 * Server-side only. Uses the Supabase SERVICE ROLE key, which bypasses row
 * level security and must NEVER be exposed to the frontend. Talking to Supabase
 * over HTTP keeps this safe on serverless (no DB connection pooling to manage).
 *
 * Every function fails soft: if Supabase is not configured or errors, we log and
 * let the booking flow continue, so storage problems never block a customer.
 */

const TABLE = 'bookings'
const REQUEST_TIMEOUT_MS = 10_000

function config() {
  const url = (process.env.SUPABASE_URL || '').replace(/\/+$/, '')
  const key = (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  return url && key ? { url, key } : null
}

export function isConfigured() {
  return Boolean(config())
}

async function rest(path, { method = 'GET', body, headers = {} } = {}) {
  const c = config()
  if (!c) throw new Error('Supabase is not configured')
  const res = await fetch(`${c.url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: c.key,
      Authorization: `Bearer ${c.key}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  return res
}

/** PostgREST filter syntax uses , ( ) * — strip them from free-text search so a
 *  search term can't break the query. Values are still parameterised by PostgREST. */
function safeTerm(value) {
  return String(value || '').replace(/[(),*%]/g, ' ').trim().slice(0, 80)
}

/** Map the create-booking payload to a table row. */
function toRow(b) {
  const joinList = (v) => (Array.isArray(v) ? v.join(', ') : String(v || ''))
  return {
    workshop: String(b.workshop || ''),
    name: b.name || '',
    phone: b.phone || '',
    email: b.email || '',
    state: b.state || '',
    registration_number: b.registration_number || '',
    make: b.make || '',
    model: b.model || '',
    year: String(b.year || ''),
    vin: b.vin || '',
    drop_off_time: b.drop_off_time || '',
    service: joinList(b.job_type_names),
    addons: joinList(b.service_addons),
    note: b.note || '',
    is_flexible: Boolean(b.is_flexible),
    vip_number: b.vip_number || '',
    page_url: b.page_url || '',
    parent_page_url: b.parent_page_url || '',
    utm_source: b.utm_source || '',
    utm_medium: b.utm_medium || '',
    utm_campaign: b.utm_campaign || '',
    utm_content: b.utm_content || '',
    utm_term: b.utm_term || '',
    utm_ad: b.utm_ad || '',
    utm_campaign_id: b.utm_campaign_id || '',
    utm_adgroupid: b.utm_adgroupid || '',
    ad_id: b.ad_id || '',
    matchtype: b.matchtype || '',
    utm_device: b.utm_device || '',
    utm_geoloc: b.utm_GeoLoc || '',
    utm_placement: b.utm_placement || '',
    utm_network: b.utm_network || '',
    mechanicdesk_status: 'pending',
  }
}

/** Insert a booking. Returns the new row id, or null if storage is off/unavailable. */
export async function insertBooking(payload) {
  if (!isConfigured()) return null
  const res = await rest(TABLE, {
    method: 'POST',
    body: toRow(payload),
    headers: { Prefer: 'return=representation' },
  })
  if (!res.ok) {
    throw new Error(`Supabase insert failed (${res.status}): ${(await res.text()).slice(0, 200)}`)
  }
  const rows = await res.json()
  return Array.isArray(rows) && rows[0] ? rows[0].id : null
}

/** Record the MechanicDesk sync outcome on a stored booking. */
export async function updateBookingSync(id, { status, response, ref }) {
  if (!id || !isConfigured()) return
  await rest(`${TABLE}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: {
      mechanicdesk_status: status,
      mechanicdesk_response: response ?? null,
      mechanicdesk_ref: ref ?? null,
      synced_at: new Date().toISOString(),
    },
  })
}

/** List bookings for the admin page, filtered and paginated. */
export async function listBookings({ q, workshop, status, limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams()
  params.set('select', '*')
  params.set('order', 'created_at.desc')
  params.set('limit', String(Math.min(Math.max(Number(limit) || 50, 1), 500)))
  params.set('offset', String(Math.max(Number(offset) || 0, 0)))
  if (workshop) params.set('workshop', `eq.${safeTerm(workshop)}`)
  if (status) params.set('mechanicdesk_status', `eq.${safeTerm(status)}`)
  if (q) {
    const t = safeTerm(q)
    if (t) params.set('or', `(name.ilike.*${t}*,email.ilike.*${t}*,phone.ilike.*${t}*,registration_number.ilike.*${t}*)`)
  }
  const res = await rest(`${TABLE}?${params.toString()}`, { headers: { Prefer: 'count=exact' } })
  if (!res.ok) throw new Error(`Supabase list failed (${res.status})`)
  const rows = await res.json()
  const range = res.headers.get('content-range') || ''
  const total = Number(range.split('/')[1]) || rows.length
  return { rows, total }
}
