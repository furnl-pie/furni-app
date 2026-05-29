import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {})
}

const path = window.location.pathname

async function mount() {
  let Component
  if (path === '/feedback') {
    const m = await import('./components/FeedbackPage.jsx')
    Component = m.default
  } else if (path === '/delete-account') {
    const m = await import('./components/DeleteAccountPage.jsx')
    Component = m.default
  } else {
    const m = await import('./App.jsx')
    Component = m.default
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <Component />
    </StrictMode>
  )
}

mount()
