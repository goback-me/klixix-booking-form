import ServiceCard from '../ServiceCard'

// Both workshops open Mon–Fri, 8:00am–5:00pm (closed weekends).
const OPEN_HOUR = 8
const CLOSE_HOUR = 17

/** Current weekday + hour in Brisbane (no daylight saving, so always UTC+10). */
function getBrisbaneNow() {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Brisbane',
    weekday: 'short',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  const weekday = parts.find((p) => p.type === 'weekday')?.value || 'Mon'
  const hour = Number.parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10)
  return { weekday, hour }
}

/**
 * A live open/closed label that is always accurate — unlike a static "Open today",
 * it never claims the workshop is open on a weekend or after hours.
 */
function getWorkshopHoursStatus() {
  const { weekday, hour } = getBrisbaneNow()
  const isWeekend = weekday === 'Sat' || weekday === 'Sun'

  if (!isWeekend && hour >= OPEN_HOUR && hour < CLOSE_HOUR) return 'Open now · Closes 5:00pm'
  if (!isWeekend && hour < OPEN_HOUR) return 'Opens today at 8:00am'
  if (!isWeekend && weekday !== 'Fri') return 'Closed · Opens tomorrow 8:00am'
  return 'Closed · Opens Monday 8:00am'
}

/**
 * @param {{ bookingData: any, updateBookingData: (key: string, value: any) => void, onAutoAdvance?: (key: string, value: any) => void }} props
 */
export default function Step0Workshop({ bookingData, updateBookingData, onAutoAdvance }) {
  const hoursStatus = getWorkshopHoursStatus()


  const services = [
    {
      id: 1,
      workshopId: 'hendra',
      name: 'Hendra workshop',
      address: '238 Nudgee Rd, Hendra QLD 4011, Australia',
      // Exact Car One Hendra listing (Google Maps CID), so the address opens the
      // business rather than a plain pin on the street.
      mapUrl: 'https://www.google.com/maps?cid=16246552876592836379',
      time: hoursStatus,
      phone:'(07) 3607 0215',
      image: "./hendra-workshop.webp",
    },
    {
      id: 2,
      workshopId: 'woolloongabba',
      name: 'Woolloongabba workshop',
      address: '187 Logan Rd, Woolloongabba QLD 4102, Australia',
      // Exact Car One Woolloongabba listing (Google Maps CID).
      mapUrl: 'https://www.google.com/maps?cid=1487784059651011892',
      time: hoursStatus,
      phone:'(07) 3607 0215',
      image: "./woolloongabba-workshop.webp",
    },
  ]

  return (
    <div className="p-3 sm:p-5 md:p-6 pb-3 sm:pb-8 flex flex-col min-w-0">
      <div className="flex-1 flex flex-col">
        <h2 className="text-[1.85rem] sm:text-2xl md:text-3xl leading-[1.2] mb-1 sm:mb-2 text-primary-dark break-words">Choose your workshop</h2>
        <p className="text-sm font-display text-[#333] mb-2 sm:mb-3 md:mb-5 break-words">Experience premium automotive care with our expert technicians</p>
        <div className="mb-2 sm:mb-3 md:mb-5 border-t-1 border-gray-300"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 md:gap-4 auto-rows-max">
        {services.map((service, idx) => (
          <ServiceCard
            key={service.id}
            service={service}
            selected={bookingData.workshop?.id === service.id}
            variant="workshop"
            // Responsive, larger image area, aspect ratio 16:5 for banner look
            containerHeight="aspect-[16/5] min-h-[120px] sm:min-h-[140px] md:min-h-[180px] lg:min-h-[210px] xl:min-h-[240px]"
            imageHeight={320}
            imageWidth={960}
            index={idx}
            onSelect={() => {
              if (onAutoAdvance) {
                onAutoAdvance('workshop', service)
              } else {
                updateBookingData('workshop', service)
              }
              if (typeof window !== 'undefined') {
                window.localStorage.setItem('selectedWorkshop', service.workshopId)
              }
            }}
          />
        ))}        </div>      </div>
    </div>
  )
}