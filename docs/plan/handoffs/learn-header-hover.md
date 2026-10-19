# Learn header and resting card border

- Started: 2026-10-19, Codex; revamp/learn-path in main worktree per session request.
- Plan correction: direct follow-up authorizes the scoped App/header/card-style edits outside board/lane selection.
- r26_port: yes.
- Scope: hide account control, leave theme toggle at header's right edge, remove persistent unlocked-lesson border while preserving hover and keyboard focus.
- Before screenshots: .agent-local/screens/learn-header-hover/before-{1280,390}-{light,dark}.png.

## Implementation and review
- Hid the existing optional account slot using a native hidden wrapper. This hides pending, signed-out and signed-in controls from display, accessibility and keyboard navigation while preserving the platform-only session/account coupling required by sync guards.
- With that hidden slot out of flex layout, the theme button is the sole visible utility and sits at the header content's right edge. Existing header padding and responsive layout remain intact.
- Removed the border override for data-state=open. All cards now rest with the neutral border; existing hover accent and visible keyboard-focus outline remain unchanged. Lesson status, unlocking and star counts are unchanged.
- Inspected desktop 1280x800 and phone 390x844 renders in both themes. Gallery: .agent-local/screens/learn-header-hover/index.html.
- Browser interaction review: eight combinations (320/390/1280/1920px, light/dark) verified account hidden, sole theme utility at the right, functioning theme switching/persistence, hover returning to neutral, and visible keyboard focus. No runtime errors.
- Existing focused Playwright checks: five passed (entry/reload/author bookmarks/completed sessions and seeded star/unlock states). Extended the existing seeded milestone test to verify unlocked Greetings has the neutral resting border. Synthetic Starter progress is UI evidence only, not learner results.

## Gates and completion
- Learn npm ci and lint passed. Full single-worker unit suite: 371 passed / 13 skipped (same scoring/timing assertions; no threshold changes). Production build passed; main JS 154.86 kB gzip, below 160 kB.
- Five focused Playwright tests and eight width/theme interaction cases passed. Metadata freshness, 266 sync guards and git diff --check passed.
- Preserved the existing account coupling after sync guards required its optional slot and platform-only session wiring. Only the visible control is hidden; no authentication/account behavior or contracts were removed.
- No dependencies, lockfiles, generated metadata, curriculum, scoring or unlock changes. Existing dependency audit findings remain (2 moderate / 3 high).
- Restored preview on http://localhost:5174/learn/ with forced dependency optimization. Reverified actual Path rendering and info-modal open/close on desktop/phone in both themes, without runtime or Learn asset failures.
- Refresh Learn to review. Screenshot adoption, merge/push/deploy and any R26 port remain manual; r26_port: yes.
