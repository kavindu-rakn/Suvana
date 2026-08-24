import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-foreground-muted sm:flex-row">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-accent" />
          <span>SignSpeak</span>
        </div>
        <p>&copy; {new Date().getFullYear()} SignSpeak. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <Link href="/#features" className="hover:text-foreground">
            Features
          </Link>
          <Link href="/#how-it-works" className="hover:text-foreground">
            How it works
          </Link>
        </div>
      </div>
    </footer>
  );
}
