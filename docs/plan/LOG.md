# LOG: append-only handoff journal

Rules:
- **Append only.** Never edit or delete an earlier entry. Add your entry at the end of the file.
- One entry per task handoff, per blocker, per kvn decision given in chat, per teammate reply, per deployment, per screenshot verdict.
- Keep entries short; the detail lives in `docs/plan/handoffs/<ID>.md`.
- Parallel branches append here; `.gitattributes` (Q-02) sets `docs/plan/LOG.md merge=union`, so both sides are kept. Until Q-02 merges, kvn keeps both sides when resolving.
- Never write secrets, tokens, passwords or personal data here.

## Template

```
### <YYYY-MM-DD HH:MM> | <tool or kvn> | <task ID or topic>
- What: <one line: done / blocked / partial / decision / deploy / reply / verdict>
- Branch @ sha: <agent/...@abcdef0 | n/a>
- Gates: <short, or n/a>
- Screenshots: <path to contact sheet, or n/a>
- Needs kvn: <question, or none>
- Next: <what happens next>
```

## Entries

### 2026-10-12 22:00 | claude-code (final editor, planning run) | PLAN
- What: Wrote docs/plan/ (README, 00-11, BOARD.md, tasks.json with 97 tasks, DECISIONS.md, LOG.md) from the six audits and the hostile review. Resolved the review's critical items: U1 derived from data (greetings and numbers 1-5 are all yohan_* and there is no "3"); no silhouette (invented location); corpus video gated on DN-05 (Kaggle clips partly from YouTube); Suvana vercel.json never ported to R26; Q-01 no longer gates other tasks; same-day cross-lane dependencies removed; M0 port and redeploy on 14 Oct.
- Branch @ sha: n/a (files are untracked in the primary worktree; kvn commits them in K-01)
- Gates: n/a (no code changed)
- Screenshots: n/a
- Needs kvn: K-01 tonight (merge sync/upstream-2026-10 and this plan into main, add `.agent-local/` to .git/info/exclude, pull R26); decide DN-12 tonight; DN-01, DN-10, DN-11, DN-17, DN-18 by 13 Oct; DN-05, DN-06, DN-14 by 14 Oct.
- Next: 13 Oct lanes per 10-schedule.md (CC: Q-01, L-02, L-01; CX: L-04, L-05, L-06; AG: Q-00, I-01, I-02).

## 2026-10-13 00:45 - claude-code (planning session) - K-01 check
- K-01 done by kvn: main = origin/main = 0ad2c55, CI green on main, `.agent-local/` in .git/info/exclude, R26 pulled to ec2604a.
- Lane worktrees created (detached at main): Suvana-wt/claude, Suvana-wt/codex, Suvana-wt/antigravity. 08 §3 now says to skip the "first time" commands.
- Next: each lane starts its 13 Oct tasks from BOARD.md.


### 2026-10-13 01:28 | claude-code | Q-01
- What: done (review). Per-module AGENTS.md + CLAUDE.md stubs for apps/learn and services/recognition; root AGENTS.md index and reconciled rules (9.3 KB); .claude/ narrowed; README links docs/plan. Rule-by-rule table vs the 10-Oct CLAUDE.md in handoffs/Q-01.md.
- Branch @ sha: agent/claude/Q-01-agents-md (see git log)
- Gates: sync guard ok (152 checks); no code changed
- Screenshots: n/a
- Needs kvn: none. Plan correction: AGENTS.md/CLAUDE.md said "worktree per task"; 08 says one worktree per lane. Both now match 08.
- Next: L-02 keyboard, then L-01 finger states (stacked on L-02).

### 2026-10-13 01:36 | claude-code | L-02
- What: done (review). Esc no longer exits Practice mid-countdown or mid-take; Enter/Space on a focused button do what the button does; shortcut listener registered once in the capture phase.
- Branch @ sha: agent/claude/L-02-keyboard (see git log)
- Gates: guard ok; lint 1 warning (was 2); tests 137 passed + 7 skipped; build ok 142.83 kB gzip
- Screenshots: n/a (manual check written in handoffs/L-02.md)
- Needs kvn: none. Plan correction: test baseline in lane worktrees is 133 + 7 skipped (no corpus), not 138 + 2.
- Next: L-01 finger states, stacked on this branch.

### 2026-10-13 01:50 | kvn (in chat to claude-code) | DN-17 amendment
- What: decision. Per-finger Correct/Almost/Wrong states are hidden for now: no fixed cut-off on the measured per-finger deviation separates correct takes from wrong signs (calibration corpus figures in handoffs/L-01.md). Result screen keeps the overall score, per-hand scores (two-handed signs) and "Focus on" chips. Revisit with L-17.
- Branch @ sha: n/a
- Gates: n/a
- Screenshots: .agent-local/screens/L-01/index.html (rejected variants A and B included)
- Needs kvn: copy into DECISIONS.md (amends D-A12)
- Next: L-01 ships without finger states.

