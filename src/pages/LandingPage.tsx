import { useEffect, useRef } from 'react'
import Lenis from 'lenis'

interface LandingPageProps {
  onEnter?: () => void
}

export function LandingPage({ onEnter }: LandingPageProps) {
  const heroVideoRef = useRef<HTMLVideoElement>(null)
  const solutionsVideoRef = useRef<HTMLVideoElement>(null)
  const scrollTrackRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const aboutRef = useRef<HTMLElement>(null)
  const solutionsRef = useRef<HTMLElement>(null)
  const solutionsOverlayRef = useRef<HTMLDivElement>(null)

  const heroTitleWrapRef = useRef<HTMLDivElement>(null)
  const heroCtaWrapRef = useRef<HTMLDivElement>(null)
  const heroConceptRef = useRef<HTMLDivElement>(null)
  const aboutEyebrowRef = useRef<HTMLDivElement>(null)
  const aboutTitleWrapRef = useRef<HTMLDivElement>(null)
  const aboutCapsRef = useRef<HTMLDivElement>(null)

  const solSetRefs = useRef<(HTMLDivElement | null)[]>([null, null, null])

  // All the original helper functions (ported 1:1)
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t

  const mapRange = (value: number, inMin: number, inMax: number, outMin: number, outMax: number) => {
    if (inMax === inMin) return outMin
    const t = clamp((value - inMin) / (inMax - inMin), 0, 1)
    return lerp(outMin, outMax, t)
  }

  const mapStops = (value: number, stopsIn: number[], stopsOut: (number | string)[]) => {
    if (value <= stopsIn[0]) return stopsOut[0]
    if (value >= stopsIn[stopsIn.length - 1]) return stopsOut[stopsOut.length - 1]
    for (let i = 0; i < stopsIn.length - 1; i++) {
      if (value >= stopsIn[i] && value <= stopsIn[i + 1]) {
        const t = (value - stopsIn[i]) / (stopsIn[i + 1] - stopsIn[i])
        const a = stopsOut[i]
        const b = stopsOut[i + 1]
        if (typeof a === 'number' && typeof b === 'number') return lerp(a, b, t)
        if (typeof a === 'string' && a.startsWith('blur(')) {
          const av = parseFloat(a)
          const bv = parseFloat(b as string)
          return `blur(${lerp(av, bv, t)}px)`
        }
        return a
      }
    }
    return stopsOut[stopsOut.length - 1]
  }

  const cubicBezierEase = (t: number, p1x: number, p1y: number, p2x: number, p2y: number) => {
    function sampleCurveX(t: number) {
      return ((1 - 3 * p2x + 3 * p1x) * t + (3 * p2x - 6 * p1x)) * t * t + 3 * p1x * t
    }
    function sampleCurveY(t: number) {
      return ((1 - 3 * p2y + 3 * p1y) * t + (3 * p2y - 6 * p1y)) * t * t + 3 * p1y * t
    }
    function sampleCurveDerivativeX(t: number) {
      return (3 * (1 - 3 * p2x + 3 * p1x) * t + 2 * (3 * p2x - 6 * p1x)) * t + 3 * p1x
    }
    let guess = t
    for (let i = 0; i < 8; i++) {
      const x = sampleCurveX(guess) - t
      const d = sampleCurveDerivativeX(guess)
      if (Math.abs(x) < 1e-6 || Math.abs(d) < 1e-6) break
      guess -= x / d
    }
    return sampleCurveY(guess)
  }

  // cubic-bezier easing values kept for reference parity (used inline in cubicBezierEase calls)

  const sectionProgress = (
    elTop: number,
    elHeight: number,
    offsetStart: string,
    offsetEnd: string,
    scrollY: number,
    vh: number
  ) => {
    const resolve = (edge: string, bound: string, top: number, height: number) => {
      const elY = edge === 'start' ? top : top + height
      const vpY = bound === 'start' ? scrollY : scrollY + vh
      return elY - vpY
    }
    const [aEl, aVp] = offsetStart.split(' ')
    const [bEl, bVp] = offsetEnd.split(' ')
    const start = resolve(aEl, aVp, elTop, elHeight)
    const end = resolve(bEl, bVp, elTop, elHeight)
    const total = start - end
    if (Math.abs(total) < 1e-6) return 0
    return clamp(start / total, 0, 1)
  }

  // Text splitting (ported)
  const splitText = (el: HTMLElement, per: 'char' | 'word') => {
    const text = el.textContent?.trim() || ''
    el.textContent = ''
    el.setAttribute('aria-label', text)
    const parts = per === 'char' ? [...text] : text.split(/(\s+)/)
    const nodes: HTMLSpanElement[] = []
    parts.forEach((part) => {
      if (per === 'word' && /^\s+$/.test(part)) {
        el.appendChild(document.createTextNode(part))
        return
      }
      const span = document.createElement('span')
      span.className = per
      span.textContent = part === ' ' ? '\u00A0' : part
      span.style.opacity = '0'
      span.style.filter = 'blur(10px) brightness(0%)'
      span.style.transform = 'translateY(20px)'
      el.appendChild(span)
      nodes.push(span)
    })
    return nodes
  }

  const animateSegments = (nodes: HTMLSpanElement[], show: boolean, stagger: number, delay: number) => {
    nodes.forEach((node, i) => {
      const t = (delay + i * stagger) * 1000
      node.style.transition = show
        ? 'opacity 0.4s cubic-bezier(0.16,1,0.3,1), filter 0.4s cubic-bezier(0.16,1,0.3,1), transform 0.4s cubic-bezier(0.16,1,0.3,1)'
        : 'opacity 0.3s cubic-bezier(0.16,1,0.3,1), filter 0.3s cubic-bezier(0.16,1,0.3,1), transform 0.3s cubic-bezier(0.16,1,0.3,1)'
      node.style.transitionDelay = t + 'ms'
      if (show) {
        node.style.opacity = '1'
        node.style.filter = 'blur(0px) brightness(100%)'
        node.style.transform = 'translateY(0)'
      } else {
        node.style.opacity = '0'
        node.style.filter = 'blur(10px) brightness(0%)'
        node.style.transform = 'translateY(-20px)'
      }
    })
  }

  const animateBlock = (el: HTMLElement | null, show: boolean) => {
    if (!el) return
    el.style.transition = show
      ? 'opacity 0.9s cubic-bezier(0.16,1,0.3,1), transform 0.9s cubic-bezier(0.16,1,0.3,1)'
      : 'opacity 0.7s cubic-bezier(0.16,1,0.3,1), transform 0.7s cubic-bezier(0.16,1,0.3,1)'
    if (show) {
      el.style.opacity = '1'
      el.style.transform = 'translateY(0)'
    } else {
      el.style.opacity = '0'
      el.style.transform = 'translateY(-25px)'
    }
  }

  // Main effect: exact port of the reference script, adapted to refs + React
  useEffect(() => {
    const heroVideo = heroVideoRef.current
    const solutionsVideo = solutionsVideoRef.current
    const scrollTrack = scrollTrackRef.current
    const heroEl = heroRef.current
    const aboutEl = aboutRef.current
    const solutionsEl = solutionsRef.current
    const solutionsOverlay = solutionsOverlayRef.current

    const heroTitleWrap = heroTitleWrapRef.current
    const heroCtaWrap = heroCtaWrapRef.current
    const heroConcept = heroConceptRef.current
    const aboutEyebrow = aboutEyebrowRef.current
    const aboutTitleWrap = aboutTitleWrapRef.current
    const aboutCaps = aboutCapsRef.current

    if (!heroVideo || !solutionsVideo || !scrollTrack || !heroEl || !aboutEl || !solutionsEl || !solutionsOverlay) {
      return
    }

    const solSets: (HTMLDivElement | null)[] = solSetRefs.current

    // Inject the exact CSS (scoped to this landing to avoid global pollution)
    const styleId = 'cortex-landing-styles'
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = styleId
      styleEl.textContent = `
        .cortex-landing { font-family: 'Inter Tight', system-ui, sans-serif; }
        .cortex-landing .hero-video-wrap,
        .cortex-landing .solutions-video-wrap { position: fixed; inset: 0; z-index: 0; pointer-events: none; }
        .cortex-landing .hero-video-wrap video,
        .cortex-landing .solutions-video-wrap video { width: 100%; height: 100%; object-fit: cover; }
        .cortex-landing .scroll-track { position: relative; z-index: 10; }
        .cortex-landing .section-pad { padding-left: 16px; padding-right: 16px; }
        @media (min-width: 1024px) { .cortex-landing .section-pad { padding-left: 56px; padding-right: 56px; } }
        .cortex-landing .hero { height: 100vh; display: flex; align-items: center; }
        .cortex-landing .hero-main { height: 100vh; padding-top: 112px; display: grid; grid-template-columns: 1fr; gap: 48px; }
        @media (min-width: 1024px) { .cortex-landing .hero-main { padding-top: 0; grid-template-columns: repeat(12,1fr); gap: 32px; } }
        .cortex-landing .hero-title { font-size: clamp(40px,6.5vw,105px); font-weight: 400; line-height: .95; letter-spacing: -.025em; }
        .cortex-landing .cta { display: inline-flex; align-items: center; background: #fff; color: #122e58; border-radius: 9999px; padding: 14px 28px; font-size: 14px; gap: 12px; }
        .cortex-landing .about { height: 100vh; min-height: 600px; display: flex; flex-direction: column; justify-content: space-between; }
        .cortex-landing .about-copy { font-size: clamp(24px,3.2vw,40px); font-weight: 500; line-height: 1.25; }
        .cortex-landing .solutions-spacer { min-height: 400vh; }
        .cortex-landing .solutions-overlay { position: fixed; inset: 0; z-index: 30; clip-path: inset(50% 50% round 3px); }
        .cortex-landing .sol-set { position: absolute; inset: 0; display: flex; flex-direction: column; gap: 40px; justify-content: center; opacity: 0; filter: blur(15px); }
        .cortex-landing .sol-set h1 { font-size: clamp(40px,6.5vw,105px); font-weight: 400; line-height: .95; }
        .cortex-landing .fade-block { will-change: opacity, transform, filter; }
        .cortex-landing .char, .cortex-landing .word { display: inline-block; will-change: transform, opacity, filter; }
      `
      document.head.appendChild(styleEl)
    }

    // Lenis (smooth) — drive scroll effects from Lenis events, not raw window.scrollY
    const lenis = new Lenis({ duration: 1.2, smoothWheel: true })
    let lenisScroll = 0
    const onLenisScroll = (e: { scroll: number }) => {
      lenisScroll = e.scroll
      handleScrollTargets(lenisScroll)
      updateVisuals(lenisScroll)
    }
    lenis.on('scroll', onLenisScroll)

    // RAF loop for Lenis (properly stoppable)
    let rafRunning = true
    const lenisRaf = (time: number) => {
      if (!rafRunning) return
      lenis.raf(time)
      requestAnimationFrame(lenisRaf)
    }
    const rafId = requestAnimationFrame(lenisRaf)

    // Text targets
    const textTargets: Array<{ el: HTMLElement; nodes: HTMLSpanElement[]; per: string; delay: number; shown: boolean }> = []
    const textEls = scrollTrack.querySelectorAll<HTMLElement>('[data-text-effect]')
    textEls.forEach((el) => {
      const per = (el.getAttribute('data-text-effect') as 'char' | 'word') || 'char'
      const delay = parseFloat(el.getAttribute('data-delay') || '0')
      const nodes = splitText(el, per)
      textTargets.push({ el, nodes, per, delay, shown: false })
    })

    // Initial hidden
    ;[heroCtaWrap, heroConcept, aboutEyebrow, aboutCaps].forEach((el) => {
      if (el) {
        el.style.opacity = '0'
        el.style.transform = 'translateY(35px)'
      }
    })

    // Intersection
    let inViewHero = false
    let inViewAbout = false

    const ioHero = new IntersectionObserver(
      ([entry]) => {
        const v = entry.intersectionRatio >= 0.15
        if (v === inViewHero) return
        inViewHero = v
        textTargets
          .filter((t) => heroEl.contains(t.el))
          .forEach((t) => animateSegments(t.nodes, v, 0.015, t.delay))
        animateBlock(heroCtaWrap, v)
        animateBlock(heroConcept, v)
      },
      { threshold: [0, 0.15, 1] }
    )
    ioHero.observe(heroEl)

    const ioAbout = new IntersectionObserver(
      ([entry]) => {
        const v = entry.intersectionRatio >= 0.15
        if (v === inViewAbout) return
        inViewAbout = v
        textTargets
          .filter((t) => aboutEl.contains(t.el))
          .forEach((t) => animateSegments(t.nodes, v, 0.015, t.delay))
        animateBlock(aboutEyebrow, v)
        animateBlock(aboutCaps, v)
      },
      { threshold: [0, 0.15, 1] }
    )
    ioAbout.observe(aboutEl)

    // Video scrub engine (exact port)
    const LERP = 0.09
    const SEEK_DRIFT = 0.02
    const SEEK_MIN_MS = 30
    const SETTLE_EPS = 0.0001
    const PLAY_FROM = 0.85

    let heroTarget = 0,
      heroCurrent = 0,
      heroLastSeek = 0,
      heroPlaying = false
    let solTarget = 0,
      solCurrent = 0,
      solLastSeek = 0

    let heroSectionTop = 0,
      heroSectionRange = 1
    let viewportH = window.innerHeight
    let solSectionTop = 0,
      solSectionHeight = 0,
      solSectionRange = 1

    let scrubRaf = 0
    let scrubRunning = false

    const measure = () => {
      heroSectionTop = scrollTrack.offsetTop
      heroSectionRange = scrollTrack.offsetHeight || 1
      viewportH = window.innerHeight
      solSectionTop = solutionsEl.offsetTop
      solSectionHeight = solutionsEl.offsetHeight
      solSectionRange = Math.max(1, solSectionHeight - viewportH)
    }

    const startScrub = () => {
      if (scrubRunning) return
      scrubRunning = true
      scrubRaf = requestAnimationFrame(scrubTick)
    }

    const handleScrollTargets = (scrollY: number = window.scrollY) => {
      heroTarget = clamp((scrollY - heroSectionTop) / heroSectionRange, 0, 1)
      solTarget = clamp((scrollY - solSectionTop) / solSectionRange, 0, 1)
      startScrub()
    }

    const scrubToward = (video: HTMLVideoElement, current: number, lastSeek: number, now: number) => {
      const duration = video.duration
      if (!duration || isNaN(duration)) return { lastSeek, busy: false }
      const targetTime = current * duration
      const drift = Math.abs(video.currentTime - targetTime)
      if (!video.seeking && now - lastSeek >= SEEK_MIN_MS && drift > SEEK_DRIFT) {
        video.currentTime = targetTime
        return { lastSeek: now, busy: true }
      }
      return { lastSeek, busy: video.seeking || drift > SEEK_DRIFT }
    }

    const scrubTick = () => {
      const now = performance.now()
      let busy = false

      heroCurrent += (heroTarget - heroCurrent) * LERP
      if (Math.abs(heroTarget - heroCurrent) < SETTLE_EPS) heroCurrent = heroTarget
      else busy = true

      const heroDuration = heroVideo.duration
      if (heroDuration && !isNaN(heroDuration)) {
        if (heroCurrent >= PLAY_FROM && heroTarget >= PLAY_FROM) {
          if (!heroPlaying) {
            heroVideo.play().catch(() => {})
            heroPlaying = true
          }
        } else {
          if (heroPlaying) {
            heroVideo.pause()
            heroPlaying = false
            heroCurrent = heroVideo.currentTime / heroDuration
          }
          const r = scrubToward(heroVideo, heroCurrent, heroLastSeek, now)
          heroLastSeek = r.lastSeek
          if (r.busy) busy = true
        }
      }

      solCurrent += (solTarget - solCurrent) * LERP
      if (Math.abs(solTarget - solCurrent) < SETTLE_EPS) solCurrent = solTarget
      else busy = true

      const scrollY = window.scrollY
      const solOnScreen = scrollY + viewportH > solSectionTop && scrollY < solSectionTop + solSectionHeight
      if (solOnScreen) {
        const r = scrubToward(solutionsVideo, solCurrent, solLastSeek, now)
        solLastSeek = r.lastSeek
        if (r.busy) busy = true
      }

      if (busy) scrubRaf = requestAnimationFrame(scrubTick)
      else scrubRunning = false
    }

    const primeVideo = (video: HTMLVideoElement) => {
      const p = video.play()
      if (p !== undefined) p.then(() => video.pause()).catch(() => {})
    }

    const onHeroMeta = () => {
      measure()
      handleScrollTargets()
      heroCurrent = heroTarget
      primeVideo(heroVideo)
    }

    const onSolMeta = () => {
      measure()
      handleScrollTargets()
      solCurrent = solTarget
      primeVideo(solutionsVideo)
    }

    // Visuals (ported)
    const REVEAL_END = 0.18
    const at = (p: number) => REVEAL_END + p * (1 - REVEAL_END)

    const updateVisuals = (scrollY: number = window.scrollY) => {
      const vh = window.innerHeight

      const trackTop = scrollTrack.offsetTop
      const trackH = scrollTrack.offsetHeight
      const heroTop = heroEl.offsetTop + trackTop
      const heroH = heroEl.offsetHeight
      const aboutTop = aboutEl.offsetTop + trackTop
      const aboutH = aboutEl.offsetHeight
      const solTop = solutionsEl.offsetTop
      const solH = solutionsEl.offsetHeight

      const heroVideoProgress = sectionProgress(trackTop, trackH, 'start start', 'end start', scrollY, vh)
      const blurRaw = mapRange(heroVideoProgress, 0.85, 1, 0, 24)
      const blurPx = Math.round(blurRaw / 2) * 2
      const scale = mapRange(heroVideoProgress, 0.85, 1, 1, 1.22)
      heroVideo.style.filter = `blur(${blurPx}px)`
      heroVideo.style.transform = `scale(${scale})`

      const heroScroll = sectionProgress(heroTop, heroH, 'start start', 'end start', scrollY, vh)
      const hTitleOp = mapRange(heroScroll, 0, 0.45, 1, 0)
      const hTitleBlur = mapRange(heroScroll, 0, 0.45, 0, 20)
      const hTitleY = mapRange(heroScroll, 0, 0.45, 0, -60)
      if (heroTitleWrap) {
        heroTitleWrap.style.opacity = String(hTitleOp)
        heroTitleWrap.style.filter = `blur(${hTitleBlur}px)`
        heroTitleWrap.style.transform = `translateY(${hTitleY}px)`
      }

      const hOtherOp = mapRange(heroScroll, 0, 0.45, 1, 0)
      const hOtherY = mapRange(heroScroll, 0, 0.45, 0, -40)
      if (inViewHero) {
        if (heroCtaWrap) {
          heroCtaWrap.style.opacity = String(hOtherOp)
          heroCtaWrap.style.transform = `translateY(${hOtherY}px)`
        }
        if (heroConcept) {
          heroConcept.style.opacity = String(hOtherOp)
          heroConcept.style.transform = `translateY(${hOtherY}px)`
        }
      }

      const aboutScroll = sectionProgress(aboutTop, aboutH, 'start end', 'end start', scrollY, vh)
      const aTitleOp = mapStops(aboutScroll, [0.1, 0.35, 0.65, 0.9], [0, 1, 1, 0])
      const aTitleBlur = mapStops(aboutScroll, [0.1, 0.35, 0.65, 0.9], [20, 0, 0, 20])
      const aTitleY = mapStops(aboutScroll, [0.1, 0.35, 0.65, 0.9], [60, 0, 0, -60])
      if (aboutTitleWrap) {
        aboutTitleWrap.style.opacity = String(aTitleOp)
        aboutTitleWrap.style.filter = `blur(${aTitleBlur}px)`
        aboutTitleWrap.style.transform = `translateY(${aTitleY}px)`
      }

      const aOtherOp = mapStops(aboutScroll, [0.15, 0.35, 0.65, 0.85], [0, 1, 1, 0])
      const aOtherY = mapStops(aboutScroll, [0.15, 0.35, 0.65, 0.85], [50, 0, 0, -50])
      if (inViewAbout) {
        if (aboutEyebrow) aboutEyebrow.style.transform = `translateY(${aOtherY}px)`
        if (aboutEyebrow) aboutEyebrow.style.opacity = String(aOtherOp)
        if (aboutCaps) aboutCaps.style.transform = `translateY(${aOtherY}px)`
        if (aboutCaps) aboutCaps.style.opacity = String(aOtherOp)
      }

      const solProgress = sectionProgress(solTop, solH, 'start start', 'end end', scrollY, vh)
      const revealT = clamp(solProgress / REVEAL_END, 0, 1)
      const eased = cubicBezierEase(revealT, 0.65, 0, 0.35, 1)
      const inset = lerp(50, 0, eased)
      solutionsOverlay.style.clipPath = `inset(${inset}% ${inset}% round 3px)`

      const applySet = (el: HTMLDivElement | null, opIn: number[], blurIn: number[], yRange: number[]) => {
        if (!el) return
        const op = mapStops(solProgress, opIn, [0, 1, 1, 0])
        const bl = mapStops(solProgress, blurIn, [15, 0, 0, 15])
        const yT = mapRange(solProgress, yRange[0], yRange[1], 0, -120)
        const yB = mapRange(solProgress, yRange[0], yRange[1], 0, 120)
        el.style.opacity = String(op)
        el.style.filter = `blur(${bl}px)`
        const top = el.querySelector<HTMLElement>('.sol-top')
        const bottom = el.querySelector<HTMLElement>('.sol-bottom')
        if (top) top.style.transform = `translateY(${yT}px)`
        if (bottom) bottom.style.transform = `translateY(${yB}px)`
      }

      applySet(solSets[0], [at(0), at(0.05), at(0.22), at(0.29)], [at(0), at(0.05), at(0.22), at(0.29)], [at(0), at(0.29)])
      applySet(solSets[1], [at(0.33), at(0.4), at(0.58), at(0.65)], [at(0.33), at(0.4), at(0.58), at(0.65)], [at(0.33), at(0.65)])
      applySet(solSets[2], [at(0.69), at(0.76), at(0.92), at(0.99)], [at(0.69), at(0.76), at(0.92), at(0.99)], [at(0.69), at(0.99)])
    }

    const onScrollFallback = () => {
      // Fallback for any native scroll (Lenis drives the main path)
      handleScrollTargets()
      updateVisuals()
    }
    const onResize = () => {
      measure()
      handleScrollTargets()
      updateVisuals()
    }

    // Wire
    measure()
    handleScrollTargets(0)
    heroCurrent = heroTarget
    solCurrent = solTarget
    updateVisuals(0)

    // Lenis drives scroll via its 'scroll' event (see onLenisScroll)
    // Keep a passive fallback in case
    window.addEventListener('scroll', onScrollFallback, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
    heroVideo.addEventListener('loadedmetadata', onHeroMeta)
    solutionsVideo.addEventListener('loadedmetadata', onSolMeta)

    if (heroVideo.readyState >= 1) onHeroMeta()
    if (solutionsVideo.readyState >= 1) onSolMeta()

    // Final CTA wiring (the key fix: login/auth is the final action)
    const ctas = scrollTrack.querySelectorAll<HTMLAnchorElement | HTMLButtonElement>('.cta, .cap-link')
    ctas.forEach((cta) => {
      cta.addEventListener('click', (e) => {
        // Soft CTAs in hero/about just scroll or are decorative.
        // We add a strong final action at the end of the experience.
        if (cta.getAttribute('href') === '#discover') {
          e.preventDefault()
          const about = document.getElementById('about')
          about?.scrollIntoView({ behavior: 'smooth' })
        }
      })
    })

    // Add a final prominent CTA at the end of the solutions for "login as final CTA"
    // Call synchronously after DOM is ready (no fragile timeout)
    const addFinalCTA = () => {
      const stage = solutionsOverlay.querySelector('.solutions-stage')
      if (!stage) return
      // Avoid duplicates on re-run
      if (stage.querySelector('#final-enter-cta')) return
      const final = document.createElement('div')
      final.style.position = 'absolute'
      final.style.bottom = '10%'
      final.style.left = '50%'
      final.style.transform = 'translateX(-50%)'
      final.style.zIndex = '40'
      final.innerHTML = `
        <button id="final-enter-cta"
          style="background:#fff;color:#122e58;border-radius:9999px;padding:16px 36px;font-size:15px;font-weight:500;letter-spacing:-0.01em;box-shadow:0 10px 30px rgba(0,0,0,0.3);">
          Enter the Field
        </button>
      `
      stage.appendChild(final)

      const btn = final.querySelector<HTMLButtonElement>('#final-enter-cta')
      btn?.addEventListener('click', () => {
        if (onEnter) onEnter()
        else {
          // Fallback: correct hash for router (console = home). No reload.
          window.location.hash = '#/console'
        }
      })
    }
    addFinalCTA()

    // Cleanup
    return () => {
      rafRunning = false
      window.removeEventListener('scroll', onScrollFallback)
      window.removeEventListener('resize', onResize)
      heroVideo.removeEventListener('loadedmetadata', onHeroMeta)
      solutionsVideo.removeEventListener('loadedmetadata', onSolMeta)
      ioHero.disconnect()
      ioAbout.disconnect()
      cancelAnimationFrame(rafId)
      cancelAnimationFrame(scrubRaf)
      try { lenis.off('scroll', onLenisScroll) } catch {}
      lenis.destroy()
      if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl)
    }
  }, [onEnter])

  // The JSX mirrors the reference HTML structure exactly for visual + motion fidelity
  return (
    <div className="cortex-landing page min-h-[400vh] bg-black text-white">
      <header className="header">
        <div className="logo" aria-hidden="true">
          ✳
        </div>
        <nav className="nav">
          <a href="#cortex">Noesis</a>
          <a href="#solutions">Interface</a>
          <a href="#developer">Developer</a>
          <a href="#support">Support</a>
        </nav>
      </header>

      <div className="hero-video-wrap">
        <video
          ref={heroVideoRef}
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260722_053031_0c49a4eb-94f1-46c7-b407-8c1fee2298c3.mp4"
          muted
          playsInline
          preload="auto"
        />
      </div>

      <div ref={scrollTrackRef} id="scroll-track" className="scroll-track">
        <section ref={heroRef} id="hero" className="hero">
          <main className="hero-main section-pad">
            <div className="hero-left">
              <div ref={heroTitleWrapRef} id="hero-title-wrap" className="fade-block">
                <h1 className="hero-title">
                  <span className="line" data-text-effect="char" data-delay="0">
                    Mind
                  </span>
                  <span className="line" data-text-effect="char" data-delay="0.15">
                    Amplified.
                  </span>
                </h1>
              </div>
              <div ref={heroCtaWrapRef} id="hero-cta-wrap" className="fade-block">
                <a href="#discover" className="cta">
                  <span className="cta-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M7 7h10v10" />
                      <path d="M7 17 17 7" />
                    </svg>
                  </span>
                  <span>Discover the Field</span>
                </a>
              </div>
            </div>

            <div ref={heroConceptRef} id="hero-concept" className="hero-right fade-block">
              <div className="eyebrow">001 — Concept</div>
              <p className="body-copy">
                A screen is a bottleneck. Noesis is the direct interface that streams intention into witness,
                amplifying your natural mind with precise, living readings.
              </p>
            </div>
          </main>
        </section>

        <section ref={aboutRef} id="about" className="about section-pad">
          <div className="about-top">
            <div ref={aboutEyebrowRef} id="about-eyebrow" className="fade-block">
              <span className="eyebrow medium">002 — Neural Extension</span>
            </div>
            <div ref={aboutTitleWrapRef} id="about-title-wrap" className="fade-block">
              <p className="about-copy" data-text-effect="word">
                ① Noesis is a living instrument that rests at the edge of attention, establishing a real-time
                connection that augments your cognition with the full depth of Selemene reports.
              </p>
            </div>
          </div>

          <div className="about-bottom">
            <div ref={aboutCapsRef} id="about-caps" className="caps fade-block">
              <div className="caps-label">Capabilities:</div>
              <div className="caps-list">
                <a href="#retrieval" className="cap-link">
                  <span>Instant Knowledge Retrieval</span>
                  <span className="cap-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M7 7h10v10" />
                      <path d="M7 17 17 7" />
                    </svg>
                  </span>
                </a>
                <a href="#translation" className="cap-link">
                  <span>Seamless Thought Translation</span>
                  <span className="cap-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M7 7h10v10" />
                      <path d="M7 17 17 7" />
                    </svg>
                  </span>
                </a>
                <a href="#problem-solving" className="cap-link">
                  <span>Generative Reasoning Flow</span>
                  <span className="cap-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M7 7h10v10" />
                      <path d="M7 17 17 7" />
                    </svg>
                  </span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section ref={solutionsRef} id="solutions" className="solutions-spacer" />

      <div ref={solutionsOverlayRef} id="solutions-overlay" className="solutions-overlay">
        <div className="solutions-inner">
          <div className="solutions-video-wrap">
            <video
              ref={solutionsVideoRef}
              src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260722_053057_15a922e1-f64e-40ae-94a5-8abd5fd7f784.mp4"
              muted
              playsInline
              preload="auto"
            />
          </div>

          <div className="solutions-content section-pad">
            <div className="solutions-stage">
              <div ref={(el) => { solSetRefs.current[0] = el }} className="sol-set" data-set="1">
                <div className="sol-top">
                  <span className="eyebrow medium">003 — Interface</span>
                  <h1>Silent thought.</h1>
                </div>
                <div className="sol-bottom">
                  <h1>Noesis.</h1>
                </div>
              </div>
              <div ref={(el) => { solSetRefs.current[1] = el }} className="sol-set" data-set="2">
                <div className="sol-top">
                  <span className="eyebrow medium">004 — Performance</span>
                  <h1>Cognitive flow.</h1>
                </div>
                <div className="sol-bottom">
                  <h1>Intuition.</h1>
                </div>
              </div>
              <div ref={(el) => { solSetRefs.current[2] = el }} className="sol-set" data-set="3">
                <div className="sol-top">
                  <span className="eyebrow medium">005 — Symbiosis</span>
                  <h1>Instant recall.</h1>
                </div>
                <div className="sol-bottom">
                  <h1>Insight.</h1>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The final CTA is injected in the effect for perfect positioning over the last reveal */}
    </div>
  )
}
