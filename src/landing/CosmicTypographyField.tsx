import { useEffect, useRef, type CSSProperties } from 'react'
import {
  INSTRUMENT,
  INVITATION,
  LENSES,
  PORTAL_TITLES,
  PRINCIPLES,
  SPATIAL_TEXTS,
} from './landingCopy'

type SpatialProperties = CSSProperties & {
  '--x': string
  '--y': string
  '--z': string
  '--rx': string
  '--ry': string
  '--rz': string
}

type SpatialText = (typeof SPATIAL_TEXTS)[number]

const spatialStyle = (item: SpatialText): SpatialProperties => ({
  '--x': item.x,
  '--y': item.y,
  '--z': item.z,
  '--rx': item.rx ?? '0deg',
  '--ry': item.ry ?? '0deg',
  '--rz': item.rz ?? '0deg',
})

export function CosmicTypographyField({ appHref }: { appHref: string }) {
  const sectionRef = useRef<HTMLElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const portalPreviewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const world = worldRef.current
    const portalPreview = portalPreviewRef.current

    if (!section || !world || !portalPreview) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      section.dataset.motion = 'reduced'
      portalPreview.dataset.motion = 'reduced'
      return
    }

    let disposed = false
    let animationContext: { revert: () => void } | undefined
    let tunnelObserver: MutationObserver | undefined
    let portalProgressObserver: MutationObserver | undefined
    let releaseTunnelWait: (() => void) | undefined

    const waitForTunnelPin = () => {
      const tunnel = document.querySelector<HTMLElement>('.tunnel-experience')

      if (
        !tunnel ||
        tunnel.classList.contains('is-ready') ||
        Boolean(tunnel.dataset.renderMode)
      ) {
        return Promise.resolve()
      }

      return new Promise<void>((resolve) => {
        const finish = () => {
          tunnelObserver?.disconnect()
          tunnelObserver = undefined
          releaseTunnelWait = undefined
          resolve()
        }

        releaseTunnelWait = finish
        tunnelObserver = new MutationObserver(() => {
          if (
            tunnel.classList.contains('is-ready') ||
            Boolean(tunnel.dataset.renderMode)
          ) {
            finish()
          }
        })
        tunnelObserver.observe(tunnel, {
          attributeFilter: ['class', 'data-render-mode'],
          attributes: true,
        })

        if (
          tunnel.classList.contains('is-ready') ||
          Boolean(tunnel.dataset.renderMode)
        ) {
          finish()
        }
      })
    }

    const setup = async () => {
      await waitForTunnelPin()
      if (disposed) return

      const [gsapModule, scrollTriggerModule] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ])

      if (disposed) return

      const { gsap } = gsapModule
      const { ScrollTrigger } = scrollTriggerModule
      gsap.registerPlugin(ScrollTrigger)

      animationContext = gsap.context(() => {
        const select = gsap.utils.selector(portalPreview)
        const layers = select<HTMLElement>('[data-scene-layer]')
        const phrases = select<HTMLElement>('.cosmic-field__phrase')
        const phraseInners = select<HTMLElement>(
          '.cosmic-field__phrase .cosmic-field__layer-inner',
        )
        const microLabels = select<HTMLElement>('.cosmic-field__micro')
        const portalCopy = portalPreview.querySelector<HTMLElement>(
          '.cosmic-portal-preview__copy--primary',
        )
        const secondaryCopy = portalPreview.querySelector<HTMLElement>(
          '.cosmic-portal-preview__copy--secondary',
        )
        const instrumentPanel = portalPreview.querySelector<HTMLElement>(
          '[data-urania-beat="instrument"]',
        )
        const lensesPanel = portalPreview.querySelector<HTMLElement>(
          '[data-urania-beat="lenses"]',
        )
        const principlesPanel = portalPreview.querySelector<HTMLElement>(
          '[data-urania-beat="principles"]',
        )
        const feedbackForm = portalPreview.querySelector<HTMLElement>(
          '.cosmic-feedback',
        )
        const tunnel = document.querySelector<HTMLElement>('.tunnel-experience')

        if (
          !portalCopy ||
          !secondaryCopy ||
          !instrumentPanel ||
          !lensesPanel ||
          !principlesPanel ||
          !feedbackForm
        ) {
          return
        }

        if (tunnel) {
          const syncPortalProgress = () => {
            const progress = tunnel.style.getPropertyValue('--tunnel-progress') || '0'
            const numericProgress = Number.parseFloat(progress) || 0
            const revealProgress = Math.min(
              1,
              Math.max(0, (numericProgress - 0.9) / 0.1),
            )
            const reveal =
              revealProgress * revealProgress * (3 - 2 * revealProgress)
            portalPreview.style.setProperty('--portal-progress', progress)
            portalPreview.style.setProperty('--portal-reveal', reveal.toFixed(4))
            portalPreview.style.setProperty(
              '--portal-title-scale',
              (0.56 + reveal * 0.44).toFixed(4),
            )
            portalPreview.style.setProperty(
              '--portal-title-blur',
              `${((1 - reveal) * 7).toFixed(2)}px`,
            )
          }

          portalProgressObserver = new MutationObserver(syncPortalProgress)
          portalProgressObserver.observe(tunnel, {
            attributeFilter: ['style'],
            attributes: true,
          })
          syncPortalProgress()
        }

        const beatPanels = [instrumentPanel, lensesPanel, principlesPanel]

        gsap.set(layers, { autoAlpha: 0 })
        gsap.set(world, { autoAlpha: 1 })
        gsap.set(phrases, {
          autoAlpha: 0,
          filter: 'blur(5px)',
        })
        gsap.set(microLabels, {
          autoAlpha: 0,
          filter: 'blur(4px)',
        })
        gsap.set(portalCopy, {
          autoAlpha: 0,
          filter: 'blur(8px)',
          rotationY: -5,
          scale: 0.5,
        })
        gsap.set(secondaryCopy, {
          autoAlpha: 0,
          filter: 'blur(8px)',
          rotationY: 7,
          scale: 0.42,
          xPercent: 8,
          yPercent: 3,
        })
        gsap.set(beatPanels, {
          autoAlpha: 0,
          filter: 'blur(6px)',
          pointerEvents: 'none',
          scale: 0.94,
          y: 28,
        })
        gsap.set(feedbackForm, {
          autoAlpha: 0,
          filter: 'blur(5px)',
          pointerEvents: 'none',
          scale: 0.92,
          y: 32,
        })

        const timeline = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            anticipatePin: 0,
            end: () => `+=${Math.max(window.innerHeight * 8.4, 5600)}`,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              document.documentElement.style.setProperty(
                '--cosmic-progress',
                self.progress.toFixed(4),
              )
            },
            onEnter: () => {
              gsap.set(portalPreview, { autoAlpha: 1 })
            },
            onEnterBack: () => {
              gsap.set(portalPreview, { autoAlpha: 1 })
            },
            onLeave: () => {
              document.documentElement.style.setProperty('--cosmic-progress', '1')
              gsap.set(portalPreview, { autoAlpha: 1 })
            },
            onLeaveBack: () => {
              gsap.set(portalPreview, { clearProps: 'opacity,visibility' })
            },
            pin: true,
            refreshPriority: -1,
            scrub: 0.8,
            start: 'top top',
            trigger: section,
          },
        })

        const seededBeat = (index: number, salt: number) => {
          const value =
            Math.sin((index + 1) * 12.9898 + salt * 78.233) * 43758.5453
          return value - Math.floor(value)
        }

        phrases.forEach((phrase, index) => {
          const revealAt = 0.02 + seededBeat(index, 1) * 0.85
          const brightAt = 4.3 + seededBeat(index, 2) * 7.2
          const fadeAt = 14.2 + seededBeat(index, 3) * 0.7

          timeline
            .to(
              phrase,
              {
                autoAlpha: 0.58,
                duration: 0.55,
                ease: 'power2.out',
                filter: 'blur(0px)',
              },
              revealAt,
            )
            .to(
              phrase,
              { autoAlpha: 1, duration: 0.55, ease: 'power2.out' },
              brightAt,
            )
            .to(
              phrase,
              { autoAlpha: 0.64, duration: 0.85, ease: 'power1.inOut' },
              brightAt + 0.55,
            )
            .to(
              phrase,
              {
                autoAlpha: 0,
                duration: 0.9,
                filter: 'blur(10px)',
              },
              fadeAt,
            )
        })

        microLabels.forEach((label, index) => {
          const revealAt = 0.04 + seededBeat(index, 4) * 1.05
          const brightAt = 4.8 + seededBeat(index, 5) * 6.8
          const fadeAt = 14.2 + seededBeat(index, 6) * 0.65

          timeline
            .to(
              label,
              {
                autoAlpha: 0.42,
                duration: 0.5,
                ease: 'power2.out',
                filter: 'blur(0px)',
              },
              revealAt,
            )
            .to(
              label,
              { autoAlpha: 1, duration: 0.45, ease: 'power2.out' },
              brightAt,
            )
            .to(
              label,
              { autoAlpha: 0.5, duration: 0.75, ease: 'power1.inOut' },
              brightAt + 0.45,
            )
            .to(
              label,
              {
                autoAlpha: 0,
                duration: 0.8,
                filter: 'blur(8px)',
              },
              fadeAt,
            )
        })

        timeline
          .fromTo(
            world,
            {
              force3D: true,
              rotationX: 0.8,
              rotationY: -2.4,
              z: -260,
            },
            {
              duration: 16.4,
              force3D: true,
              rotationX: -1.4,
              rotationY: 4.2,
              z: 980,
            },
            0,
          )
          .to(
            portalCopy,
            {
              autoAlpha: 1,
              duration: 0.9,
              filter: 'blur(0px)',
              rotationX: 0,
              rotationY: 0,
              rotationZ: 0,
              scale: 1.15,
              xPercent: 0,
              yPercent: 0,
            },
            1.8,
          )
          .to(
            portalCopy,
            {
              duration: 2.4,
              filter: 'blur(0px)',
              rotationX: 2,
              rotationY: -12,
              rotationZ: -1.35,
              scale: 5.4,
              xPercent: -12,
              yPercent: -3,
            },
            2.7,
          )
          .to(
            portalCopy,
            {
              autoAlpha: 0,
              duration: 0.85,
              filter: 'blur(6px)',
            },
            5.0,
          )
          .set(instrumentPanel, { pointerEvents: 'auto' }, 5.15)
          .to(
            instrumentPanel,
            {
              autoAlpha: 1,
              duration: 0.85,
              filter: 'blur(0px)',
              scale: 1,
              y: 0,
            },
            5.15,
          )
          .to(
            instrumentPanel,
            {
              autoAlpha: 0,
              duration: 0.7,
              filter: 'blur(6px)',
              pointerEvents: 'none',
              y: -18,
            },
            7.35,
          )
          .to(
            secondaryCopy,
            {
              autoAlpha: 1,
              duration: 0.95,
              filter: 'blur(0px)',
              rotationY: 0,
              scale: 1,
              xPercent: 0,
              yPercent: 0,
            },
            7.55,
          )
          .to(
            secondaryCopy,
            {
              duration: 2.6,
              rotationX: -2,
              rotationY: 11,
              rotationZ: 1.1,
              scale: 5.3,
              xPercent: 12,
              yPercent: -3,
            },
            8.4,
          )
          .to(
            secondaryCopy,
            {
              autoAlpha: 0,
              duration: 0.7,
              filter: 'blur(7px)',
            },
            10.7,
          )
          .set(lensesPanel, { pointerEvents: 'auto' }, 10.85)
          .to(
            lensesPanel,
            {
              autoAlpha: 1,
              duration: 0.9,
              filter: 'blur(0px)',
              scale: 1,
              y: 0,
            },
            10.85,
          )
          .to(
            lensesPanel,
            {
              autoAlpha: 0,
              duration: 0.7,
              filter: 'blur(6px)',
              pointerEvents: 'none',
              y: -18,
            },
            13.1,
          )
          .set(principlesPanel, { pointerEvents: 'auto' }, 13.25)
          .to(
            principlesPanel,
            {
              autoAlpha: 1,
              duration: 0.85,
              filter: 'blur(0px)',
              scale: 1,
              y: 0,
            },
            13.25,
          )
          .to(
            principlesPanel,
            {
              autoAlpha: 0,
              duration: 0.65,
              filter: 'blur(6px)',
              pointerEvents: 'none',
              y: -16,
            },
            15.15,
          )
          .set(feedbackForm, { pointerEvents: 'auto' }, 15.35)
          .to(
            feedbackForm,
            {
              autoAlpha: 1,
              duration: 1,
              filter: 'blur(0px)',
              scale: 1,
              y: 0,
            },
            15.35,
          )
          .to(
            phraseInners,
            {
              duration: 16.4,
              rotation: (index) => (index % 2 === 0 ? -2.5 : 2.5),
              xPercent: (index) =>
                [-20, -14, 18, 15, 21, -17, -24, 8, 24, -11][index] ?? 0,
              yPercent: (index) =>
                [-5, 8, -7, 6, 3, -8, 4, -9, 7, 5][index] ?? 0,
            },
            0,
          )
          .to(
            microLabels,
            {
              duration: 16.4,
              xPercent: (index) => (index % 2 === 0 ? -12 : 14),
              yPercent: (index) => (index % 3 === 0 ? -8 : 7),
            },
            0,
          )

        section.dataset.motion = 'scroll'
      }, section)

      ScrollTrigger.refresh()
    }

    setup().catch(() => {
      section.dataset.motion = 'static'
      portalPreview.dataset.motion = 'static'
    })

    return () => {
      disposed = true
      releaseTunnelWait?.()
      tunnelObserver?.disconnect()
      portalProgressObserver?.disconnect()
      document.documentElement.style.removeProperty('--cosmic-progress')
      animationContext?.revert()
    }
  }, [])

  return (
    <>
      <div ref={portalPreviewRef} className="cosmic-portal-preview">
        <div className="cosmic-field__stage" aria-hidden="true">
          <div ref={worldRef} className="cosmic-field__world">
            {SPATIAL_TEXTS.map((item) => (
              <div
                key={item.key}
                className={`cosmic-field__layer cosmic-field__${item.kind}`}
                data-scene-key={item.key}
                data-scene-layer
                style={spatialStyle(item)}
                aria-hidden="true"
              >
                <span className="cosmic-field__layer-inner">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="cosmic-portal-preview__copy cosmic-portal-preview__copy--primary"
          aria-hidden="true"
        >
          <p className="cosmic-portal-preview__title">
            {PORTAL_TITLES.primary.map((line) => (
              <span key={line} data-text={line}>
                {line}
              </span>
            ))}
          </p>
        </div>

        <div
          className="cosmic-portal-preview__copy cosmic-portal-preview__copy--secondary"
          aria-hidden="true"
        >
          <p className="cosmic-portal-preview__title">
            {PORTAL_TITLES.secondary.map((line) => (
              <span key={line} data-text={line}>
                {line}
              </span>
            ))}
          </p>
        </div>

        <article
          id={INSTRUMENT.id}
          className="urania-beat liquid-glass"
          data-urania-beat="instrument"
          aria-labelledby="urania-instrument-title"
        >
          <p className="urania-beat__eyebrow">{INSTRUMENT.kicker}</p>
          <h2 id="urania-instrument-title">{INSTRUMENT.title}</h2>
          <p className="urania-beat__lede">{INSTRUMENT.lede}</p>
          <ol className="urania-beat__steps">
            {INSTRUMENT.steps.map((step) => (
              <li key={step.index}>
                <span>{step.index}</span>
                <strong>{step.title}</strong>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </article>

        <section
          id={LENSES.id}
          className="urania-beat urania-beat--lenses liquid-glass"
          data-urania-beat="lenses"
          aria-labelledby="urania-lenses-title"
        >
          <p className="urania-beat__eyebrow">{LENSES.kicker}</p>
          <h2 id="urania-lenses-title">{LENSES.title}</h2>
          <p className="urania-beat__lede">{LENSES.lede}</p>
          <div className="urania-lens-mosaic" aria-label="Seven parent lenses">
            {LENSES.items.map((lens) => (
              <article
                key={lens.name}
                className={
                  lens.wide
                    ? 'urania-lens-card urania-lens-card--wide'
                    : 'urania-lens-card'
                }
              >
                <span>{lens.name}</span>
                <h3>{lens.title}</h3>
                <p>{lens.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          id={PRINCIPLES.id}
          className="urania-beat urania-beat--principles liquid-glass"
          data-urania-beat="principles"
          aria-labelledby="urania-principles-title"
        >
          <p className="urania-beat__eyebrow">{PRINCIPLES.kicker}</p>
          <h2 id="urania-principles-title">{PRINCIPLES.title}</h2>
          <ol className="urania-principle-list">
            {PRINCIPLES.items.map((item) => (
              <li key={item.title}>
                <span>{item.title}</span>
                <p>{item.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <div
          id={INVITATION.id}
          className="cosmic-feedback liquid-glass"
          data-urania-threshold
        >
          <p className="cosmic-feedback__eyebrow">{INVITATION.kicker}</p>
          <h3>{INVITATION.title}</h3>
          <p className="cosmic-feedback__lede">{INVITATION.lede}</p>
          <p className="cosmic-feedback__note">{INVITATION.note}</p>
          <a className="cosmic-feedback__cta" href={appHref} data-protected-app-cta>
            {INVITATION.cta}
          </a>
        </div>
      </div>

      <section
        ref={sectionRef}
        id="field"
        className="cosmic-field"
        aria-labelledby="cosmic-field-title"
      >
        <h2 id="cosmic-field-title" className="cosmic-field__sr-only">
          See the pattern. Keep the authority.
        </h2>
      </section>
    </>
  )
}
