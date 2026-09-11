import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import StaggeredText from '../../components/react-bits/staggered-text'
import { ENTER_PAGE } from '../landingCopy'

export function EnterPage({ appHref }: { appHref: string }) {
  return (
    <main id="main-content" className="eco-enter" data-urania-threshold>
      <video
        src="/media/gp-hero.mp4"
        poster="/media/urania/enter.jpg"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-hidden="true"
      />
      <div className="eco-enter__veil eco-enter__veil--top" aria-hidden="true" />
      <div className="eco-enter__veil eco-enter__veil--bottom" aria-hidden="true" />
      <div className="eco-enter__copy">
        <h1>
          <span className="sr-only">{ENTER_PAGE.title}</span>
          <StaggeredText
            as="span"
            text={ENTER_PAGE.title}
            segmentBy="words"
            blur
            delay={36}
            respectReducedMotion
          />
        </h1>
        <p>{ENTER_PAGE.lede}</p>
        <div className="eco-enter__actions">
          <a className="liquid-glass-strong eco-pill" href={appHref} data-protected-app-cta>
            {ENTER_PAGE.primary}
            <ArrowUpRight size={18} aria-hidden="true" />
          </a>
          <Link className="eco-pill eco-pill--solid" to={ENTER_PAGE.secondary.href}>
            {ENTER_PAGE.secondary.label}
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <p className="eco-enter__note">{ENTER_PAGE.note}</p>
      </div>
    </main>
  )
}
