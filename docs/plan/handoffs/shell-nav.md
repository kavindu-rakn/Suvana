# Shell landing navigation
started 2026-10-19 by Codex

## Handoff 2026-10-19 - Codex
Branch: codex/recognize-card-animation, based on prior user-requested Recognize animation increments.
Status: review
Changed files: apps/shell/index.html, apps/shell/src/styles/overview.css, apps/shell/src/main.ts, this handoff, append-only LOG.

- Reworded the four section links for visitors: About, What you can do, How it works, Feedback.
- Changed the desktop underline-only current marker into a larger, high-contrast pill; added keyboard focus styling and `aria-current=location` as sections change.
- Kept all four links visible on narrow screens in a second header row; every target is 44px high and fits in the nav at 390px and 360px widths. Anchor scrolling now accounts for the responsive header height.
- Rendered before/after desktop 1280x800, phone 390x844, and narrow phone 360x800 in light and dark. Browser check confirmed labels, visibility, target sizes, nav bounds, active-link update and phone section jump. Existing full-page phone overflow flag is not caused by nav bounds; it predates this change.
- Screenshots: .agent-local/screens/shell-nav/index.html (uncommitted; before/after captures).
- Gates: git diff --check passed. No test suite/build run in this turn.
- Separate content issue found during review: the Community section says “Tested by designers, developers, & advocates” and presents named testimonial quotes; the project plan says no study participants exist. This section is outside this header-scoped edit and requires a verified source or owner decision before those statements are presented publicly.
- SSL content and figures touched: none. r26_port: no.
- Needs kvn: review/adopt screenshots. Merge/push/deploy remain manual.

Commit message:
Clarify and expose landing page navigation

- Use plain language labels for the landing page sections
- Keep accessible section links visible on mobile and improve active state
- Offset smooth scroll for the responsive header

## Handoff addendum - 2026-10-19 - Codex
Status: review
- Restored an editorial section nav: serif labels, generous spacing, gold active text, and the animated teal-to-gold underline with a soft glow. Removed the rounded active pills introduced in 9708541.
- Kept the user-facing labels, mobile second-row navigation and 44px hit areas. Hover lifts gently; reduced-motion disables link/underline transitions and the lift. ARIA current location and responsive anchor offset remain.
- Screenshots refreshed at desktop, 390px and 360px in light/dark, plus desktop dark hover state: .agent-local/screens/shell-nav/index.html.
- Browser checks: links visible and inside nav at all viewport sizes; 44px hit areas; section jump marks correct link active and aligns heading; hover underline fully animates; reduced motion transitions 0s. Full-page phone overflow remains unrelated.
- `git diff --check` passed. No tests/build run.
- Manual visual review/adoption remains with kvn; no merge/push/deploy.

Commit message:
Restore editorial motion to landing navigation

- Bring back the animated teal-to-gold section underline and serif styling
- Keep plain-language links visible on phones with reduced-motion support
