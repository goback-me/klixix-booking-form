import { useState } from 'preact/hooks'
import Sidebar from './Sidebar'
import StepContent from './StepContent'

const AU_STATES = ['QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT']

const extraServicesMap = {
  1: 'Tyre rotation & balancing',
  2: 'Engine flush plus',
  3: 'A/C clean & deodoriser',
  4: 'Wiper blade replacement',
  5: 'A/C re-gas & full service',
  6: 'Tyre puncture repair',
  7: 'Brake calipers system',
  8: 'Oil and filter change',
  9: 'Body and Aesthetics',
  10: 'Exhaust system servicing',
}

function formatDropOffTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return ''
  const [year, month, day] = dateStr.split('-')
  const timeParts = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (!timeParts) return ''
  let hours = parseInt(timeParts[1], 10)
  const minutes = timeParts[2]
  const period = timeParts[3].toUpperCase()
  if (period === 'PM' && hours !== 12) hours += 12
  if (period === 'AM' && hours === 12) hours = 0
  return `${day}/${month}/${year} ${String(hours).padStart(2, '0')}:${minutes}`
}

const initialBookingData = {
  workshop: null,
  service: null,
  date: '',
  time: '',
  isFlexible: false,
  carDetails: {
    fullName: '',
    email: '',
    phone: '',
    make: '',
    model: '',
    year: '',
    registration: '',
    state: '',
    additionalInfo: '',
  },
  extras: [],
}

function validateStep(step, bookingData) {
  switch (step) {
    case 0:
      if (!bookingData.workshop) return { message: 'Please select a workshop' }
      return null
    case 1:
      if (!bookingData.service) return { message: 'Please select a service' }
      return null
    case 2:
      if (!bookingData.date) return { message: 'Please select a date' }
      if (!bookingData.time) return { message: 'Please select a time slot' }
      return null
    case 3: {
      const d = bookingData.carDetails
      const email = d.email.trim()
      const phone = d.phone.trim()
      const year = String(d.year || '').trim()
      const missing = []
      if (!d.fullName.trim()) missing.push('fullName')
      if (!email) missing.push('email')
      if (!phone) missing.push('phone')
      if (!d.make.trim()) missing.push('make')
      if (!d.model.trim()) missing.push('model')
      if (!year) missing.push('year')
      if (!d.registration.trim()) missing.push('registration')
      if (missing.length) return { message: 'Please fill in all required fields', fields: missing }

      const invalid = []
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
      if (!emailRegex.test(email)) invalid.push('email')

      const phoneDigits = phone.replace(/\D/g, '')
      if (phoneDigits.length < 8 || phoneDigits.length > 15) invalid.push('phone')

      const yearRegex = /^\d{4}$/
      const yearNumber = Number.parseInt(year, 10)
      const currentYear = new Date().getFullYear()
      if (!yearRegex.test(year) || yearNumber < 1900 || yearNumber > currentYear + 1) invalid.push('year')

      if (invalid.length) {
        return {
          message: 'Please enter a valid email, phone number, and 4-digit vehicle year.',
          fields: invalid,
        }
      }

      return null
    }
    case 4:
      return null // Add-ons are optional
    default:
      return null
  }
}

export default function BookingForm() {
  const [currentStep, setCurrentStep] = useState(0)
  const [bookingData, setBookingData] = useState(initialBookingData)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [validationError, setValidationError] = useState(null)

  const updateBookingData = (key, value) => {
    setBookingData((prev) => ({ ...prev, [key]: value }))
    setValidationError(null)
  }

  const steps = ['Workshop', 'Service', 'Date & time', 'Car details', 'Add-ons', 'Summary']
  const progressSteps = steps.slice(0, 5)
  const sidebarCurrentStep = Math.min(currentStep, progressSteps.length - 1)
  const sidebarAllCompleted = currentStep >= progressSteps.length

  const nextStep = () => {
    const error = validateStep(currentStep, bookingData)
    if (error) {
      setValidationError(error)
      return
    }
    setValidationError(null)
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
  }

  const prevStep = () => {
    setValidationError(null)
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  const resetSteps = () => {
    setCurrentStep(0)
    setBookingData(initialBookingData)
    setSubmitError('')
    setValidationError(null)
  }

  const submitBooking = async () => {
    setSubmitting(true)
    setSubmitError('')

    const { workshop, service, date, time, carDetails, extras } = bookingData

    const jobTypeNames = []
    const selectedAddonNames = []
    if (service?.name) jobTypeNames.push(service.name)
    extras.forEach((id) => {
      if (extraServicesMap[id]) {
        jobTypeNames.push(extraServicesMap[id])
        selectedAddonNames.push(extraServicesMap[id])
      }
    })

    const vehicleSummary = [carDetails.make, carDetails.model, carDetails.year]
      .map((v) => String(v || '').trim())
      .filter(Boolean)
      .join(' ')
    const userComment = carDetails.additionalInfo?.trim() || 'N/A'
    const addonsSummary = selectedAddonNames.length ? selectedAddonNames.join(', ') : 'None'
    const enrichedNote = `Vehicle: ${vehicleSummary || 'N/A'} | User Comments: ${userComment} | Service Add-ons: ${addonsSummary}`

    const payload = {
      workshop: workshop?.workshopId || '',
      name: carDetails.fullName,
      phone: carDetails.phone,
      email: carDetails.email,
      state: carDetails.state,
      registration_number: carDetails.registration,
      make: carDetails.make,
      model: carDetails.model,
      year: carDetails.year,
      drop_off_time: formatDropOffTime(date, time),
      job_type_names: jobTypeNames,
      note: enrichedNote,
      booking_note: enrichedNote,
      alert: enrichedNote,
      service_addons: selectedAddonNames,
      is_flexible: bookingData.isFlexible || false,
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/create-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Booking failed')
      }

      // Fire webhook in background (non-blocking)
      fetch(`${import.meta.env.VITE_API_URL}/api/send-webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {})

      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
    } catch (error) {
      setSubmitError(error.message || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row bg-white w-full h-full min-w-0 overflow-hidden">
      <Sidebar steps={progressSteps} currentStep={sidebarCurrentStep} allCompleted={sidebarAllCompleted} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <StepContent
          step={currentStep}
          onNext={nextStep}
          onPrev={prevStep}
          onReset={resetSteps}
          onSubmit={submitBooking}
          submitting={submitting}
          submitError={submitError}
          validationError={validationError}
          bookingData={bookingData}
          updateBookingData={updateBookingData}
        />
      </div>
    </div>
  )
}
