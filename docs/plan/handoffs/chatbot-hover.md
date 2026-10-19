# Chatbot launcher hover area
started 2026-10-19 by Codex

Direct user assignment on uifixes/suvana/main worktree: only hovering the actual chatbot button should show the Ask Suvana AI pill. Keep keyboard focus behavior and the existing phone experience.
Plan correction: unscheduled direct task; planner files untouched. Preserve separate accountCopy.ts edits.

## Handoff 2026-10-19 - Codex
Branch: uifixes/suvana/main worktree; follows 372555a.
Status: review
Fix: one CSS selector now checks .svn-ai-launcher:hover through :has(), instead of hovering the entire launcher wrapper. The hidden tooltip's own space no longer activates the label. Keyboard focus-visible behavior is preserved; phone label remains hidden as before.
Changed product file: apps/shell/src/styles/assistant.css (one line).
Gates: Shell 157 tests across 9 files, typecheck/build, 263 sync guards and diff check pass. Existing >500 kB main-chunk advisory remains (644.95 kB). No dependency/lockfile changes; prior clean-install lock limitation remains.
Browser: reproduced old failure (hidden label area opacity 1); fixed state opacity 0. Actual launcher hover yields opacity 1; moving onto the pill area hides it again. Keyboard focus still reveals label. Launcher clicks open the panel at desktop 1280x800 and phone 390x844; phone tooltip remains hidden. No messages submitted.
Screenshots: .agent-local/screens/chatbot-hover/index.html, before/after desktop hidden-area/button-hover and phone. Final desktop hover capture visually inspected; images stay local.
Separate accountCopy.ts subtitle edits preserved outside commit. No auth, SSL content or research figures touched. r26_port: no.
Plan correction: direct user follow-up overrides usual board/lane task setup; planner files untouched.
Needs kvn: visual review/adoption and manual merge/push/deploy.
Commit message:
Limit chatbot hint hover to the launcher button

- Trigger the hint from the actual launcher instead of its wrapper
- Preserve keyboard focus and phone behavior
- Record browser reproduction and validation gates
