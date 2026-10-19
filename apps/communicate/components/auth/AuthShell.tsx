"use client";

import { type MouseEvent, type ReactNode, useRef, useState } from "react";
import { accountCopy } from "./accountCopy";
import "./account.css";

type Mode = "login" | "register";

/** One account surface; old URLs simply select the initial form. */
export function AuthShell({ initialMode, loginForm, registerForm }: {
  initialMode: Mode;
  loginForm: ReactNode;
  registerForm: ReactNode;
}) {
  const [mode, setMode] = useState(initialMode);
  const panel = useRef<HTMLDivElement>(null);
  const copy = accountCopy[mode];

  function switchMode(next: Mode) {
    // Keep an in-flight authentication request on screen until it finishes.
    if (panel.current?.querySelector("[type=submit]:disabled")) return;
    setMode(next);
  }

  function followFormLink(event: MouseEvent<HTMLDivElement>) {
    const link = (event.target as HTMLElement).closest("a");
    if (!link || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const path = new URL(link.href).pathname;
    if (path !== "/login" && path !== "/register") return;
    event.preventDefault();
    switchMode(path === "/login" ? "login" : "register");
  }

  return (
    <div className="account-page">
      <div className="account-topline" aria-hidden="true" />
      <div className="account-layout">
        <section className="account-story" aria-labelledby="account-welcome">
          <p className="account-eyebrow"><span /> One account. All of Suvana.</p>
          <h1 id="account-welcome" aria-label={accountCopy.heading}>Welcome<br /> to <span>Suvana.</span></h1>
          <p className="account-description">{accountCopy.description}</p>
          <div className="account-connections" aria-hidden="true">
            <span>Learn</span><i /> <span>Communicate</span><i /> <span>Recognize</span>
          </div>
          <div className="account-orbit" aria-hidden="true"><span /><span /><b /></div>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Shell owns the root. */}
          <a href="/" className="account-back"><span aria-hidden="true">↖</span> Back to Suvana</a>
        </section>

        <section className="account-card" aria-label="Your Suvana account">
          <div className="account-mode-switch" role="group" aria-label="Account action">
            <button type="button" aria-pressed={mode === "register"} onClick={() => switchMode("register")}>Sign up</button>
            <button type="button" aria-pressed={mode === "login"} onClick={() => switchMode("login")}>Sign in</button>
          </div>
          <div className="account-form-heading" aria-live="polite">
            <p className="account-eyebrow">{mode === "register" ? "Your next chapter" : "Pick up where you left off"}</p>
            <h2>{copy.title}<span>.</span></h2>
            <p>{copy.subtitle}</p>
          </div>
          <div className="account-panel" ref={panel} onClick={followFormLink}>
            <div hidden={mode !== "register"}>{registerForm}</div>
            <div hidden={mode !== "login"}>{loginForm}</div>
          </div>
          <p className="account-note">One account for Learn, Communicate and Recognize.</p>
        </section>
      </div>
      <footer className="account-footer"><span>© {new Date().getFullYear()} Suvana</span><span>Bridge the gap.</span></footer>
    </div>
  );
}
