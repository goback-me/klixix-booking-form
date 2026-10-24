# Production cutover checklist — `booking_request_submitted` → Google Ads/GA4

**PREPARED ONLY. NOTHING IN HERE IS AUTHORISED TO EXECUTE.** No production tag, trigger,
conversion action, or GTM publish may be changed without separate, explicit approval.
Written for whoever performs the controlled cutover (GTM admin + Adeel for the parent-page code).

Staging design gate is accepted (Option A): simulator + static GTM audit + `listener.test.js`
+ real-browser staging acceptance are sufficient. **Live Tag Assistant validation is deferred
to this controlled production cutover** — it cannot run on the isolated staging parent
(loading `GTM-WWNM4GD` there would fire All-Pages production tags → GA4/Ads contamination).
See [gtm-staging-validation.md](gtm-staging-validation.md).

---

## A. STAGING-ONLY — MUST NOT be included in the production version
These live only in the unpublished **`Booking Request Tracking — Staging QA`** workspace and must
never be published / carried into production:

- **Tag:** `HTML - Staging Booking Request (diagnostic)` (Custom HTML) — delete/omit for prod.
- **Trigger host gate to the staging parent:** `CE - booking_request_submitted` as configured in
  the staging QA workspace = *Some Custom Events / Page Hostname **equals**
  `carone-booking-parent-staging.vercel.app`*. The production version must use the **production**
  hostname (section C), never the staging host.
- **Any staging diagnostic code** (`window.__stagingBookingDiagnostics`, the `[STAGING ...]`
  console log, the `carone-booking-parent-staging.vercel.app` host literal).
- **Do not publish the staging QA workspace.** After the staging gate, abandon/delete that
  workspace so its staging-gated trigger edit can never reach production.

---

## B. Existing production booking conversion (read-only facts, verified in GTM `GTM-WWNM4GD`)

**The current "Booking Form Lead" conversion is sent by a single tag:**

