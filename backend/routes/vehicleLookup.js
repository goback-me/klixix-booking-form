import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import {
  incrementCounter,
  decrementCounter,
  describeCounterStore,
  getCachedValue,
  setCachedValue,
} from '../lib/counters.js'
import { issueLookupToken, verifyLookupToken, LOOKUP_SESSION_TTL_SECONDS } from '../lib/lookupSession.js'
import { isTurnstileConfigured, verifyTurnstileToken } from '../lib/turnstile.js'

const router = Router()

const AU_STATES = new Set(['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'])
const PLATE_REGEX = /^[A-Z0-9]{2,9}$/
const VIN_REGEX = /^[A-Z0-9]{17}$/

const REQUEST_TIMEOUT_MS = 15_000
// Refresh the token 2 minutes before InfoAgent's stated expiry to avoid mid-request 401s.
const TOKEN_EXPIRY_MARGIN_MS = 2 * 60 * 1000
// Every uncached lookup is a billable NEVDIS query — "no match" included — so cache aggressively.
const FOUND_CACHE_TTL_SECONDS = 60 * 60
const NO_MATCH_CACHE_TTL_SECONDS = 60 * 60

const AU_TIMEZONE = 'Australia/Brisbane'
// Matches the daily transaction warning InfoAgent has set on their side (30/day),
// so both alarms fire together. Raise deliberately via INFOAGENT_DAILY_LIMIT.
const DEFAULT_DAILY_LIMIT = 30
const DEFAULT_SESSION_LIMIT = 5
const DAILY_KEY_TTL_SECONDS = 36 * 60 * 60 // key already carries the date
const MONTHLY_KEY_TTL_SECONDS = 40 * 24 * 60 * 60 // key already carries the month

/**
 * The environment name selects BOTH the host and the credential pair, so a live
 * secret can never be sent to the test host (or vice versa) through a half-done
 * config change. Test is the default: going live must be a deliberate act.
 */
const ENVIRONMENTS = {
  test: {
    baseUrl: 'https://api.dev.infoagent.com.au',
    billable: false,
    label: 'TEST sandbox (free, fake vehicles)',
  },
  live: {
    baseUrl: 'https://api.infoagent.com.au',
    billable: true,
    label: 'LIVE (BILLABLE — real charges per lookup, no-match included)',
  },
}

/** True on Vercel/Lambda-style hosts, where per-instance memory is not shared. */
function isServerless() {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)
}

export function getEnvironment() {
  const name = String(process.env.INFOAGENT_ENV || 'test').trim().toLowerCase()
  const environment = ENVIRONMENTS[name]

  if (!environment) {
    const error = new Error(`INFOAGENT_ENV must be "test" or "live" (received "${name}")`)
    error.isConfigError = true
    throw error
  }

  // The spend caps and the per-plate cache live in the counter store. On a
  // serverless host each instance has its own memory, so without a durable
  // (Redis) store the caps silently stop working and the same plate can be
  // billed repeatedly. Refuse rather than let that happen unnoticed.
  if (environment.billable && isServerless() && !describeCounterStore().durable) {
    const error = new Error(
      'Live InfoAgent lookups are disabled on serverless hosting without a durable ' +
      'counter store: the daily spend cap cannot work across instances. Set ' +
      'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN, or run the API as a ' +
      'persistent Node process.'
    )
    error.isConfigError = true
    throw error
  }

  const prefix = name === 'live' ? 'INFOAGENT_LIVE_' : 'INFOAGENT_TEST_'
  return {
    name,
    ...environment,
    clientId: process.env[`${prefix}CLIENT_ID`]?.trim() || '',
    clientSecret: process.env[`${prefix}CLIENT_SECRET`]?.trim() || '',
  }
}

/**
 * Anything that must be true before a billable lookup is allowed. Empty means
 * go. In test mode these are advisory only, because sandbox lookups are free.
 */
export function getSpendGuardProblems() {
  const problems = []
  let environment
  try {
    environment = getEnvironment()
  } catch (error) {
    return [error.message]
  }

  if (environment.billable && !isTurnstileConfigured()) {
    problems.push(
      'TURNSTILE_SECRET_KEY is not set. Live lookups require a bot challenge because ' +
      'InfoAgent has no server-side spend cap.'
    )
  }
  return problems
}

