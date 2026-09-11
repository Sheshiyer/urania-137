import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { INSTRUMENT_PAGE } from '../landingCopy'

export function InstrumentPage() {
  return (
    <main id="main-content" className="eco-page">
      <header className="eco-header">
        <span className="liquid-glass eco-badge">{INSTRUMENT_PAGE.badge}</span>
        <h1>{INSTRUMENT_PAGE.title}</h1>
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
          <div className="liquid-glass eco-chess__frame">
            <img src={row.image} alt={row.alt} />
          </div>
        </article>
      ))}

      <p className="eco-next">
        <Link to={INSTRUMENT_PAGE.next.href}>{INSTRUMENT_PAGE.next.label}</Link>
      </p>
    </main>
  )
}
