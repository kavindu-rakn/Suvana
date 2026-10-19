# Account action alignment
started 2026-10-19 by Codex

Direct user follow-up on uifixes/suvana/main worktree: anchor submit button and alternate-account sentence at the same position across Login/Register modes. Preserve separate accountCopy.ts edits and existing UI-only passkey decision.
Plan correction: unscheduled direct task; planner files untouched.

## Handoff 2026-10-19 - Codex
Branch: uifixes/suvana/main worktree; follows 62b9c94.
Status: review
Cause: outer card dimensions were reserved, but each inner form kept its own content height. The Login submit button and alternate-account sentence were 18px above Register on desktop and phone.
Fix: make each overlaid form slot a vertical flex container, let the actual form fill the available space, and anchor submit with an automatic top margin. Both submit and alternate-account sentence now have identical top/bottom coordinates in both modes; no fixed pixel offsets or auth changes.
Changed: apps/communicate/components/auth/account.css (three focused rules), this handoff and appended LOG entry.
Validation: Communicate lint, TypeScript and /communicate production build passed. 263 sync guards and diff check passed. Browser assertions now include submit and alternate-account sentence bounds, not only card/switch bounds: all 14 viewport/theme cases pass at 1280x800, 903x532, 390x844, 360x640, 320x568, 844x390, 480x320 in light/dark. Existing no-scroll/error fit checks are also run.
Screenshots: .agent-local/screens/account-actions/index.html; before/after desktop 1280x800 and phone 390x844 in both modes; focused theme captures from geometry checks. Final phone capture visually inspected.
Existing accountCopy.ts edits remain untouched and outside commit. Passkey remains UI-only/disabled. No authentication, content, research figures, package or lockfile edits. r26_port: no.
Plan correction: direct follow-up overrides board/lane branch workflow; planner files untouched.
Needs kvn: visual review/adoption and manual merge/push/deploy.
Commit message:
Align account submit actions across login and register

- Fill the reserved form area and anchor submit actions at the bottom
- Keep the alternate-account sentence at the same vertical position
- Record exact geometry checks and before/after renders
