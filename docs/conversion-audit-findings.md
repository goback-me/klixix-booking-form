# Conversion audit findings — Car One (read-only)

**Date:** 2026-10-25. **Scope:** GTM container `GTM-WWNM4GD` + Google Ads account
`124-812-6337` (Car One Automotive). **Read-only** — no GTM/Ads/GA4/website changes, no GTM
Submit/Publish, no booking/quote submitted, no call placed, no call recordings / caller details /
lead records opened. Provisionally accepted by Jai.

## Qualifications (applied to this record)
1. **Ad Calls - GAds 4.98 / 398.99 are ACCOUNT-WIDE** (30-day / 90-day) unless campaign
   segmentation proves otherwise. Campaign-segmented value for KLIXIX is **2** (90-day).
2. **No conclusion is drawn that Google Ads double-counts WhatConverts calls.**
3. **The same connected call may appear in both WhatConverts reporting and Google Ads reporting.
   Duplicate counting *inside Google Ads* is only possible if WhatConverts also imports a
   conversion into Google Ads; that integration remains ACCESS BLOCKED.**
4. **`Call From Website` uses a 60-second call-length threshold.**
5. **The Google → WhatConverts → IVR forwarding chain is CONFIGURATION ELIGIBLE but not
   end-to-end proven.**
6. No live changes were or are to be made.

Evidence classes: **CONFIRMED** / **CONFIGURATION ELIGIBLE** / **UNRESOLVED** / **ACCESS BLOCKED**.

---

## 1. GTM tag → trigger → Google Ads action map (three routes)

| Route | GTM tag | Trigger (condition) | Ads conv. ID | Label | Ads action | txn_id |
|---|---|---|---|---|---|---|
| Booking | Booking Form Tag GA | Booking form Trigger — Page URL contains `/thank-you-booking/` (Page View) | 11212284305 | `htzeCKWp2Y8dEJHDt-Ip` | **Bookinf Form Lead** | none |
| Booking | Booking Confirmation | Booking Confirmation Visible — Element Visibility, once/page | 11212284305 | `SxmtCK-S7LgcEJHDt-Ip` | **Booking Confirmation** (Removed) | none |
| Booking | Google Ads – Booking Confirmation | **same** Booking Confirmation Visible trigger | 11212284305 | `SxmtCK-S7LgcEJHDt-Ip` | **Booking Confirmation** (Removed) | none |
| Quote | Thank you | Thank you — Page URL contains `thank-you-quote-g/` (Page View) | 11212284305 | `qymgCIWjuqUbEJHDt-Ip` | **GET A Qoute** | none |
| Quote | GA4 - Event - Generate Lead *(GA4)* | Custom Event `DLV - form_id != 6` (Gravity Form submit via `HTML - Gravity Form Bridge`) + Page View - Quote LP Thank You | — | — | GA4 only | — |
| Phone | Calls from website | website call number — All Elements (tel:) | 11212284305 | `vtssCOiNqvscEJHDt-Ip` | **Call From Website** | none |
| Phone | Call Us Now | Call Us Now Trigger — Just Links `#get_touch_btn` | **10797013729** | `7yG7COCM2pUDEOG1tZwo` | *(legacy account, not in 124-812-6337)* | none |
| Phone | GA4 - Event - Click to Call *(GA4)* | Click - tel links | — | — | GA4 only | — |

Legacy micro-conversions (`Make a Booking`, `Start A booking`, `Hendra Button`, `Woolloongabba
Button`) fire into the **old Ads account `10797013729`**, not the live account, so they do not feed
the current campaign. Page load also fires remarketing for three Ads accounts: `11212284305`,
`10797013729`, `7809348473`. **CONFIRMED.**

## 2. Duplicate `Sxmt` booking-confirmation tags
- Two **duplicate GTM hits are technically eligible** for one interaction (`Booking Confirmation`
  + `Google Ads – Booking Confirmation`, same Element-Visibility trigger, same
  `11212284305 / SxmtCK-S7LgcEJHDt-Ip`, no transaction_id). **CONFIRMED.**
- The Ads action **`Booking Confirmation` is Removed and currently has no bidding impact** (0
  conversions, 30/90-day). **CONFIRMED.**
- **"Count: One" is not a reason to keep the duplicate.** One redundant tag **must be removed
  before that action is ever reactivated.** **No removal is authorised now.**

## 3. GET A Quote (end-to-end)
- GA4 "Generate Lead" fires on the **real Gravity Form submit** (`form_id != 6`) — accurate.
- Google Ads **GET A Qoute** (`qymg`) fires only on **Page URL contains `thank-you-quote-g/`** — a
  **page-view conversion, no form gating, no transaction_id**. Active, Primary, Count One, 90-day,
  in account goals = Yes. **Refresh/direct/repeat visits to that page can re-fire it.** CONFIRMED.

## 4. Phone tracking + WhatConverts
WhatConverts is injected at the **WordPress** layer (not in GTM), so it is invisible in the
container but runs on the landing pages.

