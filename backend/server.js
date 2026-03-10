import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import 'dotenv/config'
import unavailableDaysRouter from './routes/unavailableDays.js'
import createBookingRouter from './routes/createBooking.js'
import sendWebhookRouter from './routes/sendWebhook.js'

const app = express()
const PORT = process.env.PORT || 3001

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

// ✅ Test route
app.get('/', (req, res) => {
  res.json({ message: 'Booking API is running ✅' })
})

app.use('/api', unavailableDaysRouter)
app.use('/api', createBookingRouter)
app.use('/api', sendWebhookRouter)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})