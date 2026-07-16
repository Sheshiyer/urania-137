import { EngineStatus, SelemeneChild } from '../../types'

/** child.id → real Selemene engine_id where a 1:1 mapping exists. */
const ENGINE_ALIAS: Record<string, string> = {
  'vedic-clock': 'vedic-clock',
  panchanga: 'panchanga',
  'i-ching': 'i-ching',
  astro: 'transits',
  'human-design': 'human-design',
  enneagram: 'enneagram',
  'gene-keys': 'gene-keys',
}

function fmtUptime(s: number): string {
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${m}m` : `${m}m`
}

function Dot({ ok }: { ok: boolean }) {
  return <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-emerald' : 'bg-terracotta'}`} />
}

/**
 * Live Engine Status — renders the real `/health`, `/health/ready`, and engine
 * roster (never fabricated). The clicked engine child is highlighted when it
 * maps to a real Selemene engine.
 */
export function EngineStatusPanel({ child, status }: { child: SelemeneChild | null; status: EngineStatus }) {
  const { health, ready, engines, loading, error } = status
  const highlight = child ? ENGINE_ALIAS[child.id] : undefined
  const healthById = new Map((ready?.bridge_engines ?? []).map((e) => [e.engine_id, e]))

  if (loading) return <p className="py-6 text-center text-sm text-silver">Contacting the Selemene engines…</p>
  if (error && !health) return <p className="py-6 text-center text-sm text-terracotta">{error}</p>

  return (
    <div className="space-y-4">
      {/* Overall */}
      {health && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg border border-gold/15 bg-void/50 px-4 py-3 text-sm">
          <span className="flex items-center gap-2 text-parchment">
            <Dot ok={health.status === 'ok'} />
            <span className="font-display uppercase tracking-widest text-gold">v{health.version}</span>
          </span>
          <span className="text-silver">up {fmtUptime(health.uptime_seconds)}</span>
          <span className="text-silver">{health.engines_loaded} engines</span>
          <span className="text-silver">{health.workflows_loaded} workflows</span>
        </div>
      )}

      {/* Infra */}
      {ready && (
        <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          {([
            ['redis', ready.redis],
            ['postgres', ready.postgres],
            ['orchestrator', ready.orchestrator],
            ['bridge', ready.bridge_status],
          ] as const).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 rounded-md border border-gold/10 bg-void/40 px-2.5 py-2">
              <Dot ok={v === 'ok' || v === 'ready' || v === 'available'} />
              <div className="min-w-0">
                <div className="font-display uppercase tracking-wider text-silver/70 text-[9px]">{k}</div>
                <div className="truncate text-parchment">{v}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Engine roster */}
      <div>
        <div className="mb-2 font-display text-[10px] uppercase tracking-[0.2em] text-silver/70">
          {engines.length} Consciousness Engines
        </div>
        <ul className="grid max-h-56 grid-cols-2 gap-x-4 gap-y-1.5 overflow-auto pr-1 sm:grid-cols-3">
          {engines.map((id) => {
            const h = healthById.get(id)
            const ok = h ? h.healthy : true
            const isSel = id === highlight
            return (
              <li
                key={id}
                className={`flex items-center gap-2 rounded px-1.5 py-0.5 text-xs ${isSel ? 'bg-gold/15 text-parchment' : 'text-silver'}`}
                title={h ? `${h.detail} · ${h.latency_ms}ms` : 'loaded'}
              >
                <Dot ok={ok} />
                <span className="truncate">{id}</span>
                {h && <span className="ml-auto shrink-0 text-[10px] text-silver/50">{h.latency_ms}ms</span>}
              </li>
            )
          })}
        </ul>
      </div>
      <p className="text-[11px] text-silver/60">Live from the Selemene engine bridge · {ready?.overall_status ?? health?.status}.</p>
    </div>
  )
}
