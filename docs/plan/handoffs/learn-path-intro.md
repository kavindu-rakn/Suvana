# Learn Path intro removal

- Started/completed: 2026-10-19, Codex.
- Branch/worktree: revamp/learn-path, main worktree, explicitly requested by kvn.
- Plan correction: direct session task overrides board task/branch/lane selection; planner files unchanged.
- r26_port: yes.

## Change
- Removed the screenshotted eyebrow, heading and two intro paragraphs from the Path overview. Unit cards flow upward without a spacer.
- Removed unused heading CSS. Preserved the overview accessible name via aria-label and the unit detail heading association.

## Validation
- npm ci passed after stopping the existing Learn Vite process that locked the native build dependency. npm reports 5 dependency audit findings (2 moderate, 3 high); no dependency versions changed.
- Lint passed; 357 tests passed / 13 skipped (55 files passed / 4 skipped). Initial sandbox test attempt failed before collection with temporary-file rename EPERM; normal-environment rerun passed.
- Build passed, main JS 155.21 kB gzip (under 160 kB).
- Sync guard: 263 passed.
- Real browser, fresh local profile, no seeded attempts: desktop 1280x800 and phone 390x844. Intro absent; first card top moved 353.86 -> 128px desktop and 359.44 -> 108px phone; neither viewport has horizontal overflow.
- Visually inspected after screenshots. Screenshots: .agent-local/screens/learn-path-intro/{before,after}-{desktop,phone}.png (before captures full page, after captures viewport). No screenshots committed.
- Existing Learn dev server restarted on Codex port 5184 for verification.

## Remaining
- kvn visual review; merge/push/deploy remain manual.
