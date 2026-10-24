import { useState, useEffect, useRef } from 'preact/hooks'
import Sidebar from './Sidebar'
import StepContent from './StepContent'
import { getAddonLookupByWorkshopId, applyAcAddonRule as withAcAddonRule } from '../constants/addons'
import { QUOTE_PAGE_PATHS, AC_LANDING_PATH, getServiceByValue, deriveConversionFields } from '../constants/services'

/** Reduce any AU phone input to canonical 0-leading digits (handles +61 / 61 forms). */
export function toAuPhoneDigits(raw) {
  let s = String(raw || '').replace(/[^\d+]/g, '')
  if (s.startsWith('+61')) s = '0' + s.slice(3)
  else if (s.startsWith('61') && s.length === 11) s = '0' + s.slice(2)
  return s.replace(/\D/g, '')
}

/** A valid AU number: 10 digits, 0 + a mobile (4) or landline (2/3/7/8) prefix. */
export function isValidAuPhone(raw) {
  return /^0[234578]\d{8}$/.test(toAuPhoneDigits(raw))
}

/** At least a first and last name (two words). */
function isValidFullName(raw) {
  return /\S+\s+\S+/.test(String(raw || '').trim())
}

/**
 * @typedef {{ workshopId: string, name?: string }} Workshop
 * @typedef {{ name: string }} Service
 * @typedef {{
 *   fullName: string,
 *   email: string,
 *   phone: string,
 *   make: string,
 *   model: string,
 *   year: string,
 *   registration: string,
 *   state: string,
 *   additionalInfo: string,
 *   vipNumber: string,
 *   vin: string,
 *   colour: string,
 *   bodyType: string,
 * }} CarDetails
 * @typedef {{
 *   workshop: Workshop | null,
 *   service: Service | null,
 *   date: string,
 *   time: string,
 *   isFlexible: boolean,
 *   unavailableDays: string[],
 *   carDetails: CarDetails,
 *   extras: number[],
 * }} BookingData
 * @typedef {{ message: string, fields?: string[], fieldErrors?: Record<string, string> }} ValidationError
 */

const AU_STATES = /** @type {const} */ (['QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT'])

// QUOTE_PAGE_PATHS now lives in ../constants/services (shared with the service list
// and the testable conversion-field helper).

// The parent site now owns the conversion + the thank-you redirect. The iframe
// only posts a confirmed event to this EXACT origin (never '*'); set per env.
// Production: https://car-one.com.au ; staging: the authorised staging parent origin.
const PARENT_ORIGIN = import.meta.env.VITE_PARENT_ORIGIN || ''

/**
 * @param {string} dateStr
 * @param {string} timeStr
 */
function formatDropOffTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return ''
  const [year, month, day] = dateStr.split('-')
  const timeParts = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (!timeParts) return ''
  let hours = parseInt(timeParts[1], 10)
  const minutes = timeParts[2]
  const period = timeParts[3].toUpperCase()
  if (period === 'PM' && hours !== 12) hours += 12
  if (period === 'AM' && hours === 12) hours = 0
  return `${day}/${month}/${year} ${String(hours).padStart(2, '0')}:${minutes}`
}

/** @type {BookingData} */
const initialBookingData = {
  workshop: null,
  service: null,
  date: '',
  time: '',
  isFlexible: false,
  unavailableDays: [],
  carDetails: {
    fullName: '',
    email: '',
    phone: '',
    make: '',
    model: '',
    year: '',
    registration: '',
    state: 'QLD',
    additionalInfo: '',
    vipNumber: '',
    vin: '',
    colour: '',
    bodyType: '',
  },
  extras: [],
}

/**
 * @param {number} step
 * @param {BookingData} bookingData
 * @param {boolean} [isVip]
 * @returns {ValidationError | null}
 */
