import { useState } from 'react'
import { ExternalLink, Compass } from 'lucide-react'
import { PRODUCT } from '../../config/product'

/**
 * The door from the online console into Noesis Mirror — a person's walkable 3D
 * reading field, where the premium pack (readings, audio, video, slides) becomes
 * proximity-triggered beacons.
 *
 * Worlds are access-gated (CF Access + D1 grants), so we open the field rather
 * than pretending to read it: without a grant the API answers 401 and the Mirror
 * itself handles the sign-in. We never imply a world exists for an id we can't check.
 */
export function MirrorPanel() {
  const [personId, setPersonId] = useState('')
  const id = personId.trim()
  const url = id ? PRODUCT.mirror.personUrl(id) : null

  return (
    <div className="space-y-4">
      <p className="leading-relaxed text-silver">
        Your readings also exist as a walkable field. Noesis Mirror renders a person&rsquo;s premium pack as beacons you
        discover by proximity — the same readings, audio, video and slides the Folio archives here.
      </p>

      <div className="space-y-2">
        <label className="font-display text-[10px] uppercase tracking-[0.2em] text-silver/70">Person</label>
        <input
          value={personId}
          onChange={(e) => setPersonId(e.target.value)}
          placeholder="personId — e.g. harshita"
          className="w-full rounded-lg border border-gold/20 bg-void/50 px-3 py-2 text-parchment placeholder:text-silver/50 focus:border-gold/50 focus:outline-none"
          aria-label="Person id"
        />
      </div>

      <a
        href={url ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        aria-disabled={!url}
        onClick={(e) => !url && e.preventDefault()}
        className={`flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition-all ${
          url ? 'bg-gradient-to-r from-emerald to-gold text-void hover:brightness-110' : 'cursor-not-allowed bg-silver/10 text-silver/50'
        }`}
      >
        <Compass className="h-4 w-4" />
        Enter the field
        <ExternalLink className="h-3.5 w-3.5" />
      </a>

      {url && <p className="break-all text-[11px] text-silver/60">{url}</p>}

      <p className="rounded-lg border border-gold/10 bg-void/50 px-3 py-2 text-[11px] leading-relaxed text-silver/70">
        Fields are granted per person — without a grant the Mirror asks you to sign in. This console can&rsquo;t verify a
        grant from here, so the link opens the field rather than promising one exists.
      </p>
    </div>
  )
}