/** Startup summary for the server banner — never includes the secret. */
export function describeEnvironment() {
  try {
    const env = getEnvironment()
    return {
      ok: Boolean(env.clientId && env.clientSecret),
      name: env.name,
      label: env.label,
      baseUrl: env.baseUrl,
      billable: env.billable,
      clientIdHint: env.clientId ? `${env.clientId.slice(0, 4)}…${env.clientId.slice(-2)}` : '(missing)',
      dailyLimit: getDailyLimit(),
      monthlyLimit: getMonthlyLimit(),
      sessionLimit: getSessionLimit(),
      counterStore: describeCounterStore().label,
      turnstile: isTurnstileConfigured() ? 'enforced' : (env.billable ? 'MISSING' : 'off (test mode)'),
      problems: getSpendGuardProblems(),
    }
  } catch (error) {
    return { ok: false, error: error.message, problems: [error.message] }
  }
}

/** One-line log of the guard state, for cold starts on hosts with no banner. */
export function logSpendGuards() {
  const info = describeEnvironment()
  if (!info.ok) {
    console.warn(`⚠️  InfoAgent lookup DISABLED — ${info.error || 'credentials missing'}`)
  } else {
    const log = info.billable ? console.warn : console.log
    log(
      `${info.billable ? '💳' : '🧪'} InfoAgent ${info.name}: cap ${info.dailyLimit}/day` +
      (info.monthlyLimit ? `, ${info.monthlyLimit}/month` : '') +
      `, ${info.sessionLimit}/session · counters in ${info.counterStore} · Turnstile ${info.turnstile}`
    )
  }
  for (const problem of info.problems || []) {
    console.error(`🚫 InfoAgent lookups blocked: ${problem}`)
  }
}

// --- Spend caps: a brake on runaway spend, independent of the per-IP rate limit ---