| Field | Value |
|---|---|
| **Tag** | `Booking Form Tag GA` |
| Tag type | Google Ads Conversion Tracking (uses the container's Google tag "Car One") |
| Conversion ID | `11212284305` |
| Conversion Label | `htzeCKWp2Y8dEJHDt-Ip` |
| Transaction ID / Order ID | **not set** (no dedupe key today) |
| **Firing trigger** | `Booking form Trigger` |
| Trigger type | Page View |
| Trigger condition | **Page URL contains `/thank-you-booking/`** (no hostname condition) |
| Trigger references | only `Booking Form Tag GA` references this trigger |

**Separate, DO NOT TOUCH (different conversion action, out of scope):**
- `Booking Confirmation` — ID `11212284305`, Label `SxmtCK-S7LgcEJHDt-Ip`, once per event,
  trigger `Booking Confirmation Visible` (Element Visibility).
- `Google Ads – Booking Confirmation` — same ID+Label `SxmtCK-S7LgcEJHDt-Ip`, same
  Element-Visibility trigger (an apparent **duplicate** of the above — flag, don't change here).

---

## C. Production hostname (verified, not guessed)
- `https://www.car-one.com.au/` → **HTTP 301 → `https://car-one.com.au/`**.
- `https://car-one.com.au/` → **HTTP 200** (canonical apex).
- Parent listener redirect target is `https://car-one.com.au/thank-you-booking/`.
- The GTM container's nominal site label is `www.car-one.com.au`, but www 301-redirects to apex
  before any page/JS runs, so the `booking_request_submitted` dataLayer push occurs on the
  **apex `car-one.com.au`**.

**Proposed production trigger condition:** `Page Hostname` **equals** `car-one.com.au`.
Defensive alternative if any booking parent is ever served on www without redirect:
`Page Hostname` **matches RegEx** `^(www\.)?car-one\.com\.au$`. Must **not** allow
`embed.car-one.com.au` or any staging host.
→ *Confirm with Adeel there is no other authorised booking-parent hostname before finalising.*

---

## D. Production components to PREPARE (do not create or publish yet)

1. **Data Layer Variables** — already exist in the container, reuse as-is:
   `DLV - booking_reference`, `DLV - workshop`, `DLV - service_type`,
   `DLV - booking_entry_point`, `DLV - landing_page_type`.

2. **Production Custom Event trigger** — Custom Event, event name `booking_request_submitted`
   (exact string, no regex on the event name), **Some Custom Events** with the hostname rule
   from section C. Name it distinctly from the staging trigger (e.g. keep `CE - booking_request_submitted`
   but set to the production host **in the production workspace**, never the staging host).

3. **Google Ads conversion — reuse the existing action, no new action.** Conversion ID
   `11212284305`, Label `htzeCKWp2Y8dEJHDt-Ip`. **Set `transaction_id = {{DLV - booking_reference}}`**
   (Order ID) for dedupe — this is the new field vs today. Preferred implementation:
   - **(a, recommended)** Modify `Booking Form Tag GA`: add the Order ID, swap its firing
     trigger from `Booking form Trigger` to the production CE trigger. One tag, one action, no
     duplicate. — or —
   - **(b)** Create a new Google Ads Conversion Tracking tag with the **same** ID+Label, Order ID
     set, fired by the CE trigger, and retire `Booking Form Tag GA`.
   Either way: **exactly one** tag ends up firing `11212284305 / htzeCKWp2Y8dEJHDt-Ip`.

4. **GA4 event** — new GA4 Event tag, event name `booking_request_submitted`, fired by the CE
   trigger, parameters limited to the **five approved fields only**: `booking_reference`,
   `workshop`, `service_type`, `booking_entry_point`, `landing_page_type`. No PII.

5. **Remove the old page-view path at the same cutover** — remove `Booking form Trigger`
   (Page URL contains `/thank-you-booking/`) from the booking conversion so the conversion is
   counted once (on the CE event), not twice. Keep the `/thank-you-booking/` **page** itself in
   place so rollback is possible.

6. **Parent-page code (Adeel)** — deploy `docs/wordpress-booking-listener.js` to the production
   parent pages (site-wide, one registered listener) with production `EMBED_ORIGIN`
   (`https://embed.car-one.com.au`) and `THANK_YOU_URL`
   (`https://car-one.com.au/thank-you-booking/`). The dataLayer push is inert until GTM listens,
   so it is safe to deploy first.

---

## E. Atomic cutover order
1. **Confirm** the production hostname set with Adeel (section C) and the reuse approach (D3a vs D3b).
2. **Deploy the parent listener** to production parent pages; verify the `booking_request_submitted`
   dataLayer event appears (real Tag Assistant Preview is valid **now**, on production). Nothing
   fires yet because the CE conversion isn't published.
3. In a **single production GTM workspace version**, make all GTM changes together:
   create the production CE trigger (host-gated to apex), apply D3 (reuse action + Order ID on the
   CE trigger), add the GA4 event tag (D4), and **remove** `Booking form Trigger` from the booking
   conversion (D5).
4. **Preview** that version against production: one accepted booking → the CE conversion fires
   **once** with `transaction_id = booking_reference`; `/thank-you-booking/` no longer fires the
   booking conversion; no duplicate Ads action; GA4 event carries only the five fields; refresh /
   direct / failed-request → zero. Assert the staging diagnostic tag is absent and no staging host
   is referenced.
5. **Publish once** (single version, atomic). Record the version name/notes.

---

## F. Rollback
- **GTM:** Versions → revert to the immediately prior published version (single action). This
  restores the `/thank-you-booking/` page-view conversion and removes the CE conversion + GA4 event.
- **Listener:** the dataLayer push is harmless without GTM listening; for a full rollback, disable/
  remove the listener on the parent pages. The `/thank-you-booking/` page is retained, so the old
  conversion path works immediately after a GTM revert.
- **Verify after rollback:** `/thank-you-booking/` page view fires `Booking Form Tag GA` again; the
  CE event fires nothing.

---

## G. Unresolved items (require decision/confirmation before executing)
1. **Hostname scope** — confirm with Adeel that the only authorised booking-parent hostname is the
   apex `car-one.com.au` (and whether to defensively allow `www.car-one.com.au`). No other embed
   host. *(Evidence: www → apex 301; verify no exception.)*
2. **Reuse approach** — choose D3(a) modify existing tag vs D3(b) new tag + retire. Recommended: (a).
3. **Google Ads action settings** — confirm the `11212284305 / htzeCKWp2Y8dEJHDt-Ip` action's
   count/dedupe settings make use of the Order ID (`transaction_id`) as intended.
4. **Pre-existing duplicate** — `Booking Confirmation` and `Google Ads – Booking Confirmation`
   both fire `11212284305 / SxmtCK-S7LgcEJHDt-Ip` on `Booking Confirmation Visible`. This looks
   like an existing double-count on a *different* action. Flag to the owner; **do not change** as
   part of this cutover without separate approval.
5. **Element-visibility conversion semantics** — clarify whether `Booking Confirmation Visible`
   represents a distinct, still-wanted conversion (and how it relates to the future server-side
   `booking_confirmed` / diary-confirmed event) before any consolidation.
6. **Staging QA workspace disposal** — confirm the staging QA workspace is abandoned/deleted after
   the gate so its staging-gated `CE - booking_request_submitted` edit can never be published.
