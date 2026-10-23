// Vercel serverless entrypoint. All routes are rewritten here by vercel.json,
// and Express matches on the original request path.
import app from '../app.js'
import { logSpendGuards } from '../routes/vehicleLookup.js'
import { assertFakeModeSafe, isFakeModeEnabled } from '../lib/mechanicDeskMode.js'

// FAIL CLOSED at cold start: never serve if the fake MechanicDesk flag is set in
// production (Vercel runs this entry, not server.js, so the guard must live here too).
assertFakeModeSafe()
if (isFakeModeEnabled()) {
  console.warn('🧪 MechanicDesk FAKE mode ENABLED (non-production). Scenario: ' +
    (process.env.MECHANICDESK_FAKE_SCENARIO || 'confirmed') + '. No real bookings will be created.')
}

// Runs once per cold start so the guard state shows up in Vercel's runtime logs.
logSpendGuards()

export default app
