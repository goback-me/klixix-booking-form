/**
 * The two Car One workshops. Shared by the workshop step (Step0Workshop) and by
 * the "preset workshop" flow, so a workshop chosen by the embedding page is the
 * exact same object a customer would get by clicking the card.
 */
export const WORKSHOPS = [
  {
    id: 1,
    workshopId: 'hendra',
    name: 'Hendra workshop',
    address: '238 Nudgee Rd, Hendra QLD 4011, Australia',
    // Exact Car One Hendra listing (Google Maps CID), so the address opens the
    // business rather than a plain pin on the street.
    mapUrl: 'https://www.google.com/maps?cid=16246552876592836379',
    phone: '(07) 3607 0215',
    image: './hendra-workshop.webp',
    imagePos: 'center 38%',
  },
  {
    id: 2,
    workshopId: 'woolloongabba',
    name: 'Woolloongabba workshop',
    address: '187 Logan Rd, Woolloongabba QLD 4102, Australia',
    // Exact Car One Woolloongabba listing (Google Maps CID).
    mapUrl: 'https://www.google.com/maps?cid=1487784059651011892',
    phone: '(07) 3607 0215',
    image: './woolloongabba-workshop.webp',
    imagePos: 'center 78%',
  },
]

// Short names the embedding page may use as well as the full workshop id.
const ALIASES = /** @type {Record<string, string>} */ ({
  hendra: 'hendra',
  woolloongabba: 'woolloongabba',
  gabba: 'woolloongabba',
})

/**
 * Resolve the `workshop` value passed by the embedding page (e.g. "hendra",
 * "woolloongabba" or "gabba", any case). Anything else — empty, unknown, or
 * tampered — returns null, so the form falls back to the normal workshop step.
 * @param {string | null | undefined} value
 */
export function getPresetWorkshop(value) {
  const key = String(value || '').trim().toLowerCase()
  const workshopId = ALIASES[key]
  return WORKSHOPS.find((w) => w.workshopId === workshopId) || null
}
