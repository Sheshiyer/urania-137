import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { LandingPage } from './LandingPage'
import './void-atlas.css'
import './landing-chrome.css'

const root = document.getElementById('root')
if (root) {
  createRoot(root).render(
    createElement(LandingPage, {
      protectedAppOrigin: import.meta.env.VITE_PROTECTED_APP_ORIGIN,
      development: import.meta.env.DEV,
    }),
  )
  document.documentElement.dataset.landingReady = 'true'
}
