import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

// Build-time app identity (release workflow). The version is READ from
// package.json — never hardcoded — so `node scripts/release.mjs` bumping the
// version is the single source of truth. The short SHA is best-effort: a
// build outside a git checkout still succeeds, stamped 'dev'.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

function buildSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || 'dev'
  } catch {
    return 'dev'
  }
}

// Build-only config (T-056). Local dev is served by `wrangler pages dev dist`
// (npm run dev), which serves the SPA plus the /api/* Pages Functions — the
// Vite dev server and its /api/selemene proxy are retired.
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __APP_BUILD_SHA__: JSON.stringify(buildSha()),
  },
  // Ensure a single React instance — @gsap/react's useGSAP hook otherwise trips
  // "invalid hook call / more than one copy of React".
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['gsap', 'gsap/ScrollTrigger', '@gsap/react'],
  },
})
