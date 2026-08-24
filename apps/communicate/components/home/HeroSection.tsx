"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mic, Sparkles } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { buttonVariants } from "@/components/ui/Button";

export function HeroSection() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".hero-eyebrow", { opacity: 0, y: 16, duration: 0.5 })
        .from(".hero-line", { opacity: 0, y: 28, duration: 0.7, stagger: 0.12 }, "-=0.25")
        .from(".hero-sub", { opacity: 0, y: 16, duration: 0.6 }, "-=0.35")
        .from(".hero-cta", { opacity: 0, y: 16, duration: 0.5, stagger: 0.1 }, "-=0.3")
        .from(".hero-image", { opacity: 0, scale: 0.94, duration: 0.9 }, "-=0.6")
        .from(".hero-float", { opacity: 0, y: 10, duration: 0.5, stagger: 0.15 }, "-=0.4");

      gsap.to(".hero-float-1", {
        y: -12,
        duration: 2.6,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".hero-float-2", {
        y: 12,
        duration: 3.1,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
        delay: 0.3,
      });
    },
    { scope: rootRef }
  );

  return (
    <section ref={rootRef} className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-[40rem] -translate-x-1/2 rounded-full bg-accent/10 blur-3xl" />

      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
        <div>
          <span className="hero-eyebrow inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs uppercase tracking-wider text-accent">
            <Sparkles size={12} />
            Audio to 3D sign language
          </span>

          <h1 className="mt-6 text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            <span className="hero-line block">Speak naturally.</span>
            <span className="hero-line block">
              Watch it become <span className="text-accent">sign language</span>.
            </span>
          </h1>

          <p className="hero-sub mt-6 max-w-lg text-base text-foreground-muted sm:text-lg">
            Record or upload audio and SignSpeak transcribes it, reads the emotion behind it, and
            drives a 3D avatar through the matching signs — in real time.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/register" className={`hero-cta ${buttonVariants("primary", "lg")}`}>
              Get started free
            </Link>
            <Link href="#how-it-works" className={`hero-cta ${buttonVariants("outline", "lg")}`}>
              See how it works
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="hero-image relative aspect-[4/5] w-full max-w-md overflow-hidden rounded-2xl border border-border sm:mx-auto lg:mx-0 lg:ml-auto">
            <Image
              src="https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80"
              alt="Close-up of hands communicating"
              fill
              sizes="(max-width: 1024px) 90vw, 480px"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
          </div>

          <div className="hero-float hero-float-1 absolute -left-6 top-8 hidden rounded-xl border border-border bg-background-elevated/90 px-4 py-3 backdrop-blur sm:block">
            <div className="flex items-center gap-2 text-xs text-foreground-muted">
              <Mic size={14} className="text-accent" />
              Listening…
            </div>
            <p className="mt-1 text-sm">&ldquo;Nice to meet you&rdquo;</p>
          </div>

          <div className="hero-float hero-float-2 absolute -right-4 bottom-10 hidden rounded-xl border border-border bg-background-elevated/90 px-4 py-3 backdrop-blur sm:block">
            <p className="text-xs text-foreground-muted">Detected emotion</p>
            <p className="mt-1 text-sm text-accent">🙂 Friendly · 92%</p>
          </div>
        </div>
      </div>
    </section>
  );
}
