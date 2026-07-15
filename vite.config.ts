import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
