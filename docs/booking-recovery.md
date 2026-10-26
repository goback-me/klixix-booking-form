# Booking recovery — stale `received` / `syncing` / `sync_unknown` rows

**Read-only operational runbook. No code here auto-resubmits anything.**

When a booking request is received, the server first makes an **atomic claim** in Supabase
(`booking_state = 'syncing'`, see [backend/lib/bookingsStore.js](../backend/lib/bookingsStore.js))
**before** it ever calls MechanicDesk. That ordering is deliberate: if the process dies, the
network drops, or a later state write fails, the row survives in a **non-terminal** state and can
be found and reconciled by hand. This document is how an operator finds those rows.

## State machine (recap)

| `booking_state` | Meaning | Terminal? | Converts? |
|---|---|---|---|
| `received`   | Row created, submission not yet attempted (legacy/default) | no | no |
| `syncing`    | Claimed; MechanicDesk call in flight or process died mid-flight | no | no |
| `confirmed`  | MechanicDesk returned 2xx | yes | **yes** |
| `sync_failed`| MechanicDesk explicitly rejected (HTTP non-2xx) | yes | no |
| `sync_unknown`| Timed out / network-dropped — MechanicDesk **may** have the booking | yes* | no |

\* `sync_unknown` is terminal **for the automated path**. It must only leave this state through
a **human** who has checked MechanicDesk. See the prohibition below.

## Stale threshold (config)

A row is **stale** when it has sat in a non-terminal state (`received` / `syncing`) longer than the
threshold. Configure via env (consumed only by the read-only query/reporting, never by the request path):

```
BOOKING_STALE_AFTER_MINUTES=15     # default 15; a healthy sync resolves in < 1 min
```

15 minutes is comfortably longer than the MechanicDesk timeout (`MECHANICDESK_TIMEOUT_MS`, default
12 s) plus any retried client submit, so a row still `syncing` past it indicates a dropped process,
not a slow request.

## Read-only recovery query

Run against the Supabase read replica / SQL editor. **SELECT only — do not UPDATE from here.**

```sql
-- Stale, never-resolved rows (died mid-sync): oldest first.
select id, idempotency_key, booking_state, state_updated_at, error_category, created_at
from bookings
where booking_state in ('received', 'syncing')
  and coalesce(state_updated_at, created_at) < now() - interval '15 minutes'
order by coalesce(state_updated_at, created_at) asc;

-- Indeterminate outcomes awaiting a human decision (may or may not exist in MechanicDesk).
select id, idempotency_key, booking_state, state_updated_at, error_category, created_at
from bookings
where booking_state = 'sync_unknown'
order by state_updated_at desc;

-- Explicit rejections (safe to re-contact the customer / re-book deliberately).
select id, idempotency_key, booking_state, error_category, created_at
from bookings
where booking_state = 'sync_failed'
order by created_at desc;
```

## Operational status path

A read-only health count (safe to expose to an internal dashboard or a cron that emails the team):

```sql
select booking_state, count(*)
from bookings
where created_at > now() - interval '24 hours'
group by booking_state
order by booking_state;
```

Alert when `syncing` older than the threshold, or any `sync_unknown`, is non-zero.

## Manual reconciliation (required for `sync_unknown`)

For every `sync_unknown` row, a human must:

1. Open MechanicDesk → **Diary → Online Booking Requests** and search the Note for the short ref
   (`CARONE-XXXXXXXX`, derived from the row `id`) and/or the customer's name/registration.
2. **If the booking is present** → mark it handled in MechanicDesk; update the Supabase row to
   `confirmed` by hand (note who/when). Do **not** re-submit.
3. **If the booking is absent** → the customer is NOT booked. Contact them or deliberately
   re-book once, then set the row to `confirmed` (if re-booked) or `sync_failed` (if abandoned).

For `syncing` rows past the stale threshold, treat them the same as `sync_unknown`: check
MechanicDesk first, because the process may have died *after* MechanicDesk accepted.

## Prohibition on automatic retry (`sync_unknown`)

**The system MUST NOT automatically retry a `sync_unknown` (or stale `syncing`) booking.**
A timeout or dropped connection does not prove MechanicDesk failed to create the booking — an
automatic retry would risk a **duplicate** booking for the same customer. Every exit from
`sync_unknown` goes through the manual reconciliation above. This is enforced in code by
`classifyMechanicDeskOutcome` (timeout/network → `sync_unknown`, never a retried `sync_failed`)
and by the request path calling MechanicDesk **exactly once** per idempotency key.

## Not in scope

No admin interface is built for this. The queries above are run in the existing Supabase SQL
editor by an authorised operator. **Do not build an admin/reconciliation UI unless separately
authorised.**
