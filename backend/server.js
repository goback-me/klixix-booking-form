import app from './app.js'
import { describeEnvironment } from './routes/vehicleLookup.js'

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)

  // Make the InfoAgent environment impossible to miss: live lookups cost real money.
  const infoAgent = describeEnvironment()
  if (!infoAgent.ok) {
    console.warn(`⚠️  InfoAgent lookup DISABLED — ${infoAgent.error || 'credentials missing'}`)
  } else if (infoAgent.billable) {
    console.warn('💳 InfoAgent: ' + infoAgent.label)
    console.warn(`   ${infoAgent.baseUrl} | client ${infoAgent.clientIdHint} | cap ${infoAgent.dailyLimit}/day` +
      (infoAgent.monthlyLimit ? `, ${infoAgent.monthlyLimit}/month` : ''))
  } else {
    console.log('🧪 InfoAgent: ' + infoAgent.label)
    console.log(`   ${infoAgent.baseUrl} | client ${infoAgent.clientIdHint} | cap ${infoAgent.dailyLimit}/day` +
      (infoAgent.monthlyLimit ? `, ${infoAgent.monthlyLimit}/month` : ''))
  }
  if (infoAgent.ok) {
    console.log(`   limits: ${infoAgent.sessionLimit}/session · counters in ${infoAgent.counterStore} · Turnstile ${infoAgent.turnstile}`)
  }
  for (const problem of infoAgent.problems || []) {
    console.error(`🚫 InfoAgent lookups blocked: ${problem}`)
  }
})
