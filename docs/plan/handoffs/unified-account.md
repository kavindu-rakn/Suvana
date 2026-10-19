# Unified Shell account page
started 2026-10-19 by Codex

Direct user assignment: one combined sign-up/sign-in surface styled like Shell, same header, one Shell Sign Up entry and footer start link. Keep existing login/register URLs as compatible entries and preserve authentication/API/callback behavior. Work on uifixes/suvana in the main worktree as requested for this session.

Plan correction: unscheduled user-assigned task overriding usual lane/branch setup. No board or decision edits.

## Handoff 2026-10-19 - Codex
Branch: uifixes/suvana in the main worktree; based on preceding shell CTA increment 3b7e081.
Status: review

Changes:
- /register and /login now render the same interactive AuthShell with sign-up/sign-in modes. Existing URLs choose the initial mode, keeping saved links, Auth.js entry, signup fallback and module callbacks compatible. Mode buttons and form-switch links stay on the page and preserve entered state. Mode switching is held while a submit is pending.
- Editorial serif heading, teal/gold accents, orbit motion, interactive controls and light/dark responsive layout. Added stable input IDs/labels and announced errors. Existing form submit handlers, auth/session APIs, registration validation and callback safety remain unchanged.
- One Shell Sign Up link replaces the two signed-out header links. Footer start? already points to /register?callbackUrl=%2F and needs no change.
- Account requests use ShellAccountHeader with the same brand/control markup and CSS source as Shell. Shared styles were extracted from base.css/overview.css into packages/branding/shell-header.css, scoped to #header; existing Shell information pages also keep these styles. Header signup/theme targets are 44px. Normal Communicate module navbar stays on its existing path.
- Next build/tracing root includes repository packages so both builds bundle the shared stylesheet independently. No runtime stylesheet dependency or deployment-order requirement introduced. No route rewrites/config secrets changed.
- Declared new account CSS/header couplings and protected unified form/header wiring through sync guards. This direct integration task includes the narrow upstreams.json additions needed by the repository's coupling rule; no package or lockfile changes.

Gates:
- Shell: 157 tests passed across 9 files; typecheck and production build passed. Existing >500 kB main-chunk advisory remains (644.95 kB, 180.56 kB gzip).
- Communicate: lint passed, /communicate production build and TypeScript passed (27 pages).
- Account helpers: 6 tests passed (safe callbacks, loop rejection, configured origin and routing marker).
- Sync: 260 checks passed. git diff --check passed.
- Clean npm ci was not repeated against the running user preview: previous increment hit Windows locked dependency EPERM and restored dependencies through npm install --no-package-lock. Tests/builds above use that restored install; do not describe this as clean-install proof.

Browser verification (local, actual UI; all writes intercepted with synthetic responses):
- Initial /register signup and /login signin modes; same-document mode switching and form-switch links; values and module callback preserved.
- Sign-in failure and duplicate registration error visibly announced; successful registration followed by failed auto-login retains existing /login callback fallback; successful sign-in navigates to the module callback.
- Widths 360, 390, 768, 1280, both themes: no document overflow, single header, theme toggle, keyboard mode activation/focus, reduced-motion disabled animations.
- Normal motion: orbit animation and submit hover work. Shell/account signup header geometry, colors and font size match at 390 and 1280.
- Shell has one signed-out Sign Up anchor; footer keeps registration destination.
- No real accounts created or real credentials submitted; live database/session success and production deployment remain unverified. Existing auth submit code was preserved.

Screenshots: .agent-local/screens/unified-account/index.html. Before/after desktop viewport 1280x800 and phone 390x844, both themes and both initial modes (full-page captures). Rendered desktop and phone images inspected; screenshots stay uncommitted.
SSL content: none. Research figures: none. r26_port: no.
Plan correction: direct assignment overrides usual board task/branch/worktree; BOARD.md/tasks.json/DECISIONS.md untouched.
Needs kvn: visual adoption, then manual merge/push/deploy of Shell and Communicate and a real account return-path smoke test. No breaking migration or approval dependency was necessary.

Commit message:
Unify account forms with the Shell design

- Combine signup and signin modes while preserving routes and callbacks
- Share Shell header styling and keep one Sign Up entry
- Add responsive themed account interactions and accessibility
- Protect sync couplings and record builds, tests and rendered review
