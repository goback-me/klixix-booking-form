export default function Step3CarDetails({ bookingData, updateBookingData, validationError }) {
  const details = bookingData.carDetails

  const auStates = ['QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT']

  const handleChange = (field, value) => {
    updateBookingData('carDetails', { ...details, [field]: value })
  }

  const handleYearChange = (value) => {
    const numericYear = value.replace(/\D/g, '').slice(0, 4)
    handleChange('year', numericYear)
  }

  const errorFields = validationError?.fields || []

  const inputClass = (field) =>
    `w-full p-3 border rounded-xl focus:outline-none focus:border-[rgba(255,77,36,1)] ${
      errorFields.includes(field) ? 'border-red-400' : 'border-gray-300'
    }`

  return (
    <div className="p-4 sm:p-5 md:p-6 flex flex-col min-w-0">
      <div className="flex-1 flex flex-col">
        <h2 className="text-2xl md:text-3xl text-gray-900 mb-1 break-words">Vehicle &amp; contact details</h2>
        <p className="text-gray-600 mb-4 break-words">Tell us about your vehicle and how to reach you.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          <div>
            <label className="block text-sm font-500 text-gray-900 mb-2">
              Full name <span className="text-[rgba(255,77,36,1)]">*</span>
            </label>
            <input
              type="text"
              placeholder="First and last name"
              value={details.fullName}
              onChange={(e) => handleChange('fullName', e.currentTarget.value)}
              className={inputClass('fullName')}
            />
          </div>

          <div>
            <label className="block text-sm font-500 text-gray-900 mb-2">
              Email <span className="text-[rgba(255,77,36,1)]">*</span>
            </label>
            <input
              type="email"
              placeholder="yourname@example.com"
              value={details.email}
              onChange={(e) => handleChange('email', e.currentTarget.value)}
              className={inputClass('email')}
            />
          </div>

          <div>
            <label className="block text-sm font-500 text-gray-900 mb-2">
              Phone number <span className="text-[rgba(255,77,36,1)]">*</span>
            </label>
            <input
              type="tel"
              placeholder="+61"
              value={details.phone}
              onChange={(e) => handleChange('phone', e.currentTarget.value)}
              className={inputClass('phone')}
            />
          </div>

          <div>
            <label className="block text-sm font-500 text-gray-900 mb-2">
              Make <span className="text-[rgba(255,77,36,1)]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Mitsubishi"
              value={details.make}
              onChange={(e) => handleChange('make', e.currentTarget.value)}
              className={inputClass('make')}
            />
          </div>

          <div>
            <label className="block text-sm font-500 text-gray-900 mb-2">
              Model <span className="text-[rgba(255,77,36,1)]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Triton"
              value={details.model}
              onChange={(e) => handleChange('model', e.currentTarget.value)}
              className={inputClass('model')}
            />
          </div>

          <div>
            <label className="block text-sm font-500 text-gray-900 mb-2">
              Year <span className="text-[rgba(255,77,36,1)]">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              placeholder="e.g., 2020"
              value={details.year}
              onChange={(e) => handleYearChange(e.currentTarget.value)}
              className={inputClass('year')}
            />
          </div>

          <div>
            <label className="block text-sm font-500 text-gray-900 mb-2">
              Registration <span className="text-[rgba(255,77,36,1)]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. ABC123"
              value={details.registration}
              onChange={(e) => handleChange('registration', e.currentTarget.value)}
              className={inputClass('registration')}
            />
          </div>

          <div>
            <label className="block text-sm font-500 text-gray-900 mb-2">State</label>
            <select
              value={details.state}
              onChange={(e) => handleChange('state', e.currentTarget.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:border-[rgba(255,77,36,1)] bg-white"
            >
              <option value="">Select state</option>
              {auStates.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-500 text-gray-900 mb-2">Additional information</label>
            <textarea
              rows={3}
              placeholder="e.g. Strange noise when braking, service light is on, car pulls to the left ... "
              value={details.additionalInfo}
              onChange={(e) => handleChange('additionalInfo', e.currentTarget.value)}
              className="w-full p-3 border border-gray-300 rounded-xl resize-none focus:outline-none focus:border-[rgba(255,77,36,1)]"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
