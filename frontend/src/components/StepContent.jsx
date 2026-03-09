import Step0Workshop from './steps/Step0Workshop'
import Step1Service from './steps/Step1Service'
import Step2DateTime from './steps/Step2DateTime'
import Step3CarDetails from './steps/Step3CarDetails.jsx'
import Step4AddExtra from './steps/Step4AddExtra'
import Step5Summary from './steps/Step5Summary'

const steps = [Step0Workshop, Step1Service, Step2DateTime, Step3CarDetails, Step4AddExtra, Step5Summary]

export default function StepContent({ step, onNext, onPrev, onReset }) {
  const CurrentStep = steps[step]
  const isSummaryStep = step === steps.length - 1
  const isSubmitStep = step === steps.length - 2

  return (
    <>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <CurrentStep />
      </div>
      <div className="border-t border-gray-200 p-4 sm:p-6 md:p-8 flex flex-wrap items-center justify-between gap-3 sm:gap-4 flex-shrink-0 bg-white sticky bottom-0">
        <button
          onClick={onPrev}
          disabled={step === 0}
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
        ) : (
          <button
            onClick={onNext}
            className="px-8 py-2 bg-orange-500 text-white rounded-full hover:bg-orange-600 transition"
          >
            {isSubmitStep ? 'Submit' : 'Next'}
          </button>
        )}
      </div>
    </>
  )
}
