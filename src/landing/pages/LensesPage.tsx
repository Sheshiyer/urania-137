import { Link } from 'react-router-dom'
import DepthCard from '../../components/react-bits/depth-card'
import StaggeredText from '../../components/react-bits/staggered-text'
import { LENSES_PAGE } from '../landingCopy'

export function LensesPage() {
  return (
    <main id="main-content" className="eco-page">
      <header className="eco-header">
        <span className="liquid-glass eco-badge">{LENSES_PAGE.badge}</span>
        <h1>
          <span className="sr-only">{LENSES_PAGE.title}</span>
          <StaggeredText
            as="span"
            text={LENSES_PAGE.title}
            segmentBy="words"
            blur
            delay={40}
            respectReducedMotion
          />
        </h1>
        <p>{LENSES_PAGE.lede}</p>
      </header>

      <div className="eco-mosaic" aria-label="Seven parent lenses">
        {LENSES_PAGE.items.map((lens, index) => (
          <DepthCard
            key={lens.name}
            image={lens.image}
            title={`${lens.name} — ${lens.title}`}
            description={lens.body}
            width={index === 0 ? 920 : 300}
            height={index === 0 ? 280 : 340}
            borderRadius="18px"
            spotlight
            spotlightColor="rgba(230, 184, 77, 0.22)"
            respectReducedMotion
            disableOnMobile
            className={index === 0 ? 'eco-depth eco-depth--wide' : 'eco-depth'}
          />
        ))}
      </div>

      <p className="eco-next">
        <Link to={LENSES_PAGE.next.href}>{LENSES_PAGE.next.label}</Link>
      </p>
    </main>
  )
}
