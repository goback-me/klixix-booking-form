// Vercel serverless entrypoint. All routes are rewritten here by vercel.json,
// and Express matches on the original request path.
import app from '../app.js'
import { logSpendGuards } from '../routes/vehicleLookup.js'

// Runs once per cold start so the guard state shows up in Vercel's runtime logs.
logSpendGuards()

export default app
