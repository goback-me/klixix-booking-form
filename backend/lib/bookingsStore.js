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

// ── Atomic idempotency: the DB (unique index on idempotency_key) is the single
//    authoritative owner across instances/restarts. The request whose INSERT
//    succeeds owns MechanicDesk submission; a loser reads the existing row. ──

/** Map booking_state → the legacy mechanicdesk_status the /admin filters still use. */
function legacyStatusFor(state) {
  if (state === 'confirmed') return 'sent'
  if (state === 'sync_failed' || state === 'sync_unknown') return 'failed'
  return 'pending' // received | syncing
}

/**
 * Atomically claim a booking by idempotency_key.
 * @returns {Promise<{ configured:boolean, created?:boolean, row?:any }>}
 *   configured:false  → storage is off (caller treats as storage-failed path)
 *   created:true      → THIS request owns MechanicDesk submission (row is the new row)
 *   created:false     → a prior request already owns it (row is the existing row); DO NOT call MechanicDesk
 */
export async function claimBooking(payload, idempotencyKey) {
  if (!isConfigured()) return { configured: false }
  const row = { ...toRow(payload), idempotency_key: idempotencyKey, booking_state: 'syncing', state_updated_at: new Date().toISOString() }
  const res = await rest(TABLE, { method: 'POST', body: row, headers: { Prefer: 'return=representation' } })
  if (res.status === 201) {
    const rows = await res.json()
    return { configured: true, created: true, row: Array.isArray(rows) ? rows[0] : rows }
  }
  // 409 = unique violation on idempotency_key → a concurrent/retried request already claimed it.
  if (res.status === 409) {
    const existing = await getBookingByIdemKey(idempotencyKey)
    return { configured: true, created: false, row: existing }
  }
  throw new Error(`Supabase claim failed (${res.status}): ${(await res.text()).slice(0, 200)}`)
}

/** Read a booking by its idempotency_key (used by the losing/retry request). */
export async function getBookingByIdemKey(idempotencyKey) {
  if (!isConfigured() || !idempotencyKey) return null
  const res = await rest(`${TABLE}?idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&select=*&limit=1`)
  if (!res.ok) return null
  const rows = await res.json()
  return Array.isArray(rows) && rows[0] ? rows[0] : null
}

/** Persist a state transition (confirmed | sync_failed | sync_unknown). Never throws fatally. */
export async function updateBookingState(id, state, { mechanicdeskRef = null, errorCategory = null, response = null } = {}) {
  if (!id || !isConfigured()) return
  await rest(`${TABLE}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: {
      booking_state: state,
      state_updated_at: new Date().toISOString(),
      mechanicdesk_status: legacyStatusFor(state),
      mechanicdesk_ref: mechanicdeskRef,
      error_category: errorCategory,
      mechanicdesk_response: response ?? null,
      synced_at: state === 'confirmed' ? new Date().toISOString() : null,
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
    const raw = String(q).trim()
    // A booking ref (CARONE-99ECC7FA = first 8 hex of the row id) or a full id →
    // look up the exact row; otherwise fall back to the free-text search.
    const refHex = raw.replace(/^carone[\s-]*/i, '').trim().toLowerCase()
    const fullId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(raw.toLowerCase())
    if (fullId) {
      params.set('id', `eq.${raw.toLowerCase()}`)
    } else if (/^[0-9a-f]{8}$/.test(refHex)) {
      // Match any uuid whose first 8 hex digits equal the ref, via an ordered range.
      params.append('id', `gte.${refHex}-0000-0000-0000-000000000000`)
      const next = (BigInt('0x' + refHex) + 1n).toString(16).padStart(8, '0')
      if (next.length <= 8) params.append('id', `lt.${next}-0000-0000-0000-000000000000`)
    } else {
      const t = safeTerm(q)
      if (t) params.set('or', `(name.ilike.*${t}*,email.ilike.*${t}*,phone.ilike.*${t}*,registration_number.ilike.*${t}*)`)
    }
  }
  const res = await rest(`${TABLE}?${params.toString()}`, { headers: { Prefer: 'count=exact' } })
  if (!res.ok) throw new Error(`Supabase list failed (${res.status})`)
  const rows = await res.json()
  const range = res.headers.get('content-range') || ''
  const total = Number(range.split('/')[1]) || rows.length
  return { rows, total }
}
