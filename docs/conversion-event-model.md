# Conversion event model — correction & migration (design only)

**Status: design + evidence. No code changed, nothing deployed, GTM/Ads untouched.**

## 1. The correction (evidence)

A `2xx` from MechanicDesk's `booking_requests/create_booking` means **the online request was
accepted and stored in the _Online Booking Requests_ inbox** — it does **not** mean a diary
booking exists. The production workflow (confirmed by MechanicDesk evidence):

1. Customer submits the online request.
2. It appears in MechanicDesk → **Online Booking Requests**.
3. **Staff** click *New Booking* and create/manage the diary booking.
4. The website does **not** allocate technician hours or create the diary booking.
5. Primary service + add-ons are visible in the request **notes**.

Source confirms the gap:
- [createBooking.js](../backend/routes/createBooking.js) `classifyMechanicDeskOutcome`: `r.ok` (HTTP 2xx) → state `confirmed`.
- `postMechanicDesk` reads `responseData = await response.json()` with the comment *"MechanicDesk may return empty"* — so success is the **HTTP status**, not a diary record.

**Withdrawn claim:** the browser submission / `200 confirmed` does **not** prove a diary-confirmed
booking. The current event name `booking_confirmed` is therefore **mis-named** — what the browser
can actually prove is *request submitted and accepted*.

## 2. Two distinct events

