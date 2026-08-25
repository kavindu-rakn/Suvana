import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initWebGLBackground } from './webgl';

gsap.registerPlugin(ScrollTrigger);

// 1. Initialize Lenis for Smooth Scrolling
const lenis = new Lenis({
  lerp: 0.1,
  wheelMultiplier: 1,
});

lenis.on('scroll', ScrollTrigger.update);

gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0);

// 2. Custom Cursor
const cursor = document.getElementById('custom-cursor');
let cursorX = window.innerWidth / 2;
let cursorY = window.innerHeight / 2;

document.addEventListener('mousemove', (e) => {
  cursorX = e.clientX;
  cursorY = e.clientY;
  
  gsap.to(cursor, {
    x: cursorX,
    y: cursorY,
    duration: 0.1,
    ease: 'power2.out'
  });
});

// Add hover states to interactive elements
const interactiveElements = document.querySelectorAll('a, button, .theme-toggle');
interactiveElements.forEach(el => {
  el.addEventListener('mouseenter', () => {
    document.body.classList.add('is-hovering');
  });
  el.addEventListener('mouseleave', () => {
    document.body.classList.remove('is-hovering');
  });
});

// 3. WebGL Background
const canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
if (canvas) {
  initWebGLBackground(canvas);
}

// 4. Hero Animations (Entrance)
const heroTl = gsap.timeline({ defaults: { ease: 'power3.out' } });

heroTl.to('.hero .lockup', {
  opacity: 1,
  y: 0,
  duration: 1.2,
  delay: 0.2
})
.to('.hero .name-si', {
  opacity: 1,
  y: 0,
  duration: 1
}, "-=0.8")
.to('.hero .tagline', {
  opacity: 1,
  y: 0,
  duration: 1
}, "-=0.8")
.to('.hero .subline, .hero .btn', {
  opacity: 1,
  y: 0,
  duration: 1,
  stagger: 0.2
}, "-=0.8");

// Hero Parallax on Scroll
gsap.to('.hero .content', {
  yPercent: 30,
  ease: 'none',
  scrollTrigger: {
    trigger: '.hero',
    start: 'top top',
    end: 'bottom top',
    scrub: true
  }
});

// 5. Modules Scroll Animations
const modules = gsap.utils.toArray('.module-section');

modules.forEach((mod: any, i) => {
  const content = mod.querySelector('.module-content');
  const visual = mod.querySelector('.module-visual');
  
  // Create a timeline for each module
  const modTl = gsap.timeline({
    scrollTrigger: {
      trigger: mod,
      start: 'top 80%',
      end: 'top 30%',
      scrub: 1,
    }
  });

  // Determine direction based on index (even/odd)
  const direction = i % 2 === 0 ? 50 : -50;

  modTl.fromTo(content, 
    { x: direction, opacity: 0 },
    { x: 0, opacity: 1, duration: 1 }
  )
  .fromTo(visual,
    { scale: 0.8, opacity: 0 },
    { scale: 1, opacity: 1, duration: 1 },
    "<" // sync with content animation
  );
});

// 6. Theme Toggle with Mask Transition
const themeBtn = document.getElementById('theme-toggle');
const themeMask = document.getElementById('theme-mask');

const SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>';
const MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>';

function paintBtn(theme: string) {
  if (!themeBtn) return;
  const next = theme === 'dark' ? 'light' : 'dark';
  themeBtn.innerHTML = theme === 'dark' ? SUN : MOON;
  themeBtn.setAttribute('aria-label', 'Switch to ' + next + ' theme');
  themeBtn.setAttribute('title', 'Switch to ' + next + ' theme');
}

paintBtn(document.documentElement.dataset.theme || 'light');

if (themeBtn && themeMask) {
  themeBtn.addEventListener('click', (e) => {
    const currentTheme = document.documentElement.dataset.theme;
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    // Set the mask background to the incoming theme's color
    const nextBgColor = nextTheme === 'dark' ? '#0a1414' : '#fdfdfd';
    themeMask.style.background = nextBgColor;
    
    // Get button coordinates for the animation origin
    const rect = themeBtn.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    // Calculate max radius needed to cover the screen
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );
    
    gsap.fromTo(themeMask, 
      { clipPath: `circle(0px at ${x}px ${y}px)` },
      { 
        clipPath: `circle(${maxRadius}px at ${x}px ${y}px)`, 
        duration: 0.8,
        ease: 'power3.inOut',
        onComplete: () => {
          document.documentElement.dataset.theme = nextTheme;
          paintBtn(nextTheme);
          try {
            localStorage.setItem('suvana.theme', nextTheme);
          } catch (e) {}
          
          // Dispatch event for WebGL to update
          window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: nextTheme } }));
          
          // Reset mask
          gsap.set(themeMask, { clipPath: 'circle(0% at center)' });
        }
      }
    );
  });
}

// Keep other tabs in step
window.addEventListener('storage', function (e) {
  if (e.key !== 'suvana.theme' || !e.newValue) return;
  document.documentElement.dataset.theme = e.newValue;
  paintBtn(e.newValue);
  window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: e.newValue } }));
});

// 7. Auth Slot
(async () => {
  const slot = document.getElementById('auth-slot');
  if (!slot) return;
  const signedOut = `
    <a href="/communicate/login?callbackUrl=%2F">Sign in</a>
    <a class="auth-cta" href="/communicate/register?callbackUrl=%2F">Create account</a>`;
  try {
    const res = await fetch('/communicate/api/auth/session', {
      headers: { accept: 'application/json' },
    });
    const session = res.ok ? await res.json() : null;
    const user = session && session.user;
    if (!user) {
      slot.innerHTML = signedOut;
      return;
    }
    const who = user.name || user.email || 'Signed in';
    const admin =
      user.role === 'admin' ? '<a href="/communicate/admin">Admin</a>' : '';
    slot.innerHTML = `
      <span class="auth-who">Hi, <strong></strong></span>
      ${admin}
      <a href="/communicate/dashboard">Account</a>
      <a class="auth-cta" href="/communicate/api/auth/signout">Sign out</a>`;
    // textContent, not interpolation: the name is user-supplied.
    slot.querySelector('strong')!.textContent = who;
  } catch {
    slot.innerHTML = signedOut;
  }
})();
