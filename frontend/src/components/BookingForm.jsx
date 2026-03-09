import { useState } from 'preact/hooks'
import Sidebar from './Sidebar'
import StepContent from './StepContent'

export default function BookingForm() {
  const [currentStep, setCurrentStep] = useState(0)

  const steps = ['Workshop', 'Service', 'Date & time', 'Car details', 'Add-ons', 'Summary']
  const progressSteps = steps.slice(0, 5)
  const sidebarCurrentStep = Math.min(currentStep, progressSteps.length - 1)
  const sidebarAllCompleted = currentStep >= progressSteps.length

  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
  }

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  const resetSteps = () => {
    setCurrentStep(0)
  }

  return (
    <div className="flex flex-col md:flex-row bg-white w-full h-full min-w-0 overflow-hidden">
      <Sidebar steps={progressSteps} currentStep={sidebarCurrentStep} allCompleted={sidebarAllCompleted} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <StepContent step={currentStep} onNext={nextStep} onPrev={prevStep} onReset={resetSteps} />
      </div>
    </div>
  )
}
