/**
 * Counter and cache store for spend limits.
 *
 * In-process memory is fine for one long-running server, but it resets on every
 * deploy and is not shared between serverless instances — which is exactly when
 * a spend cap matters most. If Upstash Redis credentials are present the counters
 * and the lookup-result cache become durable and shared; otherwise we fall back
 * to memory and say so.
 */

const memory = new Map() // key -> { value, expiresAt }
const MEMORY_CACHE_MAX_ENTRIES = 500

// Accepts the names Upstash uses directly and the KV_* names Vercel's Upstash
// marketplace integration injects, so either setup path works unchanged.
function redisConfig() {
  const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '').trim()
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '').trim()
  return url && token ? { url: url.replace(/\/+$/, ''), token } : null
}

function usingRedis() {
  return Boolean(redisConfig())
}

export function describeCounterStore() {
  return usingRedis()
    ? { durable: true, label: 'Redis (durable, shared across instances)' }
    : { durable: false, label: 'memory (per-instance, resets on deploy)' }
}

/**
 * Runs one Redis command through the Upstash REST API. The command is sent as
 * a JSON array in the body, so values with slashes or JSON are safe.
 */
async function redisCommand(...args) {
  const { url, token } = redisConfig()
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args.map((a) => String(a))),
    signal: AbortSignal.timeout(5000),
  })
  if (!response.ok) throw new Error(`Upstash responded ${response.status}`)
  const data = await response.json()
  if (data.error) throw new Error(`Upstash error: ${data.error}`)
  return data.result
}

function memoryIncrement(key, ttlSeconds) {
  const now = Date.now()
  const entry = memory.get(key)
  if (!entry || now >= entry.expiresAt) {
    memory.set(key, { value: 1, expiresAt: now + ttlSeconds * 1000 })
    return 1
  }
  entry.value += 1
  return entry.value
}

function memoryDecrement(key) {
  const entry = memory.get(key)
  if (entry && entry.value > 0) entry.value -= 1
}

/**
 * Adds one to `key` and returns the new total. Falls back to the in-memory
 * counter if the durable store errors, so a Redis blip degrades protection
 * rather than blocking every booking.
 */
export async function incrementCounter(key, ttlSeconds) {
  if (usingRedis()) {
    try {
      const value = await redisCommand('INCR', key)
      if (Number(value) === 1) await redisCommand('EXPIRE', key, ttlSeconds)
      return Number(value)
    } catch (error) {
      console.warn(`Counter store unavailable (${error.message}) — falling back to memory for ${key}`)
    }
  }
  return memoryIncrement(key, ttlSeconds)
}

/** Gives a count back when the attempt provably cost nothing. */
export async function decrementCounter(key) {
  if (usingRedis()) {
    try {
      await redisCommand('DECR', key)
      return
    } catch (error) {
      console.warn(`Counter store unavailable (${error.message}) — memory decrement for ${key}`)
    }
  }
  memoryDecrement(key)
}

// --- Small JSON cache, used so a repeat lookup of the same plate is never re-billed ---

function memoryCacheGet(key) {
  const entry = memory.get(key)
  if (!entry) return null
  if (Date.now() >= entry.expiresAt) {
    memory.delete(key)
    return null
  }
  return entry.value
}

function memoryCacheSet(key, value, ttlSeconds) {
  if (memory.size >= MEMORY_CACHE_MAX_ENTRIES) {
    const oldestKey = memory.keys().next().value
    memory.delete(oldestKey)
  }
  memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
}

/** Returns the cached JSON value for `key`, or null. */
export async function getCachedValue(key) {
  if (usingRedis()) {
    try {
      const raw = await redisCommand('GET', key)
      if (raw !== null && raw !== undefined) return JSON.parse(raw)
      return null
    } catch (error) {
      console.warn(`Cache store unavailable (${error.message}) — reading memory for ${key}`)
    }
  }
  return memoryCacheGet(key)
}

/** Stores a JSON value under `key` for `ttlSeconds`. Always also warms memory. */
export async function setCachedValue(key, value, ttlSeconds) {
  memoryCacheSet(key, value, ttlSeconds)
  if (usingRedis()) {
    try {
      await redisCommand('SET', key, JSON.stringify(value), 'EX', ttlSeconds)
    } catch (error) {
      console.warn(`Cache store unavailable (${error.message}) — memory only for ${key}`)
    }
  }
}
