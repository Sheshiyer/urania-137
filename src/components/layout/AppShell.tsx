import type { ReactNode } from 'react'

export type AppShellVariant = 'app' | 'threshold'

/**
 * The one shell. Every authenticated surface — the map, node rooms, Folio,
 * Settings, and now the Threshold — mounts inside it, so the wordmark, the
 * way out (Leave the field) and the degraded banner are never absent.
 *
 * `data-route-field` owns the remaining dynamic viewport and its scroll;
 * the masthead, dialogs and docks measure and lock against it, not `body`.
 */
export function AppShell({
  navigation,
  degradedNotice,
  variant = 'app',
  children,
}: {
  'data-app-shell'?: boolean
  navigation: ReactNode
  degradedNotice: string | null
  variant?: AppShellVariant
  children: ReactNode
}) {
  return (
    <div
      data-app-shell
      data-shell-variant={variant}
      className="flex h-dvh min-h-screen min-w-0 flex-col overflow-hidden bg-void text-parchment"
    >
      {navigation}
      {degradedNotice && (
        <div
          role="status"
          data-degraded-notice
          className="relative z-30 border-b hairline bg-surface/95 px-5 py-2 text-center text-meta leading-relaxed text-secondary"
        >
          <span className="font-display text-[10px] uppercase tracking-[0.2em] text-gold">
            Limited
          </span>
          <span className="mx-2 text-gold/40" aria-hidden="true">·</span>
          {degradedNotice}
          <span className="mx-2 text-gold/40" aria-hidden="true">·</span>
          Your saved work remains available.
        </div>
      )}
      <div
        data-route-field
        className="relative min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto"
      >
        {children}
      </div>
    </div>
  )
}
