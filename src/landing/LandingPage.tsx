import { ArrowDown, ArrowUpRight, Paperclip } from 'lucide-react'
import { protectedAppHref } from '../config/landing'

function ArrowGlyph() {
  return <ArrowUpRight strokeWidth={1.7} aria-hidden="true" size={17} />
}

export interface LandingPageProps {
  protectedAppOrigin?: string
  development?: boolean
}

const WITNESS_PROMPT =
  'What pattern keeps returning, and what concrete signal would show that it no longer applies?'

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

      <header className="landing-header" aria-label="Primary">
        <a className="landing-wordmark" href="#top" aria-label="Urania 137 home">
          <span>Urania</span>
          <span>137</span>
        </a>
        <nav aria-label="Landing navigation">
          <a href="#instrument">Instrument</a>
          <a href="#principles">Principles</a>
          <a href="#invitation">Invitation</a>
        </nav>
        <a className="landing-header-cta" href={appHref} data-protected-app-cta>
          Enter
          <ArrowGlyph />
        </a>
      </header>

      <main id="main-content">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero-media" aria-hidden="true" data-media-fallback>
            <span className="landing-orbit landing-orbit--outer" />
            <span className="landing-orbit landing-orbit--middle" />
            <span className="landing-orbit landing-orbit--inner" />
          </div>

          <div className="landing-hero-overlay" aria-hidden="true" />

          <div className="landing-hero-copy">
            <p className="landing-kicker">A private field for precision</p>
            <h1 id="landing-title">
              See the pattern.
              <span>Keep the authority.</span>
            </h1>
            <p className="landing-lede">
              Urania brings multiple symbolic systems into one attributable reading,
              keeping source, inference, and your interpretation visibly distinct.
            </p>

            <article className="landing-witness-card" aria-labelledby="landing-witness-label">
              <p id="landing-witness-label" className="landing-context-label">
                Witness prompt
              </p>
              <blockquote id="landing-witness-prompt" className="landing-witness-prompt">
                {WITNESS_PROMPT}
              </blockquote>

              <input
                id="landing-witness-input"
                className="landing-file-input"
                type="file"
                accept="image/*,.pdf"
                aria-label="Choose an image or PDF for context"
                aria-describedby="landing-context-note"
              />
              <div className="landing-witness-actions">
                <label htmlFor="landing-witness-input" className="landing-file-trigger">
                  <Paperclip aria-hidden="true" size={18} strokeWidth={1.65} />
                  <span>Choose image or PDF</span>
                </label>

                <a className="landing-primary-cta" href={appHref} data-protected-app-cta>
                  Enter the field
                  <ArrowGlyph />
                </a>
              </div>
              <p id="landing-context-note" className="landing-context-note">
                Optional context · nothing is sent from this page
              </p>
            </article>
          </div>

          <a className="landing-scroll-cue" href="#instrument">
            <span>Scroll to inspect</span>
            <ArrowDown aria-hidden="true" size={16} strokeWidth={1.5} />
          </a>
        </section>

        <section id="instrument" className="landing-section landing-instrument">
          <div className="landing-section-index" aria-hidden="true">001</div>
          <div className="landing-section-copy">
            <p className="landing-kicker">The instrument</p>
            <h2>One field. Many lenses. A traceable reading.</h2>
            <p>
              Move from pattern to witness, from daily sky to an enduring archive.
              Sources, inference, and conclusion remain legible.
            </p>
          </div>
          <div className="landing-capability-grid" aria-label="Urania capabilities">
            <article>
              <span>01</span>
              <h3>Pattern</h3>
              <p>Layered systems become a readable constellation, not a black box.</p>
            </article>
            <article>
              <span>02</span>
              <h3>Witness</h3>
              <p>Questions keep interpretation open, accountable, and revisable.</p>
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
              <span>Source before model</span>
              <p>Each reading keeps a trail back to its inputs.</p>
            </li>
            <li>
              <span>Consent before relation</span>
              <p>Participation is explicit and revocable.</p>
            </li>
            <li>
              <span>Privacy before convenience</span>
              <p>The private console activates only after crossing the protected boundary.</p>
            </li>
          </ol>
        </section>

        <section id="invitation" className="landing-invitation" aria-labelledby="invitation-title">
          <div>
            <p className="landing-kicker">The threshold</p>
            <h2 id="invitation-title">Enter when the question is active.</h2>
            <p>
              The next page is the protected application. Authentication is required
              before the private environment opens.
            </p>
          </div>
          <a className="landing-invitation-cta" href={appHref} data-protected-app-cta>
            Open Urania 137
            <ArrowGlyph />
          </a>
        </section>
      </main>

      <footer className="landing-footer">
        <a className="landing-wordmark" href="#top">
          <span>Urania</span>
          <span>137</span>
        </a>
        <p>Living readings · attributable sources · protected by design</p>
      </footer>
    </div>
  )
}
