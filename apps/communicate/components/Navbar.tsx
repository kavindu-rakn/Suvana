import Link from "next/link";
import { Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { buttonVariants } from "@/components/ui/Button";
import { LogoutButton } from "@/components/LogoutButton";
import { ThemeToggle } from "@/components/ThemeToggle";

export async function Navbar() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Sparkles size={18} className="text-accent" />
          Suvana
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-foreground-muted sm:flex">
          <Link href="/#features" className="transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="/#how-it-works" className="transition-colors hover:text-foreground">
            How it works
          </Link>
          {session?.user && (
            <Link href="/dashboard" className="transition-colors hover:text-foreground">
              Dashboard
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          {session?.user?.role === "admin" && (
            <Link href="/admin" className="text-sm text-foreground-muted hover:text-foreground">
              Admin
            </Link>
          )}
          {session?.user ? (
            <>
              <span className="hidden text-sm text-foreground-muted sm:inline">
                {session.user.name}
              </span>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className={buttonVariants("ghost", "md")}>
                Log in
              </Link>
              <Link href="/register" className={buttonVariants("primary", "md")}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
