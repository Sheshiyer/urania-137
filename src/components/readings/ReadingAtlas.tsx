import { COLORS, STATE } from '../../styles/tokens'
import type { ReadingDocument } from '../../lib/readings'

function compactLabel(label: string): string {
  return label.length > 22 ? `${label.slice(0, 20)}…` : label
}

/**
 * A semantic constellation of the source-supplied section structure.
 * Nodes are sections and edges mean "belongs to this reading". Flat records
 * render a single body node instead of receiving invented spokes.
 */
export function ReadingAtlas({ document }: { document: ReadingDocument }) {
  const native = document.structureSource === 'native'
  const sections = native ? document.sections : []
  const center = { x: 360, y: 190 }
  const radius = sections.length > 8 ? 150 : 135

  return (
    <figure className="console-card overflow-hidden p-3 sm:p-5" aria-labelledby={`reading-atlas-title-${document.id}`}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="console-eyebrow">Reading atlas</p>
          <h2 id={`reading-atlas-title-${document.id}`} className="mt-1 font-serif text-base uppercase tracking-[0.18em] text-parchment">
            {native ? 'Section structure' : 'Unstructured source'}
          </h2>
        </div>
        <p className="max-w-sm text-right text-[10px] leading-relaxed text-silver/65">
          {native
            ? 'Each spoke connects one source-supplied section to this reading.'
            : 'This saved record contains one flat body; no section relationships were stored.'}
        </p>
      </div>

      <svg
        viewBox="0 0 720 380"
        className="h-auto min-h-56 w-full"
        role="img"
        aria-labelledby={`reading-atlas-svg-title-${document.id} reading-atlas-svg-desc-${document.id}`}
      >
        <title id={`reading-atlas-svg-title-${document.id}`}>{native ? 'Reading section constellation' : 'Flat reading record'}</title>
        <desc id={`reading-atlas-svg-desc-${document.id}`}>
          {native
            ? `${sections.length} sections surround the reading: ${sections.map((section) => section.title).join(', ')}.`
            : 'A single central body is shown because the archive record has no native section structure.'}
        </desc>

        <circle cx={center.x} cy={center.y} r="96" fill="none" stroke={COLORS.gold} strokeOpacity="0.12" />
        <circle cx={center.x} cy={center.y} r="70" fill={COLORS.surface} stroke={COLORS.gold} strokeOpacity="0.46" />
        <circle cx={center.x} cy={center.y} r="55" fill="none" stroke={COLORS.gold} strokeOpacity="0.18" strokeDasharray="2 7" />
        <text x={center.x} y={center.y - 5} textAnchor="middle" fill={COLORS.parchment} fontSize="13" letterSpacing="2">
          {native ? 'READING' : 'FLAT RECORD'}
        </text>
        <text x={center.x} y={center.y + 17} textAnchor="middle" fill={COLORS.gold} fillOpacity="0.75" fontSize="9" letterSpacing="1.8">
          {document.nodeLabel.toUpperCase()}
        </text>

        {native &&
          sections.map((section, index) => {
            const angle = -Math.PI / 2 + (index * Math.PI * 2) / sections.length
            const x = center.x + Math.cos(angle) * radius
            const y = center.y + Math.sin(angle) * radius
            const labelX = center.x + Math.cos(angle) * (radius + 38)
            const labelY = center.y + Math.sin(angle) * (radius + 38)
            const anchor = Math.cos(angle) > 0.2 ? 'start' : Math.cos(angle) < -0.2 ? 'end' : 'middle'
            return (
              <g key={section.id}>
                <line x1={center.x} y1={center.y} x2={x} y2={y} stroke={COLORS.gold} strokeOpacity="0.24" />
                <circle cx={x} cy={y} r="15" fill={COLORS.void} stroke={STATE.goldWarm} strokeOpacity="0.75" />
                <circle cx={x} cy={y} r="4" fill={section.evidenceKind === 'witness' ? STATE.selected : COLORS.emerald} />
                <text x={labelX} y={labelY} textAnchor={anchor} fill={COLORS.parchment} fillOpacity="0.78" fontSize="9" letterSpacing="0.7">
                  {compactLabel(section.title).toUpperCase()}
                </text>
              </g>
            )
          })}
      </svg>

      <figcaption className="mt-2 flex flex-wrap gap-x-5 gap-y-2 border-t border-gold/10 pt-3 text-[9px] uppercase tracking-[0.16em] text-silver/60">
        {native ? (
          <>
            <span className="flex items-center gap-1.5">
              <i className="h-2 w-2 rounded-full bg-emerald" aria-hidden="true" /> Computed or system section
            </span>
            <span className="flex items-center gap-1.5">
              <i className="h-2 w-2 rounded-full" style={{ backgroundColor: STATE.selected }} aria-hidden="true" /> Witness section
            </span>
            <span>{sections.length} source-supplied sections</span>
          </>
        ) : (
          <span>One stored body · zero inferred sections</span>
        )}
      </figcaption>
    </figure>
  )
}
