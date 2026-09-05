import { useEffect, useRef, useState } from 'preact/hooks'
import { AlertTriangle, CheckCircle2, Search } from 'lucide-react'
import BreadcrumbBar from '../BreadcrumbBar'
import { loadTurnstile, TURNSTILE_SITE_KEY } from '../../lib/turnstile'

const AU_STATES = ['QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT']
const VEHICLE_FIELDS = ['make', 'model', 'year']

/** @param {string} value */
function normalizePlate(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
}

/**
 * @param {{ bookingData: any, updateBookingData: (key: string, value: any) => void, validationError: any, onGoToStep?: (step: number) => void }} props
 */
export default function Step3CarDetails({ bookingData, updateBookingData, validationError, onGoToStep, isVip = false }) {
  const details = bookingData.carDetails

  const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

  // idle | loading | found | no_match | error
  const [lookupStatus, setLookupStatus] = useState('idle')
  const [lookupMessage, setLookupMessage] = useState('')
  const [manualEntry, setManualEntry] = useState(false)
  const [foundVehicle, setFoundVehicle] = useState(/** @type {any} */ (null))
  const [searchMode, setSearchMode] = useState(/** @type {'rego' | 'vin'} */ ('rego'))
  // Short-lived token that ties lookups to this booking session, so the billable
  // endpoint can't be called freely from outside the form.
  const lookupTokenRef = useRef('')
  // Snapshot of the last auto-filled values, so we only wipe fields the user hasn't edited.
  const autoFillRef = useRef(/** @type {{ make: string, model: string, year: string, registration?: string } | null} */ (null))
  const lastLookupKeyRef = useRef('')

  useEffect(() => {
    if (!details.state) {
      updateBookingData('carDetails', { ...details, state: 'QLD' })
    }
  }, [details, updateBookingData])

  // Cloudflare Turnstile: each lookup is billed, so the backend only issues a
  // lookup session once the browser has passed the challenge. The widget is
  // invisible unless Cloudflare decides it needs the visitor to interact.
  const turnstileContainerRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const turnstileWidgetRef = useRef(/** @type {string | null} */ (null))
  const turnstileWaitersRef = useRef(/** @type {Array<(token: string) => void>} */ ([]))
  const sessionFailedRef = useRef(false)

  /** Exchange an optional Turnstile token for a lookup session token. */
  const requestSession = async (turnstileToken) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/lookup-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(turnstileToken ? { turnstileToken } : {}),
      })
      const data = response.ok ? await response.json().catch(() => null) : null
      if (data?.token) {
        lookupTokenRef.current = data.token
        sessionFailedRef.current = false
        return data.token
      }
    } catch {
      // fall through — treated as a failed session below
    }
    sessionFailedRef.current = true
    return ''
  }

  /** Runs a fresh Turnstile challenge and resolves with its token ('' on failure). */
  const getTurnstileToken = () => new Promise((resolve) => {
    const turnstile = /** @type {any} */ (window).turnstile
    const widgetId = turnstileWidgetRef.current
    if (!turnstile || widgetId === null) return resolve('')
    const timer = setTimeout(() => {
      turnstileWaitersRef.current = turnstileWaitersRef.current.filter((fn) => fn !== waiter)
      resolve('')
    }, 20_000)
    const waiter = (token) => { clearTimeout(timer); resolve(token) }
    turnstileWaitersRef.current.push(waiter)
    try {
      turnstile.reset(widgetId)
    } catch {
      clearTimeout(timer)
      resolve('')
    }
  })

  /** Get a new lookup session, solving a new challenge first when Turnstile is on. */
  const renewSession = async () => {
    if (!TURNSTILE_SITE_KEY) return requestSession()
    const token = await getTurnstileToken()
    if (!token) {
      sessionFailedRef.current = true
      return ''
    }
    return requestSession(token)
  }

  useEffect(() => {
    let active = true
    if (!TURNSTILE_SITE_KEY) {
      requestSession()
      return () => { active = false }
    }

    let widgetId = null
    loadTurnstile()
      .then((turnstile) => {
        if (!active || !turnstileContainerRef.current) return
        widgetId = turnstile.render(turnstileContainerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          appearance: 'interaction-only',
          size: 'flexible',
          callback: (token) => {
            const waiters = turnstileWaitersRef.current.splice(0)
            if (waiters.length) waiters.forEach((fn) => fn(token))
            else requestSession(token)
          },
          'error-callback': () => {
            sessionFailedRef.current = true
            turnstileWaitersRef.current.splice(0).forEach((fn) => fn(''))
          },
        })
        turnstileWidgetRef.current = widgetId ?? null
      })
      .catch(() => { sessionFailedRef.current = true })

    return () => {
      active = false
      const turnstile = /** @type {any} */ (window).turnstile
      if (widgetId !== null && turnstile) {
        try { turnstile.remove(widgetId) } catch { /* already gone */ }
      }
      turnstileWidgetRef.current = null
    }
  }, [apiBaseUrl])

  /** @param {string} field
   *  @param {string} value
   */
  const handleChange = (field, value) => {
    updateBookingData('carDetails', { ...details, [field]: value })
  }

  /** @param {string} value */
  const handleYearChange = (value) => {
    const numericYear = value.replace(/\D/g, '').slice(0, 4)
    handleChange('year', numericYear)
  }

  /** Wipe data from a previous lookup that the user hasn't edited themselves. */
  const clearStaleLookup = (next) => {
    next.colour = ''
    next.bodyType = ''
    const auto = autoFillRef.current
    const untouched = auto
      && details.make === auto.make
      && details.model === auto.model
      && details.year === auto.year
    if (untouched) {
      next.make = ''
      next.model = ''
      next.year = ''
    }
    if (auto && auto.registration !== undefined && details.registration === auto.registration) {
      next.registration = ''
    }
    autoFillRef.current = null
    lastLookupKeyRef.current = ''
    setFoundVehicle(null)
    setLookupStatus('idle')
    setLookupMessage('')
  }

  /** Rego or state changed: data from a previous lookup no longer belongs to this plate. */
  const handleIdentityChange = (field, value) => {
    const next = { ...details, [field]: value }
    if (lookupStatus !== 'idle' || autoFillRef.current) {
      next.vin = ''
      clearStaleLookup(next)
    }
    updateBookingData('carDetails', next)
  }

  /** VIN input changed: same idea, but the VIN itself is what the user is typing. */
  const handleVinChange = (value) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 17)
    const next = { ...details, vin: cleaned }
    if (lookupStatus !== 'idle' || autoFillRef.current) {
      clearStaleLookup(next)
    }
    updateBookingData('carDetails', next)
  }

  /** @param {'rego' | 'vin'} mode */
  const switchSearchMode = (mode) => {
    if (mode === searchMode) return
    setSearchMode(mode)
    setLookupStatus('idle')
    setLookupMessage('')
    setFoundVehicle(null)
  }

  const handleLookup = async () => {
    if (lookupStatus === 'loading') return

    let lookupKey
    let requestBody
    if (searchMode === 'vin') {
      const vin = details.vin || ''
      if (vin.length !== 17) {
        setLookupStatus('error')
        setLookupMessage(vin.length === 0
          ? 'Please enter your VIN first.'
          : `A VIN is 17 characters — you've entered ${vin.length}.`)
        return
      }
      lookupKey = `VIN:${vin}`
      requestBody = { vin }
    } else {
      const plate = normalizePlate(details.registration)
      const state = details.state || 'QLD'
      if (plate.length < 2) {
        setLookupStatus('error')
        setLookupMessage('Please enter your registration plate first.')
        return
      }
      lookupKey = `${state}:${plate}`
      requestBody = { plate, state }
    }

    if (lookupKey === lastLookupKeyRef.current && lookupStatus === 'found') return

    setLookupStatus('loading')
    setLookupMessage('')

    try {
      const send = () => fetch(`${apiBaseUrl}/api/vehicle-lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-lookup-token': lookupTokenRef.current || '',
        },
        body: JSON.stringify(requestBody),
      })

      // No session yet (challenge still running, or it failed earlier): get one now.
      if (!lookupTokenRef.current && !(await renewSession())) {
        setLookupStatus('error')
        setLookupMessage(sessionFailedRef.current
          ? "We couldn't verify your browser, so automatic lookup is off. Please enter your details manually."
          : 'Vehicle lookup is temporarily unavailable. Please enter your details manually.')
        setManualEntry(true)
        return
      }

      let response = await send()
      // A long-idle form has a stale token; get a new one and try once more.
      if (response.status === 401) {
        if (await renewSession()) {
          response = await send()
        }
      }
      const data = await response.json().catch(() => ({}))

      if (response.ok && data.found) {
        const fromVin = searchMode === 'vin'
        const nextRegistration = fromVin && data.plate ? data.plate : details.registration
        const nextState = fromVin && data.state && AU_STATES.includes(data.state) ? data.state : details.state
        autoFillRef.current = {
          make: data.make || '',
          model: data.model || '',
          year: data.year || '',
          ...(fromVin ? { registration: nextRegistration } : {}),
        }
        lastLookupKeyRef.current = lookupKey
        setFoundVehicle({ ...data, via: searchMode })
        setLookupStatus('found')
        updateBookingData('carDetails', {
          ...details,
          make: data.make || '',
          model: data.model || '',
          year: data.year || '',
          vin: data.vin || details.vin || '',
          registration: nextRegistration,
          state: nextState,
          colour: data.colour || '',
          bodyType: data.bodyType || '',
        })
      } else if (response.ok) {
        setLookupStatus('no_match')
        setManualEntry(true)
      } else {
        setLookupStatus('error')
        setLookupMessage(data.error || 'Vehicle lookup is temporarily unavailable. Please enter your details manually.')
        setManualEntry(true)
      }
    } catch {
      setLookupStatus('error')
      setLookupMessage('Vehicle lookup is temporarily unavailable. Please enter your details manually.')
      setManualEntry(true)
    }
  }

  const errorFields = validationError?.fields || []
  const hasVehicleData = Boolean(details.make || details.model || details.year)
  const vehicleFieldHasError = VEHICLE_FIELDS.some((field) => errorFields.includes(field))
  const showVehicleFields = manualEntry || lookupStatus === 'found' || hasVehicleData || vehicleFieldHasError

  /** @param {string} field */
  const inputClass = (field) =>
    `w-full px-4 py-3 border rounded-xl bg-[#f5f5f5] placeholder:text-[#ababab] focus:outline-none focus:border-[rgba(255,77,36,1)] ${
      errorFields.includes(field) ? 'border-red-400' : 'border-[#eee]'
    }`

  const foundSummary = foundVehicle
    ? [foundVehicle.year, foundVehicle.make, foundVehicle.model].filter(Boolean).join(' ')
    : ''
  const foundDetail = foundVehicle
    ? [
        foundVehicle.colour,
        foundVehicle.bodyType,
        foundVehicle.via === 'vin' && foundVehicle.plate
          ? `Rego ${foundVehicle.plate}${foundVehicle.state ? ` (${foundVehicle.state})` : ''}`
          : '',
      ].filter(Boolean).join(' · ')
    : ''

  const vinLength = (details.vin || '').length

  return (
    <div className="p-4 sm:p-5 md:p-6 flex flex-col min-w-0">
      <div className="flex-1 flex flex-col">
        <h2 className="text-2xl md:text-3xl text-[#111] mb-1 break-words">Vehicle &amp; contact details</h2>
        <p className="text-sm font-display text-[#333] mb-0 break-words">Enter your rego or VIN and we&apos;ll find your vehicle for you.</p>
        {onGoToStep && <BreadcrumbBar bookingData={bookingData} onGoToStep={onGoToStep} />}

        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3 sm:p-4 mb-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1" role="tablist" aria-label="Search by rego or VIN">
              <button
                type="button"
                role="tab"
                aria-selected={searchMode === 'rego'}
                onClick={() => switchSearchMode('rego')}
                className={`px-4 py-1.5 text-sm rounded-lg transition-all duration-150 ${searchMode === 'rego' ? 'bg-[rgba(255,77,36,1)] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Rego
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={searchMode === 'vin'}
                onClick={() => switchSearchMode('vin')}
                className={`px-4 py-1.5 text-sm rounded-lg transition-all duration-150 ${searchMode === 'vin' ? 'bg-[rgba(255,77,36,1)] text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                VIN
              </button>
            </div>
            <p className="hidden sm:block text-xs text-gray-500 mb-0 text-right">
              {searchMode === 'rego' ? 'Your number plate — fastest way to find your car' : 'The 17-character number on your windscreen or rego papers'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-end">
            {searchMode === 'vin' && (
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium font-display text-[#111] mb-2">
                  VIN <span className="text-[rgba(255,77,36,1)]">*</span>
                </label>
                {/* Counter sits inside the field so this column stays the same
                    height as the rego column and the search button stays aligned. */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. JTHBK262405191074"
                    value={details.vin || ''}
                    onChange={(e) => handleVinChange(e.currentTarget.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleLookup() }}
                    className={`${inputClass('vin')} bg-white! font-mono tracking-wide pr-16`}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs tabular-nums ${
                      vinLength === 17 ? 'text-emerald-600' : 'text-gray-400'
                    }`}
                  >
                    {vinLength}/17
                  </span>
                </div>
              </div>
            )}
            {searchMode === 'rego' && (
              <>
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium font-display text-[#111] mb-2">
                    Registration <span className="text-[rgba(255,77,36,1)]">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ABC123"
                    value={details.registration}
                    onChange={(e) => handleIdentityChange('registration', e.currentTarget.value.toUpperCase())}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleLookup() }}
                    className={`${inputClass('registration')} bg-white!`}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>
                <div className="w-full sm:w-28">
                  <label className="block text-sm font-medium font-display text-[#111] mb-2">State</label>
                  <select
                    value={details.state}
                    onChange={(e) => handleIdentityChange('state', e.currentTarget.value)}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-[rgba(255,77,36,1)] bg-white"
                  >
                    {AU_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </>
            )}
            <button
              type="button"
              onClick={handleLookup}
              disabled={lookupStatus === 'loading'}
              className="w-full sm:w-auto shrink-0 px-6 py-3 bg-[rgba(255,77,36,1)] text-white rounded-xl hover:bg-[rgba(255,77,36,0.92)] hover:shadow-md active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {lookupStatus === 'loading' ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
                  Find my vehicle
                </>
              )}
            </button>
          </div>

          {/* Turnstile mounts here; it stays empty unless Cloudflare asks the visitor to interact. */}
          {TURNSTILE_SITE_KEY && <div ref={turnstileContainerRef} aria-live="polite" />}

          {searchMode === 'vin' && errorFields.includes('registration') && (
            <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:gap-3">
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium font-display text-[#111] mb-2">
                  Registration <span className="text-[rgba(255,77,36,1)]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. ABC123"
                  value={details.registration}
                  onChange={(e) => handleIdentityChange('registration', e.currentTarget.value.toUpperCase())}
                  className={`${inputClass('registration')} bg-white!`}
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              <div className="w-full sm:w-28">
                <label className="block text-sm font-medium font-display text-[#111] mb-2">State</label>
                <select
                  value={details.state}
                  onChange={(e) => handleIdentityChange('state', e.currentTarget.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-[rgba(255,77,36,1)] bg-white"
                >
                  {AU_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {lookupStatus === 'found' && foundVehicle && (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" strokeWidth={2.2} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-emerald-900 break-words">{foundSummary || 'Vehicle found'}</p>
                <p className="text-xs text-emerald-700 break-words">
                  {foundDetail ? `${foundDetail} — ` : ''}check the details below and edit anything that looks wrong.
                </p>
              </div>
            </div>
          )}

          {lookupStatus === 'no_match' && (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" strokeWidth={2.2} aria-hidden="true" />
              <p className="text-sm text-amber-900 break-words">
                {searchMode === 'vin'
                  ? "We couldn't find a vehicle for that VIN. Please double-check it, or enter your details below."
                  : "We couldn't find a vehicle for that rego. Please check the plate and state, or enter your details below."}
              </p>
            </div>
          )}

          {lookupStatus === 'error' && lookupMessage && (
            <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3">
              <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" strokeWidth={2.2} aria-hidden="true" />
              <p className="text-sm text-red-900 break-words">{lookupMessage}</p>
            </div>
          )}

          {!showVehicleFields && (
            <p className="mt-3 mb-0 text-sm text-gray-600">
              Can&apos;t find it or no rego yet?{' '}
              <button
                type="button"
                onClick={() => setManualEntry(true)}
                className="underline text-gray-800 hover:text-[rgba(255,77,36,1)]"
              >
                Enter details manually
              </button>
            </p>
          )}
        </div>

        {showVehicleFields && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-3 md:mb-4">
            <div>
              <label className="block text-sm font-medium font-display text-[#111] mb-2">
                Make <span className="text-[rgba(255,77,36,1)]">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Mitsubishi"
                value={details.make}
                onChange={(e) => handleChange('make', e.currentTarget.value)}
                className={inputClass('make')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium font-display text-[#111] mb-2">
                Model <span className="text-[rgba(255,77,36,1)]">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Triton"
                value={details.model}
                onChange={(e) => handleChange('model', e.currentTarget.value)}
                className={inputClass('model')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium font-display text-[#111] mb-2">
                Year <span className="text-[rgba(255,77,36,1)]">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                placeholder="e.g., 2020"
                value={details.year}
                onChange={(e) => handleYearChange(e.currentTarget.value)}
                className={inputClass('year')}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div>
            <label className="block text-sm font-medium font-display text-[#111] mb-2">
              Full name <span className="text-[rgba(255,77,36,1)]">*</span>
            </label>
            <input
              type="text"
              placeholder="First and last name"
              value={details.fullName}
              onChange={(e) => handleChange('fullName', e.currentTarget.value)}
              className={inputClass('fullName')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium font-display text-[#111] mb-2">
              Email <span className="text-[rgba(255,77,36,1)]">*</span>
            </label>
            <input
              type="email"
              placeholder="yourname@example.com"
              value={details.email}
              onChange={(e) => handleChange('email', e.currentTarget.value)}
              className={inputClass('email')}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium font-display text-[#111] mb-2">
              Phone number <span className="text-[rgba(255,77,36,1)]">*</span>
            </label>
            <input
              type="tel"
              placeholder="+61"
              value={details.phone}
              onChange={(e) => handleChange('phone', e.currentTarget.value)}
              className={inputClass('phone')}
            />
          </div>

          {isVip && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium font-display text-[#111] mb-2">
                VIP number <span className="text-[rgba(255,77,36,1)]">*</span>
              </label>
              <input
                type="text"
                placeholder="Enter your VIP number"
                value={details.vipNumber || ''}
                onChange={(e) => handleChange('vipNumber', e.currentTarget.value)}
                className={inputClass('vipNumber')}
              />
            </div>
          )}

          <div className="md:col-span-2">
            <label className="block text-sm font-medium font-display text-[#111] mb-2">Additional information</label>
            <textarea
              rows={3}
              placeholder="e.g. Strange noise when braking, service light is on, car pulls to the left ... "
              value={details.additionalInfo}
              onChange={(e) => handleChange('additionalInfo', e.currentTarget.value)}
              className="w-full p-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:border-[rgba(255,77,36,1)]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
