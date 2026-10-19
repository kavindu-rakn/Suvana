import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "../register/RegisterForm";
import { accountPage, type AccountSearch } from "@/lib/accountPage";

export const metadata: Metadata = {
  title: "Sign in — Suvana",
  description: "One Suvana account for Learn, Communicate and Recognize. Alerts works without an account.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<AccountSearch> }) {
  const callbackUrl = await accountPage("login", searchParams);
  return (
    <AuthShell initialMode="login"
      loginForm={<LoginForm callbackUrl={callbackUrl} />}
      registerForm={<RegisterForm callbackUrl={callbackUrl} />}
    />
  );
}
