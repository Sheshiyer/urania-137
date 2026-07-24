/// <reference types="vite/client" />

/**
 * Build-time app identity, injected via vite.config.ts `define` (release
 * workflow). Read through src/lib/appVersion.ts — never referenced directly
 * by components. Declared here so `tsc` stays green.
 */
declare const __APP_VERSION__: string
declare const __APP_BUILD_TIME__: string
declare const __APP_BUILD_SHA__: string
