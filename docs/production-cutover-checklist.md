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
- **Do not publish the staging QA workspace.** Keep it unpublished until Jai reviews/accepts its
  evidence; **abandon/delete it only after the production cutover succeeds** (section E), so its
  staging-gated trigger edit can never reach production. The production work happens in a separate
  new workspace, never by publishing this one.

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

1. **Data Layer Variables** — the five DLVs currently exist **only as unpublished changes in the
   staging QA workspace**; they are **not** published container variables, and abandoning that
   workspace discards them. In the new production workspace, **recreate the five Version-2 Data
   Layer Variables exactly**:
   - `DLV - booking_reference` → `booking_reference`
   - `DLV - workshop` → `workshop`
   - `DLV - service_type` → `service_type`
   - `DLV - booking_entry_point` → `booking_entry_point`
   - `DLV - landing_page_type` → `landing_page_type`

   Do **not** publish or import the staging diagnostic tag or the staging hostname trigger.

2. **Production Custom Event trigger** — Custom Event, event name `booking_request_submitted`
   (exact string, no regex on the event name), **Some Custom Events** with the hostname rule
   from section C. Name it distinctly from the staging trigger (e.g. keep `CE - booking_request_submitted`
   but set to the production host **in the production workspace**, never the staging host).

3. **Google Ads conversion — reuse the existing action; do NOT create another conversion tag or
   action.** In the production workspace, **modify `Booking Form Tag GA` only**: retain Conversion
   ID `11212284305`, retain Label `htzeCKWp2Y8dEJHDt-Ip`, **add Order ID
   `transaction_id = {{DLV - booking_reference}}`** (new vs today — there is no dedupe key now), and
   **replace** its firing trigger (`Booking form Trigger`) with the production CE trigger. Exactly
   one tag continues to fire `11212284305 / htzeCKWp2Y8dEJHDt-Ip`.

4. **GA4 event** — **after confirming the correct existing GA4 configuration tag/destination**
   (e.g. `GA4 - Config - Main`), add a new GA4 Event tag, event name `booking_request_submitted`,
   fired by the CE trigger, parameters limited to the **five approved fields only**:
   `booking_reference`, `workshop`, `service_type`, `booking_entry_point`, `landing_page_type`. No PII.

5. **Remove the old page-view path from the tag at the same cutover** — remove `Booking form Trigger`
   (Page URL contains `/thank-you-booking/`) **from `Booking Form Tag GA`** so the conversion is
   counted once (on the CE event), not twice. **Do not delete the `Booking form Trigger` itself**
   unless separately approved — leave it in the container, unused, for rollback history. Keep the
   `/thank-you-booking/` **page** itself in place so rollback is possible.

6. **Do not modify or remove** the `SxmtCK-S7LgcEJHDt-Ip` tags (`Booking Confirmation`,
   `Google Ads – Booking Confirmation`) until their separate audit is completed.

7. **Parent-page code (Adeel)** — deploy `docs/wordpress-booking-listener.js` to the production
   parent pages (site-wide, one registered listener) with production `EMBED_ORIGIN`
   (`https://embed.car-one.com.au`) and `THANK_YOU_URL`
   (`https://car-one.com.au/thank-you-booking/`). The dataLayer push is inert until GTM listens,
   so it is safe to deploy first.

---

## E. Production workspace & atomic cutover order
Production work occurs in a **new** workspace — **never by publishing the staging QA workspace**.

1. **Preserve** the screenshots/evidence from the staging QA workspace.
2. **Keep the staging QA workspace unpublished** until its evidence is accepted by Jai.
3. **Create a new workspace** named **`Booking Request Tracking — Production Cutover`**.
4. **Recreate the five DLVs** there (section D1) — Version 2, exact names/keys.
5. **Create the production Custom Event trigger**: event `booking_request_submitted`,
   Page Hostname **matches RegEx** `^(www\.)?car-one\.com\.au$` (section C). Do not include
   `embed.car-one.com.au` or any staging host.
