/**
 * @typedef {{ value: string, suffix: string }} SplitPricePart
 * @typedef {{
 *   id: number,
 *   name: string,
 *   price: number,
 *   image: string,
 *   priceLabel?: string,
 *   priceSuffix?: string,
 *   splitPrice?: SplitPricePart[],
 *   description?: string,
 *   featured?: boolean,
 *   badge?: string,
 * }} Addon
 */

/** @type {Addon[]} */
export const HENDRA_ADDONS = [
  { id: 1, name: 'Tyre rotation & balancing', price: 77.5, priceLabel: '$77.50', image: '/tyre-rotation.svg', badge: 'Recommended' },
  { id: 2, name: 'Engine flush plus', price: 39.5, priceLabel: '$39.50', image: '/Engine flush plus.svg' },
  { id: 3, name: 'A/C clean & deodoriser', price: 38.25, priceLabel: '$38.25', image: '/AC clean & deodoriser.svg' },
  { id: 4, name: 'Wiper blade replacement', price: 27, priceLabel: '$27.00 each', image: '/Wiper blade replacement.svg' },
  // A/C re-gas & full service removed — now the standalone "Car Air Conditioning Service" top-level service.
  { id: 6, name: 'Tyre puncture repair', price: 46.5, priceLabel: '$46.50', image: '/Tyre puncture repair.svg' },
  { id: 7, name: 'No Add-ons', image: '/no-addons.svg', noAddon: true },
]

/** @type {Addon[]} */
export const GABBA_ADDONS = [
  { id: 101, name: 'Tyre rotation & balancing', price: 100, priceLabel: '$100.00', image: '/tyre-rotation-gabba-balancing.svg', badge: 'Recommended' },
  { id: 102, name: 'Engine flush additive', price: 52.8, priceLabel: '$52.80', image: '/Engine flush plus-gabba.svg' },
  { id: 103, name: 'A/C clean & deodoriser', price: 38.25, priceLabel: '$38.25', image: '/AC clean & deodoriser-gabba.svg' },
  // A/C re-gas & full service (id 104) removed — now the standalone "Car Air Conditioning Service".
  { id: 105, name: 'Tyre puncture repair', price: 100, priceLabel: '$50 / $100', image: '/Tyre puncture repair.svg' },
  { id: 106, name: 'Wiper blade replacement', price: 30, priceLabel: '$30.00 each', image: '/Wiper blade replacement.svg' },
  { id: 107, name: 'AC clean + Cabin filter', price: 138.5, priceLabel: '$138.50', image: '/ac-clean-cabin-fiber-gabba.svg' },
  // AC Regas (id 108, duplicate of the re-gas full service) removed — standalone service now.
  { id: 109, name: 'No Add-ons', image: '/no-addons.svg', noAddon: true },
]

/**
 * Conditional add-on: the standalone Air Conditioning Service offered as an ADDITIONAL
 * service when the chosen primary service is NOT already Air Conditioning Service.
 * No price, no description — just the B&W image and label. Stable id air_conditioning_service.
 * @type {Addon & { value: string }}
 */
export const AC_ADDON = {
  id: 900,
  value: 'air_conditioning_service',
  name: 'Air Conditioning Service',
  image: './svc-air-conditioning.png',
}

/**
 * @param {string | undefined} workshopId
 * @returns {Addon[]}
 */
export function getAddonsByWorkshopId(workshopId) {
  return workshopId === 'woolloongabba' ? GABBA_ADDONS : HENDRA_ADDONS
}

/**
 * The add-on list to show for a given primary service: the A/C add-on is prepended
 * unless the primary service IS Air Conditioning Service (then it's hidden, so it can
 * never duplicate the primary).
 * @param {string | undefined} workshopId
 * @param {string | undefined} primaryServiceValue
 * @returns {Addon[]}
 */
export function addonsForPrimary(workshopId, primaryServiceValue) {
  const base = getAddonsByWorkshopId(workshopId)
  return primaryServiceValue === 'air_conditioning_service' ? base : [AC_ADDON, ...base]
}

/**
 * Apply the A/C-add-on de-duplication rule to a booking-data update: when the primary
 * service becomes Air Conditioning Service, drop the A/C add-on from the selected extras.
 * Pure — returns the next booking-data object.
 * @param {any} prev @param {string} key @param {any} value
 */
export function applyAcAddonRule(prev, key, value) {
  const next = { ...prev, [key]: value }
  if (key === 'service' && value && value.value === 'air_conditioning_service' && Array.isArray(prev.extras)) {
    next.extras = prev.extras.filter((/** @type {number} */ id) => id !== AC_ADDON.id)
  }
  return next
}

/**
 * @param {string | undefined} workshopId
 * @returns {Record<number, Addon>}
 */
export function getAddonLookupByWorkshopId(workshopId) {
  const lookup = getAddonsByWorkshopId(workshopId).reduce((acc, addon) => {
    acc[addon.id] = addon
    return acc
  }, /** @type {Record<number, Addon>} */ ({}))
  // Always resolvable so a selected A/C add-on reaches job_type_names / the record.
  lookup[AC_ADDON.id] = AC_ADDON
  return lookup
}
