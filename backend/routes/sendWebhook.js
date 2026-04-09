import { Router } from 'express'

const router = Router()

function toStr(value) {
  if (value === null || value === undefined) return ''
  return String(value)
}

function buildWebhookParams(payload) {
  const params = new URLSearchParams()

  const jobTypeNames = Array.isArray(payload.job_type_names) ? payload.job_type_names : []
  const serviceAddons = Array.isArray(payload.service_addons) ? payload.service_addons : []

  // Human-readable keys requested for webhook integrations.
  params.set('Workshop', toStr(payload.workshop))
  params.set('Name', toStr(payload.name))
  params.set('Phone', toStr(payload.phone))
  params.set('Email', toStr(payload.email))
  params.set('State', toStr(payload.state))
  params.set('Registration Number', toStr(payload.registration_number))
  params.set('Make', toStr(payload.make))
  params.set('Model', toStr(payload.model))
  params.set('Year', toStr(payload.year))
  params.set('Drop Off Time', toStr(payload.drop_off_time))
  params.set('Note', toStr(payload.note))
  params.set('Booking Note', toStr(payload.booking_note))
  params.set('Alert', toStr(payload.alert))
  params.set('Is Flexible', toStr(payload.is_flexible))

  // Summary keys plus indexed keys for line-item style display.
  params.set('Job Type Names', jobTypeNames.join(', '))
  jobTypeNames.forEach((name, idx) => {
    params.set(`Job Type Names ${idx + 1}`, toStr(name))
  })

  params.set('Service Addons', serviceAddons.join(', '))
  serviceAddons.forEach((name, idx) => {
    params.set(`Service Addons ${idx + 1}`, toStr(name))
  })

  // Keep machine-friendly originals for downstream compatibility.
  params.set('workshop', toStr(payload.workshop))
  params.set('name', toStr(payload.name))
  params.set('phone', toStr(payload.phone))
  params.set('email', toStr(payload.email))
  params.set('state', toStr(payload.state))
  params.set('registration_number', toStr(payload.registration_number))
  params.set('make', toStr(payload.make))
  params.set('model', toStr(payload.model))
  params.set('year', toStr(payload.year))
  params.set('drop_off_time', toStr(payload.drop_off_time))
  params.set('job_type_names', jobTypeNames.join(', '))
  params.set('note', toStr(payload.note))
  params.set('booking_note', toStr(payload.booking_note))
  params.set('alert', toStr(payload.alert))
  params.set('service_addons', serviceAddons.join(', '))
  params.set('is_flexible', toStr(payload.is_flexible))

  return params
}

router.post('/send-webhook', async (req, res) => {
  const webhookUrl = (process.env.WEBHOOK_URL || process.env.ZAPIER_WEBHOOK_URL || '').trim()
  const webhookMethod = (process.env.WEBHOOK_METHOD || 'GET').trim().toUpperCase()

  if (!webhookUrl) {
    return res.status(200).json({ skipped: true, message: 'No webhook configured' })
  }

  try {
    const params = buildWebhookParams(req.body || {})
    const separator = webhookUrl.includes('?') ? '&' : '?'
    const urlWithQuery = `${webhookUrl}${separator}${params.toString()}`

    const fetchOptions = { method: webhookMethod }

    if (webhookMethod !== 'GET') {
      fetchOptions.headers = { 'Content-Type': 'application/json' }
      // Keep JSON body for webhook providers that require POST body.
      fetchOptions.body = JSON.stringify(req.body || {})
    }

    const response = await fetch(urlWithQuery, fetchOptions)

    if (!response.ok) {
      console.warn('Webhook failed:', response.status, response.statusText)
      return res.status(response.status).json({ error: 'Webhook failed' })
    }

    const data = await response.json().catch(() => ({ status: 'success' }))
    return res.status(200).json({ ...data, sentAs: webhookMethod, querystring: params.toString() })
  } catch (error) {
    console.error('Webhook error:', error)
    return res.status(500).json({ error: 'Webhook request failed' })
  }
})

export default router