function validateStep(step, bookingData, isVip = false) {
  switch (step) {
    case 0:
      if (!bookingData.workshop) return { message: 'Please select a workshop' }
      return null
    case 1:
      if (!bookingData.service) return { message: 'Please select a service' }
      return null
    case 2:
      if (!bookingData.date) return { message: 'Please select a date' }
      if (!bookingData.time) return { message: 'Please select a time slot' }
      return null
    case 3: {
      const d = bookingData.carDetails
      const email = d.email.trim()
      const phone = d.phone.trim()
      const year = String(d.year || '').trim()
      const missing = []
      if (!d.fullName.trim()) missing.push('fullName')
      if (!email) missing.push('email')
      if (!phone) missing.push('phone')
      if (!d.make.trim()) missing.push('make')
      if (!d.model.trim()) missing.push('model')
      if (!year) missing.push('year')
      if (!d.registration.trim()) missing.push('registration')
      if (isVip && !d.vipNumber?.trim()) missing.push('vipNumber')
      if (missing.length) return { message: 'Please fill in all required fields', fields: missing }

      // Each failing field gets its own message so the error points to the right box.
      const fieldErrors = /** @type {Record<string, string>} */ ({})
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
      if (!emailRegex.test(email)) fieldErrors.email = 'Please enter a valid email address.'
      if (!isValidFullName(d.fullName)) fieldErrors.fullName = 'Please enter your first and last name.'
      if (!isValidAuPhone(phone)) fieldErrors.phone = 'Please enter a valid Australian phone number (e.g. 0412 345 678).'

      const yearRegex = /^\d{4}$/
      const yearNumber = Number.parseInt(year, 10)
      const currentYear = new Date().getFullYear()
      if (!yearRegex.test(year) || yearNumber < 1900 || yearNumber > currentYear + 1) {
        fieldErrors.year = 'Please enter a 4-digit vehicle year.'
      }

      const invalid = Object.keys(fieldErrors)
      if (invalid.length) {
        return {
          message: invalid.length === 1 ? fieldErrors[invalid[0]] : 'Please fix the highlighted fields.',
          fields: invalid,
          fieldErrors,
        }
      }

      return null
    }
    case 4:
      return null // Add-ons are optional
    default:
      return null
  }
}

