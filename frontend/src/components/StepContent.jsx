import { motion, AnimatePresence } from 'motion/react'
import { ArrowLeft } from 'lucide-react'
import Step0Workshop from './steps/Step0Workshop'
import Step1Service from './steps/Step1Service'
import Step2DateTime from './steps/Step2DateTime'
import Step3CarDetails from './steps/Step3CarDetails.jsx'
import Step4AddExtra from './steps/Step4AddExtra'
import Step5Summary from './steps/Step5Summary'

const steps = [Step0Workshop, Step1Service, Step2DateTime, Step3CarDetails, Step4AddExtra, Step5Summary]

/**
 * @typedef {{ message: string, fields?: string[] }} ValidationError
 * @typedef {{
 *   step: number,
 *   onNext: () => void,
 *   onPrev: () => void,
 *   onAutoAdvance: (key: string, value: unknown) => void,
 *   onReset: () => void,
 *   onSubmit: () => void,
 *   submitting: boolean,
 *   submitError: string,
 *   validationError: ValidationError | null,
 *   bookingData: unknown,
 *   updateBookingData: (key: string, value: unknown) => void,
 * }} StepContentProps
 */

/** @param {StepContentProps} props */
export default function StepContent({ step, onNext, onPrev, onAutoAdvance, onReset, onSubmit, submitting, submitError, validationError, bookingData, updateBookingData }) {
  const CurrentStep = /** @type {any} */ (steps[step])
  const isSummaryStep = step === steps.length - 1
  const isSubmitStep = step === steps.length - 2
  const isAutoAdvanceStep = step === 0 || step === 1
  const isDateTimeStep = step === 2
  const isAddonsStep = step === 4
  const contentScrollClass = isSummaryStep
    ? 'no-scrollbar flex-1 min-h-0 overflow-hidden'
    : 'no-scrollbar flex-1 min-h-0 overflow-y-auto overflow-x-hidden'
  const shouldShowFooter = !isAutoAdvanceStep || Boolean(submitError) || Boolean(validationError)
  const footerPaddingClass = (isDateTimeStep || isAddonsStep) ? 'p-2 sm:p-4 md:p-5' : 'p-3 sm:p-4 md:p-5'
  const footerClass = isSummaryStep
    ? `mobile-safe-footer border-t border-gray-200 ${footerPaddingClass} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 flex-shrink-0 bg-white sticky bottom-0`
    : `mobile-safe-footer border-t border-gray-200 ${footerPaddingClass} flex flex-wrap items-center justify-between gap-3 sm:gap-4 flex-shrink-0 bg-white sticky bottom-0`

  return (
    <>
      <div className={contentScrollClass}>
        {step !== 0 && !isSummaryStep && (
          <div className="sm:hidden px-3 pt-2 pb-1">
            <button
              onClick={onPrev}
              disabled={submitting}
              className="inline-flex items-center gap-3 text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-black bg-white">
                <ArrowLeft className="h-5 w-5 text-black" strokeWidth={2.1} aria-hidden="true" />
              </span>
              <span className="text-[1.5rem] leading-none font-light text-black">Back</span>
            </button>
          </div>
        )}
        {step === 2 ? (
          <div className="h-full">
            <CurrentStep
              bookingData={bookingData}
              updateBookingData={updateBookingData}
              validationError={validationError}
              onAutoAdvance={onAutoAdvance}
              onPrev={onPrev}
            />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="h-full"
              style={{ willChange: 'transform, opacity' }}
            >
              <CurrentStep
                bookingData={bookingData}
                updateBookingData={updateBookingData}
                validationError={validationError}
                onAutoAdvance={onAutoAdvance}
                onPrev={onPrev}
              />
            </motion.div>
          </AnimatePresence>
        )}
      </div>
      {shouldShowFooter && <div className={footerClass}>
        {submitError && (
          <p className="w-full text-sm text-red-500 mb-1">{submitError}</p>
        )}
        {validationError && (
          <p className="w-full text-sm text-red-500 mb-1">{validationError.message}</p>
        )}
        {step !== 0 && step !== 1 && !isSummaryStep && (
          <button
            onClick={onPrev}
            disabled={submitting}
            className={`${isSummaryStep ? 'w-full sm:w-auto' : 'hidden sm:inline-flex sm:w-auto'} px-5 sm:px-6 py-2 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 hover:shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200`}
          >
            Back
          </button>
        )}
        {isSummaryStep ? (
          <div className="w-full grid grid-cols-2 sm:flex sm:flex-nowrap items-stretch sm:items-center sm:justify-between gap-2 sm:gap-3">
            <button
              onClick={onReset}
              className="w-full sm:w-auto sm:min-w-[220px] px-3 sm:px-6 py-2 bg-gray-900 text-white rounded-full hover:bg-black hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 text-center whitespace-nowrap"
            >
              Make another booking
            </button>
            <button
              onClick={onReset}
              className="w-full sm:w-auto sm:min-w-[220px] px-3 sm:px-6 py-2 bg-[rgba(255,77,36,1)] text-white rounded-full hover:bg-[rgba(255,77,36,0.92)] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 text-center whitespace-nowrap"
            >
              Back to home
            </button>
          </div>
        ) : isSubmitStep ? (
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="w-full sm:w-auto px-8 py-2 bg-[rgba(255,77,36,1)] text-white rounded-full hover:bg-[rgba(255,77,36,0.92)] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Submitting...
              </>
            ) : 'Submit'}
          </button>
        ) : (
          !isAutoAdvanceStep && (
            <button
              onClick={onNext}
              className="w-full sm:w-auto px-8 py-2 bg-[rgba(255,77,36,1)] text-white rounded-full hover:bg-[rgba(255,77,36,0.92)] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200"
            >
              Next
            </button>
          )
        )}
      </div>}
    </>
  )
}