| Event | Meaning | Who can prove it | Fires from |
|---|---|---|---|
| `booking_request_submitted` | MechanicDesk accepted + stored the online request (HTTP 2xx) | the browser / our API | browser → parent dataLayer (today's path, renamed) |
| `booking_confirmed` | a **diary booking** was created by staff | only MechanicDesk (staff action) | **server-side**, on direct evidence — never the browser |

Rules:
- **(3)** `booking_request_submitted` may fire **only after** MechanicDesk accepts and stores the
  request (our current `state === 'confirmed'`, HTTP 200). This is a real, deduped signal — far
  better than a thank-you page view.
- **(4)** `booking_confirmed` must **not** fire from the browser. The browser has **no** signal that
  a diary booking was created (no MechanicDesk callback exists in the integration). It may fire only
  from a server trigger that has direct diary evidence (§6).

Customer wording is already correct and is **preserved**: [Step5Summary.jsx](../frontend/src/components/steps/Step5Summary.jsx) shows *"Thank you, your booking request has been received!"* and the 202 notice says *"We've received your request and will call you shortly to confirm your appointment time."* Neither claims a confirmed appointment.

## 3. Internal state naming (proposal)

The `booking_state` value `confirmed` means *"MechanicDesk accepted the request"*, not *"diary booked"*.
Proposed (design only):
- rename `confirmed` → **`request_accepted`** (same trigger: HTTP 2xx), and
- add a new terminal **`diary_confirmed`** set only by the server trigger in §6.
`sync_failed` / `sync_unknown` / `received` / `syncing` keep their meaning.

## 4. Stable request identifier (evidence)

- **Yes — ours is stable and already returned.** The API returns `booking_reference = <Supabase booking id (uuid)>`
  (= the idempotency reference). See `httpForOutcome`: `booking_reference = bookingId || idempotencyKey`.
  It is stored, returned to the browser, and embedded in the MechanicDesk note as the short ref
  **`CARONE-XXXXXXXX`** (first 8 hex of the id, upper-cased).
- **MechanicDesk's own id: unconfirmed.** The code opportunistically reads
  `responseData.booking_id || id || request_id` into `mechanicdesk_ref` **if present**, but the
  create_booking response "may be empty". Whether the widget returns a stable id is **not proven** —
  inspect a real production `mechanicdesk_response` (jsonb column) to confirm. On staging the fake
  adapter returns a `request_id`, which is not evidence about production.

**Use `booking_reference` (our id) as the transaction/join key everywhere.** It is the one stable,
confirmed identifier.

## 5. Joining an online request → the MechanicDesk diary booking

There is **no automatic callback** from MechanicDesk when staff create the diary booking, so the join
is currently **manual / by-reference**:
- The request note carries `[Online booking · CARONE-XXXXXXXX]` + primary service + add-ons. Staff see
  this in Online Booking Requests; the diary booking created from it inherits that note.
- Join candidates, strongest first:
  1. **`CARONE-XXXXXXXX`** in the note (present on the request and the diary booking made from it).
  2. Customer identity (name + phone + registration) **+** drop-off time.
  3. `mechanicdesk_ref` **if** MechanicDesk returns one and exposes a request→diary mapping (unconfirmed).

To get a reliable *diary-confirmed* signal we need one of (design options, none built):
- **A. MechanicDesk webhook** on diary-booking creation (if MechanicDesk offers one) → server matches
  by `CARONE-XXXXXXXX` → sets `diary_confirmed`.
- **B. Scheduled poll** of a MechanicDesk diary/bookings API (if available) → match by ref/identity → `diary_confirmed`.
- **C. Manual confirmation** in the internal `/admin` page → a staff click sets `diary_confirmed`.

## 6. Server-side `booking_confirmed` (diary) — shape

When (A/B/C) provides direct evidence, the **server** (not the browser):
1. Transitions the row to `diary_confirmed`.
2. Fires the conversion server-side — Google Ads **offline conversion import** or GA4 **Measurement
   Protocol** — keyed by `transaction_id = booking_reference` (our id), with the gclid/gbraid captured
   at submit time (store it on the row so offline import can attribute it).
3. Fires once per `booking_reference` (idempotent by the row state).

## 7. A/C add-on — unchanged

The Step-5 Air Conditioning Service add-on is **not** affected: it is transmitted as an additional
service (in `job_type_names` / `service_addons`), adds **no** extra conversion event, stays hidden
when A/C is the primary, and shown for all other primaries. (Its price display is a separate open item.)

## 8. Migration plan

| Item | Today | Target | How |
|---|---|---|---|
| **Page-view conversion** (`/thank-you-booking/`) | Live primary on prod; over-counts (refresh/revisit, unconfirmed) | Retired | Keep running until `booking_request_submitted` is validated live, then remove the page-view trigger at the approved cutover. Never remove early. |
| **Staging `booking_confirmed`** (browser) | Fires on HTTP 2xx (request accepted) — mis-named | Renamed to **`booking_request_submitted`** | Rename the browser event + the parent listener's dataLayer push + the GTM trigger. Same firing condition. |
| **`booking_request_submitted`** (secondary conversion) | — | Interim primary / secondary conversion | GTM: custom-event trigger → Ads **existing** conversion action + GA4, `transaction_id = {{booking_reference}}`. Deduped by transaction_id + browser sessionStorage (already built). |
| **Diary-confirmed primary** (`booking_confirmed`) | — | True primary conversion | Build one of §5 A/B/C → server-side conversion (§6), `transaction_id = booking_reference`. Keep `booking_request_submitted` as the lead/secondary. |
| **Dedup & transaction IDs** | sessionStorage per `booking_reference`; Ads `transaction_id` planned | Unified | **`transaction_id = booking_reference`** on every event. Browser sessionStorage stops refresh/replay re-fire of `request_submitted`; the row state stops double-fire of `diary_confirmed`. Use **two distinct Google Ads conversion actions** — one "booking request" (secondary), one "booking" (primary) — each keyed by the same `transaction_id` so neither double-counts, and the two are not merged into one. Do **not** create duplicate actions within a tier. |

### Sequencing (no implementation here)
1. Rename staging event → `booking_request_submitted`; validate in GTM Preview (no publish).
2. Point the **existing** Ads action at `booking_request_submitted`; keep the page-view trigger live.
3. At approved cutover: remove the page-view trigger. Request-submitted becomes the live (interim) primary.
4. Build the diary signal (§5) + server-side `booking_confirmed` (§6) as the true primary; demote
   request-submitted to secondary.

**Not done:** no code changed, nothing deployed, GTM not published, Google Ads unchanged.
