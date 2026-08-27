"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";

const KEY = "suvana.theme";
const EVENT = "suvana:theme";

/**
 * The applied theme is external state: an inline script in the root layout
 * writes `data-theme` on <html> before React exists, which is what stops a
 * server-rendered page flashing the wrong colours. useSyncExternalStore is the
 * primitive for exactly that — read the DOM as the source of truth, subscribe
 * for changes, and hand SSR a snapshot of its own.
 *
 * (An effect that called setState on mount would do the same job, but React's
 * lint rule rejects it for good reason: it is a cascading render, and it
 * describes the DOM as derived state rather than as the store it is.)
 */
function subscribe(onChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY || (e.newValue !== "light" && e.newValue !== "dark")) return;
    // Another tab changed it: bring this document in line, then re-read.
    document.documentElement.dataset.theme = e.newValue;
    onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, onChange);
  };
}

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/**
 * The server cannot know the visitor's theme, so it renders no icon at all.
 * Guessing would produce a hydration mismatch on the very control whose job is
 * to prevent a visible flash.
 */
function getServerSnapshot(): Theme | undefined {
  return undefined;
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* Private mode: applies now, does not persist. */
    }
    window.dispatchEvent(new Event(EVENT));
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
