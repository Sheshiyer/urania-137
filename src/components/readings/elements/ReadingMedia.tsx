import type { ReadingMediaElement, ReadingMediaItem } from '../../../lib/readings'
import { ElementFrame } from './ElementFrame'

const STATUS_LABEL: Record<ReadingMediaItem['status'], string> = {
  available: 'Available',
  missing: 'Not supplied',
  failed: 'Unavailable',
}

function MediaItem({ item }: { item: ReadingMediaItem }) {
  return (
    <article className="border border-gold/15 bg-void/70 p-3" data-media-status={item.status}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs text-parchment/90">{item.label}</h4>
        <span className="font-display text-xs uppercase tracking-[0.15em] text-silver/60">
          {STATUS_LABEL[item.status]}
        </span>
      </div>

      {item.status === 'available' && item.url && item.mediaType === 'audio' && (
        <audio className="mt-3 w-full" controls preload="none" aria-label={item.label}>
          <source src={item.url} {...(item.mimeType ? { type: item.mimeType } : {})} />
          {item.textEquivalent}
        </audio>
      )}
      {item.status === 'available' && item.url && item.mediaType === 'image' && (
        <img
          className="mt-3 max-h-80 w-full border border-parchment/10 bg-void object-contain"
          src={item.url}
          alt={item.textEquivalent}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
        />
      )}

      <p className="mt-3 text-xs leading-relaxed text-silver/70">{item.textEquivalent}</p>
      {item.detail && <p className="mt-1 text-xs leading-relaxed text-evidence-copy-unresolved/85">{item.detail}</p>}
      <p className="mt-2 break-all font-mono text-xs text-silver/45">{item.sourcePath}</p>

      {item.status === 'available' && item.url && (
        <a
          className="mt-3 inline-flex min-h-10 items-center border border-gold/25 px-3 font-display text-xs uppercase tracking-[0.16em] text-gold"
          href={item.url}
          download
          rel="noreferrer"
          referrerPolicy="no-referrer"
        >
          Download {item.mediaType}
        </a>
      )}
    </article>
  )
}

export function ReadingMedia({ element }: { element: ReadingMediaElement }) {
  return (
    <ElementFrame
      element={element}
      encoding="Media is opened only from an allowlisted URL or non-SVG data type; its source state remains written in text."
    >
      <div className="space-y-3">
        {element.items.map((item) => <MediaItem key={item.id} item={item} />)}
      </div>
    </ElementFrame>
  )
}
