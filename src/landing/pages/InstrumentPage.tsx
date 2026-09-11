import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import DepthCard from '../../components/react-bits/depth-card'
import StaggeredText from '../../components/react-bits/staggered-text'
import { INSTRUMENT_PAGE } from '../landingCopy'

export function InstrumentPage() {
  return (
    <main id="main-content" className="eco-page">
      <header className="eco-header">
        <span className="liquid-glass eco-badge">{INSTRUMENT_PAGE.badge}</span>
        <h1>
          <span className="sr-only">{INSTRUMENT_PAGE.title}</span>
          <StaggeredText
            as="span"
            text={INSTRUMENT_PAGE.title}
            segmentBy="words"
            blur
            delay={40}
            respectReducedMotion
          />
        </h1>
      </header>

      {INSTRUMENT_PAGE.rows.map((row) => (
        <article
          key={row.title}
          className={row.reverse ? 'eco-chess eco-chess--reverse' : 'eco-chess'}
        >
          <div className="eco-chess__copy">
            <h2>{row.title}</h2>
            <p>{row.body}</p>
            <Link className="liquid-glass-strong eco-pill" to={row.cta.href}>
              {row.cta.label}
              <ArrowUpRight size={16} aria-hidden="true" />
            </Link>
          </div>
          <div className="eco-chess__frame">
            <DepthCard
              image={row.image}
              title={row.title}
              description={row.alt}
              width={520}
              height={360}
              borderRadius="18px"
              spotlight
              spotlightColor="rgba(230, 184, 77, 0.28)"
              respectReducedMotion
              disableOnMobile
              className="eco-depth"
            />
          </div>
        </article>
      ))}

      <p className="eco-next">
        <Link to={INSTRUMENT_PAGE.next.href}>{INSTRUMENT_PAGE.next.label}</Link>
      </p>
    </main>
  )
}
