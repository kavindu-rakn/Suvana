import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "./RegisterForm";
import { accountPage, type AccountSearch } from "@/lib/accountPage";
import { accountCopy } from "@/components/auth/accountCopy";

export const metadata: Metadata = {
  title: "Sign up — Suvana",
  description: "One Suvana account for Learn, Communicate and Recognize. Alerts works without an account.",
};

export default async function RegisterPage({ searchParams }: { searchParams: Promise<AccountSearch> }) {
  const callbackUrl = await accountPage("register", searchParams);
  return (
    <AuthShell title={accountCopy.register.title} subtitle={accountCopy.register.subtitle}>
      <RegisterForm callbackUrl={callbackUrl} />
    </AuthShell>
  );
}
