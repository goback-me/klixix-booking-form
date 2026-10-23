# Staging — manual browser acceptance (for Jai)

These are the acceptance steps that require a **real browser** and could not be automated in the
build session. **Nothing here is marked PASS until you actually run it.** Open DevTools → Network,
tick **Preserve log**, and keep the Console visible. Entry point for every test:

**→ https://carone-booking-parent-staging.vercel.app** (it embeds the staging form; the right panel
is a local `dataLayer` inspector — it is NOT Google).

Use only synthetic data. Put `INTERNAL QA TEST — DO NOT SERVICE` in the Name and the booking note.

| # | Test | Steps | Expected | Evidence to capture |
|---|---|---|---|---|
| 1 | Hendra confirmed | Book → workshop **Hendra** → future date/time → submit once | Summary/confirmed; inspector shows **one** `booking_confirmed` | Screenshot of inspector + Network row (200) |
| 2 | Woolloongabba confirmed | Repeat with **Woolloongabba**, fresh details | One `booking_confirmed`, `workshop:"woolloongabba"` | Screenshot |
| 3 | Exactly one event | After #1, count inspector entries | Exactly **1** `booking_confirmed` | Screenshot |
| 4 | Five-field payload | Expand the pushed event | Only `booking_reference, workshop, service_type, booking_entry_point, landing_page_type` — **no** name/email/phone/rego/notes | Screenshot of expanded event |
| 5 | Refresh | Reload the parent after confirmation | **No** new `booking_confirmed` | Screenshot |
| 6 | Back / forward | Browser Back then Forward | **No** new event | Screenshot |
| 7 | Direct thank-you | Open the parent URL `#thank-you-test` directly / in a new tab | **No** event, no redirect loop | Screenshot |
| 8 | Desktop | Do #1 on desktop Chrome and desktop Safari | Usable; no console errors | Screenshot each |
| 9 | Mobile | Do #1 on mobile Chrome and mobile Safari (or DevTools device mode) | Usable; iframe resizes; no console errors | Screenshot each |
| 10 | Analytics network check | Filter Network by `google`, `doubleclick`, `facebook`, `whatconverts`, `4K9TEQS2N4`, `11212284305` | **Zero** matching requests (Google **Fonts** is OK, not analytics) | Screenshot of filtered (empty) Network |
| 11 | Paid redirect | Append `?utm_source=paid_landing`… or set entry to `paid_landing`; confirm a booking | Redirect to `#thank-you-test` only **after** the event; exactly one redirect | Screenshot before/after |
| 12 | Non-paid no-redirect | Standard entry (`main_site`/`direct`) | Confirmed state shown; **no** redirect | Screenshot |
| 13 | Failure safety | (Ask the builder to flip `MECHANICDESK_FAKE_SCENARIO`) submit | Pending/failure message; **no** `booking_confirmed`, no redirect | Screenshot |

**Record for each browser (Chromium desktop, Chromium mobile, WebKit desktop, WebKit mobile):**
pass/fail, console errors, and whether the single-event + five-field + zero-analytics rules held.

Mark a browser **BLOCKED** (not PASS) if you could not actually run it. Save screenshots to a dated
folder; do not include real contact values (synthetic only).
