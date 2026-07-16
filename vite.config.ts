import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load ALL env (incl. non-VITE_ server secrets) for the dev proxy only.
  // These are used Node-side here and are NOT exposed to the client bundle.
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.SELEMENE_API_URL || process.env.SELEMENE_API_URL || 'https://selemene.tryambakam.space'
  const apiKey = env.SELEMENE_API_KEY || process.env.SELEMENE_API_KEY || ''

  return {
    plugins: [react()],
    // Ensure a single React instance — @gsap/react's useGSAP hook otherwise trips
    // "invalid hook call / more than one copy of React".
    resolve: {
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['gsap', 'gsap/ScrollTrigger', '@gsap/react'],
    },
    // Dev mirror of the Vercel serverless proxy: forwards /api/selemene/* to the
    // Selemene API with the secret X-API-Key injected server-side.
    server: {
      proxy: {
        '/api/selemene': {
          target: apiTarget,
          changeOrigin: true,
          secure: true,
          rewrite: (p) => p.replace(/^\/api\/selemene/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              if (apiKey) proxyReq.setHeader('X-API-Key', apiKey)
            })
          },
        },
      },
    },
  }
})
