import Step0Workshop from './steps/Step0Workshop'
import Step1Service from './steps/Step1Service'
import Step2DateTime from './steps/Step2DateTime'
import Step3CarDetails from './steps/Step3CarDetails.jsx'
import Step4AddExtra from './steps/Step4AddExtra'
import Step5Summary from './steps/Step5Summary'

const steps = [Step0Workshop, Step1Service, Step2DateTime, Step3CarDetails, Step4AddExtra, Step5Summary]

export default function StepContent({ step, onNext, onPrev, onReset, onSubmit, submitting, submitError, validationError, bookingData, updateBookingData }) {
  const CurrentStep = steps[step]
  const isSummaryStep = step === steps.length - 1
  const isSubmitStep = step === steps.length - 2

  return (
    <>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <CurrentStep bookingData={bookingData} updateBookingData={updateBookingData} validationError={validationError} />
      </div>
      <div className="border-t border-gray-200 p-4 sm:p-6 md:p-8 flex flex-wrap items-center justify-between gap-3 sm:gap-4 flex-shrink-0 bg-white sticky bottom-0">
        {submitError && (
          <p className="w-full text-sm text-red-500 mb-1">{submitError}</p>
        )}
        {validationError && (
          <p className="w-full text-sm text-red-500 mb-1">{validationError.message}</p>
        )}
        <button
          onClick={onPrev}
          disabled={step === 0 || submitting}
          className="px-5 sm:px-6 py-2 border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Back
        </button>

        {isSummaryStep ? (
          <div className="w-full sm:w-auto flex flex-wrap sm:flex-nowrap items-center justify-end gap-2 sm:gap-3">
            <button
              onClick={onReset}
              className="px-4 sm:px-6 py-2 bg-gray-900 text-white rounded-full hover:bg-black transition"
            >
              Make another booking
            </button>
            <button
              onClick={onReset}
              className="px-4 sm:px-6 py-2 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition"
            >
              Back to home
            </button>
          </div>
        ) : isSubmitStep ? (
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="px-8 py-2 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Submitting...
              </>
            ) : 'Submit'}
          </button>
        ) : (
          <button
            onClick={onNext}
            className="px-8 py-2 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition"
          >
            Next
          </button>
        )}
      </div>
    </>
  )
}
