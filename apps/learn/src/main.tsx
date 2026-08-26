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
if (cursor) {
  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let isMoving = false;

  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!isMoving) {
      cursor.style.display = 'flex';
      isMoving = true;
    }
  });

  const renderCursor = () => {
    if (isMoving) {
      // Use transform for instant hardware-accelerated movement, chained with -50% to perfectly center
      cursor.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
    }
    requestAnimationFrame(renderCursor);
  };
  requestAnimationFrame(renderCursor);

  document.addEventListener('mouseenter', () => {
    cursor.style.display = 'flex';
    isMoving = true;
  });

  document.addEventListener('mouseleave', () => {
    cursor.style.display = 'none';
    isMoving = false;
  });
}

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
