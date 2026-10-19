"use client";

import { apiPath } from "@/lib/basePath";
import { type FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { accountLink, safeCallbackUrl } from "@/lib/accountPaths";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function RegisterForm({ callbackUrl = "/" }: { callbackUrl?: string }) {
  const destination = safeCallbackUrl(callbackUrl);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(apiPath("/api/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      // Auto sign-in right after successful registration.
      const signInRes = await signIn("credentials", { email, password, redirect: false, redirectTo: destination });
      setLoading(false);

      if (!signInRes || signInRes.error) {
        window.location.assign(accountLink("login", destination));
        return;
      }

      window.location.assign(destination);
    } catch {
      setLoading(false);
      setError("Network error. Please try again.");
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="register-name"
          label="Name"
          type="text"
          autoComplete="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Jane Doe"
        />
        <Input
          id="register-email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <Input
          id="register-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
        />
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <Button type="submit" size="lg" disabled={loading} className="mt-2 w-full">
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Creating account…
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-foreground-muted">
        Already have an account?{" "}
        <a href={accountLink("login", destination)} className="text-accent hover:underline">
          Log in
        </a>
      </p>
    </>
  );
}
