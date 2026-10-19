import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initWebGLBackground } from './webgl';
import { initTheme } from './theme';
import { mountAssistant } from './assistant/widget';
import { recognizeTarget } from './recognizeLink';
import { signOut } from './signOut';

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

// Landing content is visible in the HTML/CSS, with no arrival/reload gate.
// A separate small entry handles sign-up waiting without delaying navigation.
window.addEventListener('suvana:navigation-loading', event => {
  if ((event as CustomEvent<boolean>).detail) lenis.stop();
  else lenis.start();
});

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

// Hero content needs no JavaScript entrance animation to become visible.

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

// 6. Theme Toggle (shared with the other pages the shell serves)
initTheme();

// 7. Auth Logic
(async () => {
  const slot = document.getElementById('auth-slot');
  if (!slot) return;
  const signedOut = `
    <a class="auth-cta" href="/register?callbackUrl=%2F">Sign Up</a>`;
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
    // Home is user-facing: no Admin or Account links here. Admins reach Admin
    // from the Communicate header; everyone reaches the dashboard from the
    // Communicate module card.
    slot.innerHTML = `
      <span class="auth-who">Hi, <strong></strong></span>
      <button type="button" class="auth-cta">Sign out</button>`;
    slot.querySelector('strong')!.textContent = who;
    const signOutButton = slot.querySelector<HTMLButtonElement>('button')!;
    signOutButton.addEventListener('click', async () => {
      signOutButton.disabled = true;
      signOutButton.textContent = 'Signing out…';
      try {
        await signOut();
        window.location.assign('/');
      } catch {
        signOutButton.disabled = false;
        signOutButton.textContent = 'Try again';
      }
    });
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

// 9. Recognize card and header share the same resolved destination.
const recognizeFoot = document.querySelector<HTMLElement>('[data-recognize-foot]');
if (recognizeFoot) {
  const configured = recognizeFoot.dataset.serviceUrl?.trim() || (import.meta.env.VITE_RECOGNIZE_URL as string | undefined)?.trim() || '';
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  const links = document.querySelectorAll<HTMLAnchorElement>('[data-module-recognize], [data-recognize-foot] a');
  const badge = recognizeFoot.querySelector<HTMLElement>('[data-recognize-badge]');
  links.forEach(link => { link.href = '/recognize/'; link.hidden = false; });
  if (badge) { badge.textContent = 'On Suvana'; badge.hidden = false; }
  recognizeFoot.querySelector('[data-recognize-placeholder]')?.remove();
  void recognizeTarget(configured, isLocal).then(target => {
    links.forEach(link => { link.href = target; });
    if (badge && target !== '/recognize/') badge.textContent = isLocal && !configured ? 'Local service' : 'Direct service';
  });
}

// Navigation is native. The sign-up loader also clears on history restores.

// 12. Live platform stat
// The sign count is the one number on this page that changes when the model is
// retrained, so it is read from the committed index rather than typed into the
// markup. Everything else in the band is an architectural constant. On failure
// the em dash already in the HTML stands — better than a wrong number.
const signStat = document.querySelector<HTMLElement>('[data-stat="signs"]');
if (signStat) {
  void fetch('/data/signs.json', { cache: 'force-cache' })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      const count = data?.signs?.length;
      if (!count) return;
      // Count up, but only once the band is actually on screen.
      const run = () => {
        const value = { n: 0 };
        gsap.to(value, {
          n: count,
          duration: 1.2,
          ease: 'power2.out',
          onUpdate: () => { signStat.textContent = String(Math.round(value.n)); },
        });
      };
      ScrollTrigger.create({ trigger: signStat, start: 'top 90%', once: true, onEnter: run });
    })
    .catch(() => {});
}

// 13. The assistant. It carries its own knowledge base and talks to no Suvana
// service, so it works here whether or not anything else is running.
mountAssistant();
