/**
 * The integrated Tryambakam Noesis product beyond this console.
 *
 * urania-137 is the **online entry** — the graph you arrive at. Two sibling
 * surfaces carry the rest of the experience, and this is the only place their
 * locations live:
 *
 *  - **Noesis Mirror** — the person-specific walkable 3D reading field. Serves
 *    the same premium packs as `723/Solos/{personId}` (readings, audio, video,
 *    slides, study guides) as proximity-triggered beacons. Live and canonical at
 *    `314.tryambakam.space` (per its ADMIN-README); worlds are access-gated
 *    behind CF Access + D1 grants, so a person's field only opens with a grant.
 *
 *  - **Sankalpa** — the Electron desktop instrument. Owns the local-first,
 *    consent-gated surfaces that cannot run in a browser tab: biofield capture,
 *    face-reading image input, and the media engines. Its contract is explicit:
 *    "local-first + explicit opt-in to backend, explicit consent everywhere".
 */

export const PRODUCT = {
  mirror: {
    /** Canonical app origin. Override for staging/preview deployments. */
    origin: (import.meta.env.VITE_MIRROR_ORIGIN as string | undefined) ?? 'https://314.tryambakam.space',
    /** A person's walkable field. */
    personUrl(personId: string): string {
      return `${this.origin}/p/${encodeURIComponent(personId.trim())}`
    },
  },
  sankalpa: {
    /**
     * No published build yet (v0.1.0, no publish target — local `release/` only),
     * so there is deliberately no download link to offer. Set this when releases
     * exist rather than pointing at something that doesn't.
     */
    downloadUrl: (import.meta.env.VITE_SANKALPA_DOWNLOAD_URL as string | undefined) ?? null,
    /** Engines whose input can't be gathered online — camera/media + consent. */
    localEngines: ['biofield', 'biofield-capture', 'face-reading'],
  },
} as const
