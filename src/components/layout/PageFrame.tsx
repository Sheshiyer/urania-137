/**
 * The ornate frame that surrounds a parent-node cluster view: an inset double
 * border, art-deco circuit-board corner brackets, and mid-edge diamonds —
 * reproducing the framing seen in every generated page reference. Rendered as
 * a fixed, non-interactive overlay so it stays put as the camera dives.
 */

/** Art-deco circuit-board corner ornament. */
function CornerOrnament({ className }: { className: string }) {
  return (
    <svg
      className={`pointer-events-none fixed z-10 h-36 w-36 text-gold/45 ${className}`}
      viewBox="0 0 140 140"
      fill="none"
      aria-hidden="true"
    >
      <path d="M6 6 H74 M6 6 V74" stroke="currentColor" strokeWidth="1" />
      <path d="M6 14 H58 M14 6 V58" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.5" />
      <path d="M6 26 H26 V6 M6 40 H40 V26 M6 54 H34 V40 M6 68 H24 V54" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.7" />
      <path d="M26 6 V22 M40 6 V26 M54 6 V34 M68 6 V22" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.7" />
      <path d="M20 20 L44 44" stroke="currentColor" strokeWidth="0.5" strokeOpacity="0.4" />
      <circle cx="6" cy="6" r="2.4" fill="currentColor" />
      <circle cx="74" cy="6" r="1.6" fill="currentColor" />
      <circle cx="6" cy="74" r="1.6" fill="currentColor" />
      <circle cx="26" cy="22" r="1.3" fill="currentColor" />
      <circle cx="54" cy="34" r="1.3" fill="currentColor" />
      <circle cx="44" cy="44" r="1.6" fill="currentColor" />
      <circle cx="40" cy="26" r="1" fill="currentColor" fillOpacity="0.7" />
      <circle cx="68" cy="22" r="1" fill="currentColor" fillOpacity="0.7" />
    </svg>
  )
}

function EdgeDiamond({ className }: { className: string }) {
  return <span className={`pointer-events-none fixed z-10 h-2 w-2 rotate-45 border border-gold/40 ${className}`} aria-hidden="true" />
}

export function PageFrame() {
  return (
    <>
      <div className="pointer-events-none fixed inset-3 rounded-sm border border-gold/15" aria-hidden="true" />
      <div className="pointer-events-none fixed inset-4 border border-gold/[0.06]" aria-hidden="true" />

      <CornerOrnament className="left-1 top-1" />
      <CornerOrnament className="right-1 top-1 -scale-x-100" />
      <CornerOrnament className="bottom-1 left-1 -scale-y-100" />
      <CornerOrnament className="bottom-1 right-1 -scale-100" />

      <EdgeDiamond className="left-1/2 top-2 -translate-x-1/2" />
      <EdgeDiamond className="bottom-2 left-1/2 -translate-x-1/2" />
    </>
  )
}
