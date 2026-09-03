# Deploying the booking form

Two pieces deploy separately:

| Part | What it is | Host |
|---|---|---|
| `frontend/` | Static Vite/Preact bundle | **Vercel** (project `carone-booking-form-test`) |
| `backend/` | Express API | **Vercel** serverless (project `carone-booking-api-test`) or a persistent Node host (Render / Railway / Fly) |

## Spend protection — read this before going live

InfoAgent charges for **every** lookup, including "no match", and has **no
server-side cap** (confirmed by InfoAgent, Sep 2026). The only ceiling is the
one in this app, which has four layers:

| Layer | What it does | Where it lives |
|---|---|---|
| Turnstile bot challenge | A browser must pass Cloudflare's challenge before it can get a lookup session | `/api/lookup-session`, `TURNSTILE_SECRET_KEY` |
| Session cap | 5 distinct lookups per session token (30-minute life) | `INFOAGENT_SESSION_LIMIT` |
| Per-IP rate limit | 20 sessions and 10 lookups per IP per 15 minutes | express-rate-limit |
| Daily / monthly cap | Hard stop on billable lookups per Brisbane day (default 30) and optionally per month | `INFOAGENT_DAILY_LIMIT`, `INFOAGENT_MONTHLY_LIMIT` |

Plus a one-hour result cache so repeat lookups of the same plate are free.

The caps and cache are held in **Upstash Redis** when `UPSTASH_REDIS_REST_URL`
and `UPSTASH_REDIS_REST_TOKEN` are set, otherwise in process memory. Memory is
fine for the sandbox but **not** for live:

- On Vercel every serverless instance has its own memory, so the cap never holds.
- On Render's free tier the process sleeps after ~15 minutes and forgets the count.

Because of that the code refuses to run live lookups on serverless without
Redis, and refuses live lookups anywhere without Turnstile. Both show up in the
startup log as `🚫 InfoAgent lookups blocked: …`.

## Going live checklist

1. **Upstash Redis** — create a free database at upstash.com, copy the REST URL
   and token into the backend env as `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`.
2. **Cloudflare Turnstile** — at dash.cloudflare.com → Turnstile, add a widget
   (type *Managed*). Allowed hostnames must list every hostname the **form
   itself** is served from (the Vercel URL and `embed.car-one.com.au`), not the
   parent page that embeds it. Put the secret key in the backend as
   `TURNSTILE_SECRET_KEY` and the site key in the frontend as `VITE_TURNSTILE_SITE_KEY`.
3. **Caps** — set `INFOAGENT_DAILY_LIMIT` to the same number as InfoAgent's daily
   warning (currently 30) so both alarms fire together. Optionally set
   `INFOAGENT_MONTHLY_LIMIT`.
4. **Live credentials** — add `INFOAGENT_LIVE_CLIENT_ID` / `INFOAGENT_LIVE_CLIENT_SECRET`
   in the host dashboard only. Never in `.env` on a laptop, never in the repo.
5. Flip `INFOAGENT_ENV` to `live` and redeploy **both** projects.
6. Check the runtime log shows `💳 InfoAgent live: … Turnstile enforced` and no
   `🚫` lines. On Vercel this prints on each cold start.
7. Do one real lookup from the deployed form and confirm it reconciles in the
   InfoAgent portal.

Live is ~$0.3072 + GST per lookup with a $99.95 + GST monthly minimum
(~325 lookups). A "no match" is billed too.

## Backend → Vercel

- Root directory: `backend`. `vercel.json` rewrites every path to `api/index.js`.
- Env vars: everything in `backend/.env.example` except `PORT`. The MechanicDesk
  tokens (`HENDRA_TOKEN`, `WOOLLOONGABBA_TOKEN`) and `WEBHOOK_URL` are required
  for bookings to work at all.
- The account must be on a plan that permits commercial use (Pro), which also
  unlocks Vercel Firewall rate-limit rules at the edge.

## Backend → Render (alternative)

1. New → **Blueprint**, point it at this repo. Render reads `render.yaml`.
2. Enter the secrets it asks for. `LOOKUP_SESSION_SECRET` is generated for you.
3. Confirm the startup log shows the expected environment.

## Frontend → Vercel

- Root directory: `frontend` · Build: `npm run build` · Output: `dist`
- Env vars: `VITE_API_URL` = the backend URL, `VITE_TURNSTILE_SITE_KEY` = the Turnstile site key.
- Then set the backend's `ALLOWED_ORIGIN` to the frontend URL, exactly, no
  trailing slash, or the browser will block the API calls with a CORS error.

## Test plates (sandbox only)

The sandbox has its own fake vehicles; real regos return "not found".

| Rego | State | Returns |
|---|---|---|
| ATZ192 | QLD | 2013 Lexus IS250 |
| ZLEV01 | VIC | 2021 Holden Cruz |
| TE02HP | NSW | 2010 Nissan Tiida |
| YAW51Q | ACT | 1999 Ford Laser |

VIN examples: `JTHBK262405191074` (Lexus), `KMHK3815WJU021186` (Holden).

Turnstile test keys (always pass, for local runs only):
site key `1x00000000000000000000AA`, secret `1x0000000000000000000000000000000AA`.
