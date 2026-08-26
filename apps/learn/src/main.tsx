import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// 1. Lenis Smooth Scroll
const lenis = new Lenis({
  lerp: 0.1,
  smoothWheel: true,
})

lenis.on('scroll', ScrollTrigger.update)

gsap.ticker.add((time) => {
  lenis.raf(time * 1000)
})

gsap.ticker.lagSmoothing(0)

// 2. Horizontal Scroll Progress Bar Hook
lenis.on('scroll', (e: any) => {
  const scrollProgress = document.getElementById('scroll-progress');
  if (scrollProgress && e.limit > 0) {
    scrollProgress.style.transform = `scaleX(${e.progress})`;
  }
});

// Set lenis on window so other components (like Hero) can tap into its velocity
(window as any).lenis = lenis;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
