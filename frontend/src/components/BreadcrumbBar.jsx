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
  return parts.join(' · ')
}

/**
 * A single compact, horizontally-scrollable row of chips summarising what the
 * customer has already chosen (workshop / service / date). Each chip is
 * tappable to jump back to that step. Keeps the selected context visible while
 * taking only one line of height, so the actual step content sits higher up.
 *
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
    <div className="mt-2 pt-2 border-t border-gray-200">
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar -mx-0.5 px-0.5">
        {items.map(({ icon: Icon, label, step }) => (
          <button
            key={step}
            type="button"
            onClick={() => onGoToStep(step)}
            title={`Edit: ${label}`}
            className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[12.5px] text-[#333] transition-colors hover:border-[rgba(255,77,36,0.5)] hover:bg-[#FFF4EB] hover:text-[#111]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            <Icon size={13} className="text-[rgba(255,77,36,1)] shrink-0" />
            <span className="whitespace-nowrap max-w-[42vw] sm:max-w-none truncate">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
