import { protectedAppHref } from '../config/landing'

function ArrowGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
      <path d="M7 17 17 7M8 7h9v9" />
    </svg>
  )
}

export interface LandingPageProps {
  protectedAppOrigin?: string
  development?: boolean
}

export function LandingPage({
  protectedAppOrigin = import.meta.env.VITE_PROTECTED_APP_ORIGIN,
  development = import.meta.env.DEV,
}: LandingPageProps) {
  const appHref = protectedAppHref(protectedAppOrigin, { development })

  return (
    <div id="top" className="landing-page">
      <a className="landing-skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="landing-header" aria-label="Urania 137">
        <a className="landing-mark" href="#top" aria-label="Urania 137 home">
          <span aria-hidden="true">✦</span>
          <span>Urania 137</span>
        </a>
        <nav aria-label="Landing navigation">
          <a href="#instrument">Instrument</a>
          <a href="#principles">Principles</a>
          <a href="#invitation">Invitation</a>
        </nav>
        <a className="landing-header-cta" href={appHref} data-protected-app-cta>
          Enter <ArrowGlyph />
        </a>
      </header>

      <main id="main-content">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero-media" aria-hidden="true" data-media-fallback>
            <div className="landing-orbit landing-orbit--outer" />
            <div className="landing-orbit landing-orbit--middle" />
            <div className="landing-orbit landing-orbit--inner" />
            <img
              src="/media/field-poster.svg"
              alt=""
              width="1400"
              height="900"
              decoding="async"
            />
            <span className="landing-star landing-star--one" />
            <span className="landing-star landing-star--two" />
            <span className="landing-star landing-star--three" />
          </div>

          <div className="landing-hero-copy">
            <p className="landing-kicker">A private field for reflection</p>
            <h1 id="landing-title">
              Mind,
              <span>made visible.</span>
            </h1>
            <p className="landing-lede">
              Urania is a living instrument that turns many systems of insight into one
              attributable reading—held in a private console, never mistaken for certainty.
            </p>
            <div className="landing-hero-actions">
              <a className="landing-primary-cta" href={appHref} data-protected-app-cta>
                Enter the field <ArrowGlyph />
              </a>
              <a className="landing-text-link" href="#instrument">
                Discover the instrument
              </a>
            </div>
          </div>

          <p className="landing-coordinate" aria-hidden="true">
            13.7° · FIELD / WITNESS / FOLIO
          </p>
        </section>

        <section id="instrument" className="landing-section landing-instrument">
          <div className="landing-section-index" aria-hidden="true">001</div>
          <div className="landing-section-copy">
            <p className="landing-kicker">The instrument</p>
            <h2>One field. Many lenses. A traceable reading.</h2>
            <p>
              Move from pattern to witness, from daily sky to enduring archive. Urania keeps
              sources, evidence, and interpretation visibly distinct, so wonder never asks
              you to surrender discernment.
            </p>
          </div>
          <div className="landing-capability-grid" aria-label="Urania capabilities">
            <article>
              <span>01</span>
              <h3>Pattern</h3>
              <p>Layered systems brought into a legible constellation.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Witness</h3>
              <p>Questions that keep interpretation open and accountable.</p>
            </article>
            <article>
              <span>03</span>
              <h3>Folio</h3>
              <p>A private, searchable record of the readings you choose to keep.</p>
            </article>
          </div>
        </section>

        <section id="principles" className="landing-section landing-principles">
          <div className="landing-section-index" aria-hidden="true">002</div>
          <div className="landing-section-copy">
            <p className="landing-kicker">The posture</p>
            <h2>Insight without overclaim.</h2>
          </div>
          <ol className="landing-principle-list">
            <li>
              <span>Source before story</span>
              <p>Every reading retains the trail back to its inputs and producing system.</p>
            </li>
            <li>
              <span>Consent before relation</span>
              <p>Shared readings remain bounded by explicit, revocable participation.</p>
            </li>
            <li>
              <span>Privacy before convenience</span>
              <p>The complete console begins only after crossing the protected boundary.</p>
            </li>
          </ol>
        </section>

        <section id="invitation" className="landing-invitation" aria-labelledby="invitation-title">
          <div>
            <p className="landing-kicker">The threshold</p>
            <h2 id="invitation-title">Enter when the question is alive.</h2>
            <p>
              The next page crosses into the private application and will ask you to
              authenticate through Cloudflare Access.
            </p>
          </div>
          <a className="landing-primary-cta" href={appHref} data-protected-app-cta>
            Open Urania 137 <ArrowGlyph />
          </a>
        </section>
      </main>

      <footer className="landing-footer">
        <a className="landing-mark" href="#top">
          <span aria-hidden="true">✦</span>
          <span>Urania 137</span>
        </a>
        <p>Living readings · attributable sources · protected by design</p>
      </footer>
    </div>
  )
}
