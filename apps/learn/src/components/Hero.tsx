import { useEffect, useRef } from 'react'
import type { Tab } from '../app/tabs'
import { ThemeToggle } from './ThemeToggle'
import gsap from 'gsap'
import { lenis } from '../main'

const STEPS = [
  {
    n: '01',
    title: 'Choose a sign',
    body: 'Pick from 351 signs, or let a session choose the ones you most need to practise.',
  },
  {
    n: '02',
    title: 'Record your attempt',
    body: 'Hand tracking runs inside your browser. No video is uploaded, and nothing is stored on a server.',
  },
  {
    n: '03',
    title: 'See what to fix',
    body: 'A match score against real-signer references, plus which fingers and which part of the movement drifted.',
  },
]

export function Hero({ onEnter }: { onEnter: (tab: Tab) => void }) {
  const container = useRef<HTMLDivElement>(null)
  const marqueeRef = useRef<HTMLDivElement>(null)
  const artRef = useRef<SVGSVGElement>(null)
  const stepRefs = useRef<(HTMLElement | null)[]>([])

  useEffect(() => {
    let ctx = gsap.context(() => {
      // 1. Entrance Animations
      gsap.fromTo('.aww-suvana-en', { y: 100, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power4.out', delay: 0.2 })
      gsap.fromTo('.aww-suvana-si', { y: 100, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power4.out', delay: 0.4 })
      gsap.fromTo('.aww-subline', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', delay: 0.6 })
      gsap.fromTo('.aww-hero-cta', { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', delay: 0.8 })
      gsap.fromTo(artRef.current, { scale: 0.8, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.5, ease: 'elastic.out(1, 0.5)', delay: 1 })

      // 2. SVG Breathing Animation
      if (artRef.current) {
        gsap.to(artRef.current.querySelectorAll('circle'), {
          scale: 1.2,
          transformOrigin: 'center',
          stagger: {
            each: 0.1,
            yoyo: true,
            repeat: -1
          },
          duration: 1.5,
          ease: 'sine.inOut'
        })
      }

      // 3. ScrollTrigger for Steps
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

    // 4. Marquee Velocity Hook
    let xPos = 0
    let rafId: number
    const animateMarquee = () => {
      if (marqueeRef.current) {
        const scrollSpeed = Math.abs((lenis?.velocity || 0) * 0.001)
        xPos -= (0.02 + scrollSpeed)
        
        if (xPos <= -50) xPos += 50
        else if (xPos > 0) xPos -= 50
        
        gsap.set(marqueeRef.current, { xPercent: xPos })
      }
      rafId = requestAnimationFrame(animateMarquee)
    }
    rafId = requestAnimationFrame(animateMarquee)

    return () => {
      ctx.revert()
      cancelAnimationFrame(rafId)
    }
  }, [])

  return (
    <div className="aww-hero-wrapper" ref={container}>
      <div className="aww-topbar">
        <a className="aww-back" href="/">
          ← All Suvana modules
        </a>
        <ThemeToggle />
      </div>

      <section className="aww-hero-main">
        <div className="aww-titles">
          <h1 className="aww-suvana-en">LEARN</h1>
          <h2 className="aww-suvana-si" lang="si">ඉගෙන ගන්න</h2>
        </div>
        
        <div className="aww-hero-art" aria-hidden="true">
          <svg ref={artRef} viewBox="0 0 220 260" fill="none" role="presentation">
            <defs>
              <linearGradient id="lheroGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="var(--p-teal-400)" />
                <stop offset="100%" stopColor="var(--p-gold-400)" />
              </linearGradient>
            </defs>
            <path
              d="M104 226 L78 156 Q76 146 88 146 L150 152 Q160 154 158 166 L140 224 Q132 234 116 234 Z"
              fill="url(#lheroGrad)"
              opacity="0.1"
            />
            <g stroke="url(#lheroGrad)" strokeWidth="2.2" strokeLinecap="round" opacity="0.6">
              <path d="M112 236 L112 206 M112 206 L86 152 M112 206 L110 146 M112 206 L134 150 M112 206 L154 164 M112 206 L82 196" />
              <path d="M86 152 L80 118 M80 118 L76 94 M110 146 L108 108 M108 108 L106 82 M134 150 L140 114 M140 114 L144 90 M154 164 L166 136 M166 136 L174 118" />
              <path d="M82 196 L58 176 M58 176 L44 158" />
            </g>
            <g fill="url(#lheroGrad)">
              {[
                [112, 236], [112, 206], [86, 152], [110, 146], [134, 150], [154, 164],
                [82, 196], [80, 118], [108, 108], [140, 114], [166, 136], [58, 176],
                [76, 94], [106, 82], [144, 90], [174, 118], [44, 158],
              ].map(([cx, cy], i) => (
                <circle key={i} cx={cx} cy={cy} r={i === 0 ? 5.5 : 4} />
              ))}
            </g>
          </svg>
        </div>

        <p className="aww-subline">
          Point your camera and sign. Every attempt is scored against recordings of real signers — with corrections down to individual fingers.
        </p>

        <div className="aww-hero-cta">
          <button className="btn massive" onClick={() => onEnter('practice')}>Start practising</button>
          <button className="btn btn-ghost massive" onClick={() => onEnter('scenario')}>Try a conversation</button>
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
               <div className={`aww-css-art art-${index + 1}`}></div>
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
           <h2>Ready to<br/>start?</h2>
           <button className="btn massive" onClick={() => onEnter('practice')}>Start Now</button>
        </div>
      </footer>
    </div>
  )
}
