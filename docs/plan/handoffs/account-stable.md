# Stable account form and theme actions
started 2026-10-19 by Codex

Direct assignment on uifixes/suvana in the main worktree: restore theme-aware Shell signup/action colors, remove account header signup, anchor form/switch across modes, and add passkey entry. Existing backend has password credentials only; asked whether to add passkey enrollment/storage/verification before changing authentication. Safe UI work continues while that decision is pending.
Plan correction: direct user task overrides board/lane setup; planner-owned files remain untouched.

## Handoff 2026-10-19 - Codex
Branch: uifixes/suvana/main worktree; follows a12acc2.
Status: review

Changes:
- Restored Shell signup colors to the supplied theme examples: light background #2f4f4f / text #fdfdfd; dark background #cfe3df / text #0a1414. Kept the wider/slimmer action dimensions.
- Removed redundant Sign Up from the account header; theme toggle now sits at the right corner. Shared Shell brand/header styling remains.
- Login/Register submit actions use the same theme colors. Alternate Register/Login links use the matching slate text color.
- Heading and form variants share grid cells and both contribute to intrinsic layout height. Inactive form is visibility-hidden, aria-hidden and inert. The outer card and mode switch have identical bounds while changing modes, without arbitrary fixed pixel heights.
- Added Use Passkey above Login as a disabled, Coming soon UI control with an accessible unavailable description. User explicitly chose Keep this task to the UI after being told the password-only backend lacks enrollment/storage/verification. No authentication/API/database/dependency changes made.
- Sync guards updated for theme-only account header and inert form slots.

Validation:
- Shell: 157 tests across 9 files; typecheck/build pass. Existing >500 kB main chunk advisory remains (644.95 kB).
- Communicate: lint, TypeScript and /communicate production build pass.
- Sync: 263 checks pass; git diff --check passes.
- Browser: 14 viewport/theme cases (1280x800, 903x532, 390x844, 360x640, 320x568, 844x390, 480x320 x light/dark) have exactly identical card x/y/width/height and switch x/y/width/height in both modes. Actual computed submit/link/Shell action colors match the values above. Account header has theme control and no signup action; inactive fields are inert and excluded from accessible roles; passkey is disabled.
- Existing password/signup mocked behavior checks still pass, including safe callback/state, errors, auto-login fallback and successful return. No real credential writes.
- Existing 22 viewport/mode no-scroll/no-overlap geometry cases pass; visible errors also fit 320x568, 903x532, 480x320. Theme/keyboard/reduced-motion checks pass at 360/390/768/1280.
- Clean install limitation from prior increments remains; no package/lockfile edits or npm ci rerun against the running preview.

Screenshots: .agent-local/screens/account-stable/index.html, before/after desktop/review/phone/small-phone light/dark, plus focused Login mode renders. Visually inspected final desktop and phone login images. Screenshots stay local.
Separate working-copy edits detected in components/auth/accountCopy.ts (Login/Register subtitles) were not made by this increment and are preserved outside its commit. Browser captures/builds include that working copy; do not claim an entirely clean checkout.
SSL/figures touched: none. r26_port: no.
Needs kvn: visual review/adoption; merge/push/deploy remain manual. Real passkey sign-in intentionally excluded by the explicit UI-only decision.

Commit message:
Stabilize account modes and restore theme action colors

- Keep card and Login/Register switch geometry identical across modes
- Restore slate action colors and simplify the account header
- Add a disabled passkey preview under the UI-only scope
- Record responsive comparisons and validation results
