"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

const STEPS = [
  {
    step: "01",
    title: "Capture audio",
    description: "Record with your mic or upload a file from your device.",
  },
  {
    step: "02",
    title: "Transcribe & detect emotion",
    description: "Your speech-to-text model returns the transcript plus the detected emotion.",
  },
  {
    step: "03",
    title: "Match to sign glosses",
    description: "The text is broken down and matched to a sequence of known sign glosses.",
  },
  {
    step: "04",
    title: "Play on the 3D avatar",
    description: "Each gloss's animation plays in order on a rigged 3D model, right in the browser.",
  },
] as const;

export function HowItWorksSection() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(".step-item", {
        opacity: 0,
        x: -24,
        duration: 0.6,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: { trigger: rootRef.current, start: "top 70%" },
      });

      gsap.fromTo(
        ".step-line-fill",
        { scaleY: 0 },
        {
          scaleY: 1,
          ease: "none",
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top 60%",
            end: "bottom 80%",
            scrub: 0.5,
          },
        }
      );
    },
    { scope: rootRef }
  );

  return (
    <section id="how-it-works" ref={rootRef} className="bg-background-elevated/40 py-24">
      <div className="mx-auto max-w-4xl px-6">
        <div className="max-w-2xl">
          <span className="text-xs uppercase tracking-wider text-accent">How it works</span>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            From your voice to a sign, in four steps
          </h2>
        </div>

        <div className="relative mt-14 flex flex-col gap-10">
          <div className="absolute left-4 top-2 bottom-2 w-px bg-border">
            <div className="step-line-fill h-full w-full origin-top bg-accent" />
          </div>

          {STEPS.map(({ step, title, description }) => (
            <div key={step} className="step-item relative flex gap-6 pl-0">
              <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-background text-xs font-medium text-accent">
                {step}
              </div>
              <div className="pt-1">
                <h3 className="text-lg font-medium">{title}</h3>
                <p className="mt-1 text-sm text-foreground-muted">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
