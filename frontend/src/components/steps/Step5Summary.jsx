import { BadgeCheck, CalendarDays, Car, Clock3, MapPin, User, Wrench, WalletCards, Mail, Phone, FileText, Plus } from 'lucide-react'

const workshopAddresses = {
  hendra: '238 Nudgee Rd, Hendra QLD 4011',
  woolloongabba: '456 Main St, Woolloongabba QLD 4102',
}

const extraServices = [
  { id: 1, name: 'Tyre rotation & balancing', price: 10.22 },
  { id: 2, name: 'Engine flush plus', price: 12.10 },
  { id: 3, name: 'A/C clean & deodoriser', price: 8.12 },
  { id: 4, name: 'Wiper blade replacement', price: 6.10 },
  { id: 5, name: 'A/C re-gas & full service', price: 8.22 },
  { id: 6, name: 'Tyre puncture repair', price: 8.22 },
  { id: 7, name: 'Brake calipers system', price: 8.22 },
  { id: 8, name: 'Oil and filter change', price: 8.22 },
  { id: 9, name: 'Body and Aesthetics', price: 20 },
  { id: 10, name: 'Exhaust system servicing', price: 13.22 },
]

function formatDate(dateStr) {
  if (!dateStr) return 'Not selected'
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function Step5Summary({ bookingData }) {
  const { workshop, service, date, time, isFlexible, carDetails, extras } = bookingData

  const selectedExtras = extraServices.filter((s) => extras.includes(s.id))
  const extrasTotal = selectedExtras.reduce((sum, s) => sum + s.price, 0)
  const workshopAddress = workshop?.workshopId ? (workshopAddresses[workshop.workshopId] || workshop.address) : 'Not selected'

  return (
    <div className="p-4 sm:p-5 md:p-6 flex flex-col min-w-0">
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

        {/* Quick info cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-100 rounded-xl p-3">
            <p className="text-xs text-gray-700 mb-1 flex items-center gap-1.5">
              <WalletCards className="h-4 w-4 text-orange-500" strokeWidth={2} />
              Total add-ons
            </p>
            <p className="text-base font-medium text-gray-900">$ {extrasTotal.toFixed(2)}</p>
          </div>
          <div className="bg-gray-100 rounded-xl p-3 min-w-0">
            <p className="text-xs text-gray-700 mb-1 flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-orange-500" strokeWidth={2} />
              Date
            </p>
            <p className="text-sm sm:text-base font-medium text-gray-900 break-words">{formatDate(date)}</p>
          </div>
          <div className="bg-gray-100 rounded-xl p-3 min-w-0">
            <p className="text-xs text-gray-700 mb-1 flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-orange-500" strokeWidth={2} />
              Workshop
            </p>
            <p className="text-sm sm:text-base font-medium text-gray-900 break-words">{workshop?.name || 'Not selected'}</p>
          </div>
          <div className="bg-gray-100 rounded-xl p-3">
            <p className="text-xs text-gray-700 mb-1 flex items-center gap-1.5">
              <Clock3 className="h-4 w-4 text-orange-500" strokeWidth={2} />
              Time
            </p>
            <p className="text-base font-medium text-gray-900">{time || 'Not selected'}{isFlexible ? ' (Flexible)' : ''}</p>
          </div>
        </div>

        {/* Detailed breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Service & Workshop */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-orange-500" /> Service details
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

          {/* Contact info */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-orange-500" /> Contact information
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 flex items-center gap-1"><User className="h-3 w-3" /> Name</span>
                <span className="text-gray-900 font-medium">{carDetails.fullName || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 flex items-center gap-1"><Mail className="h-3 w-3" /> Email</span>
                <span className="text-gray-900 font-medium">{carDetails.email || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</span>
                <span className="text-gray-900 font-medium">{carDetails.phone || '—'}</span>
              </div>
            </div>
          </div>

          {/* Vehicle info */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Car className="h-4 w-4 text-orange-500" /> Vehicle details
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Make</span>
                <span className="text-gray-900 font-medium">{carDetails.make || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Model</span>
                <span className="text-gray-900 font-medium">{carDetails.model || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Year</span>
                <span className="text-gray-900 font-medium">{carDetails.year || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Registration</span>
                <span className="text-gray-900 font-medium">{carDetails.registration || '—'}</span>
              </div>
              {carDetails.state && (
                <div className="flex justify-between">
                  <span className="text-gray-500">State</span>
                  <span className="text-gray-900 font-medium">{carDetails.state}</span>
                </div>
              )}
            </div>
          </div>

          {/* Add-ons */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Plus className="h-4 w-4 text-orange-500" /> Add-ons
            </h3>
            {selectedExtras.length > 0 ? (
              <div className="space-y-2 text-sm">
                {selectedExtras.map((extra) => (
                  <div key={extra.id} className="flex justify-between">
                    <span className="text-gray-500">{extra.name}</span>
                    <span className="text-gray-900 font-medium">$ {extra.price.toFixed(2)}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold">
                  <span className="text-gray-700">Total</span>
                  <span className="text-gray-900">$ {extrasTotal.toFixed(2)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No add-ons selected</p>
            )}
          </div>
        </div>

        {/* Additional info */}
        {carDetails.additionalInfo && (
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-500" /> Additional information
            </h3>
            <p className="text-sm text-gray-700">{carDetails.additionalInfo}</p>
          </div>
        )}

        <p className="text-center text-xs sm:text-sm text-gray-700 break-words">
          {carDetails.email ? (
            <>A confirmation email has been sent to <span className="text-orange-500">{carDetails.email}</span><span className="mx-2"> </span></>
          ) : null}
          Need help? Call us at <span className="text-orange-500"><a href="tel:0736070215">(07) 3607 0215</a></ span>
        </p>
      </div>
    </div>
  )
}
