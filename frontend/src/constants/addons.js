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
  { id: 5, name: 'A/C re-gas & full service', price: 250, priceLabel: '$250.00', image: '/AC re-gas & full service.svg' },
  { id: 6, name: 'Tyre puncture repair', price: 46.5, priceLabel: '$46.50', image: '/Tyre puncture repair.svg' },
  { id: 7, name: 'No Add-ons', image: '/no-addons.svg' },
]

/** @type {Addon[]} */
export const GABBA_ADDONS = [
  { id: 101, name: 'Tyre rotation & balancing', price: 100, priceLabel: '$100.00', image: '/tyre-rotation-gabba-balancing.svg', badge: 'Recommended' },
  { id: 102, name: 'Engine flush additive', price: 52.8, priceLabel: '$52.80', image: '/Engine flush plus-gabba.svg' },
  { id: 103, name: 'A/C clean & deodoriser', price: 38.25, priceLabel: '$38.25', image: '/AC clean & deodoriser-gabba.svg' },
  { id: 104, name: 'A/C re-gas & full service', price: 220, priceLabel: '$220.00', image: '/AC re-gas & full service-gabba.svg' },
  { id: 105, name: 'Tyre puncture repair', price: 100, priceLabel: '$50 / $100', image: '/Tyre puncture repair.svg' },
  { id: 106, name: 'Wiper blade replacement', price: 30, priceLabel: '$30.00 each', image: '/Wiper blade replacement.svg' },
  { id: 107, name: 'AC clean + Cabin filter', price: 138.5, priceLabel: '$138.50', image: '/ac-clean-cabin-fiber-gabba.svg' },
  { id: 108, name: 'AC Regas', price: 220, priceLabel: '$220.00', image: '/AC re-gas & full service.svg' },
  { id: 109, name: 'No Add-ons', image: '/no-addons.svg' },
]

/**
 * @param {string | undefined} workshopId
 * @returns {Addon[]}
 */
export function getAddonsByWorkshopId(workshopId) {
  return workshopId === 'woolloongabba' ? GABBA_ADDONS : HENDRA_ADDONS
}

/**
 * @param {string | undefined} workshopId
 * @returns {Record<number, Addon>}
 */
export function getAddonLookupByWorkshopId(workshopId) {
  return getAddonsByWorkshopId(workshopId).reduce((acc, addon) => {
    acc[addon.id] = addon
    return acc
  }, /** @type {Record<number, Addon>} */ ({}))
}
