import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from '@/app/App'
import '@/styles/globals.css'

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason
  const message = reason instanceof Error ? reason.message : String(reason)
  const stack = reason instanceof Error ? reason.stack : ''

  console.error(
    `UNHANDLED PROMISE REJECTION: ${message}`,
    stack ? `\n${stack}` : '',
    '\nFull rejection object:',
    reason,
  )
})

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