### 2026-10-13 01:58 | claude-code | L-01
- What: done (review). Invented per-finger % and the 90/75/60 tiers removed; band() is the only label scale; two-handed signs show measured per-hand scores; meaning shown once without lang="si"; fingerStates.ts kept (tested, not wired in) with a corpus test that records why.
- Branch @ sha: agent/claude/L-01-finger-states (stacked on agent/claude/L-02-keyboard; see git log)
- Gates: guard ok; lint 1 warning (L-04's); tests 144 passed + 9 skipped; build ok 141.61 kB gzip
- Screenshots: C:\Users\User\Documents\Suvana-wt\claude\.agent-local\screens\L-01\index.html
- Needs kvn: adopt/reject the UI from the contact sheet; record the DN-17 amendment. Plan correction: L-01's 0.1/0.05 cut-offs and HINT_MIN_DEVIATION fire on correct takes (for L-17); 07's M0 commit text needs the new wording.
- Next: claude-code's 13 Oct tasks are done; 14 Oct R-00 M0 port after kvn merges.

### 2026-10-13 01:36 | codex | L-04
- What: Camera lifecycle, GPU-to-CPU fallback and wall-clock capture safeguards ready for review; no real-device verification claimed.
- Branch @ sha: agent/codex/L-04-camera-lifecycle @ task HEAD (see handoffs/L-04.md and git log -1 on branch).
- Gates: guard 152; lint 1 existing PracticeView warning, 0 new; tests 137 passed / 7 skipped; build 143.21 kB gzip; diff check passed.
- Screenshots: n/a (logic-only).
- Needs kvn: review/merge; real-camera and phone checks at Q-06a/Q-06; R-00 port after merge.
- Plan correction: clean lane lacks untracked calibration data; baseline 138/2 does not apply here, calibration/weight-fit and opt-in evaluation tests skip (7 total). No data generated or committed.
- Next: L-05 storage on a leaf stacked on this logic-only branch, then L-06 from L-04.

### 2026-10-13 01:49 | codex | L-06
- What: Cache headers, standalone root redirect and asset versioning ready for review; R26-only header instructions and version-bump rule in handoffs/L-06.md.
- Branch @ sha: agent/codex/L-06-cache-headers @ task HEAD, stacked on L-04 e9fa2bc. L-05 52124ae stays a sibling leaf.
- Gates: clean npm ci/lint/test/build passed; 1 existing PracticeView warning / 0 new; 144 passed / 7 skipped; main JS 143.38 kB gzip; guard 152; diff check passed; 7 versioned URLs returned 200 in local production preview (preview stopped).
- Screenshots: n/a (logic-only). L-05 screenshots remain pending until Q-00 merges; see that branch's handoff.
- Needs kvn: review/merge L-04 first, then the sibling L-05/L-06 branches (keep both LOG appends); L-05 needs screenshots and visual adoption first; R-00 port and D-01 deployed smoke later.
- Next: today's Codex queue implemented; no 14 Oct tasks started.

### 2026-10-13 02:16 | antigravity | I-02
- What: done: Updated user-visible Alerts strings to Suvana Alerts in Onboarding.tsx:204 and withSoundGuardBackground.js:171, 249. Proposes upstreams.json declaration and guards.
- Branch @ sha: agent/antigravity/I-02-alerts-strings@65e0dd8
- Gates: guard ok (152 checks passed) | alerts tsc passed (npx tsc --noEmit 0 errors)
- Screenshots: C:/Users/User/Documents/Suvana-wt/antigravity/.agent-local/screens/I-02/index.html
- Needs kvn: none
- Next: All Antigravity tasks for 2026-10-13 completed (Q-00, I-01, I-02 in review)

### 2026-10-13 01:52 | antigravity | Q-00
- What: done: Playwright screenshot shooter (tools/screens/shoot.mjs), contact sheet generator (contact-sheet.mjs), ffmpeg conversion documentation, dev-only fixtures page (apps/learn/fixtures.html, src/dev/fixtures.tsx) and JSON fixtures.
- Branch @ sha: agent/antigravity/Q-00-screens@9a85bd7
- Gates: guard ok (152 checks passed) | learn lint 0 new warnings (2 upstream) | tests 133 passed, 7 skipped | build 142.70 kB gzip (fixtures.html excluded from dist)
- Screenshots: C:/Users/User/Documents/Suvana-wt/antigravity/.agent-local/screens/Q-00/index.html
- Needs kvn: none
- Next: I-01 (Shell: remove the 'SoundGuard Ecosystem' sub-brand, configurable Recognize URL, fix the stale example)

### 2026-10-13 02:40 | kvn (K-10, prepared by the planning session) | evening merge
- Merged into main via integration/2026-10-13: Q-01, L-02, L-01 (finger states hidden, D-A15), L-04, L-06, I-02. Gates on the merged tree: Learn 155 passed + 9 skipped, lint clean, build ok, sync guard 152.
- Not merged: Q-00 (changes requested: build breaks with L-01's ScoreBadge; three fixture glosses are not real signs; invented coaching text), I-01 (screenshots show only the intro counter; re-shoot), L-05 (screenshots wait for Q-00).
- Plan corrections applied: lane-worktree test baseline (08 section 9), M0 commit wording (07 section 4), L-17 re-derives HINT_MIN_DEVIATION.
- Tomorrow first: antigravity reworks Q-00, then re-shoots I-01; kvn merges Q-00 at midday so codex can shoot L-05.

<<<<<<< HEAD
### 2026-10-13 02:58 | antigravity | Q-00 rework
- What: done: Reworked Q-00 dev fixtures to align with merged L-01 ScoreBadge props (hands: HandFeedback[], no per-finger accuracy), replaced fixture glosses with real references from public/reference-index.json (DAKINAWA, AHANAWA, AYUBOWAN, KANAWA), used real scorer hint strings (or none), and re-shot after screens.
- Branch @ sha: agent/antigravity/Q-00-screens (rebased on main @ 2fd433a)
- Gates: guard ok (153 passed) | learn lint 0 warnings, 0 errors | learn tests 155 passed, 9 skipped | learn build ok (fixtures.html excluded from dist) | shoot.mjs and contact-sheet ok
- Screenshots: C:/Users/User/Documents/Suvana-wt/antigravity/.agent-local/screens/Q-00/index.html
- Needs kvn: review and merge so Codex can shoot L-05 storage screens
- Next: re-shoot I-01 after waiting for the landing intro animation to finish

<<<<<<< HEAD
### 2026-10-13 01:42 | codex | L-05
- What: Storage resilience implemented; partial pending required screenshots and kvn UI adoption. Safe loads preserve bundled references; guarded fields and render-error Reload fallback added.
- Branch @ sha: agent/codex/L-05-storage @ task HEAD, stacked on L-04 e9fa2bc (merge L-04 first).
- Gates: clean npm ci/lint/test/build passed; 1 existing PracticeView warning / 0 new; 142 passed / 7 skipped; main JS 143.56 kB gzip; guard 152; diff check passed.
- Screenshots: pending because Q-00 remains absent from origin/main dd92377; no browser captures. Details and before-state instructions in handoffs/L-05.md.
- Needs kvn: review screenshots after Q-00 merges; adopt/merge only after visual review; port in R-00 M0 after merge.
- Next: L-06 from L-04 (L-05 stays a leaf; nothing stacked on it).


### 2026-10-13 10:49 | codex | L-05 screenshot follow-up
- What: Q-00 verified on main 26a20e5; L-05 rebased and 24 before/after images captured. Record's new notice now fits phone width; Reload recovery checked at both sizes. Ready for visual review.
- Branch @ sha: agent/codex/L-05-storage @ task HEAD (rebased implementation 10daadd; final commit in branch log).
- Gates: clean npm 10 ci, lint 0 warnings, 160 passed / 9 skipped, build 142.68 kB gzip; guard 155; diff check; PNG/state assertions and Reload checks passed. Q-04 E2E script not present yet.
- Screenshots: C:/Users/User/Documents/Suvana-wt/codex/.agent-local/screens/L-05/index.html (before main 2fd433a; after L-05 final source).
- Plan correction: phone dock overlap and author/pane overflow exist on baseline; phone states reached via shipped keyboard shortcuts. Wider layout fixes belong to phone-polish ownership. Practice storage rejection remains L-03's scope.
- Needs kvn: adopt/reject renders, then merge if accepted; port from main later.
- Next: R-01 portability screenshot handoff on its separate leaf branch.

### 2026-10-13 11:23 | kvn (in chat; recorded by codex) | L-05 UI approval
- What: approved the reviewed L-05 UI: "I approve the UIs." Visual adoption gate satisfied.
- Branch @ sha: agent/codex/L-05-storage; approved source a34c228b81d0715dc42af2f57aabbc4fc040dd6f. Approval-record commit follows in this branch.
- Screenshots: C:/Users/User/Documents/Suvana-wt/codex/.agent-local/screens/L-05/index.html
- Gates: documentation-only approval record; required Learn and sync checks rerun before commit, results in handoff.
- Needs kvn: merge the approved branch; port from merged main later. Inherited broader layout work remains documented.
- Next: both UI approvals recorded. No agent merge/push/deploy authorized.



### 2026-10-13 02:50 | codex | R-01 (14 Oct work requested early)
- What: Portability implemented; config-absent standalone build removes platform paths/session calls. Visual acceptance pending Q-00.
- Branch @ sha: agent/codex/R-01-portability @ task HEAD (see branch log and handoffs/R-01.md).
- Gates: npm 10 clean ci; lint 0 warnings; 161 passed / 9 skipped; Suvana build 142.34 kB gzip, standalone 141.89; config and standalone bundle assertions; guard 155; diff check passed.
- Screenshots: pending Q-00 merge (changes requested, not on main 2fd433a); L-05 also remains pending.
- Needs kvn: merge corrected Q-00, then visual review before R-01 adoption; later mirror from merged main.
- Plan correction: no rendered/byte-identical R26 claim; standalone paths validated, mirror and renders still separate gates.
- Next: I-04 from main as a sibling branch (R-01 is a leaf UI branch).

### 2026-10-13 10:58 | codex | R-01 screenshot follow-up
- What: R-01 rebased onto Q-00 main 26a20e5; 16 screenshots captured across both editions, views and viewports. No additional product change; ready for visual review.
- Branch @ sha: agent/codex/R-01-portability @ task HEAD (rebased implementation 43c745c; final commit in branch log). L-05 final a34c228 is a sibling; I-04 remains f3bcd1b.
- Gates: clean npm 10 ci; lint 0 warnings; 161 passed / 9 skipped; Suvana build 142.34 kB gzip, standalone 141.89; guard 156; standalone route/flag/fixture checks and 16 PNG assertions passed. Six image pairs byte-identical; remaining pairs differ at 4 and 7 pixels, inspected with no layout change.
- Screenshots: C:/Users/User/Documents/Suvana-wt/codex/.agent-local/screens/R-01/index.html (Suvana before main 2fd433a; standalone before R26 ec2604a; after R-01 final source).
- Needs kvn: adopt/reject renders and merge if accepted; actual R26 mirror/deploy stays separate.
- Next: both pending screenshot handoffs complete; disable the quiet screenshot follow-up. No pushes, merges or deployments by Codex.

### 2026-10-13 11:21 | kvn (in chat; recorded by codex) | R-01 UI approval
- What: approved the reviewed R-01 UI: "I approve the UIs." Visual adoption gate satisfied.
- Branch @ sha: agent/codex/R-01-portability; approved source eabf98e9e5d00166a253faab59a8309aa843aaa1. Approval-record commit follows in this branch.
- Screenshots: C:/Users/User/Documents/Suvana-wt/codex/.agent-local/screens/R-01/index.html
- Gates: documentation-only approval record; required Learn and sync checks rerun before commit, results in handoff.
- Needs kvn: merge the approved branch; actual R26 mirror and deployment remain separate.
- Next: record L-05's approval on its own branch. No agent merge/push/deploy authorized.


### 2026-10-13 03:00 | codex | I-04 (14 Oct work requested early)
- What: Applied ten upstream recognition source/test files, skipped 23 assets/reports/out-of-bound paths, recorded ec2604a; runtime model/config/labels unchanged. Ready for review.
- Branch @ sha: agent/codex/I-04-recognition-sync @ task HEAD (see branch log and handoffs/I-04.md).
- Gates: required pytest 35 passed; extra suites 13 passed / 12 warnings; local startup tf_function + 171 labels + shared engine; guard 157; status clean after record; imported source matches upstream. Upstream blank-line whitespace retained; full diff --check reports it.
- Screenshots: n/a. L-05/R-01 visuals pending corrected Q-00 merge; same-chat 30-minute follow-up active, quiet while unchanged.
- Needs kvn: review/merge I-04 independently; README and optional training CLI/utils proposals are in handoff; keep the app/computer on for pending screenshot follow-up.
- Plan correction: recognizer*.py glob misses both actual *_recognizer.py adapters; documented the intended two-file update. Unlisted main.py/utils left unchanged and explicitly skipped. R26 venv FastAPI differs from Suvana pins; Docker/performance verification stays at I-08.
- Next: Q-00 merge enables L-05 and R-01 screenshots; visual adoption, pushes, merges and deployments remain kvn's.
