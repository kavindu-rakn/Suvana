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

// 3. Custom Cursor Logic
const cursor = document.getElementById('custom-cursor');
let isMouseMoving = false;
let mouseTimeout: any;

document.addEventListener('mousemove', (e) => {
  if (!cursor) return;
  // Use transform for instant hardware-accelerated movement
  cursor.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
  
  if (!isMouseMoving) {
    cursor.style.display = 'flex';
    isMouseMoving = true;
  }
  
  clearTimeout(mouseTimeout);
  mouseTimeout = setTimeout(() => {
    isMouseMoving = false;
  }, 1000);
});

document.addEventListener('mouseleave', () => {
  if (cursor) cursor.style.display = 'none';
});

// Use event delegation for hover states
document.body.addEventListener('mouseover', (e) => {
  const target = e.target as HTMLElement;
  if (target.closest('a') || target.closest('button')) {
    cursor?.classList.add('hovering');
  }
});

document.body.addEventListener('mouseout', (e) => {
  const target = e.target as HTMLElement;
  if (target.closest('a') || target.closest('button')) {
    cursor?.classList.remove('hovering');
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
