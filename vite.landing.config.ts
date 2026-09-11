import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import {
  DEFAULT_PROTECTED_APP_ORIGIN,
  validateProtectedAppOrigin,
} from './src/config/landing'

const repositoryRoot = fileURLToPath(new URL('.', import.meta.url))
const landingRoot = fileURLToPath(new URL('./landing', import.meta.url))
const landingOutput = fileURLToPath(new URL('./dist/landing', import.meta.url))

/**
 * Motionskin of Motionsites Golden Portal.
 * Structure/motion 1:1; Urania type/palette/copy/Access CTA are the skin.
 */
export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, repositoryRoot, '')
  const protectedAppOrigin = validateProtectedAppOrigin(
    environment.VITE_PROTECTED_APP_ORIGIN ?? DEFAULT_PROTECTED_APP_ORIGIN,
    { development: mode !== 'production' },
  )

  return {
    root: landingRoot,
    publicDir: fileURLToPath(new URL('./landing/public', import.meta.url)),
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      fs: {
        allow: [repositoryRoot],
      },
    },
    define: {
      'import.meta.env.VITE_PROTECTED_APP_ORIGIN': JSON.stringify(protectedAppOrigin),
    },
    build: {
      outDir: landingOutput,
      emptyOutDir: true,
      sourcemap: false,
      assetsInlineLimit: 4096,
    },
  }
})
