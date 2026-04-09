import { Router } from 'express'

const router = Router()

function toStr(value) {
  if (value === null || value === undefined) return ''
  return String(value)
}

function buildWebhookFields(payload) {
  const fields = {}

  const jobTypeNames = Array.isArray(payload.job_type_names) ? payload.job_type_names : []
  const serviceAddons = Array.isArray(payload.service_addons) ? payload.service_addons : []

  // Human-readable keys requested for webhook integrations.
  fields.Workshop = toStr(payload.workshop)
  fields.Name = toStr(payload.name)
  fields.Phone = toStr(payload.phone)
  fields.Email = toStr(payload.email)
  fields.State = toStr(payload.state)
  fields['Registration Number'] = toStr(payload.registration_number)
  fields.Make = toStr(payload.make)
  fields.Model = toStr(payload.model)
  fields.Year = toStr(payload.year)
  fields['Drop Off Time'] = toStr(payload.drop_off_time)
  fields.Note = toStr(payload.note)
  fields['Booking Note'] = toStr(payload.booking_note)
  fields.Alert = toStr(payload.alert)
  fields['Is Flexible'] = toStr(payload.is_flexible)

  // Summary keys plus indexed keys for line-item style display.
  fields['Job Type Names'] = jobTypeNames.join(', ')
  jobTypeNames.forEach((name, idx) => {
    fields[`Job Type Names ${idx + 1}`] = toStr(name)
  })

  fields['Service Addons'] = serviceAddons.join(', ')
  serviceAddons.forEach((name, idx) => {
    fields[`Service Addons ${idx + 1}`] = toStr(name)
  })

  // Keep machine-friendly originals for downstream compatibility.
  fields.workshop = toStr(payload.workshop)
  fields.name = toStr(payload.name)
  fields.phone = toStr(payload.phone)
  fields.email = toStr(payload.email)
  fields.state = toStr(payload.state)
  fields.registration_number = toStr(payload.registration_number)
  fields.make = toStr(payload.make)
  fields.model = toStr(payload.model)
  fields.year = toStr(payload.year)
  fields.drop_off_time = toStr(payload.drop_off_time)
  fields.job_type_names = jobTypeNames.join(', ')
  fields.note = toStr(payload.note)
  fields.booking_note = toStr(payload.booking_note)
  fields.alert = toStr(payload.alert)
  fields.service_addons = serviceAddons.join(', ')
  fields.is_flexible = toStr(payload.is_flexible)

  return fields
}

router.post('/send-webhook', async (req, res) => {
  const webhookUrl = (process.env.WEBHOOK_URL || process.env.ZAPIER_WEBHOOK_URL || '').trim()
  const webhookMethod = (process.env.WEBHOOK_METHOD || 'POST').trim().toUpperCase()

  if (!webhookUrl) {
    return res.status(200).json({ skipped: true, message: 'No webhook configured' })
  }

  try {
    const fields = buildWebhookFields(req.body || {})
    const params = new URLSearchParams(fields)
    const isGetMethod = webhookMethod === 'GET'
    const separator = webhookUrl.includes('?') ? '&' : '?'
    const targetUrl = isGetMethod ? `${webhookUrl}${separator}${params.toString()}` : webhookUrl

    const fetchOptions = { method: webhookMethod }

    if (!isGetMethod) {
      fetchOptions.headers = { 'Content-Type': 'application/json' }
      // Send flattened fields as top-level JSON keys.
      fetchOptions.body = JSON.stringify(fields)
    }

    const response = await fetch(targetUrl, fetchOptions)

    if (!response.ok) {
      console.warn('Webhook failed:', response.status, response.statusText)
      return res.status(response.status).json({ error: 'Webhook failed' })
    }

    const data = await response.json().catch(() => ({ status: 'success' }))
    return res.status(200).json({
      ...data,
      sentAs: webhookMethod,
      sentAsQuerystring: isGetMethod,
      sentFieldCount: Object.keys(fields).length,
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return res.status(500).json({ error: 'Webhook request failed' })
  }
})

export default router
