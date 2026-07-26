import { EngineStatus, SelemeneChild } from '../../types'
import { OperatorField } from '../readings/OperatorField'
import { Collapsible } from '../ui/Collapsible'

function fmtUptime(s: number): string {
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`
}

function Dot({ state }: { state: 'available' | 'unavailable' | 'unknown' }) {
  return (
    <span
      className={[
        'h-1.5 w-1.5 rounded-full',
        state === 'available'
          ? 'bg-emerald'
          : state === 'unavailable'
            ? 'bg-terracotta'
            : 'bg-silver/40',
      ].join(' ')}
      role="img"
      aria-label={state}
    />
  )
}

function availability(value: string): 'available' | 'unavailable' {
  return value === 'ok' || value === 'ready' || value === 'available'
    ? 'available'
    : 'unavailable'
}

/**
 * Live Engine Status — renders the real `/health`, `/health/ready`, and engine
 * roster (never fabricated). The clicked engine child is highlighted when it
 * maps to a real Selemene engine.
 */
export function EngineStatusPanel({ child, status }: { child: SelemeneChild | null; status: EngineStatus }) {
  const { health, ready, engines, loading, error } = status
  const highlight = child?.run?.kind === 'engine' ? child.run.engineId : undefined
  const healthById = new Map((ready?.bridge_engines ?? []).map((e) => [e.engine_id, e]))

  return (
    <OperatorField title="Selemene engine status">
      <div className="space-y-4">
        {loading && (
          <p className="py-6 text-center text-sm text-silver">
            Contacting the Selemene endpoints…
          </p>
        )}

        {error && (
          <p className="rounded-sm border border-terracotta/25 bg-terracotta/5 px-3 py-2 text-sm text-evidence-copy-unresolved">
            {error}
          </p>
        )}

        {/* Overall fields are rendered only when GET /health returned them. */}
        {health && (
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-reading-rule bg-reading-rule text-sm sm:grid-cols-4">
            <div className="bg-reading-paper/95 px-3 py-2">
              <dt className="console-eyebrow">Availability</dt>
              <dd className="mt-1 flex items-center gap-2 text-reading-ink">
                <Dot state={availability(health.status)} />
                {health.status}
              </dd>
            </div>
            <div className="bg-reading-paper/95 px-3 py-2">
              <dt className="console-eyebrow">Version</dt>
              <dd className="mt-1 font-mono text-reading-ink">{health.version}</dd>
            </div>
            <div className="bg-reading-paper/95 px-3 py-2">
              <dt className="console-eyebrow">Uptime</dt>
              <dd className="mt-1 font-mono text-reading-ink">{fmtUptime(health.uptime_seconds)}</dd>
            </div>
            <div className="bg-reading-paper/95 px-3 py-2">
              <dt className="console-eyebrow">Loaded</dt>
              <dd className="mt-1 font-mono text-reading-ink">
                {health.engines_loaded} engines · {health.workflows_loaded} workflows
              </dd>
            </div>
          </dl>
        )}

        {/* Infrastructure values come verbatim from GET /health/ready. */}
        {ready && (
          <Collapsible title="Infrastructure" defaultOpen badge={ready.overall_status}>
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              {([
                ['redis', ready.redis],
                ['postgres', ready.postgres],
                ['orchestrator', ready.orchestrator],
                ['bridge', ready.bridge_status],
              ] as const).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 rounded-sm border border-reading-rule bg-reading-paper/70 px-2.5 py-2">
                  <Dot state={availability(value)} />
                  <div className="min-w-0">
                    <div className="console-eyebrow">{key}</div>
                    <div className="truncate font-mono text-reading-ink">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </Collapsible>
        )}

        {/* A roster id alone proves loading, not health. Unknown stays neutral. */}
        {engines.length > 0 && (
          <Collapsible title="Engine roster" defaultOpen={Boolean(highlight)} badge={`${engines.length} engines`}>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {engines.map((id) => {
                const evidence = healthById.get(id)
                const state = evidence
                  ? evidence.healthy
                    ? 'available'
                    : 'unavailable'
                  : 'unknown'
                const selected = id === highlight
                return (
                  <li
                    key={id}
                    className={[
                      'rounded border px-2.5 py-2 text-xs',
                      selected
                        ? 'border-gold/45 bg-gold/10'
                        : 'border-reading-rule bg-reading-paper/60',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-2">
                      <Dot state={state} />
                      <span className="truncate font-mono text-reading-ink">{id}</span>
                      {evidence && Number.isFinite(evidence.latency_ms) && (
                        <span className="ml-auto shrink-0 font-mono text-reading-muted">
                          {evidence.latency_ms}ms
                        </span>
                      )}
                    </div>
                    {evidence?.detail && (
                      <p className="mt-1 pl-3.5 text-reading-muted">{evidence.detail}</p>
                    )}
                  </li>
                )
              })}
            </ul>
          </Collapsible>
        )}

        {!loading && !health && !ready && engines.length === 0 && !error && (
          <p className="py-4 text-sm text-reading-muted">
            No operator evidence was returned by the configured endpoints.
          </p>
        )}

        {(ready || health) && (
          <p className="font-mono text-[11px] text-reading-muted">
            Endpoint evidence · {ready?.overall_status ?? health?.status}
          </p>
        )}
      </div>
    </OperatorField>
  )
}
