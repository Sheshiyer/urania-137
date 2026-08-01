import './landing.css'

// The landing markup is rendered from LandingPage.tsx at build time by
// vite.landing.config.ts. This tiny entry intentionally does not hydrate React:
// the acquisition surface is declarative, works without JavaScript, and keeps
// authenticated application code out of the public bundle.
document.documentElement.dataset.landingReady = 'true'
