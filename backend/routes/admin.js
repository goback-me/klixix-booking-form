/**
 * Internal admin page for browsing stored bookings.
 *
 * Server-rendered on the backend so the Supabase service key never leaves the
 * server. Protected by HTTP Basic auth (ADMIN_USER / ADMIN_PASSWORD). Intended
 * for staff on a trusted network, over HTTPS.
 */
import { Router } from 'express'
import crypto from 'node:crypto'
import rateLimit from 'express-rate-limit'
import { listBookings, isConfigured } from '../lib/bookingsStore.js'

const router = Router()
const AU_TZ = 'Australia/Brisbane'
const PAGE_SIZE = 50

const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false })

/** Constant-time compare so the password check can't be timed. */
function safeEqual(a, b) {
  const ab = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  if (ab.length !== bb.length) return false
  return crypto.timingSafeEqual(ab, bb)
}

function requireAuth(req, res, next) {
  const user = (process.env.ADMIN_USER || 'admin').trim()
  const pass = (process.env.ADMIN_PASSWORD || '').trim()
  if (!pass) return res.status(503).send('Admin is not configured. Set ADMIN_PASSWORD on the backend.')
  const header = req.headers.authorization || ''
  const [scheme, encoded] = header.split(' ')
  if (scheme === 'Basic' && encoded) {
    const [u, p] = Buffer.from(encoded, 'base64').toString('utf8').split(':')
    if (safeEqual(u || '', user) && safeEqual(p || '', pass)) return next()
  }
  res.set('WWW-Authenticate', 'Basic realm="CarOne Admin", charset="UTF-8"')
  return res.status(401).send('Authentication required')
}

// The admin page uses inline styles; Helmet's default CSP would block them.
// Scope a permissive-but-locked-down policy to admin responses only.
router.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'self'; base-uri 'none'")
  next()
})

router.use(adminLimiter, requireAuth)

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

function fmtDate(iso) {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('en-AU', {
      timeZone: AU_TZ, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
    }).format(new Date(iso))
  } catch { return iso }
}

function statusBadge(s) {
  const map = { sent: '#17ab00', failed: '#e11d48', pending: '#b45309' }
  const c = map[s] || '#6b7280'
  return `<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;color:#fff;background:${c}">${esc(s || 'pending')}</span>`
}

