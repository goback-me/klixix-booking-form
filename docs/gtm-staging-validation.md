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
| DLV – booking_reference | `booking_reference` |
| DLV – workshop | `workshop` |
| DLV – service_type | `service_type` |
| DLV – booking_entry_point | `booking_entry_point` |
| DLV – landing_page_type | `landing_page_type` |

## Trigger
- **Name:** `CE – booking_request_submitted`
- **Type:** Custom Event
- **Event name:** `booking_request_submitted` (exact string — no regex, no wildcard)
- Fires on: All Custom Events

## Staging-only validation tag (sends nothing to Google)
A **Custom HTML** tag that displays the five values and sends nothing to Ads/GA4/Meta/WhatConverts.
Gate it so it can fire **only** on the staging parent host.

- **Tag name:** `HTML – Staging Booking Request (diagnostic)`
- **Trigger:** `CE – booking_request_submitted`
- **Firing restriction:** add a trigger/exception so it fires **only** when
  `Page Hostname` **equals** `carone-booking-parent-staging.vercel.app`.
  It must **never** fire on `car-one.com.au`, `www.car-one.com.au`, or `embed.car-one.com.au`.

```html
<script>
(function () {
  // Diagnostic only — logs the 5 DLVs locally. No network, no Google, no Meta.
  var ALLOWED = 'carone-booking-parent-staging.vercel.app';
  if (location.hostname !== ALLOWED) return;              // never on production
  var v = {
    booking_reference: {{DLV – booking_reference}},
    workshop: {{DLV – workshop}},
    service_type: {{DLV – service_type}},
    booking_entry_point: {{DLV – booking_entry_point}},
    landing_page_type: {{DLV – landing_page_type}}
  };
  (window.__stagingBookingDiagnostics = window.__stagingBookingDiagnostics || []).push(v);
  try { console.log('[STAGING booking_request_submitted]', JSON.stringify(v)); } catch (e) {}
})();
</script>
```

## GTM Preview acceptance (run against the staging parent in Preview)
- Accepted request → `CE – booking_request_submitted` fires **once**; all five DLVs populated.
- `booking_reference` is a valid UUID and unique per request.
- Refresh → **zero** additional firing.
- Direct thank-you visit → **zero** firing.
- Failed / unknown request → **zero** firing.
- Wrong-origin message → **zero** firing.
- Duplicate `booking_reference` → **zero** additional firing.
- **No** production analytics network requests (no googletagmanager serving prod tags / google-analytics /
  googleadservices / doubleclick / facebook / whatconverts, no `AW-11212284305` / `G-4K9TEQS2N4`).

## Production final-trigger note (for the later cutover only — not now)
When the real GA4/Ads tags are added (separate, approved cutover), their triggers must allow only
`car-one.com.au` / `www.car-one.com.au` and must **not** allow the staging hosts. See
[gtm-booking-confirmed-setup.md](gtm-booking-confirmed-setup.md) and
[conversion-event-model.md](conversion-event-model.md).
