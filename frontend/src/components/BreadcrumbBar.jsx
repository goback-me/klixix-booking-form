import { MapPin, Wrench, CalendarDays } from 'lucide-react'

/**
 * @param {string} dateStr
 * @param {string} timeStr
 * @param {boolean} isFlexible
 */
function formatBreadcrumbDate(dateStr, timeStr, isFlexible) {
  const parts = []
  if (dateStr) {
    const date = new Date(dateStr + 'T00:00:00')
    const weekday = date.toLocaleDateString('en-AU', { weekday: 'short' })
    const day = String(date.getDate()).padStart(2, '0')
    const month = date.toLocaleDateString('en-AU', { month: 'short' })
    parts.push(`${weekday} ${day} ${month}`)
  }
  if (timeStr) {
    parts.push(timeStr)
  } else if (isFlexible) {
    parts.push('Flexible')
  }
  return parts.join(' - ')
}

/**
 * @param {{
 *   bookingData: any,
 *   onGoToStep: (step: number) => void,
 * }} props
 */
export default function BreadcrumbBar({ bookingData, onGoToStep }) {
  const items = []

  if (bookingData?.workshop) {
    items.push({ icon: MapPin, label: bookingData.workshop.name, step: 0 })
  }
  if (bookingData?.service) {
    items.push({ icon: Wrench, label: bookingData.service.name, step: 1 })
  }
  if (bookingData?.date || bookingData?.time) {
    items.push({
      icon: CalendarDays,
      label: formatBreadcrumbDate(bookingData.date, bookingData.time, bookingData.isFlexible),
      step: 2,
    })
  }

  if (!items.length) return null

  return (
    <div className="w-full border-t border-gray-200 mt-2 pt-2 flex flex-wrap items-center gap-x-6 gap-y-1.5">
      {items.map(({ icon: Icon, label, step }) => (
        <button
          key={step}
          type="button"
          onClick={() => onGoToStep(step)}
          className="inline-flex items-center gap-1.5 text-[14px] text-[#333] hover:text-gray-900 transition-colors group mb-2"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <Icon size={18} className="text-[rgba(255,77,36,1)] shrink-0" />
          <span className="group-hover:underline underline-offset-2 text-[14px]">{label}</span>
        </button>
      ))}
    </div>
  )
}
