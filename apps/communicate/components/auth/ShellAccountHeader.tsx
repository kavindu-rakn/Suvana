"use client";

import { ThemeToggle } from "@/components/ThemeToggle";
import "../../../../packages/branding/shell-header.css";

/** Same markup, brand asset and shared styles as Shell; root anchors bypass Next's basePath. */
export function ShellAccountHeader() {
  return (
    <header id="header">
      <div className="nav">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Shell owns the root. */}
        <a href="/" aria-label="Suvana home" className="brand">
          {/* eslint-disable-next-line @next/next/no-img-element -- Shared Shell asset on the public origin. */}
          <img className="mark" src="/branding/suvana-mark.png" alt="" />
          <span className="wordmark">Suvana</span>
        </a>
        <div className="nav-right">
          <ThemeToggle className="theme-toggle" />
        </div>
      </div>
    </header>
  );
}
