import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { HERO, INVITATION, QA, QUOTE, SHOWCASE } from '../landingCopy'
import { useParallax } from '../useParallax'
import { useScrollReveal } from '../useScrollReveal'

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
          poster="/media/gp-showcase.webp"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
        <div className="gp-hero__copy">
          <p className="gp-hero__kicker hero-fade-up">{HERO.kicker}</p>
          <p className="gp-hero__subkicker hero-fade-up">{HERO.subkicker}</p>
          <h1 id="landing-title" className="hero-fade-up">
            <span>{HERO.titleSerif}</span>
            <em>{HERO.titleSans}</em>
          </h1>
          <p className="gp-hero__lede hero-fade-up">{HERO.lede}</p>
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
          <img className="gp-showcase__bg" src="/media/gp-showcase.webp" alt="" />
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
