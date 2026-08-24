import type { Metadata } from "next";
import { ContributeClient } from "./ContributeClient";

export const metadata: Metadata = {
  title: "Contribute your voice — Suvana",
  description:
    "Help build a Sinhala speech-emotion dataset for a sign-language research project. Takes about 20 minutes.",
};

/**
 * Public, unauthenticated recording page.
 *
 * Deliberately outside /dashboard: contributors are volunteers who will never
 * have an account, and every extra step between the link and the microphone
 * loses people.
 */
export default function ContributePage() {
  return <ContributeClient />;
}
