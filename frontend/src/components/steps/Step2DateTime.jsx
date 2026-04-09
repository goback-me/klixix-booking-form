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

/**
 * @typedef {{
 *   label: string,
 *   available: boolean,
 *   disabled?: boolean,
 * }} TimeSlot
 */

/** @type {TimeSlot[]} */
const morningSlots = [
  { label: '8:00 AM', available: true },
  { label: '8:30 AM', available: true },
  { label: '9:00 AM', available: true },
  { label: '9:30 AM', available: true },
  { label: '10:00 AM', available: true },
  { label: '10:30 AM',  available: true },
  { label: '11:00 AM', available: true },
  { label: '11:30 AM', available: true },
  { label: '12:00 PM', available: true },
]

/** @type {TimeSlot[]} */
const afternoonSlots = [
  { label: '1:00 PM', available: true },
  { label: '1:30 PM',  available: true},
  { label: '2:00 PM', available: true },
  { label: '2:30 PM', available: true },
  { label: '3:00 PM', available: true },
  { label: '3:30 PM', available: true },
  { label: '4:00 PM', available: true},
  { label: '4:30 PM', available: true },
  { label: '5:00 PM', available: true },
]

/** @param {number | string} value */
function pad(value) {
  return String(value).padStart(2, '0')
}

/**
 * @param {number} year
 * @param {number} month
 * @param {number} day
 */
