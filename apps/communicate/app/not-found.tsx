import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 px-6 text-center">
      <span className="text-sm uppercase tracking-wider text-accent">404</span>
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="max-w-sm text-foreground-muted">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <Link href="/" className={buttonVariants("primary", "md")}>
        Back home
      </Link>
    </div>
  );
}
