# GTM — `booking_confirmed` conversion (container GTM-WWNM4GD)

**FOR THE ANALYTICS OWNER — configure in PREVIEW ONLY. Do not publish until QA + Jai sign‑off.**

## Variables (Data Layer Variables)
| Name | Data Layer key |
|---|---|
| `dlv.booking_reference` | `booking_reference` |
| `dlv.workshop` | `workshop` |
| `dlv.service_type` | `service_type` |
| `dlv.booking_entry_point` | `booking_entry_point` |
| `dlv.landing_page_type` | `landing_page_type` |

## Trigger
- **Custom Event**, Event name = `booking_confirmed`.
- (Optional segmentation) duplicate the trigger with a condition `dlv.booking_entry_point equals paid_landing` if you want a paid‑only conversion in addition to the all‑bookings GA4 event.

## Google Ads conversion tag
- **Reuse the EXISTING conversion action** — Conversion ID **`11212284305`**, Label
  **`htzeCKWp2Y8dEJHDt-Ip`**. Keep its identity unchanged so historical data and bidding stay intact.
- **Do NOT create a second/new Google Ads "booking" conversion action.** Point the existing one at
  the new trigger. A duplicate action would split and double‑count conversions.
- **Transaction ID** = `{{dlv.booking_reference}}`  ← enables Google's duplicate‑conversion dedupe.
- Fire on the `booking_confirmed` trigger (paid‑only variant if you chose segmentation).

## GA4 event tag
- Event name `booking_confirmed`; params: `booking_reference`, `workshop`, `service_type`, `booking_entry_point`, `landing_page_type`.
- Fire on `booking_confirmed` (all confirmed bookings — GA4 can report every entry point).

## Remove the old trigger — PRODUCTION CUTOVER ONLY
- The `/thank-you-booking/` **page‑view** trigger over‑counts (refresh/revisit) and fires on
  unconfirmed bookings, so it must eventually go.
- **Timing:** do this **only at the approved production cutover**, as the same published change that
  activates `booking_confirmed`. Until then (Preview + staging QA) the page‑view trigger stays
  exactly as it is in the live container — removing it early would break live measurement.
- At cutover, in one publish: attach the existing conversion action to the `booking_confirmed`
  trigger **and** detach the `/thank-you-booking/` page‑view trigger from the Ads **and** GA4 tags.

## Attribution note
Google Ads only records a conversion when it can match an eligible ad interaction (gclid/gbraid in the cookie), so emitting `booking_confirmed` for *all* confirmed bookings does **not** inflate Ads; `booking_entry_point` lets you segment paid‑landing bookings explicitly.

## Preview test (Tag Assistant)
1. One confirmed Hendra booking → exactly one `booking_confirmed`, one Ads conv (correct txn_id).
2. One confirmed Woolloongabba booking → same.
3. Refresh thank‑you / direct visit / Back‑Forward → **zero**.
4. A 202 (rejection/timeout) booking → **zero**.
5. Duplicate `booking_reference` → at most one Ads conversion.

## Rollback
- Pause the `booking_confirmed` → Ads/GA4 tags (no code deploy).
- **Do NOT** re‑enable the `/thank-you-booking/` page‑view conversion as Primary.
- If interim measurement is required, mark it Secondary/diagnostic and clearly label it unreliable — **only with Jai's approval.**
