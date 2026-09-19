import { navigate } from '../hooks/useHashRoute'
import { SELEMENE_NODES } from '../data/selemeneNodes'
import { PageFrame } from '../components/layout/PageFrame'

/**
 * An address the map does not chart. Instead of silently rewriting the hash
 * to home, the instrument says so and offers the seven lenses as the way in.
 */
export function NotFoundPage({ hash }: { hash: string }) {
  return (
    <div className="relative min-h-full bg-void" data-not-found>
      <PageFrame />
      <main
        id="main-content"
        className="relative z-10 mx-auto flex min-h-[30rem] w-full max-w-3xl flex-col justify-center px-5 py-12 sm:px-10"
      >
        <p className="console-eyebrow">Uncharted</p>
        <h1 className="mt-3 font-serif text-h1 text-parchment">Not on the map.</h1>
        <p className="mt-4 max-w-xl text-body text-secondary">
          Nothing is addressed at{' '}
          <code className="rounded-pill border hairline bg-surface/80 px-2 py-0.5 font-mono text-meta text-metadata">
            {hash || '#/'}
          </code>
          . Choose a lens below, or return to the map.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={() => navigate('/')}>
            Return to map
          </button>
          <button type="button" className="btn-ghost" onClick={() => navigate('/readings')}>
            Browse Folio
          </button>
        </div>
        <ol className="mt-10 grid gap-2 sm:grid-cols-2" aria-label="Parent lenses">
          {SELEMENE_NODES.map((node, index) => (
            <li key={node.id}>
              <button
                type="button"
                onClick={() => navigate(`/node/${node.id}`)}
                className="flex min-h-11 w-full items-center justify-between rounded-tile border hairline bg-surface/60 px-4 py-3 text-left transition-colors hover:border-gold/50 hover:bg-surface"
              >
                <span>
                  <span className="mr-3 font-mono text-meta text-metadata">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="font-serif text-small uppercase tracking-[0.14em] text-parchment">
                    {node.label}
                  </span>
                </span>
                <span className="h-1.5 w-1.5 rotate-45 border border-gold/60" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      </main>
    </div>
  )
}
