import { BadgeCheck, CalendarDays, Clock3, MapPin, User, Wrench, WalletCards } from 'lucide-react'
import { getAddonsByWorkshopId } from '../../constants/addons'

/** @type {Record<string, string>} */
const workshopAddresses = {
  hendra: '238 Nudgee Rd, Hendra QLD 4011',
  woolloongabba: '456 Main St, Woolloongabba QLD 4102',
}

/** @param {string} dateStr */
function formatDate(dateStr) {
  if (!dateStr) return 'Not selected'
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * @param {{ bookingData: any }} props
 */
export default function Step5Summary({ bookingData }) {
  const { workshop, service, date, time, isFlexible, carDetails, extras } = bookingData
  const extraServices = getAddonsByWorkshopId(workshop?.workshopId)

  const selectedExtras = extraServices.filter((s) => extras.includes(s.id))
  const extrasTotal = selectedExtras.reduce((sum, s) => sum + s.price, 0)
  const workshopAddress = workshop?.workshopId ? (workshopAddresses[workshop.workshopId] || workshop.address) : 'Not selected'
  const contactName = carDetails?.fullName || 'Not provided'
  const contactEmail = carDetails?.email || 'Not provided'
  const contactPhone = carDetails?.phone || 'Not provided'

  return (
    <div className="p-3 sm:p-5 md:p-6 flex flex-col min-w-0">
      <div className="flex-1 flex flex-col">
        <h2 className="text-[2rem] sm:text-3xl font-normal text-gray-900 text-center mb-3" style={{ fontFamily: 'var(--font-display)' }}>
          Booking summary!
        </h2>
        <div className="border-t border-gray-200 mb-4" />

        <p className="text-center text-[1.9rem] sm:text-3xl md:text-4xl leading-tight text-gray-800 mb-4 break-words" style={{ fontFamily: 'var(--font-display)' }}>
          Thank you, your booking request
          <br />
          has been received!
        </p>

        <div className="flex justify-center mb-4 sm:mb-8">
          <div className="relative">
            <BadgeCheck className="h-24 w-24 sm:h-28 sm:w-28 text-emerald-500" strokeWidth={1.8} />
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

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-6">
          <div className="bg-gray-100 rounded-xl p-3">
            <p className="text-xs text-gray-700 mb-1 flex items-center gap-1.5">
              <WalletCards className="h-4 w-4 text-[rgba(255,77,36,1)]" strokeWidth={2} />
              Total charges
            </p>
            <p className="text-base font-medium text-gray-900">$ {extrasTotal.toFixed(2)}</p>
          </div>
          <div className="bg-gray-100 rounded-xl p-3 min-w-0 col-span-1">
            <p className="text-xs text-gray-700 mb-1 flex items-center gap-1.5">
              <Clock3 className="h-4 w-4 text-[rgba(255,77,36,1)]" strokeWidth={2} />
              Time
            </p>
            <p className="text-base font-medium text-gray-900">{time || 'Not selected'}{isFlexible ? ' (Flexible)' : ''}</p>
          </div>
          <div className="bg-gray-100 rounded-xl p-3 min-w-0 col-span-2 sm:col-span-1">
            <p className="text-xs text-gray-700 mb-1 flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-[rgba(255,77,36,1)]" strokeWidth={2} />
              Date
            </p>
            <p className="text-sm sm:text-base font-medium text-gray-900 break-words">{formatDate(date)}</p>
          </div>
          <div className="bg-gray-100 rounded-xl p-3 min-w-0 col-span-2 sm:col-span-1">
            <p className="text-xs text-gray-700 mb-1 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-[rgba(255,77,36,1)]" strokeWidth={2} />
              Workshop
            </p>
            <p className="text-sm sm:text-base font-medium text-gray-900 break-words">{workshopAddress}</p>
          </div>
        </div>

        <div className="hidden sm:grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-[rgba(255,77,36,1)]" /> Service details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Workshop</span>
                <span className="text-gray-900 font-medium text-right">{workshop?.name || 'Not selected'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Address</span>
                <span className="text-gray-900 font-medium text-right max-w-[60%] break-words">{workshopAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Service type</span>
                <span className="text-gray-900 font-medium">{service?.name || 'Not selected'}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-[rgba(255,77,36,1)]" /> Contact information
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Name</span>
                <span className="text-gray-900 font-medium">{contactName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="text-gray-900 font-medium">{contactEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Phone</span>
                <span className="text-gray-900 font-medium">{contactPhone}</span>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs sm:text-sm text-gray-700 break-words mt-1 sm:mt-2">
          {carDetails.email ? (
            <>A confirmation email has been sent to <span className="text-[rgba(255,77,36,1)]">{carDetails.email}</span><span className="mx-2"> </span></>
          ) : null}
          Need help? Call us at <span className="text-[rgba(255,77,36,1)]"><a href="tel:1300227663">1300 CAR ONE</a></span>
        </p>
      </div>
    </div>
  )
}
