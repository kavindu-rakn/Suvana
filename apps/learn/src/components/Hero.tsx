import { useEffect, useRef } from 'react'
import type { Tab } from '../app/tabs'
import { ThemeToggle } from './ThemeToggle'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

const STEPS = [
  {
    n: '01',
    title: 'Browse & Choose Signs',
    body: 'Explore 490+ reference sign recordings across 20 Sri Lankan Sign Language categories, or follow mastery-weighted practice recommendations.',
  },
  {
    n: '02',
    title: 'On-Device Motion Capture',
    body: 'Hand and finger tracking runs in real time, fully inside your browser via MediaPipe Vision. No video is ever uploaded or stored on any server.',
  },
  {
    n: '03',
    title: 'Joint-Level DTW Feedback',
    body: 'Your signing motion is compared against real-signer benchmarks with dynamic time warping, returning feedback down to individual fingers within the 300 ms target.',
  },
  {
    n: '04',
    title: 'Mastery-Weighted Practice',
    body: 'Every attempt updates a running estimate of how well you know each sign, so practice stays weighted toward your weakest and least recently drilled signs.',
  },
]

export function Hero({ onEnter }: { onEnter: (tab: Tab) => void }) {
  const container = useRef<HTMLDivElement>(null)
  const marqueeRef = useRef<HTMLDivElement>(null)
  const stepRefs = useRef<(HTMLElement | null)[]>([])

  // Lenis smooth-scroll — a hero effect only. It lives here, not in main.tsx,
  // so it is torn down when the learner enters the tool: run globally it
  // intercepts the wheel from every scroll container in the app.
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true })
    ;(window as unknown as { lenis?: Lenis }).lenis = lenis

    lenis.on('scroll', ScrollTrigger.update)
    lenis.on('scroll', ({ progress, limit }: { progress: number; limit: number }) => {
      const bar = document.getElementById('scroll-progress')
      if (bar && limit > 0) bar.style.transform = `scaleX(${progress})`
    })

    const raf = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)

    return () => {
      gsap.ticker.remove(raf)
      lenis.destroy()
      delete (window as unknown as { lenis?: Lenis }).lenis
      const bar = document.getElementById('scroll-progress')
      if (bar) bar.style.transform = 'scaleX(0)'
    }
  }, [])

  useEffect(() => {
    // This page sits in front of a camera tool that people open many times
    // during a study — motion is decorative here, never load-bearing. Honour
    // the OS "reduce motion" setting for the JS-driven animation too, not just
    // the CSS keyframes (index.css handles those globally).
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let ctx = gsap.context(() => {
      if (prefersReduced) {
        // Land everything on its final state, no transition.
        gsap.set(
          ['.aww-hero-mark', '.aww-suvana-en', '.aww-suvana-si', '.aww-subline', '.aww-hero-cta'],
          { opacity: 1, y: 0, scale: 1 },
        )
        stepRefs.current.forEach((step) => step && gsap.set(step, { opacity: 1, y: 0 }))
        return
      }

      // 1. Entrance Animations
      gsap.fromTo('.aww-hero-mark', { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 1, ease: 'power4.out', delay: 0.1 })
      gsap.fromTo('.aww-suvana-en', { y: 100, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power4.out', delay: 0.2 })
      gsap.fromTo('.aww-suvana-si', { y: 100, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power4.out', delay: 0.4 })
      gsap.fromTo('.aww-subline', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', delay: 0.6 })
      gsap.fromTo('.aww-hero-cta', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', delay: 0.8 })

      // 2. ScrollTrigger for Steps
      stepRefs.current.forEach((step) => {
        if (!step) return
        gsap.fromTo(step,
          { opacity: 0, y: 100 },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: 'power3.out',
            scrollTrigger: {
              trigger: step,
              start: 'top 80%',
            }
          }
        )
      })

    }, container)

    // 4. Marquee Velocity Hook. Only runs while the footer is on screen — a
    // rAF loop scrolling an off-screen element is pure battery drain.
    let xPos = 0
    let rafId = 0
    const animateMarquee = () => {
      if (marqueeRef.current) {
        const scrollSpeed = Math.abs(((window as any).lenis?.velocity || 0) * 0.001)
        xPos -= (0.02 + scrollSpeed)
        if (xPos <= -50) xPos += 50
        gsap.set(marqueeRef.current, { xPercent: xPos })
      }
      rafId = requestAnimationFrame(animateMarquee)
    }

    let observer: IntersectionObserver | null = null
    if (!prefersReduced) {
      const footer = container.current?.querySelector('.aww-footer-editorial')
      if (footer && 'IntersectionObserver' in window) {
        observer = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting && !rafId) {
              rafId = requestAnimationFrame(animateMarquee)
            } else if (!entry.isIntersecting && rafId) {
              cancelAnimationFrame(rafId)
              rafId = 0
            }
          }
        })
        observer.observe(footer)
      } else {
        rafId = requestAnimationFrame(animateMarquee)
      }
    }

    return () => {
      ctx.revert()
      if (rafId) cancelAnimationFrame(rafId)
      observer?.disconnect()
    }
  }, [])

  return (
    <div className="aww-hero-wrapper" ref={container}>
      <header id="header" className="aww-topbar">
        <div className="nav">
          {/* In Suvana the shell owns the domain root, so the mark goes home. */}
          <a href="/" className="nav-left brand">
            <img src={`${import.meta.env.BASE_URL}branding/suvana-mark.png`} alt="" className="mark" />
            <span className="wordmark">SUVANA</span>
          </a>
          <div className="nav-right">
            <ThemeToggle />
            <a href="/" className="btn small">Back to Home</a>
          </div>
        </div>
      </header>

      <section className="aww-hero-main">
        <div className="aww-titles">
          <img
            className="aww-hero-mark"
            src={`${import.meta.env.BASE_URL}branding/suvana-mark.png`}
            alt=""
          />
          <h1 className="aww-suvana-en">LEARN</h1>
          <h2 className="aww-suvana-si">Sign Language</h2>
        </div>

        <p className="aww-subline">
          Point your camera and sign. Every attempt is scored against recordings of real signers — with corrections down to individual fingers.
        </p>

        <div className="aww-hero-cta">
          <button className="btn massive" onClick={() => onEnter('practice')}>Start practising</button>
        </div>

        <div className="lhero-stats-strip">
          <div className="lstat-pill">
            <span className="lstat-val">490+</span>
            <span className="lstat-lbl">Reference Signs</span>
          </div>
          <div className="lstat-sep" aria-hidden="true" />
          <div className="lstat-pill">
            <span className="lstat-val">100%</span>
            <span className="lstat-lbl">Private &amp; On-Device</span>
          </div>
          <div className="lstat-sep" aria-hidden="true" />
          <div className="lstat-pill">
            <span className="lstat-val">&lt;300ms</span>
            <span className="lstat-lbl">Feedback Target</span>
          </div>
        </div>
      </section>

      <section className="aww-steps" aria-label="How it works">
        {STEPS.map((s, index) => (
          <article 
            className={`aww-step ${index % 2 !== 0 ? 'aww-step-reverse' : ''}`} 
            key={s.n} 
            ref={(el) => { stepRefs.current[index] = el }}
          >
            <div className="aww-step-content">
              <p className="aww-step-n">{s.n}</p>
              <h2>{s.title}</h2>
              <p>{s.body}</p>
            </div>
            <div className="aww-step-visual">
              {index === 0 && (
                <div className="aww-preview-card card-vocab">
                  <div className="card-vocab-search">
                    <span className="search-dot" />
                    <span className="search-text">Search 490+ signs...</span>
                  </div>
                  <div className="card-vocab-pills">
                    <span className="v-pill v-pill-1">AYUBOWAN</span>
                    <span className="v-pill v-pill-2">STHUTHI</span>
                    <span className="v-pill v-pill-3">KANAWA</span>
                    <span className="v-pill v-pill-4">AMMA</span>
                  </div>
                  <div className="card-vocab-badge">20 Categories</div>
                </div>
              )}
              {index === 1 && (
                <div className="aww-preview-card card-capture">
                  <div className="capture-hud-top">
                    <span className="rec-dot" />
                    <span className="fps-tag">REAL-TIME · ON-DEVICE</span>
                  </div>
                  <div className="capture-viewfinder">
                    <div className="reticle-corner tl" />
                    <div className="reticle-corner tr" />
                    <div className="reticle-corner bl" />
                    <div className="reticle-corner br" />
                    <div className="skeleton-hand-anim" aria-hidden="true">
                      <svg className="skeleton-hand-svg" viewBox="0 0 140 140" fill="none">
                        <g
                          stroke="#20b2aa"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          opacity="0.75"
                        >
                          <path d="M70 126 L48 96 M70 126 L54 78 M70 126 L70 72 M70 126 L86 76 M70 126 L98 88" />
                          <path d="M48 96 L33 84 L24 72 M54 78 L50 56 L46 38 M70 72 L69 48 L68 28 M86 76 L89 54 L92 36 M98 88 L104 70 L110 56" />
                        </g>
                        <g fill="#20b2aa">
                          <circle cx="54" cy="78" r="3" />
                          <circle cx="70" cy="72" r="3" />
                          <circle cx="86" cy="76" r="3" />
                          <circle cx="98" cy="88" r="3" />
                          <circle cx="48" cy="96" r="3" />
                          <circle cx="50" cy="56" r="2.4" />
                          <circle cx="69" cy="48" r="2.4" />
                          <circle cx="89" cy="54" r="2.4" />
                          <circle cx="104" cy="70" r="2.4" />
                          <circle cx="33" cy="84" r="2.4" />
                          <circle cx="46" cy="38" r="2.4" />
                          <circle cx="68" cy="28" r="2.4" />
                          <circle cx="92" cy="36" r="2.4" />
                          <circle cx="110" cy="56" r="2.4" />
                          <circle cx="24" cy="72" r="2.4" />
                        </g>
                        <circle cx="70" cy="126" r="4.5" fill="#daa520" />
                      </svg>
                      <div className="scan-line" />
                    </div>
                  </div>
                </div>
              )}
              {index === 2 && (
                <div className="aww-preview-card card-scoring">
                  <div className="score-dial-wrap">
                    <div className="score-dial-outer">
                      <div className="score-dial-inner">
                        <span className="score-num">88%</span>
                        <span className="score-lbl">MATCH</span>
                      </div>
                    </div>
                  </div>
                  <div className="finger-precision-bars">
                    <div className="f-bar-row"><span>Thumb</span><div className="f-bar"><div className="f-bar-fill fill-98" /></div></div>
                    <div className="f-bar-row"><span>Index</span><div className="f-bar"><div className="f-bar-fill fill-95" /></div></div>
                    <div className="f-bar-row"><span>Motion</span><div className="f-bar"><div className="f-bar-fill fill-92" /></div></div>
                  </div>
                </div>
              )}
              {index === 3 && (
                <div className="aww-preview-card card-mastery">
                  <div className="mastery-header">
                    <span className="mastery-streak">5 Day Streak</span>
                    <span className="mastery-level">Mastery: 84%</span>
                  </div>
                  <div className="mastery-chart">
                    <div className="chart-bar b1" />
                    <div className="chart-bar b2" />
                    <div className="chart-bar b3" />
                    <div className="chart-bar b4" />
                    <div className="chart-bar b5" />
                    <div className="chart-bar b6" />
                    <div className="chart-bar b7" />
                  </div>
                  <div className="mastery-badge-row">
                    <span className="m-badge gold">Fluent</span>
                    <span className="m-badge teal">Consistent</span>
                  </div>
                </div>
              )}
            </div>
          </article>
        ))}
      </section>

      <footer className="aww-footer-editorial">
        <div className="aww-marquee-wrapper">
          <div className="aww-marquee-content" ref={marqueeRef}>
            <span>PRACTICE MAKES PERFECT &bull; </span>
            <span>PRACTICE MAKES PERFECT &bull; </span>
            <span>PRACTICE MAKES PERFECT &bull; </span>
            <span>PRACTICE MAKES PERFECT &bull; </span>
            <span>PRACTICE MAKES PERFECT &bull; </span>
            <span>PRACTICE MAKES PERFECT &bull; </span>
            {/* Duplicate for seamless loop */}
            <span>PRACTICE MAKES PERFECT &bull; </span>
            <span>PRACTICE MAKES PERFECT &bull; </span>
            <span>PRACTICE MAKES PERFECT &bull; </span>
            <span>PRACTICE MAKES PERFECT &bull; </span>
            <span>PRACTICE MAKES PERFECT &bull; </span>
            <span>PRACTICE MAKES PERFECT &bull; </span>
          </div>
        </div>
        <div className="aww-footer-mega">
          <h2>
            Ready to<br />
            <button
              type="button"
              className="aww-start-cta-link"
              onClick={() => onEnter('practice')}
              aria-label="Start practicing now"
            >
              start?
            </button>
          </h2>
        </div>
      </footer>
    </div>
  )
}
