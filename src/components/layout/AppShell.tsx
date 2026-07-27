import type { ReactNode } from 'react'

export function AppShell({
  navigation,
  degradedNotice,
  children,
}: {
  'data-app-shell'?: boolean
  navigation: ReactNode
  degradedNotice: string | null
  children: ReactNode
}) {
  return (
    <div
      data-app-shell
      className="flex h-dvh min-h-screen min-w-0 flex-col overflow-hidden bg-void text-parchment"
    >
      {navigation}
      {degradedNotice && (
        <div
          role="status"
          className="relative z-30 border-b border-gold/20 bg-surface/95 px-5 py-2 text-center text-xs leading-relaxed text-secondary"
        >
          Personalised routes are temporarily limited. Your saved work remains
          available; retry after the connection settles.
        </div>
      )}
      <div
        data-route-field
        className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto"
      >
        {children}
      </div>
    </div>
  )
}
