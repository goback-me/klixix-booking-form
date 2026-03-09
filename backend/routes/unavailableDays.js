import { Router } from 'express'

const router = Router()
const AU_TIMEZONE = 'Australia/Brisbane'

function toYmdInTimezone(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  return formatter.format(date)
}

function normalizeDateString(value) {
  if (typeof value !== 'string') return null

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return toYmdInTimezone(parsed, AU_TIMEZONE)
}

function extractUnavailableDays(payload) {
  if (Array.isArray(payload)) {
    return payload
  }

  if (payload && typeof payload === 'object') {
    if (Array.isArray(payload.unavailable_days)) return payload.unavailable_days
    if (Array.isArray(payload.unavailableDays)) return payload.unavailableDays
    if (Array.isArray(payload.days)) return payload.days
  }

  return []
}

router.get('/unavailable-days', async (req, res) => {
  const { workshop, in_days: inDaysParam = '180' } = req.query

  if (!workshop) {
    return res.status(400).json({ error: 'Workshop parameter required' })
  }

  const tokenMap = {
    hendra: process.env.HENDRA_TOKEN?.trim(),
    woolloongabba: process.env.WOOLLOONGABBA_TOKEN?.trim(),
  }

  const workshopId = String(workshop).toLowerCase()

  if (!Object.prototype.hasOwnProperty.call(tokenMap, workshopId)) {
    return res.status(400).json({ error: 'Invalid workshop ID' })
  }

  const token = tokenMap[workshopId]
  if (!token) {
    return res.status(500).json({
      error: `Missing API token for workshop '${workshopId}'. Check backend .env variables.`,
    })
  }

  const inDaysNumber = Number.parseInt(String(inDaysParam), 10)
  const inDays = Number.isFinite(inDaysNumber)
    ? Math.min(Math.max(inDaysNumber, 1), 365)
    : 180

  try {
    const url = `https://www.mechanicdesk.com.au/booking_requests/unavailable_days?token=${encodeURIComponent(token)}&in_days=${inDays}`
    const response = await fetch(url)

    if (!response.ok) {
      const responseText = await response.text()
      return res.status(502).json({
        error: `MechanicDesk API returned ${response.status}`,
        detail: responseText.slice(0, 300),
      })
    }

    const data = await response.json()
    const upstreamDays = extractUnavailableDays(data)
      .map(normalizeDateString)
      .filter(Boolean)

    const todayInAu = toYmdInTimezone(new Date(), AU_TIMEZONE)
    const unavailableDays = Array.from(new Set([...upstreamDays, todayInAu]))

    return res.status(200).json({
      workshop: workshopId,
      timezone: AU_TIMEZONE,
      unavailable_days: unavailableDays,
    })
  } catch (error) {
    console.error('Unavailable days API error:', error)
    return res.status(500).json({
      error: 'Failed to fetch unavailable days',
      detail: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

export default router
