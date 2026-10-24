# GTM staging validation spec — `booking_request_submitted` (QA only)

**Staging validation only. No publish. No production destinations. No production identifiers.**
Do NOT use on staging: Ads `AW-11212284305`, label `htzeCKWp2Y8dEJHDt-Ip`, GA4 `G-4K9TEQS2N4`.
Do NOT create another Google Ads conversion action. Leave the production `/thank-you-booking/`
conversion unchanged.

## Workspace
GTM container `GTM-WWNM4GD` → **Workspaces → Create Workspace** → name
**"Booking Request Tracking — Staging QA"**. Keep it **unpublished**.

## Data Layer Variables (Data Layer Version 2)
| Variable name | Data Layer Variable Name |
|---|---|
| DLV - booking_reference | `booking_reference` |
| DLV - workshop | `workshop` |
| DLV - service_type | `service_type` |
| DLV - booking_entry_point | `booking_entry_point` |
| DLV - landing_page_type | `landing_page_type` |

## Trigger
- **Name:** `CE - booking_request_submitted`
- **Type:** Custom Event
- **Event name:** `booking_request_submitted` (exact string — no regex, no wildcard)
- Fires on: **Some Custom Events** — `Page Hostname` **equals**
  `carone-booking-parent-staging.vercel.app`. (The host gate lives on the trigger so the
  tag can never fire on production; the tag's in-code `location.hostname` check is a second gate.)

## Staging-only validation tag (sends nothing to Google)
A **Custom HTML** tag that displays the five values and sends nothing to Ads/GA4/Meta/WhatConverts.
Gate it so it can fire **only** on the staging parent host.

- **Tag name:** `HTML - Staging Booking Request (diagnostic)`
- **Trigger:** `CE - booking_request_submitted` (already host-gated to the staging parent — see Trigger above).
  The tag therefore fires **only** when `Page Hostname` **equals**
  `carone-booking-parent-staging.vercel.app`, and **never** on `car-one.com.au`,
  `www.car-one.com.au`, or `embed.car-one.com.au`.

```html
<script>
(function () {
  // Diagnostic only — logs the 5 DLVs locally. No network, no Google, no Meta.
  var ALLOWED = 'carone-booking-parent-staging.vercel.app';
  if (location.hostname !== ALLOWED) return;              // never on production
  var v = {
    booking_reference: {{DLV - booking_reference}},
    workshop: {{DLV - workshop}},
    service_type: {{DLV - service_type}},
    booking_entry_point: {{DLV - booking_entry_point}},
    landing_page_type: {{DLV - landing_page_type}}
  };
  (window.__stagingBookingDiagnostics = window.__stagingBookingDiagnostics || []).push(v);
  try { console.log('[STAGING booking_request_submitted]', JSON.stringify(v)); } catch (e) {}
})();
</script>
```

## GTM Preview cannot run against the isolated staging parent (important)
GTM Preview / Tag Assistant can only attach to a page that **loads the live container
`GTM-WWNM4GD`**. The staging parent (`carone-booking-parent-staging.vercel.app`) deliberately
loads **no Google tags** — its `dataLayer` is a local array the page owns — which is exactly
what keeps staging isolated from production.

Loading `GTM-WWNM4GD` on the staging parent (to enable Preview) would fire the container's
**All-Pages / Initialization tags** regardless of hostname:
`GA4 - Config - Main` (→ GA4 `G-4K9TEQS2N4`), `Conversion Linker`, and
`AW-11212284305 Google Tag`. That sends real hits to production GA4/Ads and **breaks isolation**.
So a live-container Preview against the staging parent is **not safe** and must not be run.

What validates the design safely on isolated staging instead:
1. **Static audit of the configured workspace** — trigger `CE - booking_request_submitted`
   = Some Custom Events / `Page Hostname equals carone-booking-parent-staging.vercel.app`;
   tag `HTML - Staging Booking Request (diagnostic)` = Custom HTML, host-gated, no network.
2. **dataLayer / listener validation** against the real staging parent (a GTM simulator that
   replicates the CE trigger + 5 DLVs + host gate, sending nothing to Google) plus the
   `listener.test.js` unit tests. Observed: one `booking_request_submitted` per accepted
   request; `booking_reference` a valid UUID; exactly the five whitelisted fields; paid landing
   → `paid_landing` + `/ac-service-new-brisbane/`; A/C add-on leaves `service_type=general_service`;
   direct thank-you visit → 0; failed/unknown → 0; **0 production analytics requests**
   (only staging hosts + Google Fonts).

A true live-container Tag Assistant Preview belongs in the **controlled production cutover QA**,
where the container legitimately loads — with the new conversion tag's host/trigger gating
(below) being the safeguard that keeps it off the staging hosts.

### Acceptance criteria to assert during that cutover Preview
- Accepted request → `CE - booking_request_submitted` fires **once**; all five DLVs populated.
- `booking_reference` is a valid UUID and unique per request.
- Refresh → **zero** additional firing.
- Direct thank-you visit → **zero** firing.
- Failed / unknown request → **zero** firing.
- Wrong-origin message → **zero** firing.
- Duplicate `booking_reference` → **zero** additional firing.
- The staging diagnostic tag does **not** fire on production hosts, and no unintended
  production conversion (`AW-11212284305` / `G-4K9TEQS2N4`) fires on the booking event.

## Production final-trigger note (for the later cutover only — not now)
When the real GA4/Ads tags are added (separate, approved cutover), their triggers must allow only
`car-one.com.au` / `www.car-one.com.au` and must **not** allow the staging hosts. See
[gtm-booking-confirmed-setup.md](gtm-booking-confirmed-setup.md) and
[conversion-event-model.md](conversion-event-model.md).
