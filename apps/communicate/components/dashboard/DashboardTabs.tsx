"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, AudioLines, Box, Sparkles, Database, Settings } from "lucide-react";

const TABS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/speech-to-text", label: "Speech to Text", icon: AudioLines },
  { href: "/dashboard/sign-model", label: "Audio to Sign Model", icon: Box },
  { href: "/dashboard/animations", label: "Animations", icon: Sparkles },
  { href: "/dashboard/dataset", label: "Dataset", icon: Database },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;

export function DashboardTabs() {
  const pathname = usePathname();

  return (
    <div className="border-b border-border">
      <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-6">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm transition-colors ${
                active
                  ? "border-accent text-accent"
                  : "border-transparent text-foreground-muted hover:text-foreground"
              }`}
            >
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
