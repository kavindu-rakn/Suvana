import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// Lenis smooth-scroll is a marketing-hero effect and it hijacks the wheel from
// every scroll container in the app when it runs globally. It now lives in
// Hero.tsx, mounted and torn down with the hero.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
