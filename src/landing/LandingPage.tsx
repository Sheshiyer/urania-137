import { protectedAppHref } from '../config/landing'
import { CosmicTypographyField } from './CosmicTypographyField'
import { TunnelExperience } from './TunnelExperience'

export interface LandingPageProps {
  protectedAppOrigin?: string
  development?: boolean
}

/**
 * Void Atlas motion substrate + Urania composition pass:
 * tunnel/scroll world kept; funnel copy, beats, and liquid-glass chrome are Urania.
 */
export function LandingPage({
  protectedAppOrigin = import.meta.env.VITE_PROTECTED_APP_ORIGIN,
  development = import.meta.env.DEV,
}: LandingPageProps) {
  const appHref = protectedAppHref(protectedAppOrigin, { development })

  return (
    <div id="top" className="tunnel-page">
      <a className="landing-skip-link" href="#experience">
        Skip to experience
      </a>
      <main>
        <TunnelExperience videoSrc="/media/tunnel-source.mp4" appHref={appHref} />
        <CosmicTypographyField appHref={appHref} />
      </main>
    </div>
  )
}
