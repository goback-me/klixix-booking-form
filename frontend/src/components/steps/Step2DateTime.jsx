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
  { label: '9:00 AM', available: true },
  { label: '9:30 AM', available: true },
  { label: '10:00 AM', available: true },
  { label: '10:30 AM',  available: true },
  { label: '11:00 AM', available: true },
  { label: '11:30 AM', available: true },
  { label: '12:00 PM', available: true },
]

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

function pad(value) {
  return String(value).padStart(2, '0')
}

function formatYmd(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`
}

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

function addDays(date, amount) {
  const result = new Date(date.getTime())
  result.setUTCDate(result.getUTCDate() + amount)
  return result
}

function dateToYmd(date) {
  return formatYmd(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

function getWeekdayLabel(date) {
  const weekday = date.getUTCDay()
  return weekdays[weekday === 0 ? 6 : weekday - 1]
}

function SlotButton({ slot, selected, onClick }) {
  const baseClass = 'group relative rounded-xl border px-2.5 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-semibold text-left transition-all duration-200'
  const disabledClass = slot.disabled ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-800 border-gray-200 hover:border-[rgba(255,77,36,0.75)] hover:text-[rgba(255,77,36,1)] hover:bg-[rgba(255,77,36,0.08)] hover:shadow-[0_4px_10px_rgba(255,77,36,0.16)] hover:-translate-y-[1px]'
  const selectedClass = selected ? 'border-[rgba(255,77,36,1)] bg-white text-[rgba(255,77,36,1)] shadow-[0_0_0_1px_rgba(255,77,36,1),0_8px_18px_rgba(255,77,36,0.12)] ring-0' : ''

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

export default function Step2DateTime({ bookingData, updateBookingData }) {
  const nowInAu = useMemo(() => getAustralianDateParts(), [])
  const todayYmd = formatYmd(nowInAu.year, nowInAu.month, nowInAu.day)
  const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

  const [viewedMonth, setViewedMonth] = useState(nowInAu.month)
  const [viewedYear, setViewedYear] = useState(nowInAu.year)
  const selectedDate = bookingData.date || ''
  const selectedTime = bookingData.time || ''
  const isFlexible = bookingData.isFlexible || false
  const setSelectedDate = (val) => updateBookingData('date', val)
  const setSelectedTime = (val) => updateBookingData('time', val)
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
    return addDays(new Date(Date.UTC(nowInAu.year, nowInAu.month - 1, nowInAu.day)), offset)
  }, [nowInAu.hour, nowInAu.year, nowInAu.month, nowInAu.day])

  const maxSelectableDate = useMemo(
    () => new Date(Date.UTC(nowInAu.year + 1, 11, 31)),
    [nowInAu.year]
  )

  const selectableRangeDays = useMemo(() => {
    const dayMs = 24 * 60 * 60 * 1000
    return Math.max(1, Math.ceil((maxSelectableDate.getTime() - earliestSelectableDate.getTime()) / dayMs) + 1)
  }, [earliestSelectableDate, maxSelectableDate])

  const dateOptions = useMemo(() => {
    const options = []
    const maxDays = selectableRangeDays
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
        disabled: blockedDates.has(ymd),
      })
    }
    return options
  }, [earliestSelectableDate, blockedDates, selectableRangeDays])

  const visibleDates = useMemo(() => {
    const visibleCount = 5
    return dateOptions.slice(visibleStartIndex, visibleStartIndex + visibleCount)
  }, [dateOptions, visibleStartIndex])

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
          in_days: String(selectableRangeDays),
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
  }, [apiBaseUrl, selectableRangeDays, workshopId, todayYmd])

  useEffect(() => {
    if (loadingBlockedDays) return

    const validDate = dateOptions.find((option) => option.ymd === selectedDate && !option.disabled)
    const firstAvailableOption = dateOptions.find((option) => !option.disabled)

    const targetDate = validDate ? selectedDate : firstAvailableOption?.ymd || selectedDate
    const targetParts = parseYmd(targetDate)

    if (selectedDate !== targetDate && targetDate) {
      setSelectedDate(targetDate)
    }

    // Only auto-sync calendar view if no date is selected yet
    if (!selectedDate && targetParts) {
      if (viewedMonth !== targetParts.month) {
        setViewedMonth(targetParts.month)
      }
      if (viewedYear !== targetParts.year) {
        setViewedYear(targetParts.year)
      }
    }
  }, [blockedDates, dateOptions, loadingBlockedDays, selectedDate])

  const yearOptions = useMemo(
    () => [nowInAu.year, nowInAu.year + 1],
    [nowInAu.year]
  )

  const monthOptions = useMemo(() => {
    if (viewedYear > nowInAu.year) {
      // Future year: show all months
      return monthNames.map((name, idx) => ({ name, value: idx + 1 }))
    } else {
      // Current year: only show current and future months
      return monthNames
        .map((name, idx) => ({ name, value: idx + 1 }))
        .filter((month) => month.value >= nowInAu.month)
    }
  }, [viewedYear, nowInAu.year, nowInAu.month])

  const calendarCells = useMemo(
    () => buildCalendarCells(viewedYear, viewedMonth),
    [viewedYear, viewedMonth]
  )

  const visibleCount = 5
  const maxStartIndex = Math.max(0, dateOptions.length - visibleCount)
  const canMovePrev = visibleStartIndex > 0
  const canMoveNext = visibleStartIndex < maxStartIndex

  const scrollMobileDateStripTo = (ymd) => {
    const targetIndex = dateOptions.findIndex((option) => option.ymd === ymd)
    if (targetIndex === -1) return

    const nextVisibleStart = Math.min(Math.max(0, targetIndex - 2), maxStartIndex)
    setVisibleStartIndex(nextVisibleStart)
  }

  const handleManualDateSelect = (ymd, shouldClosePopup = false) => {
    setSelectedDate(ymd)
    scrollMobileDateStripTo(ymd)

    const targetParts = parseYmd(ymd)
    if (targetParts) {
      setViewedMonth(targetParts.month)
      setViewedYear(targetParts.year)
    }

    if (shouldClosePopup) {
      setShowCalendarPopup(false)
    }
  }

  return (
    <div className="p-3 sm:p-5 md:p-4 flex flex-col min-w-0">
      <div className="flex-1 flex flex-col">
        <div className={`flex items-center justify-between gap-2 mb-1 transition ${showCalendarPopup ? 'lg:blur-none blur-sm opacity-70' : ''}`}>
          <h2 className="text-lg sm:text-2xl md:text-[2rem] text-gray-900 break-words">Drop off date &amp; time</h2>
          <button
            type="button"
            onClick={() => setIsFlexible((prev) => !prev)}
            className="flex items-center gap-2 border border-gray-200 rounded-xl px-2 sm:px-3 py-1.5 sm:py-2 bg-white shrink-0"
          >
            <span className={`w-9 sm:w-11 h-5 sm:h-6 rounded-full relative transition ${isFlexible ? 'bg-[rgba(255,77,36,1)]' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 h-4 sm:h-5 w-4 sm:w-5 rounded-full bg-white transition ${isFlexible ? 'left-4 sm:left-5' : 'left-0.5'}`} />
            </span>
            <span className="text-xs sm:text-sm text-gray-800">I'm flexible</span>
          </button>
        </div>
        <p className={`text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4 transition ${showCalendarPopup ? 'lg:blur-none blur-sm opacity-70' : ''}`}>Select your preferred appointment slot.</p>

        {/* Mobile: Compact 5-date picker */}
        <div className="lg:hidden rounded-[22px] bg-white p-3.5 border border-gray-100 relative shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
          <div className={`transition ${showCalendarPopup ? 'blur-sm opacity-60 pointer-events-none' : ''}`}>
          <div className="flex items-center gap-2.5 mb-3.5">
              <button
                type="button"
                onClick={() => {
                  if (!showCalendarPopup) {
                    const targetDate = selectedDate || todayYmd
                    const targetParts = parseYmd(targetDate)
                    if (targetParts) {
                      setViewedMonth(targetParts.month)
                      setViewedYear(targetParts.year)
                    }
                  }
                  setShowCalendarPopup((prev) => !prev)
                }}
                className="w-[64%] max-w-[15rem] min-w-0 bg-white border border-gray-200 rounded-lg px-3 py-2 text-left text-sm font-semibold text-gray-900 shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-gray-300"
              >
                <span className="inline-flex items-center gap-2">
                  <span>{monthNames[viewedMonth - 1]}</span>
                  <span className="text-gray-400">▾</span>
                </span>
              </button>

              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVisibleStartIndex((prev) => Math.max(0, prev - 1))}
                  disabled={!canMovePrev}
                  className={`w-9 h-9 rounded-lg border flex items-center justify-center text-lg transition shadow-[0_1px_2px_rgba(15,23,42,0.03)] ${canMovePrev ? 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-white' : 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-100'}`}
                >
                  ‹
                </button>

                <button
                  type="button"
                  onClick={() => setVisibleStartIndex((prev) => Math.min(maxStartIndex, prev + 1))}
                  disabled={!canMoveNext}
                  className={`w-9 h-9 rounded-lg border flex items-center justify-center text-lg transition shadow-[0_1px_2px_rgba(15,23,42,0.03)] ${canMoveNext ? 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-white' : 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-100'}`}
                >
                  ›
                </button>
              </div>
            </div>

            <div className="grid grid-cols-5 gap-1.5 mb-2.5">
              {visibleDates.map((option) => {
                const isSelected = selectedDate === option.ymd
                return (
                  <button
                    key={option.ymd}
                    type="button"
                    disabled={option.disabled || loadingBlockedDays}
                    onClick={() => !option.disabled && !loadingBlockedDays && handleManualDateSelect(option.ymd)}
                    className={`rounded-lg border py-2 text-center transition shadow-[0_1px_2px_rgba(15,23,42,0.03)] ${isSelected ? 'border-[rgba(255,77,36,1)] bg-[rgba(255,77,36,1)] text-white shadow-[0_6px_14px_rgba(255,77,36,0.22)]' : option.disabled ? 'border-gray-200 bg-gray-100 text-gray-300 cursor-not-allowed' : 'border-gray-200 bg-white hover:border-[rgba(255,77,36,0.75)] hover:bg-[rgba(255,77,36,0.08)] hover:text-[rgba(255,77,36,1)] hover:shadow-[0_4px_10px_rgba(255,77,36,0.14)]'}`}
                  >
                    <div className={`text-[8px] uppercase tracking-wider font-medium ${isSelected ? 'text-white' : 'text-gray-500'}`}>{option.weekdayLabel}</div>
                    <div className={`mt-1.5 text-base font-bold ${isSelected ? 'text-white' : 'text-gray-900'}`}>{option.day}</div>
                  </button>
                )
              })}
            </div>
          </div>

            {showCalendarPopup && (
              <>
                <button
                  type="button"
                  onClick={() => setShowCalendarPopup(false)}
                  className="fixed inset-0 z-20 bg-white/35 backdrop-blur-md"
                />
                <div className="absolute inset-x-4 top-full z-30 mt-2 rounded-[26px] bg-white border border-gray-100 p-3.5 shadow-[0_18px_50px_rgba(15,23,42,0.16)] pointer-events-auto">
                  <div className="flex items-center gap-2 mb-3">
                    <select
                      value={String(viewedMonth)}
                      onChange={(e) => setViewedMonth(Number.parseInt(e.currentTarget.value, 10))}
                      className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
                    >
                      {monthOptions.map((month) => (
                        <option key={month.value} value={String(month.value)}>
                          {month.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={String(viewedYear)}
                      onChange={(e) => setViewedYear(Number.parseInt(e.currentTarget.value, 10))}
                      className="w-28 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
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
                      className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
                    >
                      Close
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {weekdays.map((day) => (
                      <div key={day} className="text-center text-gray-400 text-[10px] uppercase py-1.5">{day}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
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
                          onClick={() => {
                            if (!isDisabled) {
                              handleManualDateSelect(dateYmd, true)
                            }
                          }}
                          className={`h-10 rounded-xl text-xs transition ${isSelected
                            ? 'bg-[rgba(255,77,36,1)] text-white font-semibold shadow-[0_6px_14px_rgba(255,77,36,0.24)]'
                            : isDisabled
                              ? 'text-gray-300 cursor-not-allowed'
                              : 'text-gray-800 hover:bg-[rgba(255,77,36,0.08)] hover:text-[rgba(255,77,36,1)] hover:border-[rgba(255,77,36,0.75)]'
                          } ${cell.inCurrentMonth ? 'border border-transparent' : 'opacity-40'}`}
                          title={isDisabled ? 'Unavailable date' : 'Available date'}
                        >
                          {cell.day}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
        </div>

        <div className={`lg:hidden space-y-3.5 transition ${showCalendarPopup ? 'blur-sm opacity-60 pointer-events-none' : ''}`}>
            <div className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <h3 className="text-sm font-medium text-gray-900 mb-2.5">Morning available times</h3>
              <div className="grid grid-cols-3 gap-2">
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

            <div className="bg-white rounded-2xl p-3.5 border border-gray-100 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
              <h3 className="text-sm font-medium text-gray-900 mb-2.5">Afternoon available times</h3>
              <div className="grid grid-cols-3 gap-2">
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
        <div className="hidden lg:grid lg:grid-cols-5 gap-4">
          {/* Left: Calendar - Column 1-2 */}
          <div className="col-span-2 bg-white rounded-2xl p-3.5 border border-gray-100 shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
            <div className="flex items-center gap-2 mb-3">
              <select
                value={String(viewedMonth)}
                onChange={(e) => setViewedMonth(Number.parseInt(e.currentTarget.value, 10))}
                className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-800"
              >
                {monthOptions.map((month) => (
                  <option key={month.value} value={String(month.value)}>
                    {month.name}
                  </option>
                ))}
              </select>
              <select
                value={String(viewedYear)}
                onChange={(e) => setViewedYear(Number.parseInt(e.currentTarget.value, 10))}
                className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-800"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={String(year)}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-2.5">
              {weekdays.map((day) => (
                <div key={day} className="text-center text-gray-600 text-sm font-semibold py-2 uppercase">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
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
                    onClick={() => {
                      if (!isDisabled) {
                        setSelectedDate(dateYmd)
                      }
                    }}
                    className={`h-10 rounded-lg text-sm font-semibold transition ${isSelected
                      ? 'bg-[rgba(255,77,36,1)] text-white'
                      : isDisabled
                        ? 'text-gray-300 cursor-not-allowed'
                        : 'text-gray-800 hover:bg-[rgba(255,77,36,0.04)] hover:text-[rgba(255,77,36,1)] hover:border-[rgba(255,77,36,0.55)] border border-gray-200'
                    } ${cell.inCurrentMonth ? '' : 'opacity-30'}`}
                    title={isDisabled ? 'Unavailable date' : 'Available date'}
                  >
                    {cell.day}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right: Time slots - Column 3-5 */}
          <div className="col-span-3 flex flex-col gap-4">
            <div className="rounded-[22px] border border-gray-100 bg-white p-3.5 shadow-[0_6px_20px_rgba(15,23,42,0.04)]">
              <h3 className="text-sm font-semibold text-gray-900 mb-2.5">Morning available times</h3>
              <div className="grid grid-cols-4 gap-2.5">
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

            <div className="rounded-[22px] border border-gray-100 bg-white p-3.5 shadow-[0_6px_20px_rgba(15,23,42,0.04)]">
              <h3 className="text-sm font-semibold text-gray-900 mb-2.5">Afternoon available times</h3>
              <div className="grid grid-cols-4 gap-2.5">
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