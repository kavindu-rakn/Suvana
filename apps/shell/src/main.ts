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

// Sync GSAP with Lenis. The GSAP ticker is the ONLY driver: lenis.raf() derives
// its deltaTime from the timestamp it is handed, so feeding it two clocks (a
// bare rAF's performance.now() and the ticker's elapsed-since-load) alternates
// a positive and a negative delta every frame. Lenis damps with
// exp(-lambda * dt), so a negative dt explodes lenis.velocity — by the offset
// between the two clocks, which is exactly the module-load time that a cold
// dev-server start makes large. See the marquee below, which reads velocity.
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

// Hide Header on Scroll Down & Update Scroll Progress
let lastScroll = 0;
const header = document.querySelector('.nav') as HTMLElement;
const scrollProgress = document.getElementById('scroll-progress');

lenis.on('scroll', (e: any) => {
  const currentScroll = e.animatedScroll;
  
  // Header hide/show logic
  if (currentScroll > lastScroll && currentScroll > 100) {
    header.classList.add('nav-hidden');
  } else {
    header.classList.remove('nav-hidden');
  }
  lastScroll = currentScroll;

  // Horizontal scroll progress bar logic
  if (scrollProgress && e.limit > 0) {
    scrollProgress.style.transform = `scaleX(${e.progress})`;
  }
});

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

// 5b. Pipeline & Testimonials Animations
gsap.from('.pipeline-card', {
  y: 40,
  opacity: 0,
  duration: 0.8,
  stagger: 0.15,
  ease: 'power3.out',
  scrollTrigger: {
    trigger: '.pipeline-grid',
    start: 'top 80%',
  },
});

gsap.from('.pipeline-showcase', {
  y: 40,
  opacity: 0,
  duration: 1,
  ease: 'power3.out',
  scrollTrigger: {
    trigger: '.pipeline-showcase',
    start: 'top 80%',
  },
});

gsap.from('.testimonial-card', {
  y: 40,
  opacity: 0,
  duration: 0.8,
  stagger: 0.2,
  ease: 'power3.out',
  scrollTrigger: {
    trigger: '.testimonials-grid',
    start: 'top 80%',
  },
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
    transition.finished.finally(() => {
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
  const baseSpeed = 0.02;

  // The content is two identical halves, so any xPercent is equivalent to the
  // same value modulo 50 — wrapping that way (rather than a single +50 nudge)
  // means no velocity spike can push the marquee somewhere it takes thousands
  // of frames to walk back from.
  const wrap = (n: number) => ((n % 50) + 50) % 50 - 50;

  const animateMarquee = () => {
    // Determine scroll speed influence (lenis.velocity is available globally since lenis is declared at top).
    // Capped: velocity is a per-frame pixel delta, and a tab returning from the
    // background hands Lenis one frame worth several seconds of scrolling.
    const velocity = lenis.velocity;
    const scrollSpeed = Number.isFinite(velocity) ? Math.min(Math.abs(velocity) * 0.001, 5) : 0;

    // Always move left base speed, but skew heavily by scroll velocity (absolute value to always move in same dir but faster)
    xPos = wrap(xPos - (baseSpeed + scrollSpeed));

    gsap.set(marqueeContent, { xPercent: xPos });
    requestAnimationFrame(animateMarquee);
  };
  requestAnimationFrame(animateMarquee);
}

// 9. Recognize card
// Recognition is the one module that is not a path on this domain — it needs
// its own origin for the WebSocket (see the marked comment in index.html). The
// card ships as "Ready to deploy" and only becomes a link once there is
// somewhere for it to go, so the badge never claims more than is true.
const recognizeFoot = document.querySelector<HTMLElement>('[data-recognize-foot]');

if (recognizeFoot) {
  const configured = recognizeFoot.dataset.serviceUrl?.trim() ?? '';
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  // The Docker default, so a local demo needs no edit to this file.
  const serviceUrl = configured || (isLocal ? 'http://localhost:7860' : '');

  if (serviceUrl) {
    const link = recognizeFoot.querySelector('a');
    const badge = recognizeFoot.querySelector<HTMLElement>('[data-recognize-badge]');

    if (link) {
      link.href = serviceUrl;
      link.hidden = false;
    }
    if (badge) {
      // A deployed origin is a live service; the localhost fallback is a
      // container someone started by hand, and saying so avoids a green
      // "Live" badge on a port that may well be closed.
      if (!configured) badge.textContent = 'Local · port 7860';
      badge.hidden = false;
    }
    recognizeFoot.querySelector('[data-recognize-placeholder]')?.remove();
  }
}

// 10. Page Transitions (Outbound)
document.body.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const link = target.closest('a');
  
  if (link) {
    const href = link.getAttribute('href');
    
    // Intercept local navigation links
    if (href && href.startsWith('/') && !href.startsWith('#')) {
      e.preventDefault();
      
      const preloader = document.getElementById('preloader');
      const loaderCount = document.getElementById('loader-count');
      
      if (preloader) {
        // Hide the counter text for the exit animation
        if (loaderCount) loaderCount.style.display = 'none'; 
        
        preloader.style.display = 'flex';
        // Sweep up from the bottom
        gsap.fromTo(preloader, 
          { yPercent: 100 }, 
          { 
            yPercent: 0, 
            duration: 0.8, 
            ease: 'power4.inOut',
            onComplete: () => {
              window.location.href = href;
            }
          }
        );
      } else {
        window.location.href = href;
      }
    }
  }
});