export default function BookingForm({ isVip = false }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [bookingData, setBookingData] = useState(initialBookingData)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  // Truthful "received but not confirmed" notice (HTTP 202) — NOT an error, NOT a conversion.
  const [submitNotice, setSubmitNotice] = useState('')
  const [validationError, setValidationError] = useState(/** @type {ValidationError | null} */ (null))
  const [parentUrl, setParentUrl] = useState('')
  // Store UTM/ad params from iframe URL
  const [utmParams, setUtmParams] = useState({})
  // Once a booking succeeds we lock navigation so the progress bar can't be used
  // to go back and Confirm a second time (prevents double bookings).
  const [bookingSubmitted, setBookingSubmitted] = useState(false)
  // Stable id for one booking attempt so a retry / double-click is de-duplicated
  // on the server instead of creating a second booking.
  const idempotencyKeyRef = useRef(/** @type {string | null} */ (null))
  // Synchronous submit lock — React's `submitting` state updates async, so rapid
  // double/triple-clicks can slip through before it flips. A ref blocks them in
  // the same tick, so only one request is ever sent.
  const submitLockRef = useRef(false)
  if (!idempotencyKeyRef.current) {
    idempotencyKeyRef.current =
      (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `bk_${Date.now()}_${Math.random().toString(36).slice(2)}`
  }

  // Broadcast height to parent for inline iframe auto-resize
  useEffect(() => {
    if (window.parent === window) return
    // Step-based minimum heights — summary needs the most room
    const stepMinHeights = [700, 700, 760, 860, 780, 980]
    const minHeight = stepMinHeights[currentStep] ?? 800
    const height = Math.max(minHeight, window.innerHeight)
    window.parent.postMessage({ type: 'carone-resize', height }, PARENT_ORIGIN || '*')
  }, [currentStep])

  // Lightweight ack from the parent (protocol completeness). The iframe does NOT
  // block its UX on this — it already shows the summary on confirmation — but the
  // ack lets the parent signal it has taken over the conversion/redirect.
  useEffect(() => {
    if (typeof window === 'undefined' || !PARENT_ORIGIN) return
    const onMessage = (e) => {
      if (e.origin !== PARENT_ORIGIN) return
      if (e?.data?.type === 'carone_booking_ack') { /* parent handled the conversion */ }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])
  // On mount, read UTM/ad params and parent_url from iframe URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const pUrl = searchParams.get('parent_url') || '';
      setParentUrl(pUrl);
      // Paid AC landing page → preselect the standalone Car Air Conditioning Service
      // (so the AC purchase is the booked service, not a generic one).
      if (pUrl.includes(AC_LANDING_PATH)) {
        const ac = getServiceByValue('air_conditioning_service');
        if (ac) setBookingData((prev) => (prev.service ? prev : { ...prev, service: ac }));
      }
      const utmKeys = [
        'utm_source','utm_medium','utm_campaign','utm_content','utm_ad','utm_term','matchtype','utm_device','utm_GeoLoc','utm_placement','utm_network','utm_campaign_id','utm_adgroupid','ad_id'
      ];
      const paramsObj = /** @type {Record<string, string>} */ ({});
      utmKeys.forEach((key) => {
        paramsObj[key] = searchParams.get(key) || '';
      });
      setUtmParams(paramsObj);
    }
  }, []);

  const isQuotePage = QUOTE_PAGE_PATHS.some((path) => parentUrl.includes(path))

  const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')
  const [prefetchedUnavailableDays, setPrefetchedUnavailableDays] = useState(/** @type {string[] | null} */ (null))
  const [prefetchDatesLoading, setPrefetchDatesLoading] = useState(false)
  useEffect(() => {
    const workshopId = bookingData.workshop?.workshopId
    if (!workshopId) return
    let isMounted = true
    setPrefetchDatesLoading(true)
    setPrefetchedUnavailableDays(null)
    const params = new URLSearchParams({ workshop: workshopId, in_days: '180' })
    fetch(`${apiBaseUrl}/api/unavailable-days?${params.toString()}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((payload) => {
        if (isMounted) setPrefetchedUnavailableDays(Array.isArray(payload.unavailable_days) ? payload.unavailable_days : [])
      })
      .catch(() => { if (isMounted) setPrefetchedUnavailableDays([]) })
      .finally(() => { if (isMounted) setPrefetchDatesLoading(false) })
    return () => { isMounted = false }
  }, [bookingData.workshop?.workshopId, apiBaseUrl])

  /**
   * @param {keyof BookingData} key
   * @param {BookingData[keyof BookingData]} value
   */
  const updateBookingData = (key, value) => {
    setBookingData((prev) => withAcAddonRule(prev, key, value))
    setValidationError(null)
  }

  const steps = ['Workshop', 'Service', 'Date & time', 'Car details', 'Add-ons', 'Summary']
  const progressSteps = steps.slice(0, 5)
  const sidebarCurrentStep = Math.min(currentStep, progressSteps.length - 1)
  const sidebarAllCompleted = currentStep >= progressSteps.length
  const completedStepIndexes = progressSteps
    .map((_, index) => {
      if (index === 4) {
        // Add-ons is optional; mark as completed once user reaches summary.
        return currentStep > 4
      }
      return validateStep(index, bookingData, isVip) === null
    })
    .map((isCompleted, index) => (isCompleted ? index : -1))
    .filter((index) => index >= 0)

  const nextStep = () => {
    /** @type {ValidationError | null} */
    const error = validateStep(currentStep, bookingData, isVip)
    if (error) {
      setValidationError(error)
      return
    }
    setValidationError(null)
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
  }

  /**
   * @param {keyof BookingData} key
   * @param {BookingData[keyof BookingData]} value
   */
  const autoAdvanceWithSelection = (key, value) => {
    setBookingData((prev) => withAcAddonRule(prev, key, value))
    setValidationError(null)
    // Delay auto-advance to Step 2 to allow prefetch to complete
    const delay = key === 'service' ? 350 : 0
    setTimeout(() => {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
    }, delay)
  }

  const prevStep = () => {
    setValidationError(null)
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  /** @param {number} targetStep */
  const goToStepFromSidebar = (targetStep) => {
    if (submitting || bookingSubmitted) return

    const isCurrent = targetStep === sidebarCurrentStep
    const isCompleted = completedStepIndexes.includes(targetStep)
    if (isCurrent || isCompleted) {
      setValidationError(null)
      setCurrentStep(targetStep)
    }
  }

  const resetSteps = () => {
    setCurrentStep(0)
    setBookingData(initialBookingData)
    setSubmitError('')
    setSubmitNotice('')
    setValidationError(null)
    setBookingSubmitted(false)
    // A fresh booking gets a fresh idempotency key.
    idempotencyKeyRef.current =
      (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `bk_${Date.now()}_${Math.random().toString(36).slice(2)}`
  }

  /** @param {number[] | undefined} [overrideExtras] */
  const submitBooking = async (overrideExtras) => {
    if (submitLockRef.current || submitting || bookingSubmitted) return
    submitLockRef.current = true
    setSubmitting(true)
    setSubmitError('')
    setSubmitNotice('')

    const { workshop, service, date, time, carDetails, extras } = bookingData
    const effectiveExtras = Array.isArray(overrideExtras) ? overrideExtras : extras
    const addonLookup = getAddonLookupByWorkshopId(workshop?.workshopId)

    /** @type {string[]} */
    const jobTypeNames = []
    /** @type {string[]} */
    const selectedAddonNames = []
    if (service?.name) jobTypeNames.push(service.name)
    effectiveExtras.forEach((id) => {
      const addon = addonLookup[id]
      // "No Add-ons" is a UI convenience, never a real job/add-on.
      if (addon?.name && !addon.noAddon) {
        jobTypeNames.push(addon.name)
        selectedAddonNames.push(addon.name)
      }
    })

    const vehicleSummary = [carDetails.make, carDetails.model, carDetails.year]
      .map((v) => String(v || '').trim())
      .filter(Boolean)
      .join(' ')
    const userComment = carDetails.additionalInfo?.trim() || 'N/A'
    const addonsSummary = selectedAddonNames.length ? selectedAddonNames.join(', ') : 'None'
    const vipNote = isVip && carDetails.vipNumber?.trim() ? ` | VIP Number: ${carDetails.vipNumber.trim()}` : ''
    const vinNote = carDetails.vin?.trim() ? ` | VIN: ${carDetails.vin.trim()}` : ''
    // Make the flexible choice visible to staff, since the drop-off time is still a firm slot.
    const timingNote = bookingData.isFlexible ? ' | Timing: Flexible (customer happy with any slot)' : ''
    const enrichedNote = `User Comments: ${userComment} | Service: ${jobTypeNames[0]} | Add-ons: ${addonsSummary}${vinNote}${vipNote}${timingNote}`

    // Get parent_url from query string if present
    let parentPageUrl = '';
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      parentPageUrl = params.get('parent_url') || '';
    }
    const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
    // Privacy-safe segmentation for analytics (no PII). Entry point lets Ads/GA4
    // separate paid-landing-page bookings from the rest. serviceType is the STABLE
    // service value (e.g. air_conditioning_service), not the display name.
    const { bookingEntryPoint, landingPageType, serviceType } = deriveConversionFields({ parentUrl: parentPageUrl, service })
    // Merge UTM/ad params into payload
    const payload = {
      workshop: workshop?.workshopId || '',
      name: carDetails.fullName,
      phone: carDetails.phone,
      email: carDetails.email,
      state: carDetails.state,
      registration_number: carDetails.registration,
      make: carDetails.make,
      model: carDetails.model,
      year: carDetails.year,
      vin: carDetails.vin?.trim() || '',
      drop_off_time: formatDropOffTime(date, time),
      job_type_names: jobTypeNames,
      note: enrichedNote,
      booking_note: enrichedNote,
      alert: enrichedNote,
      service_addons: selectedAddonNames,
      is_flexible: bookingData.isFlexible || false,
      page_url: pageUrl,
      parent_page_url: parentPageUrl,
      idempotency_key: idempotencyKeyRef.current,
      ...(isVip ? { vip_number: carDetails.vipNumber?.trim() || '' } : {}),
      ...utmParams,
    }

    try {
      // The webhook is now sent server-side inside create-booking (with the booking
      // id), so it can't be lost on a quote-page redirect and the endpoint isn't
      // left open to the public.
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/create-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      // 202 = received but NOT confirmed (recovery lead) — a valid, non-error response.
      if (!response.ok && response.status !== 202) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Booking failed')
      }
      const data = await response.json().catch(() => ({}))

      if (data.confirmed === true) {
        setBookingSubmitted(true)
        // Confirmed ONLY: notify the parent to fire the conversion. The PARENT owns the
        // Ads/GA4 push AND the thank-you redirect, so the iframe never navigates
        // window.top itself (no navigation race, no refresh re-fire).
        if (window.parent !== window && PARENT_ORIGIN) {
          window.parent.postMessage({
            type: 'carone_booking_confirmed',
            booking_reference: data.booking_reference,
            workshop: workshop?.workshopId || '',
            service_type: serviceType,
            booking_entry_point: bookingEntryPoint,
            landing_page_type: landingPageType,
          }, PARENT_ORIGIN) // exact origin, never '*'
        }
        // Always show our own confirmation summary as the fallback (parent-absent);
        // if the parent redirects after its tag fires, that replaces this view.
        setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
      } else {
        // HTTP 202 (sync_failed | sync_unknown): received, not confirmed.
        // No conversion, no redirect, no summary — a truthful pending notice only.
        setSubmitNotice('We’ve received your request and will call you shortly to confirm your appointment time.')
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
      // Release the lock so a genuinely failed submit can be retried; a successful
      // one is already blocked by bookingSubmitted.
      submitLockRef.current = false
    }
  }

  return (
    <div className="flex flex-col lg:flex-row bg-white w-full h-full min-h-0 min-w-0 overflow-hidden">
      <Sidebar
        steps={progressSteps}
        currentStep={sidebarCurrentStep}
        allCompleted={sidebarAllCompleted}
        completedStepIndexes={/** @type {any} */ (completedStepIndexes)}
        onStepClick={goToStepFromSidebar}
      />
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
        <StepContent
          step={currentStep}
          onNext={nextStep}
          onPrev={prevStep}
          onGoToStep={goToStepFromSidebar}
          onAutoAdvance={/** @type {(key: string, value: unknown) => void} */ (autoAdvanceWithSelection)}
          onReset={resetSteps}
          onSubmit={submitBooking}
          onSkipAndSubmit={() => submitBooking([])}
          submitting={submitting}
          submitError={submitError}
          submitNotice={submitNotice}
          validationError={validationError}
          bookingData={bookingData}
          updateBookingData={/** @type {(key: string, value: unknown) => void} */ (updateBookingData)}
          prefetchedUnavailableDays={prefetchedUnavailableDays}
          prefetchDatesLoading={prefetchDatesLoading}
          isVip={isVip}
          isQuotePage={isQuotePage}
        />
      </div>
    </div>
  )
}
