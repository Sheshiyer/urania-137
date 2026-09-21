import { useRef, useCallback, lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import BlurHighlight from '../../components/react-bits/blur-highlight'
import StaggeredText from '../../components/react-bits/staggered-text'
import {
  ENGINE_ROSTER,
  HERO,
  INFRASTRUCTURE,
  INVITATION,
  QA,
  QUOTE,
  ROOMS_OVERVIEW,
  SHOWCASE,
  WORKFLOW_ROSTER,
} from '../landingCopy'
import { useParallax } from '../useParallax'
import { useScrollReveal } from '../useScrollReveal'

const ConstellationScene = lazy(() =>
  import('../components/ConstellationScene').then(m => ({ default: m.ConstellationScene }))
)

function ConstellationRing({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 600 600" fill="none" aria-hidden="true">
      <circle cx="300" cy="300" r="280" stroke="rgb(197 160 23 / 0.12)" strokeWidth="0.5" />
      <circle cx="300" cy="300" r="200" stroke="rgb(197 160 23 / 0.08)" strokeWidth="0.5" />
      <circle cx="300" cy="300" r="120" stroke="rgb(197 160 23 / 0.06)" strokeWidth="0.5" />
      {[0, 51.4, 102.9, 154.3, 205.7, 257.1, 308.6].map((angle) => {
        const rad = (angle * Math.PI) / 180
        const x = 300 + 280 * Math.cos(rad)
        const y = 300 + 280 * Math.sin(rad)
        return <circle key={angle} cx={x} cy={y} r="3" fill="rgb(197 160 23 / 0.18)" />
      })}
      {[0, 51.4, 102.9, 154.3, 205.7, 257.1, 308.6].map((angle, i, arr) => {
        const rad1 = (angle * Math.PI) / 180
        const rad2 = (arr[(i + 2) % arr.length] * Math.PI) / 180
        return (
          <line
            key={`l${angle}`}
            x1={300 + 280 * Math.cos(rad1)}
            y1={300 + 280 * Math.sin(rad1)}
            x2={300 + 280 * Math.cos(rad2)}
            y2={300 + 280 * Math.sin(rad2)}
            stroke="rgb(197 160 23 / 0.06)"
            strokeWidth="0.5"
          />
        )
      })}
    </svg>
  )
}

function FlowerOfLife({ className }: { className?: string }) {
  const r = 40
  const centers = [
    [0, 0],
    ...Array.from({ length: 6 }, (_, i) => {
      const a = (i * 60 * Math.PI) / 180
      return [r * Math.cos(a), r * Math.sin(a)]
    }),
  ]
  return (
    <svg className={className} viewBox="-100 -100 200 200" fill="none" aria-hidden="true">
      {centers.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={r} stroke="rgb(197 160 23 / 0.08)" strokeWidth="0.5" />
      ))}
    </svg>
  )
}

const ROOM_COLORS: Record<string, string> = {
  gold: 'var(--room-gold, #C5A017)',
  violet: 'var(--room-violet, #2D0050)',
  cyan: 'var(--room-cyan, #10B5A7)',
  amber: 'var(--room-amber, #E6B84D)',
}

