import type { Metadata } from "next";
import { AnimationsClient } from "./AnimationsClient";

export const metadata: Metadata = { title: "Animations — Suvana" };

export default function AnimationsPage() {
  return <AnimationsClient />;
}
