# Learn Path locks and Everyday terms rename

- Started: 2026-10-19, Codex; revamp/learn-path, main worktree per session instruction.
- Plan correction: directly assigned session task overrides board/lane selection. Board/decisions/history unchanged.
- r26_port: yes.
- Scope: restore visible Lucide lock for locked lessons and rename Everyday words and directions 1/2 to Everyday terms 1/2 through generator and derived metadata, preserving progress IDs and curriculum signs/order.

## Completed
- Locked lesson cards now show Lucide Lock with an accessible label; lock takes precedence over previously earned stars. Sentence challenge also displays its lock while unavailable.
- Existing sequential unlock rule already requires every sign in all earlier lessons to have at least one star. Added explicit regression assertions for one unfinished sign, including a high score on another sign; reward/unlock logic unchanged.
- Renamed the two display titles to Everyday terms 1 and Everyday terms 2 in the curriculum generator and generated curriculum. Updated curriculum order expectations and regenerated the assistant knowledge/compatibility assets using the existing generator.
- Snapshot comparison to HEAD confirms exactly two curriculum title changes; IDs, signs, sign order, unit order, categories, descriptions and approval status are identical. Existing sessions/progress continue to use unchanged IDs/glosses.
- Existing plan/handoff/history wording remains historical; no board or decision edits.

## Gates
- Learn: npm ci, lint, 367 tests passed / 13 skipped, production build passed; main JS 155.23 kB gzip.
- Shell: 157 tests passed, TypeScript and build passed; existing >500 kB chunk advisory remains.
- Recognize: required keypoint augmentation / Sinhala labels plus Suvana labels checks: 42 passed. System/bundled Python lacked pytest, so pytest/numpy/requests were installed only under ignored .agent-local/pytest-runtime for these checks; no dependency manifests changed.
- Assistant knowledge generator --check passed. Sync guard 264 passed. git diff --check passed.
- Browser: 14 uniform/mixed star fixtures at 1280x800 and 390x844 passed; next lesson lock persists with any zero-star sign and disappears at all-one-star completion. Existing reward icon cases still pass; sentence lock and renamed titles confirmed. No horizontal overflow. Synthetic attempt logs are UI evidence only, not learner results.
- Render review: .agent-local/screens/learn-path-locks/index.html, before-{desktop,phone}.png and after-{desktop,phone}-{0,1,2,3}.png. Visually inspected desktop/phone images; screenshots remain uncommitted.
- Restarted Learn on localhost:5174/learn/ with --force after npm ci; verified actual rendered Path on desktop and phone to prevent stale optimizer white-screen recurrence.

## Remaining
- kvn visual review/adoption. Merge/push/deploy and R26 mirror remain manual.
