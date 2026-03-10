import { Router } from 'express'

const router = Router()

router.post('/send-webhook', async (req, res) => {
  const webhookUrl = process.env.ZAPIER_WEBHOOK_URL?.trim()

  if (!webhookUrl) {
    return res.status(200).json({ skipped: true, message: 'No webhook configured' })
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    })

    if (!response.ok) {
      console.warn('Webhook failed:', response.status, response.statusText)
      return res.status(response.status).json({ error: 'Webhook failed' })
    }

    const data = await response.json().catch(() => ({ status: 'success' }))
    return res.status(200).json(data)
  } catch (error) {
    console.error('Webhook error:', error)
    return res.status(500).json({ error: 'Webhook request failed' })
  }
})

export default router
