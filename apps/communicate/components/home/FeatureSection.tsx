"use client";

import { useRef } from "react";
import { AudioLines, Box, Smile, History } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { Card } from "@/components/ui/Card";

const FEATURES = [
  {
    icon: AudioLines,
    title: "Record or upload audio",
    description:
      "Capture audio straight from your microphone or pick an existing file — no extra software needed.",
  },
  {
    icon: Smile,
    title: "Instant transcript + emotion",
    description:
      "Speech is transcribed to text and analyzed for tone, so you see both what was said and how it was said.",
  },
  {
    icon: Box,
    title: "3D sign language avatar",
    description:
      "Recognized text is matched to sign glosses and played back on a rigged 3D avatar, sign by sign.",
  },
  {
    icon: History,
    title: "Your personal library",
    description:
      "Every translation is saved to your account so you can revisit past sessions from your dashboard.",
  },
] as const;

export function FeatureSection() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(".feature-heading", {
        opacity: 0,
        y: 20,
        duration: 0.6,
        ease: "power3.out",
        scrollTrigger: { trigger: rootRef.current, start: "top 75%" },
      });

      gsap.from(".feature-card", {
        opacity: 0,
        y: 32,
        duration: 0.6,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: { trigger: ".feature-grid", start: "top 80%" },
      });
    },
    { scope: rootRef }
  );

  return (
    <section id="features" ref={rootRef} className="mx-auto max-w-6xl px-6 py-24">
      <div className="feature-heading max-w-2xl">
        <span className="text-xs uppercase tracking-wider text-accent">Features</span>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          Everything between your voice and a sign
        </h2>
        <p className="mt-4 text-foreground-muted">
          Four steps, one seamless pipeline — from raw audio to a 3D avatar signing it back.
        </p>
      </div>

      <div className="feature-grid mt-12 grid gap-5 sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <Card key={title} className="feature-card p-6 transition-colors hover:border-accent/50">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Icon size={20} />
            </div>
            <h3 className="mt-4 text-lg font-medium">{title}</h3>
            <p className="mt-2 text-sm text-foreground-muted">{description}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