router.get('/', async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).send('Booking storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_KEY.')
  }
  const q = (req.query.q || '').toString()
  const workshop = (req.query.workshop || '').toString()
  const status = (req.query.status || '').toString()
  const page = Math.max(parseInt(String(req.query.page || '1'), 10) || 1, 1)
  const offset = (page - 1) * PAGE_SIZE

  let rows = []
  let total = 0
  let error = ''
  try {
    ({ rows, total } = await listBookings({ q, workshop, status, limit: PAGE_SIZE, offset }))
  } catch (e) {
    error = e.message
  }

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1)
  const qp = (over) => {
    const p = new URLSearchParams({ q, workshop, status, page: String(page), ...over })
    ;[...p.entries()].forEach(([k, v]) => { if (!v) p.delete(k) })
    return p.toString()
  }

  const body = rows.map((r) => `
    <tr>
      <td class="nowrap">${esc(fmtDate(r.created_at))}</td>
      <td>${esc(r.workshop)}</td>
      <td>${esc(r.name)}<div class="sub">${esc(r.email)}</div><div class="sub">${esc(r.phone)}</div></td>
      <td>${esc(r.registration_number)}<div class="sub">${esc([r.make, r.model, r.year].filter(Boolean).join(' '))}</div></td>
      <td>${esc(r.service)}<div class="sub">${esc(r.addons)}</div></td>
      <td class="nowrap">${esc(r.drop_off_time)}${r.is_flexible ? '<div class="sub">Flexible</div>' : ''}</td>
      <td>${statusBadge(r.mechanicdesk_status)}${r.mechanicdesk_ref ? `<div class="sub">${esc(r.mechanicdesk_ref)}</div>` : ''}</td>
      <td class="sub">${esc([r.utm_source, r.utm_campaign].filter(Boolean).join(' / '))}</td>
    </tr>`).join('')

  res.set('Content-Type', 'text/html; charset=utf-8').send(`<!doctype html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>CarOne Bookings</title>
<style>
  :root { color-scheme: light; }
  body { font-family: -apple-system, system-ui, sans-serif; margin: 0; background: #f7f7f8; color: #111; }
  header { background: #111; color: #fff; padding: 14px 20px; display:flex; align-items:center; justify-content:space-between; }
  header b { color: #ff4d24; }
  .wrap { padding: 16px 20px; }
  form { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
  input, select { padding: 8px 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 14px; }
  button, .btn { padding: 8px 14px; border-radius: 8px; border: 0; background: #ff4d24; color: #fff; font-size: 14px; cursor: pointer; text-decoration: none; }
  .btn.secondary { background:#111; }
  table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
  th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #eee; font-size: 14px; vertical-align: top; }
  th { background: #fafafa; font-size: 12px; text-transform: uppercase; letter-spacing: .03em; color: #666; }
  .sub { color: #777; font-size: 12px; }
  .nowrap { white-space: nowrap; }
  .bar { display:flex; align-items:center; justify-content:space-between; margin: 12px 0; }
  .muted { color:#666; font-size: 13px; }
  .err { background:#fee2e2; color:#991b1b; padding:10px 12px; border-radius:8px; margin-bottom:12px; }
</style></head><body>
<header><div>CAR<b>ONE</b> · Bookings</div><a class="btn secondary" href="/admin/export.csv?${esc(qp({}))}">Export CSV</a></header>
<div class="wrap">
  ${error ? `<div class="err">Could not load bookings: ${esc(error)}</div>` : ''}
  <form method="get" action="/admin">
    <input type="search" name="q" placeholder="Search name, email, phone, rego" value="${esc(q)}" />
    <select name="workshop"><option value="">All workshops</option>
      <option value="hendra"${workshop === 'hendra' ? ' selected' : ''}>Hendra</option>
      <option value="woolloongabba"${workshop === 'woolloongabba' ? ' selected' : ''}>Woolloongabba</option>
    </select>
    <select name="status"><option value="">Any sync status</option>
      <option value="sent"${status === 'sent' ? ' selected' : ''}>Sent</option>
      <option value="failed"${status === 'failed' ? ' selected' : ''}>Failed</option>
      <option value="pending"${status === 'pending' ? ' selected' : ''}>Pending</option>
    </select>
    <button type="submit">Filter</button>
    <a class="btn secondary" href="/admin">Reset</a>
  </form>
  <div class="bar"><span class="muted">${total} booking${total === 1 ? '' : 's'} · page ${page} of ${totalPages}</span>
    <span>${page > 1 ? `<a class="btn secondary" href="/admin?${esc(qp({ page: String(page - 1) }))}">‹ Prev</a>` : ''}
    ${page < totalPages ? `<a class="btn secondary" href="/admin?${esc(qp({ page: String(page + 1) }))}">Next ›</a>` : ''}</span></div>
  <table><thead><tr>
    <th>Booked at</th><th>Workshop</th><th>Customer</th><th>Vehicle</th><th>Service</th><th>Drop-off</th><th>MechanicDesk</th><th>Source</th>
  </tr></thead><tbody>${body || '<tr><td colspan="8" class="muted">No bookings found.</td></tr>'}</tbody></table>
</div></body></html>`)
})

router.get('/export.csv', async (req, res) => {
  if (!isConfigured()) return res.status(503).send('Storage not configured')
  const q = (req.query.q || '').toString()
  const workshop = (req.query.workshop || '').toString()
  const status = (req.query.status || '').toString()
  let all = []
  try {
    const { rows } = await listBookings({ q, workshop, status, limit: 500, offset: 0 })
    all = rows
  } catch (e) {
    return res.status(500).send(`Export failed: ${e.message}`)
  }
  const cols = ['created_at', 'workshop', 'service', 'addons', 'drop_off_time', 'is_flexible', 'name', 'email', 'phone', 'registration_number', 'state', 'make', 'model', 'year', 'vin', 'vip_number', 'note', 'mechanicdesk_status', 'mechanicdesk_ref', 'page_url', 'parent_page_url', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_campaign_id', 'utm_adgroupid', 'ad_id', 'matchtype', 'utm_device', 'utm_geoloc', 'utm_placement', 'utm_network']
  const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = [cols.join(','), ...all.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n')
  res.set('Content-Type', 'text/csv; charset=utf-8')
  res.set('Content-Disposition', `attachment; filename="carone-bookings-${new Date().toISOString().slice(0, 10)}.csv"`)
  res.send(csv)
})

export default router
