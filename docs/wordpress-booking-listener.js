/*
 * CarOne — parent-page listener for confirmed online bookings.
 *
 * FOR ADEEL — DO NOT INSTALL YET. Ship as a version-controlled mu-plugin or theme
 * component (NOT an Elementor HTML block), loaded site-wide (every page that can
 * embed the booking form + the thank-you page). One registered listener only.
 *
 * It receives a CONFIRMED booking event from the booking iframe, validates it,
 * pushes ONE `booking_confirmed` into the dataLayer (GTM fires Ads/GA4), acks the
 * iframe, and (for paid landing pages only) controls the redirect AFTER the tag.
 * No customer PII is ever read or forwarded.
 */
(function () {
  // Set per environment. Production values shown; use the authorised STAGING origins on staging.
  var EMBED_ORIGIN   = 'https://embed.car-one.com.au';
  var THANK_YOU_URL  = 'https://car-one.com.au/thank-you-booking/';

  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  var ALLOWED_WORKSHOPS = ['hendra', 'woolloongabba'];
  var ALLOWED_ENTRY     = ['paid_landing', 'main_site', 'direct', 'gbp', 'other_embed'];

  function fromBookingIframe(win) {
    var frames = document.getElementsByTagName('iframe');
    for (var i = 0; i < frames.length; i++) { if (frames[i].contentWindow === win) return true; }
    return false;
  }
  function normaliseService(s) {
    return String(s || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 60);
  }
  function ack(source, ref) {
    try { source.postMessage({ type: 'carone_booking_ack', booking_reference: ref }, EMBED_ORIGIN); } catch (e) {}
  }

  window.addEventListener('message', function (event) {
    if (event.origin !== EMBED_ORIGIN) return;                 // 1) exact origin
    var d = event.data;
    if (!d || d.type !== 'carone_booking_confirmed') return;   // 2) exact message type
    if (!fromBookingIframe(event.source)) return;              // 3) event.source is the booking iframe
    var ref = String(d.booking_reference || '');
    if (!UUID_RE.test(ref)) return;                            // 4) reference is a UUID
    var workshop = String(d.workshop || '');
    if (ALLOWED_WORKSHOPS.indexOf(workshop) === -1) return;    // 5) approved workshop enum
    var entry = String(d.booking_entry_point || 'direct');
    if (ALLOWED_ENTRY.indexOf(entry) === -1) entry = 'other_embed'; // 6) approved entry enum
    var service = normaliseService(d.service_type);            // 7) normalised service

    // 8) Dedupe across refresh/replay. Write the session flag BEFORE dataLayer.push,
    //    so a near-simultaneous duplicate can't slip through between read and push.
    var KEY = 'carone_booked_' + ref;
    try {
      if (sessionStorage.getItem(KEY)) { ack(event.source, ref); return; }
      sessionStorage.setItem(KEY, '1');
    } catch (e) { /* private mode: proceed; Ads transaction_id is the reporting backstop */ }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'booking_confirmed',
      booking_reference: ref,          // → Google Ads transaction_id
      workshop: workshop,
      service_type: service,
      booking_entry_point: entry,
      landing_page_type: String(d.landing_page_type || 'none')
      // NEVER push name/email/phone/registration/vehicle/address.
    });

    ack(event.source, ref);

    // 9) Parent-controlled redirect — paid landing pages only, AFTER the tag fires.
    if (entry === 'paid_landing') {
      var done = false;
      var go = function () { if (!done) { done = true; window.location.href = THANK_YOU_URL; } };
      window.dataLayer.push({ event: 'booking_confirmed_redirect', eventCallback: go, eventTimeout: 1500 });
      setTimeout(go, 1800); // bounded fallback if GTM/eventCallback is unavailable
    }
  }, false);
})();
