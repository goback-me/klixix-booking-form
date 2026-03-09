import { BadgeCheck, CalendarDays, Clock3, MapPin, WalletCards } from 'lucide-react'

export default function Step5Summary() {
  return (
    <div className="p-4 sm:p-6 md:p-8 flex flex-col min-w-0">
      <div className="flex-1 flex flex-col">
        <h2 className="text-2xl md:text-3xl font-semibold text-gray-900 text-center mb-3" style={{ fontFamily: 'var(--font-display)' }}>
          Booking summary!
        </h2>
        <div className="border-t border-gray-200 mb-5" />

        <p className="text-center text-2xl sm:text-3xl md:text-4xl leading-tight text-gray-800 mb-6 break-words" style={{ fontFamily: 'var(--font-display)' }}>
          Thank you, your booking request
          <br />
          has been received!
        </p>

        <div className="flex justify-center mb-8">
          <div className="relative">
            <BadgeCheck className="h-28 w-28 text-emerald-500" strokeWidth={1.8} />
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div className="bg-gray-100 rounded-xl p-3">
            <p className="text-xs text-gray-700 mb-1 flex items-center gap-1.5">
              <WalletCards className="h-4 w-4 text-orange-500" strokeWidth={2} />
              Total charges
            </p>
            <p className="text-base font-medium text-gray-900">$ 32.66</p>
          </div>
          <div className="bg-gray-100 rounded-xl p-3 md:col-span-1 min-w-0">
            <p className="text-xs text-gray-700 mb-1 flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-orange-500" strokeWidth={2} />
              Date
            </p>
            <p className="text-sm sm:text-base font-medium text-gray-900 break-words">Friday 6 February 2026</p>
          </div>
          <div className="bg-gray-100 rounded-xl p-3 md:col-span-1 min-w-0">
            <p className="text-xs text-gray-700 mb-1 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-orange-500" strokeWidth={2} />
              Workshop
            </p>
            <p className="text-sm sm:text-base font-medium text-gray-900 break-words">456 Main Street, Woolloongabba QLD 4102</p>
          </div>
          <div className="bg-gray-100 rounded-xl p-3">
            <p className="text-xs text-gray-700 mb-1 flex items-center gap-1.5">
              <Clock3 className="h-4 w-4 text-orange-500" strokeWidth={2} />
              Time
            </p>
            <p className="text-base font-medium text-gray-900">3:00 PM</p>
          </div>
        </div>

        <p className="text-center text-xs sm:text-sm text-gray-700 break-words">
          A confirmation email has been sent to <span className="text-orange-500">dfh@gmail.com</span>
          <span className="mx-2"> </span>
          Need help? Call us at <span className="text-orange-500">1300 CAR ONE</span>
        </p>
      </div>
    </div>
  )
}
