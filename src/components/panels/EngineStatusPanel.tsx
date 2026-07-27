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
          <dl className="operator-status-summary grid gap-3 text-sm">
            <div className="min-w-0 rounded-sm border border-gold/20 bg-surface/90 px-4 py-3">
              <dt className="font-display text-xs uppercase tracking-[0.14em] text-gold">Availability</dt>
              <dd className="mt-2 flex min-w-0 items-center gap-2 break-words text-primary">
                <Dot state={availability(health.status)} />
                {health.status}
              </dd>
            </div>
            <div className="min-w-0 rounded-sm border border-gold/20 bg-surface/90 px-4 py-3">
              <dt className="font-display text-xs uppercase tracking-[0.14em] text-gold">Version</dt>
              <dd className="mt-2 break-words font-mono text-primary">{health.version}</dd>
            </div>
            <div className="min-w-0 rounded-sm border border-gold/20 bg-surface/90 px-4 py-3">
              <dt className="font-display text-xs uppercase tracking-[0.14em] text-gold">Uptime</dt>
              <dd className="mt-2 break-words font-mono text-primary">{fmtUptime(health.uptime_seconds)}</dd>
            </div>
            <div className="min-w-0 rounded-sm border border-gold/20 bg-surface/90 px-4 py-3">
              <dt className="font-display text-xs uppercase tracking-[0.14em] text-gold">Loaded</dt>
              <dd className="mt-2 break-words font-mono leading-relaxed text-primary">
                {health.engines_loaded} engines · {health.workflows_loaded} workflows
              </dd>
            </div>
          </dl>
        )}

        {/* Infrastructure values come verbatim from GET /health/ready. */}
        {ready && (
          <Collapsible title="Infrastructure" defaultOpen badge={ready.overall_status}>
            <div className="operator-status-infrastructure grid gap-3 text-sm">
              {([
                ['redis', ready.redis],
                ['postgres', ready.postgres],
                ['orchestrator', ready.orchestrator],
                ['bridge', ready.bridge_status],
              ] as const).map(([key, value]) => (
                <div key={key} className="flex min-w-0 items-start gap-3 rounded-sm border border-gold/20 bg-surface/90 px-3 py-3">
                  <Dot state={availability(value)} />
                  <div className="min-w-0">
                    <div className="font-display text-xs uppercase tracking-[0.14em] text-gold">{key}</div>
                    <div className="mt-1 [overflow-wrap:anywhere] font-mono text-sm text-primary">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </Collapsible>
        )}

        {/* A roster id alone proves loading, not health. Unknown stays neutral. */}
        {engines.length > 0 && (
          <Collapsible title="Engine roster" defaultOpen={Boolean(highlight)} badge={`${engines.length} engines`}>
            <ul className="operator-status-roster grid gap-2">
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
                        : 'border-gold/15 bg-surface/80',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-2">
                      <Dot state={state} />
                      <span className="min-w-0 [overflow-wrap:anywhere] font-mono text-primary">{id}</span>
                      {evidence && Number.isFinite(evidence.latency_ms) && (
                        <span className="ml-auto shrink-0 font-mono text-metadata">
                          {evidence.latency_ms}ms
                        </span>
                      )}
                    </div>
                    {evidence?.detail && (
                      <p className="mt-1 pl-3.5 text-secondary">{evidence.detail}</p>
                    )}
                  </li>
                )
              })}
            </ul>
          </Collapsible>
        )}

        {!loading && !health && !ready && engines.length === 0 && !error && (
          <p className="py-4 text-sm text-secondary">
            No operator evidence was returned by the configured endpoints.
          </p>
        )}

        {(ready || health) && (
          <p className="font-mono text-xs text-metadata">
            Endpoint evidence · {ready?.overall_status ?? health?.status}
          </p>
        )}
      </div>
    </OperatorField>
  )
}
