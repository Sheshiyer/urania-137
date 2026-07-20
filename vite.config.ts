import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build-only config (T-056). Local dev is served by `wrangler pages dev dist`
// (npm run dev), which serves the SPA plus the /api/* Pages Functions — the
// Vite dev server and its /api/selemene proxy are retired.
export default defineConfig({
  plugins: [react()],
  // Ensure a single React instance — @gsap/react's useGSAP hook otherwise trips
  // "invalid hook call / more than one copy of React".
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['gsap', 'gsap/ScrollTrigger', '@gsap/react'],
  },
})
