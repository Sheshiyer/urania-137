import type { ReadingMediaElement, ReadingMediaItem } from '../../../lib/readings'
import { ElementFrame } from '../elements/ElementFrame'

function safeMediaUrl(item: ReadingMediaItem): string | null {
  if (item.status !== 'available' || !item.url) return null
  if (/[?&](?:access_token|token|api_key|secret|password)=/i.test(item.url)) return null
  if (/^https?:\/\//i.test(item.url) || item.url.startsWith('/')) return item.url
  if (item.mediaType === 'image' && /^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(item.url)) return item.url
  if (item.mediaType === 'audio' && /^data:audio\/(?:mpeg|wav|ogg);base64,/i.test(item.url)) return item.url
  return null
}

export function MediaArtifact({ element }: { element: ReadingMediaElement }) {
  return (
    <ElementFrame
      element={element}
      encoding="Playback and viewing require an allowlisted media envelope; metadata and source provenance remain printed."
    >
      <div className="space-y-3" data-engine-artifact="media-artifact">
        {element.items.map((item) => {
          const url = safeMediaUrl(item)
          const renderedStatus = url ? 'available' : item.status === 'failed' ? 'failed' : 'unavailable'
          return (
            <article key={item.id} className="min-w-0 border border-gold/15 p-3" data-media-status={renderedStatus}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="min-w-0 [overflow-wrap:anywhere] text-sm text-parchment">{item.label}</h4>
                <span className="min-w-0 [overflow-wrap:anywhere] text-xs uppercase tracking-[0.12em] text-metadata">
                  {url ? 'Media available' : 'Media unavailable'}
                </span>
              </div>
              {url && item.mediaType === 'audio' && (
                <audio className="mt-3 block w-full min-w-0 max-w-full" controls preload="none" aria-label={item.label}>
                  <source src={url} {...(item.mimeType ? { type: item.mimeType } : {})} />
                  {item.textEquivalent}
                </audio>
              )}
              {url && item.mediaType === 'image' && (
                <img className="mt-3 max-h-80 w-full object-contain" src={url} alt={item.textEquivalent} referrerPolicy="no-referrer" />
              )}
              <p className="mt-3 [overflow-wrap:anywhere] text-xs text-secondary">{item.textEquivalent}</p>
              <table className="mt-3 w-full text-left text-xs">
                <caption className="sr-only">Media metadata and provenance</caption>
                <tbody>
                  <tr><th scope="row">Type</th><td>{item.mediaType}</td></tr>
                  <tr><th scope="row">MIME</th><td>{item.mimeType ?? 'Not supplied'}</td></tr>
                  <tr><th scope="row">Source</th><td className="break-all">{item.sourcePath}</td></tr>
                </tbody>
              </table>
            </article>
          )
        })}
      </div>
    </ElementFrame>
  )
}
