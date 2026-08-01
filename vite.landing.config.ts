import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import {
  DEFAULT_PROTECTED_APP_ORIGIN,
  validateProtectedAppOrigin,
} from './src/config/landing'
import { LandingPage } from './src/landing/LandingPage'

const repositoryRoot = fileURLToPath(new URL('.', import.meta.url))
const landingRoot = fileURLToPath(new URL('./landing', import.meta.url))
const landingOutput = fileURLToPath(new URL('./dist/landing', import.meta.url))

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, repositoryRoot, '')
  const protectedAppOrigin = validateProtectedAppOrigin(
    environment.VITE_PROTECTED_APP_ORIGIN ?? DEFAULT_PROTECTED_APP_ORIGIN,
    { development: mode !== 'production' },
  )
  const staticLanding = renderToStaticMarkup(
    createElement(LandingPage, {
      protectedAppOrigin,
      development: mode !== 'production',
    }),
  )

  return {
    root: landingRoot,
    publicDir: fileURLToPath(new URL('./landing/public', import.meta.url)),
    plugins: [
      react(),
      {
        name: 'urania-static-landing',
        transformIndexHtml: {
          order: 'pre',
          handler(html) {
            return html.replace(
              '<div id="root"></div>',
              `<div id="root" data-react-static>${staticLanding}</div>`,
            )
          },
        },
      },
    ],
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