function formatYmd(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`
}

/** @param {string} value */
function parseYmd(value) {
  if (typeof value !== 'string') return null
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null

  return {
    year: Number.parseInt(match[1], 10),
    month: Number.parseInt(match[2], 10),
    day: Number.parseInt(match[3], 10),
  }
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

/**
 * @param {number} year
 * @param {number} month
 */
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

/**
 * @param {Date} date
 * @param {number} amount
 */
function addDays(date, amount) {
  const result = new Date(date.getTime())
  result.setUTCDate(result.getUTCDate() + amount)
  return result
}

/** @param {Date} date */
function isWeekendUtcDate(date) {
  const day = date.getUTCDay()
  return day === 0 || day === 6
}

/** @param {Date} date */
function moveToNextBusinessDay(date) {
  let candidate = new Date(date.getTime())
  while (isWeekendUtcDate(candidate)) {
    candidate = addDays(candidate, 1)
  }
  return candidate
}

/** @param {Date} date */
function dateToYmd(date) {
  return formatYmd(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

/** @param {Date} date */
function getWeekdayLabel(date) {
  const weekday = date.getUTCDay()
  return weekdays[weekday === 0 ? 6 : weekday - 1]
}

/**
 * @param {{ slot: TimeSlot, selected: boolean, onClick: (label: string) => void }} props
 */
function SlotButton({ slot, selected, onClick }) {
  const baseClass = 'group relative rounded-xl border px-2 py-1.5 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium text-left transition'
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
        <span className="absolute right-2 top-2 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-0 group-hover:opacity-75 group-hover:animate-ping" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
        </span>
      )}
      {slot.label}
    </button>
  )
}

/**
 * @param {{ bookingData: any, updateBookingData: (key: string, value: any) => void }} props
 */
export default function Step2DateTime({ bookingData, updateBookingData }) {
  const nowInAu = useMemo(() => getAustralianDateParts(), [])
  const todayYmd = formatYmd(nowInAu.year, nowInAu.month, nowInAu.day)
  const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

  const [viewedMonth, setViewedMonth] = useState(nowInAu.month)
  const [viewedYear, setViewedYear] = useState(nowInAu.year)
  const selectedDate = bookingData.date || ''
  const selectedTime = bookingData.time || ''
  const isFlexible = bookingData.isFlexible || false
  /** @param {string} val */
  const setSelectedDate = (val) => updateBookingData('date', val)
  /** @param {string} val */
  const setSelectedTime = (val) => updateBookingData('time', val)
  /** @param {boolean | ((prev: boolean) => boolean)} val */
  const setIsFlexible = (val) => {
    const newVal = typeof val === 'function' ? val(isFlexible) : val
    updateBookingData('isFlexible', newVal)
    if (newVal) {
      const allSlots = [...morningSlots, ...afternoonSlots]
      const nearest = allSlots.find((s) => s.available && !s.disabled)
      if (nearest) updateBookingData('time', nearest.label)
    }
  }
  const [blockedDates, setBlockedDates] = useState(new Set([todayYmd]))
  const [loadingBlockedDays, setLoadingBlockedDays] = useState(true)
  const [visibleStartIndex, setVisibleStartIndex] = useState(0)
  const [showCalendarPopup, setShowCalendarPopup] = useState(false)

  const earliestSelectableDate = useMemo(() => {
    const offset = nowInAu.hour >= 17 ? 2 : 1
    const baseDate = addDays(new Date(Date.UTC(nowInAu.year, nowInAu.month - 1, nowInAu.day)), offset)
    return moveToNextBusinessDay(baseDate)
  }, [nowInAu.hour, nowInAu.year, nowInAu.month, nowInAu.day])

  const latestSelectableDate = useMemo(
    () => addDays(earliestSelectableDate, 179),
    [earliestSelectableDate]
  )

  const dateOptions = useMemo(() => {
    const options = []
    const maxDays = 180
    for (let i = 0; i < maxDays; i += 1) {
      const date = addDays(earliestSelectableDate, i)
      const ymd = dateToYmd(date)
      options.push({
        date,
        ymd,
        weekdayLabel: getWeekdayLabel(date),
        day: date.getUTCDate(),
        month: date.getUTCMonth() + 1,
        year: date.getUTCFullYear(),
        disabled: blockedDates.has(ymd) || isWeekendUtcDate(date),
      })
    }
    return options
  }, [earliestSelectableDate, blockedDates])

  const visibleCount = 5
  const visibleDates = useMemo(
    () => dateOptions.slice(visibleStartIndex, visibleStartIndex + visibleCount),
    [dateOptions, visibleStartIndex, visibleCount]
  )

  useEffect(() => {
    if (!selectedTime) {
      setSelectedTime('8:00 AM')
    }
  }, [selectedTime])

  const workshopId = useMemo(() => {
    if (bookingData?.workshop?.workshopId) {
      return bookingData.workshop.workshopId
    }

    if (typeof window === 'undefined') return 'woolloongabba'
    return window.localStorage.getItem('selectedWorkshop') || 'woolloongabba'
  }, [bookingData?.workshop?.workshopId])

  useEffect(() => {
    let isMounted = true

    async function fetchUnavailableDays() {
      setLoadingBlockedDays(true)
      try {
        const params = new URLSearchParams({
          workshop: workshopId,
          in_days: '180',
        })
        const response = await fetch(`${apiBaseUrl}/api/unavailable-days?${params.toString()}`)
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
  }, [apiBaseUrl, workshopId, todayYmd])

  useEffect(() => {
    if (loadingBlockedDays) return

    const validDate = dateOptions.find((option) => option.ymd === selectedDate && !option.disabled)
    const firstAvailableOption = dateOptions.find((option) => !option.disabled)

    const targetDate = validDate ? selectedDate : firstAvailableOption?.ymd || selectedDate
    const targetParts = parseYmd(targetDate)

    if (targetParts) {
      setViewedMonth(targetParts.month)
      setViewedYear(targetParts.year)
    }

    if (selectedDate !== targetDate && targetDate) {
      setSelectedDate(targetDate)
    }
  }, [blockedDates, dateOptions, loadingBlockedDays, selectedDate])

  const yearOptions = useMemo(() => {
    const startYear = earliestSelectableDate.getUTCFullYear()
    const endYear = latestSelectableDate.getUTCFullYear()
    const years = []

    for (let year = startYear; year <= endYear; year += 1) {
      years.push(year)
    }

    return years
  }, [earliestSelectableDate, latestSelectableDate])

  const monthOptions = useMemo(() => {
    const minMonth = viewedYear === earliestSelectableDate.getUTCFullYear()
      ? earliestSelectableDate.getUTCMonth() + 1
      : 1
    const maxMonth = viewedYear === latestSelectableDate.getUTCFullYear()
      ? latestSelectableDate.getUTCMonth() + 1
      : 12

    const months = []
    for (let month = minMonth; month <= maxMonth; month += 1) {
      months.push(month)
    }

    return months
  }, [viewedYear, earliestSelectableDate, latestSelectableDate])

  useEffect(() => {
    if (monthOptions.length === 0) return

    const minMonth = monthOptions[0]
    const maxMonth = monthOptions[monthOptions.length - 1]

    if (viewedMonth < minMonth) {
      setViewedMonth(minMonth)
      return
    }

    if (viewedMonth > maxMonth) {
      setViewedMonth(maxMonth)
    }
  }, [viewedMonth, monthOptions])

  const calendarCells = useMemo(
    () => buildCalendarCells(viewedYear, viewedMonth),
    [viewedYear, viewedMonth]
  )

  const maxStartIndex = Math.max(0, dateOptions.length - visibleCount)
  const canMovePrev = visibleStartIndex > 0
  const canMoveNext = visibleStartIndex < maxStartIndex

  const moveNextDateWindow = () => {
    setVisibleStartIndex((prev) => {
      if (prev >= maxStartIndex) return prev

      const nextStart = Math.min(maxStartIndex, prev + 1)
      const nextWindow = dateOptions.slice(nextStart, nextStart + visibleCount)
      if (nextWindow.length === 0) return nextStart

      const first = nextWindow[0]
      const monthBoundaryOffset = nextWindow.findIndex(
        (option) => option.month !== first.month || option.year !== first.year
      )

      if (monthBoundaryOffset > 0) {
        return Math.min(maxStartIndex, nextStart + monthBoundaryOffset)
      }

      return nextStart
    })
  }

  useEffect(() => {
    if (!selectedDate) return

    const selectedIndex = dateOptions.findIndex((option) => option.ymd === selectedDate)
    if (selectedIndex < 0) return

    const isVisible =
      selectedIndex >= visibleStartIndex &&
      selectedIndex < visibleStartIndex + visibleCount

    if (!isVisible) {
      const targetStartIndex = Math.min(
        Math.max(0, selectedIndex - Math.floor(visibleCount / 2)),
        maxStartIndex
      )
      setVisibleStartIndex(targetStartIndex)
    }
  }, [selectedDate, dateOptions, visibleCount, maxStartIndex])

  return (
    <div className="p-2.5 sm:p-5 md:p-6 flex flex-col min-w-0">
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h2 className="text-lg sm:text-2xl md:text-3xl font-normal text-gray-900 break-words">Drop off date &amp; time</h2>
          <button
            type="button"
            onClick={() => setIsFlexible((prev) => !prev)}
            className="flex items-center gap-2 border border-gray-200 rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 bg-white shrink-0"
          >
            <span className={`w-9 sm:w-11 h-5 sm:h-6 rounded-full relative transition ${isFlexible ? 'bg-orange-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 h-4 sm:h-5 w-4 sm:w-5 rounded-full bg-white transition ${isFlexible ? 'left-4 sm:left-5' : 'left-0.5'}`} />
            </span>
            <span className="text-xs sm:text-sm text-gray-800">I'm flexible</span>
          </button>
        </div>
        <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-6">Select your preferred appointment slot.</p>

        {/* Mobile: Compact 5-date picker */}
        <div className="lg:hidden bg-gray-50 rounded-2xl p-2.5 sm:p-4 md:p-5 border border-gray-100 relative">
          <div className="flex items-center justify-between gap-2 mb-2">
              <button
                type="button"
                onClick={() => setShowCalendarPopup((prev) => !prev)}
                className="flex-1 min-w-0 bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-left text-sm font-semibold text-gray-900"
              >
                <span className="inline-flex items-center gap-2">
                  <span>{monthNames[viewedMonth - 1]} {viewedYear}</span>
                  <span className="text-gray-400">▾</span>
                </span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVisibleStartIndex((prev) => Math.max(0, prev - 1))}
                  disabled={!canMovePrev}
                  className={`w-8 h-8 rounded-xl border ${canMovePrev ? 'border-gray-200 text-gray-700 hover:border-gray-300' : 'border-gray-200 text-gray-300 cursor-not-allowed'} bg-white`}
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={moveNextDateWindow}
                  disabled={!canMoveNext}
                  className={`w-8 h-8 rounded-xl border ${canMoveNext ? 'border-gray-200 text-gray-700 hover:border-gray-300' : 'border-gray-200 text-gray-300 cursor-not-allowed'} bg-white`}
                >
                  ›
                </button>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-1 mb-1">
              {visibleDates.map((option) => {
                const isSelected = selectedDate === option.ymd
                return (
                  <button
                    key={option.ymd}
                    type="button"
                    disabled={option.disabled || loadingBlockedDays}
                    onClick={() => !option.disabled && !loadingBlockedDays && setSelectedDate(option.ymd)}
                    className={`rounded-xl border px-1.5 py-1.5 text-center transition ${isSelected ? 'border-orange-500 bg-orange-50' : option.disabled ? 'border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                  >
                    <div className="text-[9px] uppercase tracking-[0.2em] text-gray-400">{option.weekdayLabel}</div>
                    <div className="mt-0.5 text-sm font-semibold text-gray-900">{option.day}</div>
                  </button>
                )
              })}
            </div>

            {showCalendarPopup && (
              <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
                <button
                  type="button"
                  onClick={() => setShowCalendarPopup(false)}
                  className="absolute inset-0 bg-white/35 backdrop-blur-md"
                  aria-label="Close calendar"
                />
                <div className="relative w-full max-w-[22rem] rounded-3xl bg-white border border-gray-200 p-4 shadow-2xl">
                  <div className="flex items-center gap-2 mb-3">
                    <select
                      value={String(viewedMonth)}
                      onChange={(e) => setViewedMonth(Number.parseInt(e.currentTarget.value, 10))}
                      className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800"
                    >
                      {monthOptions.map((month) => (
                        <option key={month} value={String(month)}>
                          {monthNames[month - 1]}
                        </option>
                      ))}
                    </select>
                    <select
                      value={String(viewedYear)}
                      onChange={(e) => setViewedYear(Number.parseInt(e.currentTarget.value, 10))}
                      className="w-28 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800"
                    >
                      {yearOptions.map((year) => (
                        <option key={year} value={String(year)}>
                          {year}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowCalendarPopup(false)}
                      className="h-10 w-10 rounded-xl border border-gray-300 text-gray-700 leading-none"
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekdays.map((day) => (
                      <div key={day} className="text-center text-gray-400 text-[10px] uppercase py-1">{day}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {calendarCells.map((cell, index) => {
                      const dateYmd = formatYmd(viewedYear, viewedMonth, cell.day)
                      const isSelected = cell.inCurrentMonth && selectedDate === dateYmd
                      const isBlockedByApi = blockedDates.has(dateYmd)
                      const isWeekend = cell.inCurrentMonth && isWeekendUtcDate(new Date(Date.UTC(viewedYear, viewedMonth - 1, cell.day)))
                      const isPastOrToday = dateYmd <= todayYmd
                      const isDisabled = !cell.inCurrentMonth || isBlockedByApi || isWeekend || isPastOrToday || loadingBlockedDays

                      return (
                        <button
                          key={`${viewedYear}-${viewedMonth}-${cell.day}-${index}`}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => {
                            if (!isDisabled) {
                              setSelectedDate(dateYmd)
                              setShowCalendarPopup(false)
                            }
                          }}
                          className={`h-10 rounded-xl text-xs transition ${isSelected
                            ? 'bg-orange-500 text-white font-semibold'
                            : isDisabled
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-800 hover:bg-gray-100 border border-transparent'
                          } ${cell.inCurrentMonth ? 'border border-transparent' : 'opacity-40'}`}
                          title={isDisabled ? 'Unavailable date' : 'Available date'}
                        >
                          {cell.day}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}
        </div>

        <div className="lg:hidden space-y-2.5 sm:space-y-4">
            <div className="bg-gray-50 rounded-2xl p-2.5 sm:p-4 border border-gray-100">
              <h3 className="text-sm sm:text-lg font-medium text-gray-900 mb-2 sm:mb-3">Morning available times</h3>
              <div className="grid grid-cols-3 sm:grid-cols-3 xl:grid-cols-4 gap-1.5 sm:gap-3">
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

            <div className="bg-gray-50 rounded-2xl p-2.5 sm:p-4 border border-gray-100">
              <h3 className="text-sm sm:text-lg font-medium text-gray-900 mb-2 sm:mb-3">Afternoon available times</h3>
              <div className="grid grid-cols-3 sm:grid-cols-3 xl:grid-cols-4 gap-1.5 sm:gap-3">
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

        {/* Desktop: Full calendar with time slots side-by-side */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-6">
          {/* Left: Calendar */}
          <div className="bg-gray-50 rounded-2xl p-3 border border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <select
                value={String(viewedMonth)}
                onChange={(e) => setViewedMonth(Number.parseInt(e.currentTarget.value, 10))}
                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-semibold text-gray-800"
              >
                {monthOptions.map((month) => (
                  <option key={month} value={String(month)}>
                    {monthNames[month - 1]}
                  </option>
                ))}
              </select>
              <select
                value={String(viewedYear)}
                onChange={(e) => setViewedYear(Number.parseInt(e.currentTarget.value, 10))}
                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs font-semibold text-gray-800"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={String(year)}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekdays.map((day) => (
                <div key={day} className="text-center text-gray-400 text-[10px] uppercase font-semibold py-1">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((cell, index) => {
                const dateYmd = formatYmd(viewedYear, viewedMonth, cell.day)
                const isSelected = cell.inCurrentMonth && selectedDate === dateYmd
                const isBlockedByApi = blockedDates.has(dateYmd)
                const isWeekend = cell.inCurrentMonth && isWeekendUtcDate(new Date(Date.UTC(viewedYear, viewedMonth - 1, cell.day)))
                const isPastOrToday = dateYmd <= todayYmd
                const isDisabled = !cell.inCurrentMonth || isBlockedByApi || isWeekend || isPastOrToday || loadingBlockedDays

                return (
                  <button
                    key={`${viewedYear}-${viewedMonth}-${cell.day}-${index}`}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                      if (!isDisabled) {
                        setSelectedDate(dateYmd)
                      }
                    }}
                    className={`h-8 rounded-lg text-xs font-medium transition ${isSelected
                      ? 'bg-orange-500 text-white'
                      : isDisabled
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-800 hover:bg-gray-100 border border-gray-200'
                    } ${cell.inCurrentMonth ? '' : 'opacity-30'}`}
                    title={isDisabled ? 'Unavailable date' : 'Available date'}
                  >
                    {cell.day}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right: Time slots */}
          <div className="col-span-2 space-y-3">
            <div>
              <h3 className="text-xs font-semibold text-gray-900 mb-2">Morning available times</h3>
              <div className="grid grid-cols-4 gap-2">
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

            <div>
              <h3 className="text-xs font-semibold text-gray-900 mb-2">Afternoon available times</h3>
              <div className="grid grid-cols-4 gap-2">
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