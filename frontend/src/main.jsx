import { render } from 'preact'
import App from '.'
import './style.css'

// STAGING-ONLY: add a visible "test bookings only" banner and a noindex tag.
// Gated on VITE_STAGING so production (flag unset) is completely unaffected.
if (import.meta.env.VITE_STAGING === '1' && typeof document !== 'undefined') {
  const m = document.createElement('meta')
  m.name = 'robots'; m.content = 'noindex, nofollow, noarchive'
  document.head.appendChild(m)
  const b = document.createElement('div')
  b.textContent = 'STAGING — TEST BOOKINGS ONLY'
  b.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#b26a00;color:#fff;font:600 12px/1 system-ui,sans-serif;text-align:center;padding:6px;letter-spacing:.04em'
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(b))
  if (document.body) document.body.appendChild(b)
}

const isVip = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'vip'
render(<App isVip={isVip} />, document.getElementById('app'))