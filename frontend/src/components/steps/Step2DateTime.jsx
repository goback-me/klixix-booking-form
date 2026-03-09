import { useEffect, useMemo, useState } from 'preact/hooks'

const AU_TIMEZONE = 'Australia/Brisbane'
const weekdays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const morningSlots = [
  { label: '8:00 AM', available: true },
  { label: '8:30 AM', available: true },
  { label: '9:00 AM', available: false },
  { label: '9:30 AM', available: false },
  { label: '10:00 AM', available: false, disabled: true },
  { label: '10:30 AM', available: false, disabled: true },
  { label: '11:00 AM', available: true },
  { label: '11:30 AM', available: true },
  { label: '12:00 PM', available: true },
]

const afternoonSlots = [
  { label: '1:00 PM', available: false, disabled: true },
  { label: '1:30 PM', available: false, disabled: true },
  { label: '2:00 PM', available: true },
  { label: '2:30 PM', available: true },
  { label: '3:00 PM', available: true },
  { label: '3:30 PM', available: true },
  { label: '4:00 PM', available: false, disabled: true },
  { label: '4:30 PM', available: true },
  { label: '5:00 PM', available: true },
]

function pad(value) {
  return String(value).padStart(2, '0')
}

function formatYmd(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`
}

function getAustralianDateParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: AU_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  const valueMap = Object.fromEntries(parts.map((part) => [part.type, part.value]))

  return {
    year: Number.parseInt(valueMap.year, 10),
    month: Number.parseInt(valueMap.month, 10),
    day: Number.parseInt(valueMap.day, 10),
    hour: Number.parseInt(valueMap.hour, 10),
  }
}

function buildCalendarCells(year, month) {
  const firstWeekdaySundayBased = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const leadingDays = (firstWeekdaySundayBased + 6) % 7
  const totalDaysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const totalDaysInPrevMonth = new Date(Date.UTC(year, month - 1, 0)).getUTCDate()

  const cells = []

  for (let i = leadingDays - 1; i >= 0; i -= 1) {
    cells.push({
      day: totalDaysInPrevMonth - i,
      inCurrentMonth: false,
    })
  }

  for (let day = 1; day <= totalDaysInMonth; day += 1) {
    cells.push({
      day,
      inCurrentMonth: true,
    })
  }

  const trailingDays = (7 - (cells.length % 7)) % 7
  for (let day = 1; day <= trailingDays; day += 1) {
    cells.push({
      day,
      inCurrentMonth: false,
    })
  }

  return cells
}

function SlotButton({ slot, selected, onClick }) {
  const baseClass = 'relative rounded-xl border px-4 py-3 text-sm font-medium text-left transition'
  const disabledClass = slot.disabled ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-800 border-gray-200 hover:border-gray-300'
  const selectedClass = selected ? 'ring-2 ring-orange-400 border-orange-500' : ''

  return (
    <button
      type="button"
      onClick={() => !slot.disabled && onClick(slot.label)}
      disabled={slot.disabled}
      className={`${baseClass} ${disabledClass} ${selectedClass}`}
    >
      {slot.available && !slot.disabled && (
        <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-green-500" />
      )}
      {slot.label}
    </button>
  )
}

export default function Step2DateTime() {
  const nowInAu = useMemo(() => getAustralianDateParts(), [])
  const todayYmd = formatYmd(nowInAu.year, nowInAu.month, nowInAu.day)

  const [viewedMonth, setViewedMonth] = useState(nowInAu.month)
  const [viewedYear, setViewedYear] = useState(nowInAu.year)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [isFlexible, setIsFlexible] = useState(false)
  const [blockedDates, setBlockedDates] = useState(new Set([todayYmd]))
  const [loadingBlockedDays, setLoadingBlockedDays] = useState(true)

  const workshopId = useMemo(() => {
    if (typeof window === 'undefined') return 'woolloongabba'
    return window.localStorage.getItem('selectedWorkshop') || 'woolloongabba'
  }, [])

  useEffect(() => {
    let isMounted = true

    async function fetchUnavailableDays() {
      setLoadingBlockedDays(true)
      try {
        const response = await fetch(`/api/unavailable-days?workshop=${encodeURIComponent(workshopId)}&in_days=180`)
        if (!response.ok) {
          let errorDetail = `API request failed: ${response.status}`
          try {
            const errorPayload = await response.json()
            if (errorPayload?.error) {
              errorDetail = `${errorDetail} - ${errorPayload.error}`
            }
            if (errorPayload?.detail) {
              errorDetail = `${errorDetail} (${errorPayload.detail})`
            }
          } catch {
            // Ignore parse errors and keep generic message.
          }
          throw new Error(errorDetail)
        }

        const payload = await response.json()
        const unavailableDays = Array.isArray(payload.unavailable_days) ? payload.unavailable_days : []

        // Business rule: today is always blocked.
        // This also satisfies the explicit "after 5 PM" rule.
        const merged = new Set([...unavailableDays, todayYmd])

        if (isMounted) {
          setBlockedDates(merged)
        }
      } catch (error) {
        if (isMounted) {
          setBlockedDates(new Set([todayYmd]))
        }
        console.error('Failed to fetch blocked days', error)
      } finally {
        if (isMounted) {
          setLoadingBlockedDays(false)
        }
      }
    }

    fetchUnavailableDays()

    return () => {
      isMounted = false
    }
  }, [workshopId, todayYmd])

  const yearOptions = useMemo(
    () => [nowInAu.year, nowInAu.year + 1],
    [nowInAu.year]
  )

  const calendarCells = useMemo(
    () => buildCalendarCells(viewedYear, viewedMonth),
    [viewedYear, viewedMonth]
  )

  return (
    <div className="p-4 sm:p-6 md:p-8 flex flex-col min-w-0">
      <div className="flex-1 flex flex-col">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-2">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 break-words">Drop off date &amp; time</h2>
          <button
            type="button"
            onClick={() => setIsFlexible((prev) => !prev)}
            className="flex items-center gap-3 border border-gray-200 rounded-xl px-3 py-2 bg-white"
          >
            <span className={`w-11 h-6 rounded-full relative transition ${isFlexible ? 'bg-orange-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${isFlexible ? 'left-5' : 'left-0.5'}`} />
            </span>
            <span className="text-sm text-gray-800">I'm flexible</span>
          </button>
        </div>
        <p className="text-gray-600 mb-6">Select your preferred appointment slot.</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-gray-50 rounded-2xl p-4 md:p-5 border border-gray-100">
            <div className="flex flex-wrap gap-3 mb-4">
              <select
                value={String(viewedMonth)}
                onChange={(e) => setViewedMonth(Number.parseInt(e.currentTarget.value, 10))}
                className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-lg font-medium text-gray-800"
              >
                {monthNames.map((monthName, index) => (
                  <option key={monthName} value={String(index + 1)}>
                    {monthName}
                  </option>
                ))}
              </select>
              <select
                value={String(viewedYear)}
                onChange={(e) => setViewedYear(Number.parseInt(e.currentTarget.value, 10))}
                className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-lg font-medium text-gray-800"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={String(year)}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-3">
              {weekdays.map((day) => (
                <div key={day} className="text-center text-gray-400 text-lg py-1">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarCells.map((cell, index) => {
                const dateYmd = formatYmd(viewedYear, viewedMonth, cell.day)
                const isSelected = cell.inCurrentMonth && selectedDate === dateYmd
                const isBlockedByApi = blockedDates.has(dateYmd)
                const isPastOrToday = dateYmd <= todayYmd
                const isDisabled = !cell.inCurrentMonth || isBlockedByApi || isPastOrToday || loadingBlockedDays

                return (
                  <button
                    key={`${viewedYear}-${viewedMonth}-${cell.day}-${index}`}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => !isDisabled && setSelectedDate(dateYmd)}
                    className={`h-9 rounded-xl text-base transition ${isSelected
                      ? 'bg-orange-500 text-white font-semibold'
                      : isDisabled
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-800 hover:bg-gray-100'
                    }`}
                    title={isDisabled ? 'Unavailable date' : 'Available date'}
                  >
                    {cell.day}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Morning available times</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {morningSlots.map((slot) => (
                  <SlotButton
                    key={slot.label}
                    slot={slot}
                    selected={selectedTime === slot.label}
                    onClick={setSelectedTime}
                  />
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Afternoon available times</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {afternoonSlots.map((slot) => (
                  <SlotButton
                    key={slot.label}
                    slot={slot}
                    selected={selectedTime === slot.label}
                    onClick={setSelectedTime}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
