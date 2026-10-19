import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "./RegisterForm";
import { LoginForm } from "../login/LoginForm";
import { accountPage, type AccountSearch } from "@/lib/accountPage";

export const metadata: Metadata = {
  title: "Sign up — Suvana",
  description: "One Suvana account for Learn, Communicate and Recognize. Alerts works without an account.",
};

export default async function RegisterPage({ searchParams }: { searchParams: Promise<AccountSearch> }) {
  const callbackUrl = await accountPage("register", searchParams);
  return (
    <AuthShell initialMode="register"
      loginForm={<LoginForm callbackUrl={callbackUrl} />}
      registerForm={<RegisterForm callbackUrl={callbackUrl} />}
    />
  );
}
