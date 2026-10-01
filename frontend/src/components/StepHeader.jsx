import { ArrowLeft } from 'lucide-react'
import BreadcrumbBar from './BreadcrumbBar'

/**
 * Shared header for every step after the first: a compact inline Back button
 * next to the heading (so it no longer takes its own row and pushes content
 * down), an optional subtitle, an optional right-hand slot (e.g. the date
 * step's "I'm flexible" toggle), and the compact chip breadcrumb of what the
 * customer has already selected.
 *
 * @param {{
 *   title: string,
 *   subtitle?: string,
 *   onBack?: () => void,
 *   bookingData?: any,
 *   onGoToStep?: (step: number) => void,
 *   rightSlot?: any,
 * }} props
 */
export default function StepHeader({ title, subtitle, onBack, bookingData, onGoToStep, rightSlot }) {
  return (
    <div className="mb-2 sm:mb-3">
      <div className="flex items-start gap-2.5 sm:gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="mt-0.5 flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border-2 sm:border-[3px] border-black bg-white text-black transition active:scale-95"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2.1} aria-hidden="true" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-[26px] sm:text-[30px] md:text-3xl leading-[1.1] tracking-[-0.015em] text-[#111] mb-0.5 break-words">
              {title}
            </h2>
            {rightSlot}
          </div>
          {subtitle && (
            <p className="text-[13px] sm:text-sm font-display text-[#333] mb-0 break-words">{subtitle}</p>
          )}
        </div>
      </div>
      {onGoToStep && <BreadcrumbBar bookingData={bookingData} onGoToStep={onGoToStep} />}
    </div>
  )
}
