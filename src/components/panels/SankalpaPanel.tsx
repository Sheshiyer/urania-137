import { Download, Monitor, ShieldCheck } from 'lucide-react'
import { PRODUCT } from '../../config/product'

/**
 * Sankalpa — the desktop instrument, surfaced from Engine Status because it owns
 * the engines this console structurally cannot run.
 *
 * biofield / biofield-capture / face-reading need camera + image input under
 * explicit consent ("local-first + explicit opt-in to backend, explicit consent
 * everywhere"). A browser tab is the wrong place for that, so rather than offer
 * a surface that would quietly return nothing, we name where it actually lives.
 */
export function SankalpaPanel() {
  const { downloadUrl, localEngines } = PRODUCT.sankalpa

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-gold/15 bg-void/50 px-4 py-3">
        <Monitor className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
        <p className="text-sm leading-relaxed text-silver">
          <span className="font-display uppercase tracking-widest text-gold">Sankalpa</span> is the desktop instrument —
          one shell over the Noesis and Biofield surfaces, with a hard boundary between local work and anything the
          backend owns.
        </p>
      </div>

      <div>
        <div className="mb-2 font-display text-[10px] uppercase tracking-[0.2em] text-silver/70">Lives there, not here</div>
        <ul className="space-y-1.5">
          {localEngines.map((e) => (
            <li key={e} className="flex items-center gap-2 rounded border border-gold/10 bg-void/40 px-2.5 py-1.5 text-xs text-silver">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald" />
              <span className="text-parchment">{e}</span>
              <span className="ml-auto text-[10px] text-silver/60">camera / image · consent-gated</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[11px] leading-relaxed text-silver/60">
          These need capture under explicit consent, which a browser tab can&rsquo;t honour. This console deliberately
          doesn&rsquo;t offer them rather than return an empty result.
        </p>
      </div>

      {downloadUrl ? (
        <a
          href={downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald to-gold py-3 text-sm font-semibold text-void transition-all hover:brightness-110"
        >
          <Download className="h-4 w-4" />
          Get Sankalpa
        </a>
      ) : (
        <p className="rounded-lg border border-gold/10 bg-void/50 px-3 py-2 text-[11px] leading-relaxed text-silver/70">
          No public build yet — Sankalpa is at v0.1.0 and isn&rsquo;t published, so there&rsquo;s nothing honest to link to
          from here. This surface will offer the download once releases exist.
        </p>
      )}
    </div>
  )
}
