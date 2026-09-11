import { Link, NavLink } from 'react-router-dom'
import { FOOTER, INVITATION, NAV } from './landingCopy'

function Mark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 256 256" aria-hidden="true" focusable="false">
      <path d="M 64 128 L 64.5 128 L 32 95 L 0 64 L 0 0 L 64 0 L 128 64 L 128 64.5 L 161 32 L 192 0 L 256 0 L 256 64 L 192 128 L 128 128 L 128 192 L 96 223 L 63.5 256 L 0 256 L 0 192 Z M 256 192 L 224 223 L 191.5 256 L 128 256 L 128 192 L 192 128 L 256 128 Z" />
    </svg>
  )
}

export function Shell({
  children,
  appHref,
}: {
  children: React.ReactNode
  appHref: string
}) {
  return (
    <div id="top" className="gp-page">
      <a className="landing-skip-link" href="#main-content">
        Skip to content
      </a>

      <header className="gp-nav liquid-glass">
        <nav aria-label="Primary navigation">
          <NavLink to={NAV[0].href}>{NAV[0].label}</NavLink>
          <NavLink to={NAV[1].href}>{NAV[1].label}</NavLink>
          <Link to="/" aria-label="Urania 137 home">
            <Mark className="gp-nav__mark" />
          </Link>
          <NavLink to={NAV[2].href}>{NAV[2].label}</NavLink>
          <NavLink to={NAV[3].href}>{NAV[3].label}</NavLink>
        </nav>
      </header>

      {children}

      <footer className="gp-footer">
        <Link to="/" aria-label="Urania 137 home">
          <strong>{FOOTER.mark}</strong>
        </Link>
        <p>{FOOTER.line}</p>
        <a href={appHref} data-protected-app-cta>
          {INVITATION.cta}
        </a>
      </footer>
    </div>
  )
}
