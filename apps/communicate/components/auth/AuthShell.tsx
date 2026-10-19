"use client";

import { type MouseEvent, type ReactNode, useRef, useState } from "react";
import { accountCopy } from "./accountCopy";
import "./account.css";
import "../../../../packages/branding/shell-footer.css";

type Mode = "login" | "register";

/** One account surface; old URLs simply select the initial form. */
export function AuthShell({ initialMode, loginForm, registerForm }: {
  initialMode: Mode;
  loginForm: ReactNode;
  registerForm: ReactNode;
}) {
  const [mode, setMode] = useState(initialMode);
  const panel = useRef<HTMLDivElement>(null);

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
          {/* eslint-disable-next-line @next/next/no-img-element -- Use the actual Shell brand asset. */}
          <img className="account-mark" src="/branding/suvana-mark.png" alt="" />
          <h1 id="account-welcome" aria-label={accountCopy.heading}>Welcome<br /> to <span>Suvana.</span></h1>
          <p className="account-description">{accountCopy.description}</p>
        </section>

        <section className="account-card" aria-label="Your Suvana account">
          <button type="button" role="switch" aria-label="Register mode" aria-checked={mode === "register"}
            className="account-mode-switch" data-mode={mode}
            onClick={(event) => {
              const box = event.currentTarget.getBoundingClientRect();
              switchMode(event.detail === 0 ? (mode === "login" ? "register" : "login")
                : event.clientX < box.left + box.width / 2 ? "login" : "register");
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                switchMode(event.key === "ArrowLeft" ? "login" : "register");
              }
            }}>
            <span className="account-mode-highlight" aria-hidden="true" />
            <span>Login</span><span>Register</span>
          </button>
          <div className="account-form-heading" aria-live="polite">
            {(["login", "register"] as const).map((headingMode) => (
              <div key={headingMode} data-inactive={mode !== headingMode} aria-hidden={mode !== headingMode}>
                <h2>{accountCopy[headingMode].title}<span>.</span></h2>
                <p>{accountCopy[headingMode].subtitle}</p>
              </div>
            ))}
          </div>
          <div className="account-panel" ref={panel} onClick={followFormLink}>
            <div data-inactive={mode !== "register"} aria-hidden={mode !== "register"} inert={mode !== "register"}>{registerForm}</div>
            <div data-inactive={mode !== "login"} aria-hidden={mode !== "login"} inert={mode !== "login"}>{loginForm}</div>
          </div>
        </section>
      </div>
      <footer className="account-footer">
        <div className="footer-bottom">
          <div className="fb-left">
            <span className="fb-logo">SUVANA</span>
            <span className="copyright">© {new Date().getFullYear()} Suvana. All rights reserved.</span>
          </div>
          <nav className="fb-right" aria-label="Footer">
            <a href="/privacy.html">Privacy</a>
            <a href="/terms.html">Terms</a>
            <a href="/contact.html">Contact</a>
            <a href="/pricing.html">Roadmap</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
