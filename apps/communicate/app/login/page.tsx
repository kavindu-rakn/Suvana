import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Log in — SignSpeak" };

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Log in to continue to your dashboard.">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
