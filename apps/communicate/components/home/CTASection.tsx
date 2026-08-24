"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { gsap, useGSAP } from "@/lib/gsap";
import { buttonVariants } from "@/components/ui/Button";

export function CTASection() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(".cta-content > *", {
        opacity: 0,
        y: 20,
        duration: 0.6,
        stagger: 0.1,
        ease: "power3.out",
        scrollTrigger: { trigger: rootRef.current, start: "top 80%" },
      });
    },
    { scope: rootRef }
  );

  return (
    <section ref={rootRef} className="mx-auto max-w-6xl px-6 pb-24">
      <div className="relative overflow-hidden rounded-2xl border border-border">
        <Image
          src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1600&auto=format&fit=crop&q=80"
          alt="Abstract purple gradient backdrop"
          fill
          sizes="100vw"
          className="object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/85 to-background" />

        <div className="cta-content relative z-10 flex flex-col items-center gap-5 px-6 py-20 text-center">
          <h2 className="max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
            Ready to give your words a <span className="text-accent">visual voice</span>?
          </h2>
          <p className="max-w-md text-foreground-muted">
            Create a free account and start translating audio into sign language in minutes.
          </p>
          <Link href="/register" className={buttonVariants("primary", "lg")}>
            Create your account
          </Link>
        </div>
      </div>
    </section>
  );
}