6. **Modify `Booking Form Tag GA` only** in that workspace (section D3): retain ID `11212284305`
   + label `htzeCKWp2Y8dEJHDt-Ip`, add Order ID `{{DLV - booking_reference}}`, and replace the
   thank-you-page trigger with the production CE trigger (do **not** delete the old trigger — D5).
7. **Add the GA4 event tag** (section D4) after confirming the correct existing GA4 configuration
   tag/destination.
8. **Do not modify or remove the `Sxmt` tags** until their separate audit is completed.
9. **Deploy the parent listener** to production parent pages (section D7). The new
   `booking_request_submitted` event will initially have **no production CE tag listening to it**.
   However, the existing `/thank-you-booking/` page-view conversion remains live: a paid-landing
   request that redirects to that page can still record the existing Booking Form Lead conversion
   until the atomic GTM cutover. For initial listener verification, prefer a **controlled main-site
   booking request that does not redirect**, where possible. Any real production test booking
   requires **Jai's separate approval** and must be clearly marked and reconciled.
10. **Preview** the production-cutover workspace against production (criteria below), then
    **Publish once** (single atomic version). Record the version name/notes. **Only after the
    production cutover succeeds, abandon the staging QA workspace.**

### Preview is not a sandbox
GTM Preview can send **real** Google Ads and GA4 hits. One authorised accepted request used during
production Preview may record a **genuine test conversion** — record its `booking_reference`,
timestamp, workshop, service type and test purpose. **Do not run repeated test submissions.**

### Preview acceptance criteria (assert all)
- One authorised accepted request.
- One `booking_request_submitted` event.
- One Google Ads tag firing.
- One GA4 event firing.
- Correct `transaction_id` (= `booking_reference`).
- **No** old page-view booking tag firing in the preview version.
- Refresh / direct thank-you visit → **zero** additional booking events.
- Failed / unknown request → **zero** booking conversion events.
- Test conversion **documented for reconciliation**.

---

## F. Rollback
- **GTM:** Versions → revert to the immediately prior published version (single action). This
  restores the `/thank-you-booking/` page-view conversion and removes the CE conversion + GA4 event.
- **Listener:** the dataLayer push is harmless without GTM listening; for a full rollback, disable/
  remove the listener on the parent pages. The `/thank-you-booking/` page is retained, so the old
  conversion path works immediately after a GTM revert.
- **Old trigger retained:** `Booking form Trigger` is only removed *from the tag*, not deleted, so
  it remains available for rollback history and re-attachment.
- **Verify after rollback:** `/thank-you-booking/` page view fires `Booking Form Tag GA` again; the
  CE event fires nothing.

---

## G. Unresolved items (require decision/confirmation before executing)
1. **Hostname scope** — rule is fixed to `Page Hostname matches RegEx ^(www\.)?car-one\.com\.au$`
   (www → apex 301 confirmed); still confirm with Adeel there is **no other authorised
   booking-parent hostname**, and never allow `embed.car-one.com.au` or staging hosts.
2. **Reuse approach** — fixed: modify the existing `Booking Form Tag GA`; do not create another
   conversion tag or action (section D3).
3. **Google Ads action settings** — confirm the `11212284305 / htzeCKWp2Y8dEJHDt-Ip` action's
   count/dedupe settings make use of the Order ID (`transaction_id`) as intended.
4. **Pre-existing duplicate** — `Booking Confirmation` and `Google Ads – Booking Confirmation`
   both fire `11212284305 / SxmtCK-S7LgcEJHDt-Ip` on `Booking Confirmation Visible`. This looks
   like an existing double-count on a *different* action. Flag to the owner; **do not change** as
   part of this cutover without separate approval.
5. **Element-visibility conversion semantics** — clarify whether `Booking Confirmation Visible`
   represents a distinct, still-wanted conversion (and how it relates to the future server-side
   `booking_confirmed` / diary-confirmed event) before any consolidation.
6. **Staging QA workspace disposal** — abandon/delete the staging QA workspace **only after the
   production cutover succeeds** (and after its evidence is accepted), so its staging-gated
   `CE - booking_request_submitted` edit can never be published.
