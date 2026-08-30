import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { initWebGLBackground } from './webgl';
import { initTheme } from './theme';
import { mountAssistant } from './assistant/widget';

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

// 6. Theme Toggle (shared with the other pages the shell serves)
initTheme();

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
  // Two local origins are plausible and both are documented: 8000 is the
  // uvicorn command in the runbook, 7860 the Docker default in
  // services/recognition/DEPLOY-SUVANA.md. Default to 8000 so the link works
  // the moment the runbook is followed, then confirm by probe.
  const LOCAL_PORTS = [8000, 7860];
  const serviceUrl = configured || (isLocal ? `http://localhost:${LOCAL_PORTS[0]}` : '');

  if (serviceUrl) {
    const link = recognizeFoot.querySelector('a');
    const badge = recognizeFoot.querySelector<HTMLElement>('[data-recognize-badge]');

    if (link) {
      link.href = serviceUrl;
      link.hidden = false;
    }
    if (badge) {
      // A deployed origin is a live service; the localhost fallback is a
      // server someone started by hand, and saying so avoids a green "Live"
      // badge on a port that may well be closed.
      if (!configured) badge.textContent = `Local · port ${LOCAL_PORTS[0]}`;
      badge.hidden = false;
    }
    recognizeFoot.querySelector('[data-recognize-placeholder]')?.remove();

    // Find which port is actually answering. The service serves no CORS
    // headers by design (it is same-origin with its own page), so the response
    // cannot be read — but a no-cors fetch still settles: it resolves opaque
    // when something replied and rejects when the connection was refused,
    // which is exactly the liveness question being asked. It cannot tell what
    // is listening, so it only ever picks between the two documented ports.
    if (!configured && isLocal) {
      const probe = (port: number) =>
        fetch(`http://localhost:${port}/api/info`, {
          mode: 'no-cors',
          signal: AbortSignal.timeout(1500),
        }).then(() => port);

      void Promise.any(LOCAL_PORTS.map(probe))
        .then((port) => {
          if (link) link.href = `http://localhost:${port}`;
          if (badge) badge.textContent = `Local · port ${port}`;
        })
        .catch(() => {
          // Nothing is up yet. Leave the link on the runbook's port and say so
          // rather than implying a running service.
          if (badge) badge.textContent = 'Local · not running';
        });
    }
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

// 11. Section navigation
// The landing is one long page, so the header carries jump links. Two pieces:
// the scroll itself has to go through Lenis (a native anchor jump sets
// scrollTop directly, which Lenis then fights back to where it thinks the page
// is), and an observer marks whichever section is in view.
const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.nav-links a'));

if (navLinks.length) {
  // Lenis is already intercepting the wheel, so hand it the target too. The
  // offset clears the fixed header, which would otherwise cover the heading
  // the reader just asked to see.
  document.addEventListener('click', (e) => {
    const link = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    const id = link?.getAttribute('href');
    if (!id || id === '#') return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target as HTMLElement, { offset: -80, duration: 1.1 });
    history.replaceState(null, '', id);
  });

  const sections = new Map<Element, HTMLAnchorElement>();
  for (const link of navLinks) {
    const target = document.querySelector(link.getAttribute('href') ?? '');
    if (target) sections.set(target, link);
  }

  if (sections.size && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const link = sections.get(entry.target);
          if (!link) continue;
          navLinks.forEach((l) => l.classList.remove('is-current'));
          link.classList.add('is-current');
        }
      },
      // A band across the upper third of the viewport. That matches where a
      // reader perceives "the section I'm in" better than dead centre does,
      // and it keeps exactly one section current at a time.
      { rootMargin: '-15% 0px -75% 0px', threshold: 0 },
    );
    sections.forEach((_link, target) => io.observe(target));
  }
}

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