| Item | Finding | Class |
|---|---|---|
| WhatConverts present (3 paid LPs) | Runtime globals `$wc_load`, `wc_visitor_init`, `wc_transaction_ypbib`, `wc_form_ypbib`, `wc_iframe_ypbib` | **CONFIRMED** |
| Profile identifier | token **`ypbib`**; numeric account ID not exposed | CONFIRMED (token) / UNRESOLVED (numeric) |
| `07 3497 6101` hardcoded or dynamic | **Both** — rendered pages display `07 3497 6101` swapped from static base `07 3607 0215` (DNI); car-mechanic page also has one hardcoded `tel:0734976101` | **CONFIRMED** |
| Visible text vs `tel:` after DNI | **Match** — "07 3497 6101" / `tel:+61734976101` | **CONFIRMED** |
| Google "Calls from website" alongside WhatConverts | Ads action **Call From Website** configured on the **same number `07 3497 6101`** | **CONFIRMED** |
| Google forwarding vs WhatConverts on the same number | Both target `07 3497 6101`; collision is possible | **CONFIGURATION ELIGIBLE** |
| One connected call in both systems | The same connected call may appear in **both** WhatConverts reporting and Google Ads reporting. **Duplicate counting inside Google Ads is only possible if WhatConverts also imports a conversion into Google Ads** | **ACCESS BLOCKED** (for the import) |
| Call From Website = connected call or interaction | **Connected call** — Google forwarding-number conversion with **≥60s** call length, not a click | **CONFIRMED** |
| Call From Website minimum duration | **60 seconds** | **CONFIRMED** |
| WhatConverts imports conversions into Google Ads | Needs WhatConverts account | **ACCESS BLOCKED** |
| Google → WhatConverts → Car One IVR (`07 3607 0215`) forwarding chain | Numbers line up (display `07 3497 6101`, base/IVR `07 3607 0215`) but the end-to-end forwarding path is not proven without the WhatConverts config / a test call | **CONFIGURATION ELIGIBLE** (not end-to-end proven) |

## 5. Google Ads call actions
| Action | Source | Goal | In acct goals | Count | Min duration | Value | 30-day | 90-day | Status |
|---|---|---|---|---|---|---|---|---|---|
| Ad Calls - GAds | Calls from ads | Primary (Other goal) | Yes | One | **60 seconds** | **A$50 (configured value)** | **4.98 (account-wide)** | **398.99 (account-wide)** · KLIXIX = 2 | Awaiting conversions |
| Call From Website | Calls from website (fwd #) | Primary | No | One | **60 seconds** | A$1 | 1 | 1 | Awaiting conversions |
| Clicks to call | Google hosted | Primary | No | **Every** | none (counts tel: clicks) | ~A$100/click | 38 | 197 | Active |

`Call From Website` detail: type ID **7774832360**, created **18/09/2026**, number **07 3497 6101**,
Data-driven attribution.

`Ad Calls - GAds` detail (manual UI verification, CONFIRMED): conversion action ID **6670529517**,
created **16/10/2023**, Action optimisation **Other, Primary**, account-default goal **Yes**,
source **Calls from ads**, Count **One**, **minimum call length 60 seconds**, value **A$50**,
click-through window **30 days**, attribution **Data-driven**, **last recorded conversion
9 Oct 2026 at 17:00**; current status **Awaiting conversions** (none recorded in the past 7 days).
The **A$50 is a configured conversion value, not confirmed revenue or gross profit.**

## 6. KLIXIX campaign bidding — `Search | Hendra & Gabba | Sep'26 | KLIXIX` (id 24271371723)
- Strategy **Maximise conversions**; **no Target CPA** set (column shows "—"); **budget-limited**
  (A$100/day, Eligible-Limited, "Lead form asset is missing"); **campaign-level** (no portfolio).
- Conversions column (90-day) = **20**: GET A Qoute 10, Bookinf Form Lead 7, Ad Calls - GAds 2,
  Call From Website 1. `Clicks to call` = 0 (in-goals = No). **CONFIRMED.**
- **No event here is a confirmed diary booking** — `Bookinf Form Lead` is a `/thank-you-booking/`
  page-view (a booking *request* proxy). There is no diary evidence in any signal.

## 7. Conversion counts (account-wide; last 30 / 90 days)
GET A Qoute 13 / 25 · Bookinf Form Lead 7 / 8 · Ad Calls - GAds 4.98 / 398.99 · Clicks to call
38 / 197 · Call From Website 1 / 1 · Store visits 5 / 22 (misconfigured). Booking Confirmation
(Sxmt) 0 / 0 (Removed).

## 8. Evidence (screenshots, session scratchpad)
GTM: `sxmt-bc.png`, `sxmt-gads.png`, `trig-bcv.png`, `cv-Booking_Form_Tag_GA.png`,
`trig-bookingform.png`, `tag_Thank_you.png`. Ads: `ads-conv2.png`, `ads-dd.png`, `ads-90.png`,
`ads-klix-conv.png`, `act-cfw-settings.png`, `ads-adg.png`. WhatConverts: `wc-plain.png`,
`wc-gclid.png`.

## Confirmation
Nothing published, submitted, edited or created. No GTM Submit/Publish. No booking/quote
submitted, no call placed. No call recordings, caller details, or lead records accessed. Ads UI
date-range/segment/tab changes are view-only. Chrome left open.
