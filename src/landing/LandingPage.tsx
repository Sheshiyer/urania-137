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

/** Decorative constellation field — inline SVG only (no <img>/<video>). */
function ConstellationField() {
  return (
    <svg
      className="landing-constellation"
      viewBox="0 0 1200 900"
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id="landing-core-glow" cx="50%" cy="48%" r="42%">
          <stop offset="0%" stopColor="#E6B84D" stopOpacity="0.55" />
          <stop offset="42%" stopColor="#0B50FB" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#070B1D" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="landing-ring-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#E6B84D" stopOpacity="0.05" />
          <stop offset="50%" stopColor="#C5A017" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#E6B84D" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      <circle cx="780" cy="420" r="320" fill="url(#landing-core-glow)" />
      <circle cx="780" cy="420" r="290" fill="none" stroke="url(#landing-ring-gold)" strokeWidth="1.2" />
      <circle cx="780" cy="420" r="210" fill="none" stroke="rgba(197,160,23,0.35)" strokeWidth="1" />
      <circle cx="780" cy="420" r="140" fill="none" stroke="rgba(240,237,227,0.18)" strokeWidth="1" />
      <circle cx="780" cy="420" r="72" fill="none" stroke="rgba(197,160,23,0.55)" strokeWidth="1.4" />

      {/* Flower-of-life suggestion */}
      {[0, 60, 120, 180, 240, 300].map((deg) => {
        const rad = (deg * Math.PI) / 180
        const x = 780 + Math.cos(rad) * 72
        const y = 420 + Math.sin(rad) * 72
        return (
          <circle
            key={deg}
            cx={x}
            cy={y}
            r="72"
            fill="none"
            stroke="rgba(197,160,23,0.22)"
            strokeWidth="0.9"
          />
        )
      })}

      {/* Satellite nodes */}
      {[
        [520, 220],
        [640, 160],
        [900, 190],
        [1020, 300],
        [1040, 520],
        [920, 680],
        [700, 740],
        [540, 640],
        [480, 450],
      ].map(([x, y], i) => (
        <g key={`${x}-${y}`}>
          <line
            x1="780"
            y1="420"
            x2={x}
            y2={y}
            stroke="rgba(197,160,23,0.28)"
            strokeWidth="0.8"
          />
          <circle cx={x} cy={y} r={i % 3 === 0 ? 5.5 : 3.5} fill="#E6B84D" fillOpacity="0.85" />
        </g>
      ))}

      <text
        x="780"
        y="428"
        textAnchor="middle"
        fill="#F0EDE3"
        fontFamily="Cinzel, Georgia, serif"
        fontSize="22"
        letterSpacing="0.28em"
      >
        NOESIS
      </text>
    </svg>
  )
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

      <header className="landing-header" aria-label="Primary">
        <a className="landing-wordmark" href="#top" aria-label="Urania 137 home">
          <span>Urania</span>
          <span>137</span>
        </a>
        <nav aria-label="Landing navigation">
          <a href="#instrument">Instrument</a>
          <a href="#lenses">Lenses</a>
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
            <ConstellationField />
            <span className="landing-orbit landing-orbit--outer" />
            <span className="landing-orbit landing-orbit--middle" />
            <span className="landing-orbit landing-orbit--inner" />
            <span className="landing-grain" />
          </div>

          <div className="landing-hero-overlay" aria-hidden="true" />

          <div className="landing-hero-shell">
            <div className="landing-hero-copy landing-reveal">
              <p className="landing-kicker">Tryambakam Noesis · private stellar console</p>
              <h1 id="landing-title">
                See the pattern.
                <span>Keep the authority.</span>
              </h1>
              <p className="landing-lede">
                Urania is the online entry to a graph-first reading field: conversation as
                threshold, Selemene as computation, Folio as the attributable record.
              </p>
            </div>

            <aside className="landing-hero-side landing-reveal landing-reveal--delay">
              <article className="landing-witness-card liquid-glass" aria-labelledby="landing-witness-label">
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

              <dl className="landing-hero-stats liquid-glass" aria-label="What the console holds">
                <div>
                  <dt>Parent lenses</dt>
                  <dd>7</dd>
                </div>
                <div>
                  <dt>Runnable doorways</dt>
                  <dd>35</dd>
                </div>
                <div>
                  <dt>Trust boundary</dt>
                  <dd>Access OTP</dd>
                </div>
              </dl>
            </aside>
          </div>

          <a className="landing-scroll-cue" href="#instrument">
            <span>Scroll to inspect</span>
            <ArrowDown aria-hidden="true" size={16} strokeWidth={1.5} />
          </a>
        </section>

        <section id="instrument" className="landing-section landing-instrument">
          <div className="landing-section-index" aria-hidden="true">
            001
          </div>
          <div className="landing-section-copy">
            <p className="landing-kicker">The instrument</p>
            <h2>One field. Many lenses. A traceable reading.</h2>
            <p>
              Move from pattern to witness, from daily sky to an enduring archive. Sources,
              inference, and conclusion remain legible — never collapsed into a single claim.
            </p>
          </div>
          <div className="landing-instrument-panel liquid-glass" aria-label="How a reading stays honest">
            <ol>
              <li>
                <span>01</span>
                <strong>Threshold</strong>
                <p>Conversation collects only the facts the capability needs.</p>
              </li>
              <li>
                <span>02</span>
                <strong>Selemene</strong>
                <p>Deterministic engines and witness modes stay named and separate.</p>
              </li>
              <li>
                <span>03</span>
                <strong>Folio</strong>
                <p>The same document reopens with system stack and evidence ledger.</p>
              </li>
            </ol>
          </div>
        </section>

        <section id="lenses" className="landing-section landing-lenses">
          <div className="landing-section-index" aria-hidden="true">
            002
          </div>
          <div className="landing-section-copy">
            <p className="landing-kicker">The constellation</p>
            <h2>Seven rooms. One graph.</h2>
            <p>
              The graph is the interface at every depth. Each parent lens opens a room — never a
              menu of undifferentiated modes.
            </p>
          </div>
          <div className="landing-lens-mosaic" aria-label="Seven parent lenses">
            <article className="landing-lens-card landing-lens-card--wide liquid-glass">
              <span>Birth Witness</span>
              <h3>Identity without collapse</h3>
              <p>Owner is not subject. Birth facts stay attributable.</p>
            </article>
            <article className="landing-lens-card liquid-glass">
              <span>Union Mirror</span>
              <h3>Relation with consent</h3>
              <p>Dyads and families only when participation is explicit.</p>
            </article>
            <article className="landing-lens-card liquid-glass">
              <span>Sky Weather</span>
              <h3>Today as witness</h3>
              <p>Daily limbs rendered as reading, not raw dump.</p>
            </article>
            <article className="landing-lens-card liquid-glass">
              <span>Noesis Reading</span>
              <h3>Witness depth</h3>
              <p>Integrated modes that the engine actually resolves.</p>
            </article>
            <article className="landing-lens-card liquid-glass">
              <span>Engine Status</span>
              <h3>Live telemetry</h3>
              <p>Nineteen engines named; capture doors stay honest.</p>
            </article>
            <article className="landing-lens-card liquid-glass">
              <span>Folio Archive</span>
              <h3>Durable recovery</h3>
              <p>Canonical readings you can reopen without losing the thread.</p>
            </article>
            <article className="landing-lens-card liquid-glass">
              <span>Bridge Query</span>
              <h3>Question as door</h3>
              <p>Decision support without prescription.</p>
            </article>
          </div>
        </section>

        <section id="principles" className="landing-section landing-principles">
          <div className="landing-section-index" aria-hidden="true">
            003
          </div>
          <div className="landing-section-copy">
            <p className="landing-kicker">The posture</p>
            <h2>Insight without overclaim.</h2>
          </div>
          <ol className="landing-principle-list">
            <li className="liquid-glass">
              <span>Source before model</span>
              <p>Each reading keeps a trail back to its inputs.</p>
            </li>
            <li className="liquid-glass">
              <span>Consent before relation</span>
              <p>Participation is explicit and revocable.</p>
            </li>
            <li className="liquid-glass">
              <span>Privacy before convenience</span>
              <p>The private console activates only after crossing the protected boundary.</p>
            </li>
          </ol>
        </section>

        <section id="invitation" className="landing-invitation liquid-glass" aria-labelledby="invitation-title">
          <div>
            <p className="landing-kicker">The threshold</p>
            <h2 id="invitation-title">Enter when the question is active.</h2>
            <p>
              The next page is the protected application. Cloudflare Access email OTP is required
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
