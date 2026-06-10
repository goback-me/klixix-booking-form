import { render } from 'preact'
import App from '.'
import './style.css'

const isVip = typeof window !== 'undefined' && window.location.pathname === '/vip'
render(<App isVip={isVip} />, document.getElementById('app'))