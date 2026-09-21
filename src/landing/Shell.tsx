import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { FOOTER, INVITATION, NAV } from './landingCopy'

function Mark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 256 256" aria-hidden="true" focusable="false">
      <path d="M 64 128 L 64.5 128 L 32 95 L 0 64 L 0 0 L 64 0 L 128 64 L 128 64.5 L 161 32 L 192 0 L 256 0 L 256 64 L 192 128 L 128 128 L 128 192 L 96 223 L 63.5 256 L 0 256 L 0 192 Z M 256 192 L 224 223 L 191.5 256 L 128 256 L 128 192 L 192 128 L 256 128 Z" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <line x1="3" y1="5" x2="17" y2="5" />
      <line x1="3" y1="10" x2="17" y2="10" />
      <line x1="3" y1="15" x2="17" y2="15" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <line x1="4" y1="4" x2="16" y2="16" />
      <line x1="16" y1="4" x2="4" y2="16" />
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
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const rafRef = useRef(0)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    const onScroll = () => {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        setScrolled(window.scrollY > 60)
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  const toggleMenu = useCallback(() => {
    setMenuOpen((prev) => !prev)
  }, [])

  return (
    <div id="top" className="gp-page">
      <a className="landing-skip-link" href="#main-content">
        Skip to content
      </a>

      <header className={`gp-nav liquid-glass${menuOpen ? ' gp-nav--open' : ''}${scrolled ? ' gp-nav--scrolled' : ''}`}>
        <nav aria-label="Primary navigation">
          <NavLink className="gp-nav__link" to={NAV[0].href}>{NAV[0].label}</NavLink>
          <NavLink className="gp-nav__link" to={NAV[1].href}>{NAV[1].label}</NavLink>
          <Link to="/" aria-label="Urania 137 home">
            <Mark className="gp-nav__mark" />
          </Link>
          <NavLink className="gp-nav__link" to={NAV[2].href}>{NAV[2].label}</NavLink>
          <NavLink className="gp-nav__link" to={NAV[3].href}>{NAV[3].label}</NavLink>
        </nav>
        <button
          type="button"
          className="gp-nav__toggle"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          onClick={toggleMenu}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>
      </header>

      {menuOpen && (
        <div className="gp-mobile-drawer" role="dialog" aria-label="Navigation">
          <nav aria-label="Mobile navigation">
            {NAV.map((item) => (
              <NavLink key={item.href} to={item.href}>{item.label}</NavLink>
            ))}
            <a href={appHref} data-protected-app-cta className="gp-mobile-drawer__cta">
              {INVITATION.cta}
            </a>
          </nav>
        </div>
      )}

      {children}

      <footer className="gp-footer">
        <div className="gp-footer__brand">
          <Link to="/" aria-label="Urania 137 home">
            <strong>{FOOTER.mark}</strong>
          </Link>
          <p className="gp-footer__posture">{FOOTER.posture}</p>
        </div>
        <nav className="gp-footer__rooms" aria-label="Footer navigation">
          {FOOTER.rooms.map((room) => (
            <Link key={room.href} to={room.href}>{room.label}</Link>
          ))}
        </nav>
        <div className="gp-footer__enter">
          <p>{FOOTER.line}</p>
          <a href={appHref} data-protected-app-cta>
            {INVITATION.cta}
          </a>
        </div>
      </footer>
    </div>
  )
}
