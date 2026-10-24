/**
 * Top-level bookable services. Each has a STABLE `value` (used for analytics /
 * booking_confirmed service_type) that never changes even if the display `name`
 * is reworded. The display `name` is what flows to MechanicDesk via job_type_names.
 */

/** Paid landing-page paths. A parent_url containing one → booking_entry_point=paid_landing. */
export const QUOTE_PAGE_PATHS = [
  '/spring-service-hendra-g/',
  '/pre-purchase-new/',
  '/spring-service-woolloongabba-g/',
  '/roadworthy-certificate-brisbane/',
  '/european-car-service-brisbane/',
  '/logbook-service-brisbane/',
  '/ac-service-new-brisbane/',
  '/car-mechanic-service-brisbane/',
]

/** The AC paid landing page path (preselects the AC service). */
export const AC_LANDING_PATH = '/ac-service-new-brisbane/'

/** @typedef {{ id:number, value:string, name:string, image:string, badge?:string, priceLabel?:string, note?:string }} Service */

/** @type {Service[]} */
export const SERVICES = [
  { id: 1, value: 'general_service', name: 'General Service', badge: 'Most booked', image: './svc-general.png' },
  { id: 2, value: 'vehicle_repair', name: 'Vehicle repair', image: './svc-vehicle-repair.png' },
  { id: 3, value: 'roadworthy_certificate', name: 'Roadworthy certificate', image: './svc-roadworthy.png' },
  { id: 4, value: 'pre_purchase_inspection', name: 'Pre purchase inspection', image: './svc-prepurchase.png' },
  {
    id: 6,
    value: 'air_conditioning_service',
    name: 'Air Conditioning Service',
    image: './svc-air-conditioning.png',
    // Price (special landing offer) and the inspection-first condition live on the
    // landing page, not on the embedded form — so the widget never exposes a price.
  },
  { id: 5, value: 'other_enquiry', name: 'Other enquiry', image: './svc-other.png' },
]

/** @param {string} value */
export function getServiceByValue(value) {
  return SERVICES.find((s) => s.value === value)
}

/**
 * Derive the privacy-safe conversion fields (no PII). Pure — unit-testable.
 * @param {{ parentUrl?: string, service?: { value?: string, name?: string } }} input
 */
export function deriveConversionFields({ parentUrl = '', service } = {}) {
  const url = String(parentUrl || '')
  const matched = QUOTE_PAGE_PATHS.find((p) => url.includes(p))
  const isQuote = Boolean(matched)
  return {
    isQuote,
    bookingEntryPoint: isQuote ? 'paid_landing' : (url ? 'main_site' : 'direct'),
    landingPageType: isQuote ? matched : 'none',
    // STABLE value for analytics; falls back to display name only if value is absent.
    serviceType: (service && (service.value || service.name)) || '',
  }
}
