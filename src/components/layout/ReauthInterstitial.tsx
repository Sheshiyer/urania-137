import { redirectToAccessLogin } from '../../lib/me'

/**
 * `/api/me` answered with a server-side failure (not a reauth redirect, which
 * never paints). The instrument says so and offers one honest way back
 * through the Access edge instead of rendering a signed-out-looking shell.
 */
export function ReauthInterstitial({ message }: { message: string }) {
  return (
    <main
      id="main-content"
      data-reauth-interstitial
      className="grid h-full min-h-[30rem] place-items-center px-6 text-center"
    >
      <div role="alert" className="max-w-md rounded-card border hairline bg-surface/80 px-8 py-8 shadow-popover">
        <p className="font-display text-[9px] uppercase tracking-[0.28em] text-gold">
          Identity unresolved
        </p>
        <h1 className="mt-3 font-serif text-h2 text-parchment">
          The field needs you to sign in again.
        </h1>
        <p className="mt-3 text-small leading-relaxed text-secondary">{message}</p>
        <button
          type="button"
          onClick={() => redirectToAccessLogin()}
          className="btn-primary mt-6"
        >
          Sign in again
        </button>
      </div>
    </main>
  )
}
