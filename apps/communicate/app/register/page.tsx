import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Sign up — Suvana" };

export default function RegisterPage() {
  return (
    <AuthShell title="Create your account" subtitle="Start turning speech into sign language.">
      <RegisterForm />
    </AuthShell>
  );
}
