# CarOne Booking Form — Production Deployment Handoff

This branch contains a large set of changes. This doc is everything the developer
needs to deploy to production and what to configure. Public keys are inline;
**secrets are never committed** — get them from the sources noted.

## Architecture (unchanged)

| Part | Where | URL |
|---|---|---|
| Frontend (Vite/Preact) | Vercel · project `klixix-booking-form` | embed.car-one.com.au |
| Backend (Express) | Render · `klixix-booking-form` (persistent Node) | https://klixix-booking-form.onrender.com |

Frontend calls the backend via `VITE_API_URL`. Backend forwards bookings to
MechanicDesk and (new) stores them in Supabase.

## What changed this release

- Figma design matching across Workshop, Service, Car details, and Summary steps
  (typography, colours, spacing, images, the "Most booked" badge, the Summary
  "Total charges" tile).
- Workshop cards: live Brisbane-time open/closed status, formatted phone,
  tap-to-call and Google Maps links, fixed image cropping.
- Rego/VIN lookup hardening: **Cloudflare Turnstile** gate, **Upstash Redis**
  durable spend counters + result cache, per-session / daily / monthly caps,
  and a fail-safe that refuses live billable lookups on serverless without Redis.
- Security: trust the platform proxy for correct per-IP rate limiting; generic
  error messages (no internal/.env details leaked); MechanicDesk payload safety.
- **NEW — bookings stored in Supabase** (Postgres) as well as sent to MechanicDesk.
  Order: store first (source of truth) → forward to MechanicDesk → record the
  sync status and MechanicDesk reference. A booking is "received" if it lands in
  either place, so bookings are never lost if MechanicDesk is down.
- **NEW — internal admin page** at `/admin` (HTTP Basic auth) to list, search,
  filter, and CSV-export bookings, showing MechanicDesk sync status.

## Deploy

1. Merge/push this branch to the branch Render and Vercel auto-deploy from (main).
2. Backend (Render): root `backend`, start `node server.js`. Auto-deploys on push.
3. Frontend (Vercel): root `frontend`, build `npm run build`, output `dist`.
4. Set the environment variables below, then redeploy both.

## Environment variables

### Frontend — Vercel `klixix-booking-form`

| Var | Value | Status |
|---|---|---|
| `VITE_API_URL` | https://klixix-booking-form.onrender.com | existing |
| `VITE_TURNSTILE_SITE_KEY` | `0x4AAAAAAElCBf2Hs_rIXNoW` | **NEW** (public Turnstile site key) |

### Backend — Render `klixix-booking-form`

Keep existing:
- `HENDRA_TOKEN`, `WOOLLOONGABBA_TOKEN` — MechanicDesk
- `WEBHOOK_URL` (and/or `ZAPIER_WEBHOOK_URL`)
- `ALLOWED_ORIGIN` = the production frontend origin, exactly, no trailing slash
  (e.g. `https://embed.car-one.com.au`)

Add — InfoAgent rego (starts in free sandbox; flip to live when ready):
- `INFOAGENT_ENV` = `test` (set to `live` to go billable)
- `INFOAGENT_TEST_CLIENT_ID`, `INFOAGENT_TEST_CLIENT_SECRET` — sandbox (existing)
- `INFOAGENT_LIVE_CLIENT_ID`, `INFOAGENT_LIVE_CLIENT_SECRET` — from InfoAgent (only for live)
- `INFOAGENT_DAILY_LIMIT` = `30`
- `INFOAGENT_SESSION_LIMIT` = `5`
- `INFOAGENT_MONTHLY_LIMIT` = optional
- `LOOKUP_SESSION_SECRET` = a long random string
  (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `TURNSTILE_SECRET_KEY` = Cloudflare Turnstile **secret** key (from the Turnstile dashboard)
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` = from Upstash
  (**required before `INFOAGENT_ENV=live`** so the daily spend cap is durable)

Add — booking storage + admin:
- `SUPABASE_URL` = `https://lhzkznzlpmegoteukkuy.supabase.co`
- `SUPABASE_SERVICE_KEY` = Supabase **secret** key (`sb_secret_…`, Settings → API Keys → Secret keys)
- `ADMIN_USER` = `admin`
- `ADMIN_PASSWORD` = a strong password of your choice

The code also accepts `KV_REST_API_URL` / `KV_REST_API_TOKEN` in place of the
`UPSTASH_REDIS_REST_*` names (Vercel's Upstash integration uses those).

## One-time setup

- **Supabase table**: already created. If you ever recreate the project, run
  [`backend/db/schema.sql`](backend/db/schema.sql) in the Supabase SQL editor.
- **Cloudflare Turnstile**: widget created (keys above). Its allowed hostnames
  must include every hostname the form is served from — `embed.car-one.com.au`
  and the Vercel URL — not the parent page.
- **Upstash Redis**: create a free database, set the two REST vars. Required for
  live rego.

## Going live with billable rego

1. Set `UPSTASH_REDIS_REST_URL` / `_TOKEN`.
2. Set `INFOAGENT_LIVE_CLIENT_ID` / `_SECRET`.
3. Set `INFOAGENT_ENV=live`, redeploy.
4. Confirm `GET /` shows `environment: "live"`, `turnstile: "enforced"`,
   `counterStore: "Redis…"`, `blocked: []`.

InfoAgent bills every lookup including "no match" and has no server-side cap, so
these guards are the only spend ceiling. Keep `INFOAGENT_DAILY_LIMIT` aligned
with InfoAgent's daily warning (currently 30/day).

## Verify after deploy

- `GET https://klixix-booking-form.onrender.com/` → JSON health with a `lookup` block.
- `/admin` → log in → bookings list.
- One real booking → appears in MechanicDesk **and** `/admin` (status `sent` with a reference).
- One rego lookup (sandbox plate `ATZ192` / QLD → Lexus).

## Security

- `SUPABASE_SERVICE_KEY`, `TURNSTILE_SECRET_KEY`, InfoAgent secrets and
  `ADMIN_PASSWORD` are backend-only. Never put them in the frontend.
- `ALLOWED_ORIGIN` must match the production frontend exactly.
- Rotate the Supabase database password if it was shared anywhere.