function getDailyLimit() {
  const parsed = Number.parseInt(String(process.env.INFOAGENT_DAILY_LIMIT || ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_DAILY_LIMIT
}

/** Optional. Unset means no monthly ceiling beyond the daily one. */
function getMonthlyLimit() {
  const parsed = Number.parseInt(String(process.env.INFOAGENT_MONTHLY_LIMIT || ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function brisbaneDateStamp() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: AU_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function getSessionLimit() {
  const parsed = Number.parseInt(String(process.env.INFOAGENT_SESSION_LIMIT || ''), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_SESSION_LIMIT
}

function dailyCounterKey(envName) {
  return `infoagent:daily:${envName}:${brisbaneDateStamp()}`
}

function monthlyCounterKey(envName) {
  return `infoagent:monthly:${envName}:${brisbaneDateStamp().slice(0, 7)}`
}

/**
 * Counts one billable lookup against today's (and, if set, this month's) cap.
 * Returns null when a cap is spent, so the caller can fall back to manual entry
 * instead of spending more.
 */
async function reserveBillableLookup(envName) {
  const dailyLimit = getDailyLimit()
  const dailyUsed = await incrementCounter(dailyCounterKey(envName), DAILY_KEY_TTL_SECONDS)
  if (dailyUsed > dailyLimit) {
    // Already over: hand the count straight back so the total cannot drift up
    // while the cap is being hammered.
    await decrementCounter(dailyCounterKey(envName))
    return null
  }

  const monthlyLimit = getMonthlyLimit()
  if (monthlyLimit) {
    const monthlyUsed = await incrementCounter(monthlyCounterKey(envName), MONTHLY_KEY_TTL_SECONDS)
    if (monthlyUsed > monthlyLimit) {
      await decrementCounter(monthlyCounterKey(envName))
      await decrementCounter(dailyCounterKey(envName))
      return null
    }
    return { used: dailyUsed, limit: dailyLimit, monthlyUsed, monthlyLimit }
  }

  return { used: dailyUsed, limit: dailyLimit }
}

/** Give back a reservation for an attempt that provably never reached NEVDIS. */
async function refundBillableLookup(envName) {
  await decrementCounter(dailyCounterKey(envName))
  if (getMonthlyLimit()) await decrementCounter(monthlyCounterKey(envName))
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

// One retry on timeouts/network drops only (never on HTTP error responses) —
// the InfoAgent test environment can be slow to respond after sitting idle.
async function fetchWithTimeoutRetry(url, options = {}) {
  try {
    return await fetchWithTimeout(url, options)
  } catch (error) {
    console.warn(`InfoAgent request failed (${error.name}: ${error.message}), retrying once:`, url)
    return fetchWithTimeout(url, options)
  }
}

// --- OAuth token, cached in memory and shared by all requests ---

let cachedToken = null // { value: string, expiresAt: number }
let tokenRequest = null // in-flight promise so concurrent lookups trigger a single auth call

async function requestAccessToken() {
  const { name, baseUrl, clientId, clientSecret } = getEnvironment()

  if (!clientId || !clientSecret) {
    const prefix = name === 'live' ? 'INFOAGENT_LIVE_' : 'INFOAGENT_TEST_'
    const error = new Error(
      `InfoAgent ${name} credentials are missing. Set ${prefix}CLIENT_ID and ${prefix}CLIENT_SECRET.`
    )
    error.isConfigError = true
    throw error
  }

  const response = await fetchWithTimeoutRetry(`${baseUrl}/auth/v1/token/oauth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!response.ok) {
    const error = new Error(`InfoAgent auth failed with status ${response.status}`)
    error.isAuthError = true
    throw error
  }

  const data = await response.json()
  if (!data.access_token) {
    throw new Error('InfoAgent auth response did not include an access token')
  }

  const lifetimeMs = (Number(data.expires_in) || 3600) * 1000
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + Math.max(lifetimeMs - TOKEN_EXPIRY_MARGIN_MS, 60_000),
    env: name,
  }
  return cachedToken.value
}

async function getAccessToken(forceRefresh = false) {
  const { name } = getEnvironment()

  if (forceRefresh) {
    cachedToken = null
  } else if (cachedToken && cachedToken.env === name && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value
  } else if (cachedToken && cachedToken.env !== name) {
    // Environment switched: a token minted for the other host must never be reused.
    cachedToken = null
  }

  if (!tokenRequest) {
    tokenRequest = requestAccessToken().finally(() => {
      tokenRequest = null
    })
  }
  return tokenRequest
}

// --- Lookup result cache (durable when Redis is configured) so repeat queries
//     for the same plate are never re-billed, plus an in-process de-duplicator
//     so a double-click is one upstream call, not two ---

const inFlightLookups = new Map() // key -> promise

function resultCacheKey(cacheKey) {
  return `infoagent:result:${cacheKey}`
}

// --- NEVDIS vehicle report ---

function postVehicleReport(token, query) {
  return fetchWithTimeoutRetry(`${getEnvironment().baseUrl}/nevdis/v1/vehicle-report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...query,
      clientReference: 'carone-booking-form',
      products: ['VEHICLE_AGE', 'EXTENDED_DATA'],
    }),
  })
}

async function callVehicleReport(query) {
  let token = await getAccessToken()
  let response = await postVehicleReport(token, query)

  if (response.status === 401) {
    token = await getAccessToken(true)
    response = await postVehicleReport(token, query)
  }

  if (!response.ok) {
    throw new Error(`InfoAgent lookup failed with status ${response.status}`)
  }

  return response.json()
}

function mapReportToResult(report) {
  const result = report?.result
  const vehicle = Array.isArray(result?.vehicles) ? result.vehicles[0] : null

  if (result?.responseCode !== 'SUCCESS' || !vehicle) {
    return { found: false }
  }

  const identification = vehicle.identification || {}
  const age = vehicle.vehicleAge || {}
  const extended = vehicle.extendedData || {}

  return {
    found: true,
    make: extended.makeDescription || extended.makeCode || '',
    model: extended.modelDescription || extended.modelCode || '',
    year: age.yearOfManufacture ? String(age.yearOfManufacture) : '',
    vin: identification.vin || '',
    plate: identification.plate || '',
    state: identification.state || '',
    colour: extended.colour || '',
    bodyType: extended.bodyType || '',
  }
}

const UNAVAILABLE_MESSAGE = 'Vehicle lookup is temporarily unavailable. Please enter your details manually.'

/** Shared fail-closed check for both lookup routes. Returns true when the request was refused. */
function refuseIfGuardsMissing(res) {
  const problems = getSpendGuardProblems()
  if (!problems.length) return false
  for (const problem of problems) console.error(`InfoAgent lookups blocked: ${problem}`)
  res.status(503).json({ error: UNAVAILABLE_MESSAGE })
  return true
}

const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again shortly.' },
})

// Handed to the form when it loads; every lookup must present one. When
// Turnstile is configured the browser must first pass the bot challenge, and
// in live mode Turnstile is mandatory.
router.post('/lookup-session', sessionLimiter, async (req, res) => {
  if (refuseIfGuardsMissing(res)) return

  if (isTurnstileConfigured()) {
    const check = await verifyTurnstileToken(req.body?.turnstileToken, req.ip)
    if (!check.ok) {
      console.warn(`Turnstile verification failed from ${req.ip}: ${check.reason}`)
      return res.status(403).json({
        error: 'We could not verify your browser. Please enter your vehicle details manually.',
      })
    }
  }

  const { token, expiresIn } = issueLookupToken()
  return res.status(200).json({ token, expiresIn, maxLookups: getSessionLimit() })
})

// Stricter than the global limiter: lookups cost money per query.
const lookupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many lookups. Please enter your vehicle details manually.' },
})

