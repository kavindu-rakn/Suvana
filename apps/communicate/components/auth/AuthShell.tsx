import { Sparkles } from "lucide-react";
import type { ReactNode } from "react";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-background-elevated p-12 lg:flex">
        <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-accent-strong/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-2 text-lg font-semibold">
          <Sparkles size={20} className="text-accent" />
          SignSpeak
        </div>

        <div className="relative z-10">
          <p className="text-3xl font-semibold leading-tight">
            Turn speech into
            <br />
            <span className="text-accent">sign language</span>, instantly.
          </p>
          <p className="mt-4 max-w-sm text-foreground-muted">
            Record or upload audio, get an instant transcript with detected emotion, then watch a
            3D avatar sign it back to you.
          </p>
        </div>

        <p className="relative z-10 text-xs text-foreground-muted">
          &copy; {new Date().getFullYear()} SignSpeak
        </p>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-foreground-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
