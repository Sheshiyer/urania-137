import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PRINCIPLES_PAGE } from '../landingCopy'

type CategoryKey = (typeof PRINCIPLES_PAGE.categories)[number]['key']

export function PrinciplesPage({ appHref }: { appHref: string }) {
  const [active, setActive] = useState<CategoryKey>('field')
  const [open, setOpen] = useState<number | null>(0)
  const items = PRINCIPLES_PAGE.faqs[active]

  return (
    <main id="main-content" className="eco-page">
      <header className="eco-faq-head">
        <div>
          <span className="liquid-glass eco-badge">{PRINCIPLES_PAGE.badge}</span>
          <h1>{PRINCIPLES_PAGE.title}</h1>
        </div>
        <p>{PRINCIPLES_PAGE.lede}</p>
      </header>

      <div className="eco-faq">
        <aside>
          <div className="liquid-glass eco-faq__cats">
            {PRINCIPLES_PAGE.categories.map((category) => (
              <button
                key={category.key}
                type="button"
                className={active === category.key ? 'is-active' : undefined}
                onClick={() => {
                  setActive(category.key)
                  setOpen(0)
                }}
              >
                {category.label}
              </button>
            ))}
          </div>
          <div className="liquid-glass eco-faq__aside">
            <h2>{PRINCIPLES_PAGE.asideTitle}</h2>
            <p>{PRINCIPLES_PAGE.asideBody}</p>
            <a href={appHref} data-protected-app-cta>
              Open Urania 137 →
            </a>
          </div>
        </aside>

        <div className="eco-faq__list">
          {items.map((item, index) => {
            const expanded = open === index
            return (
              <article key={`${active}-${item.q}`} className="liquid-glass eco-faq__item">
                <h3>
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setOpen(expanded ? null : index)}
                  >
                    <span>{item.q}</span>
                    <span aria-hidden="true">{expanded ? '–' : '+'}</span>
                  </button>
                </h3>
                {expanded ? <p>{item.a}</p> : null}
              </article>
            )
          })}
        </div>
      </div>

      <p className="eco-next">
        <Link to={PRINCIPLES_PAGE.next.href}>{PRINCIPLES_PAGE.next.label}</Link>
      </p>
    </main>
  )
}
