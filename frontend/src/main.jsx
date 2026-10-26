import { render } from 'preact'
import App from '.'
import './style.css'

const isVip = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'vip'
render(<App isVip={isVip} />, document.getElementById('app'))