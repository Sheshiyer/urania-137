import { useRef } from 'react'
import { Link } from 'react-router-dom'
import BlurHighlight from '../../components/react-bits/blur-highlight'
import StaggeredText from '../../components/react-bits/staggered-text'
import { HERO, INVITATION, QA, QUOTE, SHOWCASE } from '../landingCopy'
import { useParallax } from '../useParallax'
import { useScrollReveal } from '../useScrollReveal'

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

export function HomePage({ appHref }: { appHref: string }) {
  const pageRef = useRef<HTMLElement>(null)
  const qaRef = useRef<HTMLElement>(null)
  const qaCloudRef = useRef<HTMLImageElement>(null)
  const quoteRef = useRef<HTMLElement>(null)
  const quoteOverlayRef = useRef<HTMLImageElement>(null)

  useScrollReveal(pageRef)
  useParallax(qaRef, qaCloudRef, 30)
  useParallax(quoteRef, quoteOverlayRef, -80)

  return (
    <main id="main-content" ref={pageRef}>
      <section className="gp-hero" aria-labelledby="landing-title">
        <video
          src="/media/gp-hero.mp4"
          poster="/media/urania/hero-2k.png"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
        <ConstellationRing className="gp-hero__geometry" />
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
        </div>
      </section>

      <div className="gp-cloud" aria-hidden="true">
        <img src="/media/gp-cloud.png" alt="" />
      </div>

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
              style={{ animationDelay: '0.45s' }}
            >
              {SHOWCASE.cta}
            </Link>
          </div>
          <div className="gp-showcase__veil" aria-hidden="true" />
        </section>
        <img className="gp-dove" src="/media/gp-dove.png" alt="" />
      </div>

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
