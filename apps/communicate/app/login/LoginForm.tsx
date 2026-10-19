"use client";

import { type FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { accountLink, safeCallbackUrl } from "@/lib/accountPaths";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function LoginForm({ callbackUrl = "/" }: { callbackUrl?: string }) {
  const destination = safeCallbackUrl(callbackUrl);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await signIn("credentials", { email, password, redirect: false, redirectTo: destination });
      if (!res || res.error) {
        setError("Invalid email or password.");
        return;
      }
      // Full navigation reaches Shell/Learn too; Next's router adds basePath.
      window.location.assign(destination);
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          id="login-email"
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
        <Input
          id="login-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <Button type="submit" size="lg" disabled={loading} className="mt-2 w-full">
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Logging in…
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-foreground-muted">
        Don&apos;t have an account?{" "}
        <a href={accountLink("register", destination)} className="text-accent hover:underline">
          Sign up
        </a>
      </p>
    </>
  );
}
