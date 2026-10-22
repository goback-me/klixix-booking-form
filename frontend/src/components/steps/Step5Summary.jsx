import { BadgeCheck, CalendarDays, CalendarPlus, Car, Clock3, MapPin, Navigation, User, Wrench } from 'lucide-react'
import { getAddonsByWorkshopId } from '../../constants/addons'
import { useEffect } from 'preact/hooks'

/** @type {Record<string, string>} */
const workshopAddresses = {
  hendra: '238 Nudgee Rd, Hendra, QLD 4011',
  woolloongabba: '187 Logan Rd, Woolloongabba, QLD 4102',
}

// Exact Google Maps business listings (CID), so the address opens the workshop, not a pin.
/** @type {Record<string, string>} */
const workshopMapUrls = {
  hendra: 'https://www.google.com/maps?cid=16246552876592836379',
  woolloongabba: 'https://www.google.com/maps?cid=1487784059651011892',
}

/** @param {string} dateStr */
function formatDate(dateStr) {
  if (!dateStr) return 'Not selected'
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function pad(n) { return String(n).padStart(2, '0') }

/** Build a Google Calendar "add event" link from the booking date/time (1-hour slot). */
function calendarUrl({ dateStr, timeStr, title, address }) {
  if (!dateStr) return null
  const m = String(timeStr || '').match(/(\d+):(\d+)\s*(AM|PM)/i)
  let h = 9, min = 0
  if (m) { h = (parseInt(m[1], 10) % 12) + (/pm/i.test(m[3]) ? 12 : 0); min = parseInt(m[2], 10) }
  const start = new Date(dateStr + 'T00:00:00'); start.setHours(h, min, 0, 0)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  const fmt = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title || 'CarOne Automotive booking',
    dates: `${fmt(start)}/${fmt(end)}`,
    location: address || '',
    details: 'Your CarOne Automotive service booking.',
    ctz: 'Australia/Brisbane',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/**
 * @param {{ bookingData: any, isVip?: boolean }} props
 */
export default function Step5Summary({ bookingData, isVip = false }) {
  const { workshop, service, date, time, isFlexible, carDetails, extras } = bookingData
  const extraServices = getAddonsByWorkshopId(workshop?.workshopId)

  // Exclude the "No Add-ons" convenience option — it's never a real extra.
  const selectedExtras = extraServices.filter((s) => extras.includes(s.id) && !s.noAddon)
  const addonsLabel = selectedExtras.length ? selectedExtras.map((s) => s.name).join(', ') : 'None'
  const workshopAddress = workshop?.workshopId ? (workshopAddresses[workshop.workshopId] || workshop.address) : 'Not selected'
  const contactName = carDetails?.fullName || 'Not provided'
  const contactEmail = carDetails?.email || 'Not provided'
  const contactPhone = carDetails?.phone || 'Not provided'
  const vehicleRego = [carDetails?.registration, carDetails?.state ? `(${carDetails.state})` : '']
    .filter(Boolean).join(' ') || 'Not provided'
  const vehicleMakeModel = [carDetails?.make, carDetails?.model].map((v) => String(v || '').trim()).filter(Boolean).join(' ') || 'Not provided'
  const vehicleYear = carDetails?.year || 'Not provided'
  const mapUrl = (workshop?.workshopId && workshopMapUrls[workshop.workshopId]) || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(workshopAddress)}`
  const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(workshopAddress)}`
  const calUrl = calendarUrl({ dateStr: date, timeStr: time, title: `CarOne Automotive — ${service?.name || 'Service'}`, address: workshopAddress })

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'auto'
    }
  }, [])

  return (
    <div className="p-2.5 sm:p-5 md:p-6 pb-0 flex flex-col min-w-0 h-full">
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto no-scrollbar">
        <h2 className="text-[1.9rem] sm:text-[42px] leading-tight font-normal text-[#111] text-center mb-2 sm:mb-3" style={{ fontFamily: 'var(--font-display)' }}>
          Booking summary!
        </h2>
        <div className="border-t border-gray-200 mb-2 sm:mb-4" />

        <p className="text-center text-[1.15rem] sm:text-[26px] leading-[1.25] text-[#111] mb-2 sm:mb-4 break-words" style={{ fontFamily: 'var(--font-display)' }}>
          Thank you, your booking request
          <br />
          has been received!
        </p>

        <div className="flex justify-center mb-2 sm:mb-8">
          <div className="relative">
            <BadgeCheck className="h-14 w-14 sm:h-28 sm:w-28 text-emerald-500" strokeWidth={1.8} />
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 h-2 w-0.5 bg-emerald-500 rounded" />
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 h-2 w-0.5 bg-emerald-500 rounded" />
            <span className="absolute top-1/2 -left-3 -translate-y-1/2 h-0.5 w-2 bg-emerald-500 rounded" />
            <span className="absolute top-1/2 -right-3 -translate-y-1/2 h-0.5 w-2 bg-emerald-500 rounded" />
            <span className="absolute top-3 left-2 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="absolute top-3 right-2 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="absolute bottom-3 left-2 h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="absolute bottom-3 right-2 h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-3 mb-2 sm:mb-3">
          <div className="bg-[#f5f5f5] rounded-xl p-2.5 sm:p-3 min-w-0">
            <p className="text-xs text-gray-700 mb-1 flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-[rgba(255,77,36,1)]" strokeWidth={2} />
              Date
            </p>
            <p className="text-[13px] sm:text-base font-medium text-[#111] break-words leading-[1.25]">{formatDate(date)}</p>
          </div>
          <div className="bg-[#f5f5f5] rounded-xl p-2.5 sm:p-3 min-w-0">
            <p className="text-xs text-gray-700 mb-1 flex items-center gap-1.5">
              <Clock3 className="h-4 w-4 text-[rgba(255,77,36,1)]" strokeWidth={2} />
              Time
            </p>
            <p className="text-sm sm:text-base font-medium text-[#111]">{time || 'Not selected'}{isFlexible ? ' (Flexible)' : ''}</p>
          </div>
          <div className="bg-[#f5f5f5] rounded-xl p-2.5 sm:p-3 min-w-0 col-span-2 lg:col-span-1">
            <p className="text-xs text-gray-700 mb-1 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-[rgba(255,77,36,1)]" strokeWidth={2} />
              Workshop
            </p>
            <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-[13px] sm:text-base font-medium text-[#111] hover:text-[rgba(255,77,36,1)] underline-offset-2 hover:underline break-words leading-[1.25]">{workshopAddress}</a>
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-3 sm:mb-4">
          {calUrl && (
            <a href={calUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-[#111] hover:border-[rgba(255,77,36,0.5)] hover:bg-[#FFF4EB] transition-colors">
              <CalendarPlus className="h-4 w-4 text-[rgba(255,77,36,1)]" /> Add to calendar
            </a>
          )}
          <a href={dirUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-medium text-[#111] hover:border-[rgba(255,77,36,0.5)] hover:bg-[#FFF4EB] transition-colors">
            <Navigation className="h-4 w-4 text-[rgba(255,77,36,1)]" /> Get directions
          </a>
        </div>

        {/* Details — three columns on desktop (no scroll), stacked on mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 items-start">
          <div className="bg-gray-50 rounded-2xl p-3.5 sm:p-4 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-[rgba(255,77,36,1)]" /> Service
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 shrink-0">Service type</span>
                <span className="text-gray-900 font-medium text-right">{service?.name || 'Not selected'}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 shrink-0">Add-ons</span>
                <span className="text-gray-900 font-medium text-right min-w-0 break-words">{addonsLabel}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-3.5 sm:p-4 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Car className="h-4 w-4 text-[rgba(255,77,36,1)]" /> Vehicle
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 shrink-0">Registration</span>
                <span className="text-gray-900 font-medium text-right">{vehicleRego}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 shrink-0">Make &amp; model</span>
                <span className="text-gray-900 font-medium text-right min-w-0 break-words">{vehicleMakeModel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Year</span>
                <span className="text-gray-900 font-medium">{vehicleYear}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-3.5 sm:p-4 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-[rgba(255,77,36,1)]" /> Contact
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 shrink-0">Name</span>
                <span className="text-gray-900 font-medium text-right">{contactName}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 shrink-0">Email</span>
                {carDetails?.email
                  ? <a href={`mailto:${contactEmail}`} className="text-gray-900 font-medium text-right break-all min-w-0 hover:text-[rgba(255,77,36,1)] hover:underline underline-offset-2">{contactEmail}</a>
                  : <span className="text-gray-900 font-medium text-right break-all min-w-0">{contactEmail}</span>}
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-gray-500 shrink-0">Phone</span>
                {carDetails?.phone
                  ? <a href={`tel:${String(contactPhone).replace(/\s+/g, '')}`} className="text-gray-900 font-medium text-right hover:text-[rgba(255,77,36,1)] hover:underline underline-offset-2">{contactPhone}</a>
                  : <span className="text-gray-900 font-medium text-right">{contactPhone}</span>}
              </div>
              {isVip && carDetails?.vipNumber && (
                <div className="flex justify-between">
                  <span className="text-gray-500">VIP number</span>
                  <span className="text-gray-900 font-medium">{carDetails.vipNumber}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-auto text-center text-[11px] sm:text-sm leading-snug text-gray-700 break-words p-2 space-y-0.5">
        {carDetails.email ? (
          <p>A confirmation email has been sent to <span className="text-[rgba(255,77,36,1)] break-all">{carDetails.email}</span></p>
        ) : null}
        <p>Need help? Call us at <span className="text-[rgba(255,77,36,1)]"><a href="tel:+61736070215">(07) 3607 0215</a></span></p>
      </div>
    </div>
  )
}
