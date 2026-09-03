import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import 'dotenv/config'
import unavailableDaysRouter from './routes/unavailableDays.js'
import createBookingRouter from './routes/createBooking.js'
import sendWebhookRouter from './routes/sendWebhook.js'
import vehicleLookupRouter, { describeEnvironment } from './routes/vehicleLookup.js'
import adminRouter from './routes/admin.js'

const app = express()

// Vercel and Render terminate TLS upstream; without this the rate limiters
// would see the proxy IP for every visitor and throttle everyone together.
if (process.env.VERCEL || process.env.RENDER) {
  app.set('trust proxy', 1)
}

// ✅ Security headers
app.use(helmet())

// ✅ CORS - only allow your frontend
app.use(cors({
  origin: (process.env.ALLOWED_ORIGIN || 'http://localhost:5173').replace(/\/+$/, ''),
  methods: ['GET', 'POST'],
}))

// ✅ Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50
}))

app.use(express.json())

// ✅ Health route. Also reports the lookup spend-guard state (no secrets) so a
// deploy can be checked from the outside without reading logs.
app.get('/', (req, res) => {
  const info = describeEnvironment()
  res.json({
    message: 'Booking API is running ✅',
    lookup: {
      environment: info.name || null,
      billable: Boolean(info.billable),
      credentials: info.ok ? 'present' : 'missing',
      turnstile: info.turnstile || null,
      counterStore: info.counterStore || null,
      dailyLimit: info.dailyLimit ?? null,
      monthlyLimit: info.monthlyLimit ?? null,
      sessionLimit: info.sessionLimit ?? null,
      blocked: info.problems || [],
    },
  })
})

app.use('/api', unavailableDaysRouter)
app.use('/api', createBookingRouter)
app.use('/api', sendWebhookRouter)
app.use('/api', vehicleLookupRouter)

// Internal, password-protected admin page for browsing stored bookings.
app.use('/admin', adminRouter)

export default app
