import { Link } from 'react-router-dom'
import { LENSES_PAGE } from '../landingCopy'

export function LensesPage() {
  return (
    <main id="main-content" className="eco-page">
      <header className="eco-header">
        <span className="liquid-glass eco-badge">{LENSES_PAGE.badge}</span>
        <h1>{LENSES_PAGE.title}</h1>
        <p>{LENSES_PAGE.lede}</p>
      </header>

      <div className="eco-mosaic" aria-label="Seven parent lenses">
        {LENSES_PAGE.items.map((lens, index) => (
          <article
            key={lens.name}
            className={index === 0 ? 'liquid-glass eco-card eco-card--wide' : 'liquid-glass eco-card'}
          >
            <span>{lens.name}</span>
            <h2>{lens.title}</h2>
            <p>{lens.body}</p>
          </article>
        ))}
      </div>

      <p className="eco-next">
        <Link to={LENSES_PAGE.next.href}>{LENSES_PAGE.next.label}</Link>
      </p>
    </main>
  )
}