router.post('/vehicle-lookup', lookupLimiter, async (req, res) => {
  const session = verifyLookupToken(req.get('x-lookup-token') || req.body?.lookupToken)
  if (!session.valid) {
    return res.status(401).json({
      error: session.reason === 'expired'
        ? 'Your session timed out. Please refresh the page and try again.'
        : 'Vehicle lookup is unavailable. Please enter your details manually.',
    })
  }

  if (refuseIfGuardsMissing(res)) return

  const vin = String(req.body?.vin || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const plate = String(req.body?.plate || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const state = String(req.body?.state || '').trim().toUpperCase()

  let environment
  try {
    environment = getEnvironment()
  } catch (error) {
    console.error('InfoAgent configuration error:', error.message)
    return res.status(500).json({ error: UNAVAILABLE_MESSAGE })
  }

  let lookupKey
  let query
  if (vin) {
    if (!VIN_REGEX.test(vin)) {
      return res.status(400).json({ error: 'Please enter the full 17-character VIN' })
    }
    lookupKey = `VIN:${vin}`
    query = { vin }
  } else {
    if (!PLATE_REGEX.test(plate)) {
      return res.status(400).json({ error: 'Please enter a valid registration plate' })
    }
    if (!AU_STATES.has(state)) {
      return res.status(400).json({ error: 'Please select a valid state' })
    }
    lookupKey = `${state}:${plate}`
    query = { plate, state }
  }
  // Namespaced by environment so sandbox results are never served as live ones.
  const cacheKey = `${environment.name}:${lookupKey}`
  const cached = await getCachedValue(resultCacheKey(cacheKey))
  if (cached) {
    return res.status(200).json(cached)
  }

  try {
    let lookup = inFlightLookups.get(cacheKey)
    if (!lookup) {
      // Per-visitor ceiling. Cached repeats never get here, so this only counts
      // distinct vehicles one person asked us to pay for.
      const sessionLimit = getSessionLimit()
      const sessionUsed = await incrementCounter(`lookup:session:${session.sid}`, LOOKUP_SESSION_TTL_SECONDS)
      if (sessionUsed > sessionLimit) {
        console.warn(`Session ${session.sid} exceeded ${sessionLimit} lookups — refusing ${lookupKey}`)
        return res.status(429).json({
          error: `You've reached the limit of ${sessionLimit} vehicle searches. Please enter your details manually.`,
        })
      }

      const reservation = await reserveBillableLookup(environment.name)
      if (!reservation) {
        // The visitor did not get a lookup, so do not charge it against their session either.
        await decrementCounter(`lookup:session:${session.sid}`)
        console.error(
          `InfoAgent spend cap reached (${environment.name}: ${getDailyLimit()}/day` +
          (getMonthlyLimit() ? `, ${getMonthlyLimit()}/month` : '') +
          `) — refusing ${lookupKey}. Raise INFOAGENT_DAILY_LIMIT / INFOAGENT_MONTHLY_LIMIT if this is legitimate traffic.`
        )
        return res.status(503).json({ error: UNAVAILABLE_MESSAGE })
      }

      console.log(
        `InfoAgent ${environment.name.toUpperCase()} lookup ${lookupKey} ` +
        `— ${reservation.used}/${reservation.limit} today` +
        (reservation.monthlyLimit ? `, ${reservation.monthlyUsed}/${reservation.monthlyLimit} this month` : '') +
        (environment.billable ? ' (BILLABLE)' : ' (free sandbox)')
      )
      lookup = callVehicleReport(query)
        .then(async (report) => {
          const data = mapReportToResult(report)
          await setCachedValue(
            resultCacheKey(cacheKey),
            data,
            data.found ? FOUND_CACHE_TTL_SECONDS : NO_MATCH_CACHE_TTL_SECONDS
          )
          return data
        })
        .catch(async (error) => {
          // Config and auth failures never reached NEVDIS, so they cost nothing —
          // don't let an outage burn the day's cap. Anything else stays counted.
          if (error.isConfigError || error.isAuthError) {
            await refundBillableLookup(environment.name)
            await decrementCounter(`lookup:session:${session.sid}`)
            console.warn(`Refunded spend-cap slot for ${lookupKey} (request never reached NEVDIS)`)
          }
          throw error
        })
        .finally(() => {
          inFlightLookups.delete(cacheKey)
        })
      inFlightLookups.set(cacheKey, lookup)
    }

    const data = await lookup
    return res.status(200).json(data)
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Vehicle lookup error for ${cacheKey}:`, error)
    const status = error.isConfigError ? 500 : 502
    return res.status(status).json({ error: UNAVAILABLE_MESSAGE })
  }
})

export default router
