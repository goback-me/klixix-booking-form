import { useState } from 'preact/hooks'

export default function Step3CarDetails() {
  const [mobileStep, setMobileStep] = useState(1)
  const [details, setDetails] = useState({
    fullName: '',
    email: '',
    phone: '',
    make: '',
    model: '',
    year: '',
    registration: '',
    state: '',
    additionalInfo: '',
  })

  const handleChange = (field, value) => {
    setDetails({ ...details, [field]: value })
  }

  const goNextMobileStep = () => {
    setMobileStep((prev) => Math.min(prev + 1, 3))
  }

  const goPrevMobileStep = () => {
    setMobileStep((prev) => Math.max(prev - 1, 1))
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 flex flex-col min-w-0">
      <div className="flex-1 flex flex-col">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 break-words">Vehicle &amp; contact details</h2>
        <p className="text-gray-600 mb-6 break-words">Tell us about your vehicle and how to reach you.</p>

        <div className="md:hidden">
          {mobileStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-500 text-gray-900 mb-2">
                  Full name <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="John Smith"
                  value={details.fullName}
                  onChange={(e) => handleChange('fullName', e.currentTarget.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-500 text-gray-900 mb-2">
                  Email <span className="text-orange-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="john@example.com"
                  value={details.email}
                  onChange={(e) => handleChange('email', e.currentTarget.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-500 text-gray-900 mb-2">
                  Phone number <span className="text-orange-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="0423 345 678"
                  value={details.phone}
                  onChange={(e) => handleChange('phone', e.currentTarget.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          )}

          {mobileStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-500 text-gray-900 mb-2">
                  Make <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Toyota"
                  value={details.make}
                  onChange={(e) => handleChange('make', e.currentTarget.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-500 text-gray-900 mb-2">
                  Model <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Camry"
                  value={details.model}
                  onChange={(e) => handleChange('model', e.currentTarget.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-500 text-gray-900 mb-2">
                  Year <span className="text-orange-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="e.g., 2020"
                  value={details.year}
                  onChange={(e) => handleChange('year', e.currentTarget.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-500 text-gray-900 mb-2">
                  Registration <span className="text-orange-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="E.G., ABC123"
                  value={details.registration}
                  onChange={(e) => handleChange('registration', e.currentTarget.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          )}

          {mobileStep === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-500 text-gray-900 mb-2">State</label>
                <input
                  type="text"
                  value={details.state}
                  onChange={(e) => handleChange('state', e.currentTarget.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-500 text-gray-900 mb-2">Additional information</label>
                <textarea
                  rows={4}
                  placeholder="Any specific concerns or requests..."
                  value={details.additionalInfo}
                  onChange={(e) => handleChange('additionalInfo', e.currentTarget.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={goPrevMobileStep}
              disabled={mobileStep === 1}
              className="px-5 py-2 border border-gray-300 text-gray-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>
            <span className="text-sm text-gray-500">Step {mobileStep} of 3</span>
            <button
              type="button"
              onClick={goNextMobileStep}
              disabled={mobileStep === 3}
              className="px-5 py-2 bg-orange-500 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>

        <div className="hidden md:grid md:grid-cols-2 gap-4 md:gap-5">
          <div>
            <label className="block text-sm font-500 text-gray-900 mb-2">
              Full name <span className="text-orange-500">*</span>
            </label>
            <input
              type="text"
              placeholder="John Smith"
              value={details.fullName}
              onChange={(e) => handleChange('fullName', e.currentTarget.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-500 text-gray-900 mb-2">
              Email <span className="text-orange-500">*</span>
            </label>
            <input
              type="email"
              placeholder="john@example.com"
              value={details.email}
              onChange={(e) => handleChange('email', e.currentTarget.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-500 text-gray-900 mb-2">
              Phone number <span className="text-orange-500">*</span>
            </label>
            <input
              type="tel"
              placeholder="0423 345 678"
              value={details.phone}
              onChange={(e) => handleChange('phone', e.currentTarget.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-500 text-gray-900 mb-2">
              Make <span className="text-orange-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Toyota"
              value={details.make}
              onChange={(e) => handleChange('make', e.currentTarget.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-500 text-gray-900 mb-2">
              Model <span className="text-orange-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Camry"
              value={details.model}
              onChange={(e) => handleChange('model', e.currentTarget.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-500 text-gray-900 mb-2">
              Year <span className="text-orange-500">*</span>
            </label>
            <input
              type="number"
              placeholder="e.g., 2020"
              value={details.year}
              onChange={(e) => handleChange('year', e.currentTarget.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-500 text-gray-900 mb-2">
              Registration <span className="text-orange-500">*</span>
            </label>
            <input
              type="text"
              placeholder="E.G., ABC123"
              value={details.registration}
              onChange={(e) => handleChange('registration', e.currentTarget.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-sm font-500 text-gray-900 mb-2">State</label>
            <input
              type="text"
              value={details.state}
              onChange={(e) => handleChange('state', e.currentTarget.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-500 text-gray-900 mb-2">Additional information</label>
            <textarea
              rows={4}
              placeholder="Any specific concerns or requests..."
              value={details.additionalInfo}
              onChange={(e) => handleChange('additionalInfo', e.currentTarget.value)}
              className="w-full p-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
