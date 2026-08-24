import type { Metadata } from "next";
import { SignModelClient } from "./SignModelClient";

export const metadata: Metadata = { title: "Audio to Sign Model — Suvana" };

export default function SignModelPage() {
  return <SignModelClient />;
}
