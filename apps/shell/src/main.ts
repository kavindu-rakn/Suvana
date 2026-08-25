import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initWebGLBackground } from './webgl';

gsap.registerPlugin(ScrollTrigger);

// 1. Lenis Smooth Scroll
const lenis = new Lenis({
  lerp: 0.1,
  smoothWheel: true,
});

function raf(time: number) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// Sync GSAP with Lenis
gsap.ticker.add((time) => {
  lenis.raf(time * 1000);
});
gsap.ticker.lagSmoothing(0, 0);

// Preloader Logic
const preloader = document.getElementById('preloader');
const loaderCount = document.getElementById('loader-count');

// Create hero timeline but pause it initially
const heroTl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });

if (preloader && loaderCount) {
  document.body.style.overflow = 'hidden'; // lock scroll
  lenis.stop(); // lock lenis
  
  const progress = { value: 0 };
  
  const loaderTl = gsap.timeline({
    onComplete: () => {
      document.body.style.overflow = '';
      lenis.start();
      preloader.style.display = 'none';
    }
  });

  loaderTl.to(progress, {
    value: 100,
    duration: 1.5,
    ease: 'power3.inOut',
    onUpdate: () => {
      loaderCount.innerText = Math.round(progress.value).toString();
    }
  })
  .to(preloader, {
    yPercent: -100,
    duration: 0.8,
    ease: 'power4.inOut',
  })
  .add(() => heroTl.play(), "-=0.4"); // start hero entrance before preloader fully leaves
} else {
  heroTl.play();
}

// Hide Header on Scroll Down
let lastScroll = 0;
const header = document.querySelector('.nav') as HTMLElement;
lenis.on('scroll', (e: any) => {
  const currentScroll = e.animatedScroll;
  if (currentScroll > lastScroll && currentScroll > 100) {
    header.classList.add('nav-hidden');
  } else {
    header.classList.remove('nav-hidden');
  }
  lastScroll = currentScroll;
});

// 2. Custom Cursor Logic
const cursor = document.getElementById('custom-cursor');
if (cursor) {
  document.addEventListener('mousemove', (e) => {
    // Instant responsive follow, no lerp delay
    cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`;
  });

  // Hide cursor when leaving the window to prevent it getting stuck at the border
  document.addEventListener('mouseleave', () => cursor.style.opacity = '0');
  document.addEventListener('mouseenter', () => cursor.style.opacity = '1');

  // Event delegation for hover states (works for dynamically injected buttons like Sign In)
  const isInteractable = (target: HTMLElement | null) => 
    target?.closest('a, button, input, [role="button"], .theme-toggle');

  document.body.addEventListener('mouseover', (e) => {
    if (isInteractable(e.target as HTMLElement)) {
      document.body.classList.add('is-hovering');
    }
  });
  
  document.body.addEventListener('mouseout', (e) => {
    if (isInteractable(e.target as HTMLElement)) {
      document.body.classList.remove('is-hovering');
    }
  });
}

// 3. WebGL Background
const canvas = document.getElementById('webgl-canvas') as HTMLCanvasElement;
if (canvas) {
  initWebGLBackground(canvas);
}

// 4. Hero GSAP Animations
// Hero animation continues...
heroTl.to('.hero-mark', {
  opacity: 1,
  scale: 1,
  duration: 1.5,
  delay: 0.2
})
.to('.hero-suvana-en', {
  opacity: 1,
  y: 0,
  duration: 1.2
}, "-=1")
.to('.hero-suvana-si', {
  opacity: 1,
  y: 0,
  duration: 1.2
}, "-=1")
.to('.hero .tagline', {
  opacity: 1,
  y: 0,
  duration: 1
}, "-=0.8")
.to('.hero .subline', {
  opacity: 1,
  y: 0,
  duration: 1
}, "-=0.8");

// Removed magnetic parallax per user request

// 5. Vertical Scroll Modules
const modules = gsap.utils.toArray('.module-row');

modules.forEach((mod: any, i) => {
  const content = mod.querySelector('.mr-content');
  const visual = mod.querySelector('.mr-visual');
  
  const direction = i % 2 === 0 ? 50 : -50;

  gsap.fromTo(content, 
    { x: direction, opacity: 0 },
    { 
      x: 0, 
      opacity: 1, 
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: mod,
        start: 'top 80%',
        end: 'top 50%',
        scrub: 1
      }
    }
  );

  gsap.fromTo(visual,
    { scale: 0.9, opacity: 0, rotateY: direction > 0 ? 5 : -5 },
    { 
      scale: 1, 
      opacity: 1, 
      rotateY: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: mod,
        start: 'top 80%',
        end: 'top 50%',
        scrub: 1
      }
    }
  );
});

// 6. Theme Toggle with View Transitions API
const themeBtn = document.getElementById('theme-toggle');

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

if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.dataset.theme;
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    const switchTheme = () => {
      document.documentElement.dataset.theme = nextTheme;
      paintBtn(nextTheme);
      try { localStorage.setItem('suvana.theme', nextTheme); } catch (e) {}
      window.dispatchEvent(new CustomEvent('theme-changed', { detail: { theme: nextTheme } }));
    };

    if (!(document as any).startViewTransition) {
      switchTheme();
      return;
    }

    const rect = themeBtn.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const maxRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    const transition = (document as any).startViewTransition(switchTheme);

    // Prevent frozen custom cursor during transition
    document.body.classList.add('is-transitioning');
    transition.finished.then(() => {
      document.body.classList.remove('is-transitioning');
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRadius}px at ${x}px ${y}px)`
          ],
        },
        {
          duration: 800,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)',
        }
      );
    });
  });
}

// 7. Auth Logic
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
    const admin = user.role === 'admin' ? '<a href="/communicate/admin">Admin</a>' : '';
    slot.innerHTML = `
      <span class="auth-who">Hi, <strong></strong></span>
      ${admin}
      <a href="/communicate/dashboard">Account</a>
      <a class="auth-cta" href="/communicate/api/auth/signout">Sign out</a>`;
    slot.querySelector('strong')!.textContent = who;
  } catch {
    slot.innerHTML = signedOut;
  }
})();

// 8. Footer Marquee
const marqueeContent = document.querySelector('.marquee-content');
if (marqueeContent) {
  let xPos = 0;
  const baseSpeed = 0.05;

  const animateMarquee = () => {
    // Determine scroll speed influence (lenis.velocity is available globally since lenis is declared at top)
    const scrollSpeed = Math.abs((lenis.velocity || 0) * 0.005);
    
    // Always move left base speed, but skew heavily by scroll velocity (absolute value to always move in same dir but faster)
    xPos -= (baseSpeed + scrollSpeed);

    // Loop
    if (xPos <= -50) {
      xPos += 50;
    } else if (xPos > 0) {
      xPos -= 50;
    }

    gsap.set(marqueeContent, { xPercent: xPos });
    requestAnimationFrame(animateMarquee);
  };
  requestAnimationFrame(animateMarquee);
}
