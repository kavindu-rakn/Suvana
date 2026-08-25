"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

const KEY = "suvana.theme";

/**
 * Light/dark switch.
 *
 * The theme is applied before React exists — an inline script in the root
 * layout sets data-theme from the shared `suvana.theme` key, which is what
 * keeps a server-rendered page from flashing the wrong colours. This only
 * flips the attribute and records the choice.
 *
 * The key is shared with the shell and the Learn module: all three are served
 * from one origin, so the preference follows the user across the platform.
 */
export function ThemeToggle() {
  // Starts undefined so the button renders nothing until mounted: the server
  // cannot know the visitor's theme, and guessing produces a hydration
  // mismatch on the very element meant to prevent flashes.
  const [theme, setTheme] = useState<Theme | undefined>(undefined);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");

    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY || (e.newValue !== "light" && e.newValue !== "dark")) return;
      document.documentElement.dataset.theme = e.newValue;
      setTheme(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* Private mode: applies now, does not persist. */
    }
  }

  const label = theme ? `Switch to ${theme === "dark" ? "light" : "dark"} theme` : "Switch theme";

  return (
    <button
      onClick={toggle}
      aria-label={label}
      title={label}
      className="grid h-9 w-9 place-items-center rounded-full border border-border text-foreground-muted transition-colors hover:border-accent hover:text-accent"
    >
      {theme === undefined ? null : theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