export function HomePage({ appHref }: { appHref: string }) {
  const pageRef = useRef<HTMLElement>(null)
  const qaRef = useRef<HTMLElement>(null)
  const qaCloudRef = useRef<HTMLImageElement>(null)
  const quoteRef = useRef<HTMLElement>(null)
  const quoteOverlayRef = useRef<HTMLImageElement>(null)

  useScrollReveal(pageRef)
  useParallax(qaRef, qaCloudRef, 30)
  useParallax(quoteRef, quoteOverlayRef, -80)

  const handleRoomClick = useCallback((_roomId: string) => {
    const el = document.getElementById('rooms')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }, [])

  return (
    <main id="main-content" ref={pageRef}>
      {/* Hero — interactive 3D constellation */}
      <section className="gp-hero" aria-labelledby="landing-title">
        <Suspense fallback={null}>
          <ConstellationScene
            onRoomClick={handleRoomClick}
            className="gp-hero__scene"
          />
        </Suspense>
        <div className="gp-hero__veil" aria-hidden="true" />
        <div className="gp-hero__copy">
          <p className="gp-hero__kicker hero-fade-up">{HERO.kicker}</p>
          <p className="gp-hero__subkicker hero-fade-up">{HERO.subkicker}</p>
          <h1 id="landing-title" className="gp-hero-stagger">
            <span className="sr-only">{HERO.title}</span>
            <StaggeredText
              as="span"
              text={`${HERO.titleSerif}|${HERO.titleSans}`}
              separator="|"
              segmentBy="chars"
              blur
              delay={28}
              respectReducedMotion
            />
          </h1>
          <BlurHighlight
            highlightedBits={['Keep the authority']}
            highlightColor="#e6b84d"
            blurAmount={8}
            className="gp-hero__lede"
          >
            {HERO.lede}
          </BlurHighlight>
          <a className="gp-cta liquid-glass hero-fade-up" href={appHref} data-protected-app-cta>
            {HERO.cta}
          </a>
          <p className="gp-hero__orbit-hint hero-fade-up" style={{ animationDelay: '1.2s' }}>
            Drag to orbit the constellation
          </p>
        </div>
      </section>

      <div className="gp-cloud" aria-hidden="true">
        <img src="/media/gp-cloud.png" alt="" />
      </div>

      {/* Showcase — instrument preview */}
      <div className="gp-showcase-wrap">
        <section id={SHOWCASE.id} className="gp-showcase" aria-labelledby="instrument-title">
          <img className="gp-showcase__bg" src="/media/urania/hero-2k.png" alt="" />
          <div className="gp-showcase__copy">
            <h2 id="instrument-title" className="reveal">
              {SHOWCASE.title}
            </h2>
            {SHOWCASE.lines.map((line, index) => (
              <p key={line} className="reveal" style={{ animationDelay: `${0.15 * (index + 1)}s` }}>
                {line}
              </p>
            ))}
            <Link
              className="gp-ghost reveal"
              to={SHOWCASE.href}
              style={{ animationDelay: '0.6s' }}
            >
              {SHOWCASE.cta}
            </Link>
          </div>
          <div className="gp-showcase__veil" aria-hidden="true" />
        </section>
        <img className="gp-dove" src="/media/gp-dove.png" alt="" />
      </div>

      {/* Rooms overview */}
      <section id={ROOMS_OVERVIEW.id} className="gp-rooms" aria-labelledby="rooms-title">
        <h2 id="rooms-title" className="gp-rooms__title reveal">{ROOMS_OVERVIEW.title}</h2>
        <p className="gp-rooms__lede reveal">{ROOMS_OVERVIEW.lede}</p>
        <div className="gp-rooms__grid">
          {ROOMS_OVERVIEW.rooms.map((room, index) => (
            <article
              key={room.id}
              className="gp-rooms__card liquid-glass reveal"
              style={{ animationDelay: `${0.08 * (index + 1)}s` }}
            >
              <div
                className="gp-rooms__accent"
                style={{ backgroundColor: ROOM_COLORS[room.color] }}
                aria-hidden="true"
              />
              <h3>{room.label}</h3>
              <p className="gp-rooms__epithet">{room.epithet}</p>
              <p className="gp-rooms__tagline">{room.tagline}</p>
              <p className="gp-rooms__caps">
                {room.engines.length > 0 && (
                  <span>{room.engines.length} engine{room.engines.length > 1 ? 's' : ''}</span>
                )}
                {room.workflows.length > 0 && (
                  <span>{room.workflows.length} workflow{room.workflows.length > 1 ? 's' : ''}</span>
                )}
                {room.witnesses.length > 0 && (
                  <span>{room.witnesses.length} witness mode{room.witnesses.length > 1 ? 's' : ''}</span>
                )}
              </p>
            </article>
          ))}
        </div>
        <p className="gp-rooms__cta reveal">
          <Link className="gp-ghost" to="/lenses">See each room in detail</Link>
        </p>
      </section>

      {/* Engine roster */}
      <section id={ENGINE_ROSTER.id} className="gp-engines" aria-labelledby="engines-title">
        <ConstellationRing className="gp-engines__geometry" />
        <h2 id="engines-title" className="reveal">{ENGINE_ROSTER.title}</h2>
        <p className="gp-engines__lede reveal">{ENGINE_ROSTER.lede}</p>
        <div className="gp-engines__grid">
          {ENGINE_ROSTER.engines.map((engine, index) => (
            <div
              key={engine.id}
              className="gp-engines__item reveal"
              style={{ animationDelay: `${0.06 * (index + 1)}s` }}
            >
              <div className="gp-engines__head">
                <span className="gp-engines__name">{engine.name}</span>
                <span className={`gp-engines__tag gp-engines__tag--${engine.substrate.toLowerCase()}`}>
                  {engine.substrate}
                </span>
              </div>
              <p>{engine.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Workflow roster */}
      <section id={WORKFLOW_ROSTER.id} className="gp-workflows" aria-labelledby="workflows-title">
        <h2 id="workflows-title" className="reveal">{WORKFLOW_ROSTER.title}</h2>
        <p className="gp-workflows__lede reveal">{WORKFLOW_ROSTER.lede}</p>
        <div className="gp-workflows__grid">
          {WORKFLOW_ROSTER.workflows.map((wf, index) => (
            <article
              key={wf.id}
              className="gp-workflows__card liquid-glass reveal"
              style={{ animationDelay: `${0.1 * (index + 1)}s` }}
            >
              <h3>{wf.name}</h3>
              <p>{wf.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Infrastructure */}
      <section id={INFRASTRUCTURE.id} className="gp-infra" aria-labelledby="infra-title">
        <FlowerOfLife className="gp-infra__geometry" />
        <h2 id="infra-title" className="reveal">{INFRASTRUCTURE.title}</h2>
        <div className="gp-infra__grid">
          {INFRASTRUCTURE.sections.map((section, index) => (
            <article
              key={section.title}
              className="gp-infra__card reveal"
              style={{ animationDelay: `${0.1 * (index + 1)}s` }}
            >
              <h3>{section.title}</h3>
              <p>{section.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Q&A */}
      <section ref={qaRef} id={QA.id} className="gp-qa" aria-labelledby="lenses-title">
        <FlowerOfLife className="gp-qa__geometry" />
        <h2 id="lenses-title" className="gp-qa__title reveal">
          <span>{QA.title[0]}</span>
          <em>{QA.title[1]}</em>
          <span>{QA.title[2]}</span>
        </h2>
        <div className="gp-qa__grid">
          <div>
            {QA.left.map((item, index) => (
              <article
                key={item.q}
                className="reveal"
                style={{ animationDelay: `${0.12 * (index + 1)}s` }}
              >
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </article>
            ))}
          </div>
          <div className="gp-qa__col--right">
            {QA.right.map((item, index) => (
              <article
                key={item.q}
                className="reveal"
                style={{ animationDelay: `${0.12 * (index + 4)}s` }}
              >
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </article>
            ))}
          </div>
        </div>
        <img ref={qaCloudRef} className="gp-qa__cloud" src="/media/gp-cloud.png" alt="" />
      </section>

      {/* Quote / principles */}
      <section
        ref={quoteRef}
        id={QUOTE.id}
        className="gp-quote"
        aria-labelledby="principles-title"
      >
        <ConstellationRing className="gp-quote__geometry" />
        <p id="principles-title" className="reveal-scale">
          {QUOTE.text}
          <em>{QUOTE.emphasis}</em>
        </p>
        <img
          ref={quoteOverlayRef}
          className="gp-quote__overlay"
          src="/media/gp-quote-overlay.png"
          alt=""
        />
      </section>

      {/* Invitation / threshold */}
      <section
        id={INVITATION.id}
        className="gp-invite liquid-glass"
        aria-labelledby="invitation-title"
        data-urania-threshold
      >
        <p className="gp-invite__kicker">{INVITATION.kicker}</p>
        <h2 id="invitation-title">{INVITATION.title}</h2>
        <p>{INVITATION.lede}</p>
        <p className="gp-invite__note">{INVITATION.note}</p>
        <a className="gp-cta gp-cta--solid" href={appHref} data-protected-app-cta>
          {INVITATION.cta}
        </a>
      </section>
    </main>
  )
}
