# GTM — `booking_request_submitted` conversion (container GTM-WWNM4GD)

**FOR THE ANALYTICS OWNER — configure in PREVIEW ONLY. Do not publish until QA + Jai sign‑off.**

## Preview-phase boundaries (this phase)
- **Do NOT publish** the container. Preview/Tag Assistant only.
- **Do NOT fire production Google Ads or GA4 from staging.** Point any test tag at a *separate test*
  conversion action/label, or block the Ads/GA4 tags with a staging exception. The production
  Ads action `AW-11212284305` / GA4 `G-4K9TEQS2N4` must not receive staging traffic.
- **GTM Preview is NOT proof of analytics isolation** — Preview still transmits real hits. Isolation
  was proven separately at the served-asset level (no tracker in the staging bundles).
- **Do NOT create a second/duplicate Google Ads "booking" conversion action.** Reuse the existing
  one; keep its identity for the eventual cutover.
- `transaction_id` = `{{dlv.booking_reference}}` (Google dedupe).
- **Keep the current `/thank-you-booking/` page‑view trigger ACTIVE** until the separately approved
  production cutover — do not remove it during Preview/staging work.
- Do not run real MechanicDesk bookings as part of GTM testing.

## Variables (Data Layer Variables)
| Name | Data Layer key |
|---|---|
| `dlv.booking_reference` | `booking_reference` |
| `dlv.workshop` | `workshop` |
| `dlv.service_type` | `service_type` |
| `dlv.booking_entry_point` | `booking_entry_point` |
| `dlv.landing_page_type` | `landing_page_type` |

## Trigger
- **Custom Event**, Event name = `booking_request_submitted`.
- (Optional segmentation) duplicate the trigger with a condition `dlv.booking_entry_point equals paid_landing` if you want a paid‑only conversion in addition to the all‑bookings GA4 event.

## Google Ads conversion tag
- **Reuse the EXISTING conversion action** — Conversion ID **`11212284305`**, Label
  **`htzeCKWp2Y8dEJHDt-Ip`**. Keep its identity unchanged so historical data and bidding stay intact.
- **Do NOT create a second/new Google Ads "booking" conversion action.** Point the existing one at
  the new trigger. A duplicate action would split and double‑count conversions.
- **Transaction ID** = `{{dlv.booking_reference}}`  ← enables Google's duplicate‑conversion dedupe.
- Fire on the `booking_request_submitted` trigger (paid‑only variant if you chose segmentation).

## GA4 event tag
- Event name `booking_request_submitted`; params: `booking_reference`, `workshop`, `service_type`, `booking_entry_point`, `landing_page_type`.
- Fire on `booking_request_submitted` (all confirmed bookings — GA4 can report every entry point).

## Remove the old trigger — PRODUCTION CUTOVER ONLY
- The `/thank-you-booking/` **page‑view** trigger over‑counts (refresh/revisit) and fires on
  unconfirmed bookings, so it must eventually go.
- **Timing:** do this **only at the approved production cutover**, as the same published change that
  activates `booking_request_submitted`. Until then (Preview + staging QA) the page‑view trigger stays
  exactly as it is in the live container — removing it early would break live measurement.
- At cutover, in one publish: attach the existing conversion action to the `booking_request_submitted`
  trigger **and** detach the `/thank-you-booking/` page‑view trigger from the Ads **and** GA4 tags.
  **Never let both triggers count the same request** — they must swap in the same GTM version.

## Atomic production cutover (one controlled release)
Do these together, as one release; roll back the GTM version if any event is duplicated or missing:
1. Deploy the production booking-form + parent-listener changes (emit `booking_request_submitted`).
2. Publish the new `booking_request_submitted` trigger + GA4/Ads tags.
3. In the **same** GTM version, remove the `/thank-you-booking/` page‑view trigger from the existing booking action.
4. **Rename the Google Ads conversion action** from the misspelled **“Bookinf Form Lead”** →
   **“Booking Request Submitted”** (rename only — reuse the same action; do NOT create a new one).
5. Keep on that action: **Count = One**, **Category = Submit lead form**, **Transaction ID = `booking_reference`**.
6. Submit **one** authorised production test request → confirm it appears in MechanicDesk Online Booking
   Requests, GTM/Tag Assistant, GA4 DebugView/Realtime (and Ads diagnostics later).
7. Refresh the thank-you page → verify **no** second event. Roll back the GTM version on any duplicate/missing event.

> Naming accuracy: `booking_request_submitted` = MechanicDesk **accepted and stored the online request**.
> It is **not** a staff-created diary booking. The diary-confirmed conversion is a separate, server-side,
> Phase-2 action (see [conversion-event-model.md](conversion-event-model.md)).

## Attribution note
Google Ads only records a conversion when it can match an eligible ad interaction (gclid/gbraid in the cookie), so emitting `booking_request_submitted` for *all* accepted requests does **not** inflate Ads; `booking_entry_point` lets you segment paid‑landing requests explicitly.

## Preview test (Tag Assistant)
1. One confirmed Hendra booking → exactly one `booking_request_submitted`, one Ads conv (correct txn_id).
2. One confirmed Woolloongabba booking → same.
3. Refresh thank‑you / direct visit / Back‑Forward → **zero**.
4. A 202 (rejection/timeout) booking → **zero**.
5. Duplicate `booking_reference` → at most one Ads conversion.

## Rollback
- Pause the `booking_request_submitted` → Ads/GA4 tags (no code deploy).
- **Do NOT** re‑enable the `/thank-you-booking/` page‑view conversion as Primary.
- If interim measurement is required, mark it Secondary/diagnostic and clearly label it unreliable — **only with Jai's approval.**
