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

### 2026-10-13 02:58 | antigravity | Q-00 rework
- What: done: Reworked Q-00 dev fixtures to align with merged L-01 ScoreBadge props (hands: HandFeedback[], no per-finger accuracy), replaced fixture glosses with real references from public/reference-index.json (DAKINAWA, AHANAWA, AYUBOWAN, KANAWA), used real scorer hint strings (or none), and re-shot after screens.
- Branch @ sha: agent/antigravity/Q-00-screens (rebased on main @ 2fd433a)
- Gates: guard ok (153 passed) | learn lint 0 warnings, 0 errors | learn tests 155 passed, 9 skipped | learn build ok (fixtures.html excluded from dist) | shoot.mjs and contact-sheet ok
- Screenshots: C:/Users/User/Documents/Suvana-wt/antigravity/.agent-local/screens/Q-00/index.html
- Needs kvn: review and merge so Codex can shoot L-05 storage screens
- Next: re-shoot I-01 after waiting for the landing intro animation to finish

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

### 2026-10-13 03:05 | antigravity | I-01 re-shot
- What: done: Removed 'SoundGuard Ecosystem' sub-brand tag from pipeline section, updated recognize example URL to recognize.suvana.help, injected VITE_RECOGNIZE_URL into data-service-url at build time while keeping localhost fallback. Screenshots re-shot with landing intro and preloader fully finished, capturing both hero typography and pipeline tag comparisons.
- Branch @ sha: agent/antigravity/I-01-shell-brand (rebased on main @ 2fd433a)
- Gates: guard ok (152 checks passed) | shell tests 44 passed | shell build 180.47 kB gzip main bundle | VITE_RECOGNIZE_URL injection verified
- Screenshots: C:/Users/User/Documents/Suvana-wt/antigravity/.agent-local/screens/I-01/index.html
- Needs kvn: review and merge for single-brand shell
- Next: I-01 ready for review

### 2026-10-13 10:05 | claude-code | L-03
- What: done (review). Practice capture backstop (captureMs + 500), allSettled initial load, no logging of takes with no compared hand, delta by attempt id, abandon-with-notice on tracking error or hidden tab.
- Branch @ sha: agent/claude/L-03-capture-robustness (on main 2fd433a; see git log)
- Gates: guard 152 ok; lint 0 warnings; tests 162 passed + 9 skipped; build ok 142.61 kB gzip
- Screenshots: not required; reference renders of the new notice at .agent-local/screens/L-03/after-{desktop,phone}-abandoned.png
- Needs kvn: adopt/reject the notice wording and position. L-05 not merged, so Practice uses allSettled directly (switch to safeLoad later).
- Next: L-07 onboarding, stacked on this branch. R-00 waits for L-05 to merge (dependency).

### 2026-10-13 10:55 | claude-code | L-07
- What: done (review, UI). First-run 3-step guide (native dialog, reopened from "How it works"), hands-in-frame pill gating Record on 5 tracked frames, window max(2 x dur, dur + 3000), learner take trimmed like convert_references.py.
- Branch @ sha: agent/claude/L-07-onboarding (stacked on agent/claude/L-03-capture-robustness; see git log)
- Gates: guard 152 ok; lint 0 warnings; tests 170 passed + 9 skipped; build ok 143.97 kB gzip
- Screenshots: C:\Users\User\Documents\Suvana-wt\claude\.agent-local\screens\L-07\index.html (ready state rendered with a forced flag, labelled FORCED)
- Needs kvn: adopt/reject from the renders; thesis must say the capture protocol changed and the bands were not recalibrated. Plan correction: 03 section 6 step 2 names 0.5x start and 'My turn', which arrive with L-08/L-16a; copy describes today's controls.
- Next: R-00 is blocked on L-05 (not merged; it waits for Q-00). L-08 tomorrow stacks on L-07.

### 2026-10-13 12:30 | kvn (K-10 midday, prepared by the planning session) | merge 2
- Merged into main via integration/2026-10-13b: R-01 (config switch, UI adopted by kvn), I-04 (recognition code and tests only, DN-18), I-01 (shell brand, re-shot), L-03 (capture robustness), L-07 (guide, hands-in-frame gate, longer trimmed takes). Gates on the merged tree: Learn 181 passed + 9 skipped, lint clean, Learn and Shell builds ok, sync guard 164.
- Q-00 (rework) and L-05 were merged earlier by kvn; their GitHub Desktop merges left conflict markers in this file. Removed here, every entry kept. New `.gitattributes` line `docs/plan/LOG.md merge=union` stops this; Q-02 extends `.gitattributes` for line endings.
- R-00 can run now as ONE port: L-04, L-05 and L-06 are all on main (Claude's wait-or-port-twice question no longer applies).
- Plan correction (claude, L-07): the guide's step 2 describes today's controls (speed button, Record or Space, 3-second countdown); L-08 (0.5x start) and L-16a ("My turn") must update that step when they land.
- Thesis note (claude, L-07): the capture method changed (longer window, trimmed learner takes, Record waits for hands) but the 85/60 bands were not recalibrated for it; the final thesis must say so (09-thesis-final).


### 2026-10-13 12:45 | kvn | UI approvals for integration/2026-10-13b
- Approved from before/after renders (desktop + phone): I-01 (pipeline tag says Alerts), L-03 (not-scored notice above Record), L-07 (3-step How it works guide; Record waits for Hands in frame). R-01 was approved earlier; I-04 has no UI.

### 2026-10-13 13:45 | antigravity | Q-02
- What: done: Configured .gitattributes with `* text=auto eol=lf`, explicit text and source extensions, CRLF for Windows scripts, binary flags for media, models, documents and archives, while preserving `docs/plan/LOG.md merge=union`. Ran `git add --renormalize .` with 0 modified files (well below the 20-file limit).
- Branch @ sha: agent/antigravity/Q-02-gitattributes (stacked on: origin/main @ d9a6aaf)
- Gates: guard ok (164 checks passed) | learn lint 0 warnings, 0 errors | learn tests 181 passed, 9 skipped | learn build ok | shell build ok | shell tests 44 passed | renormalize 0 files changed
- Screenshots: n/a (non-UI task)
- Needs kvn: review and merge into main
- Next: I-03 (Fix stale integration docs and record the Communicate gate) or L-10
### 2026-10-13 14:02 | antigravity | I-03
- What: done: Fixed stale integration docs across DEMO.md (Status table and tracked labels section), DEPLOYMENT.md (resolved shell env vars contradiction, updated container host notes for Railway Hobby / HF PRO, removed labels.npy blocker row), and TODO-PP2.md:109 (marked shell rewrites 100% complete). Verified Communicate lint and build pass with NEXT_PUBLIC_BASE_PATH=/communicate; proposed README REPLACE-WITH diff in handoff.
- Branch @ sha: agent/antigravity/I-03-stale-docs (stacked on: origin/main @ d9a6aaf)
- Gates: guard ok (164 checks passed) | communicate lint passed | communicate build passed | shell build and tests passed | learn build and tests passed
- Screenshots: n/a (documentation task)
- Needs kvn: review and merge; CX can take the proposed README diff
- Next: L-10 (Reference metadata: hands, motion, duration, licence, hasMeaning in the generated index)
### 2026-10-13 16:15 | antigravity | L-10 review
- Branch agent/antigravity/L-10-ref-meta @ HEAD; handoff: docs/plan/handoffs/L-10.md.
- Added data-derived reference metadata: hands (1|2), motion ('still'|'moving'), durationMs, licence, hasMeaning.
- Thresholds documented as untuned UI constants: TWO_HAND_FRAME_THRESHOLD = 0.20, MOTION_PATH_THRESHOLD = 5.0 hand-size units.
- Gates: Learn lint 0 warnings/errors, Learn tests 183 passed + 9 skipped (10 passed in referenceIndex.test.ts), build clean (bundle 144.27 kB gzip), index size 46.09 B/ref (budget 50 B), sync guard 164 passed.
- Next: L-09 (curriculum report, data-derived units, scenario coverage) stacked on this branch.

### 2026-10-13 16:30 | antigravity | L-09 review
- Branch agent/antigravity/L-09-curriculum @ HEAD (stacked on L-10); handoff: docs/plan/handoffs/L-09.md.
- Created `apps/learn/scripts/curriculum-report.mjs` and generated `apps/learn/src/data/curriculum.ts`.
- Verified meanings resolved: exactly 75 verified meanings in `translations.ts` matching unique corpus glosses.
- U1 Starter: 7 signs (`BAG EKA`, `HINAWENAWA`, `ANDANAWA`, `PHONE EKA`, `50`, `THATTU KARANAWA`, `C`), 100% Kaggle CC0, 1-hand, still, duration ascending.
- 21 typed units generated by rule from authentic corpus categories, ordered by difficulty, status 'proposed'.
- Scenario coverage tables generated for 5 proposal scenarios to support K-05 approval and DN-19 decision.
- Gates: Learn lint 0 warnings/errors (100 files), Learn tests 187 passed + 9 skipped (curriculum.test.ts 4/4 passed), build clean (144.27 kB gzip), sync guard 164 passed.
### 2026-10-13 13:31 | codex | L-22a
- What: Completed next unblocked board task: read-only inventory of 21 sentence clips (20 named, 1 unlabelled .mp4), converter sentence mode and K-07 commands. Sentence labels preserved verbatim; no footage or references generated/committed.
- Branch @ sha: agent/codex/L-22a-sentence-labels @ task HEAD (base d9a6aaf; final SHA in branch log).
- Gates: converter 12 tests passed; clean npm 10 ci; Learn lint 0 warnings, 181 passed / 9 skipped, build 144.27 kB gzip; sync guard 164; diff check passed.
- Screenshots: n/a (CLI/logic/docs only).
- Plan correction: 21 inputs include one clip with no label; K-07 cannot promise 21 usable labelled references. --all now announces sentence exclusion; --sentences uses its own namespace. Exact labels and measured container durations are in handoffs/L-22a.md.
- Needs kvn: review/merge L-22a; decide DN-08 before K-07. No game implementation until L-09 is merged and exact DN-10 values approved. L-15a follows DN-05's no-video default while undecided.
- Next: L-12 after its dependency/decision gates; K-07 after DN-08. Screenshot automation already stopped; no new follow-up scheduled.
### 2026-10-13 14:45 | claude-code | L-08
- What: done (review, UI). 0.5x for 2 loops then 1x with a 4-button speed group; raw framing by default with caption + Zoom to hands; mirror label; ghost sized to the camera and wrist-anchored (A12); HUD overflow and touch scrubber fixed; guide step 2 updated.
- Branch @ sha: agent/claude/L-08-playback (on main d9a6aaf; see git log)
- Gates: guard 164 ok; lint 0 warnings; tests 185 passed + 9 skipped; build ok 144.76 kB gzip
- Screenshots: C:\Users\User\Documents\Suvana-wt\claude\.agent-local\screens\L-08\index.html (one-hand, two-hand, zoomed, ghost, Scenario)
- Needs kvn: adopt/reject from renders; phone transport is one row (restart/step hidden; they were off-screen before). Note: Scenario/Library/Record take the new player defaults; Scenario's KANAWA coaching line describes movement/location (for L-19).
- Next: R-00 waits for kvn's R26 commit + D-06. Next claude-code board tasks (L-11, L-16a, L-24...) depend on L-12/K-05/L-13, not yet on main.
### 2026-10-13 13:55 | claude-code | R-00
- What: done (review). One port of Learn from Suvana main d9a6aaf into the R26 working tree (all files except suvana.config.json, vercel.json, package-lock.json, and AGENTS.md/CLAUDE.md); R26-form vercel.json (1-day cache + SWR, no redirect); R26's out-of-sync lockfile regenerated with npm 10. Nothing committed in R26.
- Branch @ sha: agent/claude/R-00-m0-port (handoff only); R26 working tree at ec2604a + 20 modified / 30 new paths
- Gates (R26 web): npm@10 ci ok; tests 188 passed + 2 skipped; lint 0 warnings; build 143.82 kB gzip; '/learn/' in dist = 0; assets 200 at base /
- Screenshots: C:\Users\User\Documents\Suvana-wt\claude\.agent-local\screens\R-00\index.html
- Needs kvn: commit in R26 with the blocks in handoffs/R-00.md, push, D-06 redeploy; decide whether AGENTS.md/CLAUDE.md belong in R26 (R-02 must match).
- Next: L-08 playback (15 Oct), from main.

### 2026-10-13 15:10 | claude-code (integration prep, 08 section 12) | integration/2026-10-13c
- What: merged with --no-ff onto main d9a6aaf, bottom first: Q-02 (.gitattributes), I-03 (stale docs), L-10 (reference metadata), L-09 (curriculum, stacked on L-10), L-22a (sentence inventory, converter), L-08 (playback, UI), R-00 (handoff only; the port lives in the R26 working tree). No conflicts; LOG.md kept all 30 entries (union).
- Gates on the merged tree: Learn npm@10 ci, lint 0 warnings, tests 191 passed + 9 skipped, build 144.76 kB gzip; Shell tests 44 passed, build ok; converter unittest 12 passed; sync guard 164; git diff --check clean; `git add --renormalize .` changes 0 files under Q-02's .gitattributes. Communicate and recognition untouched (gates not run).
- Content checks: all 490 unique signs in L-09's curriculum.ts are real corpus glosses; its English cues match translations.ts; curriculum.ts and L-10's new index fields are not yet used by any UI. No data, binaries, build output or secrets in the diff.
- Board: Q-02, I-03, L-10, L-09, L-22a, L-08 and R-00 set to done.
- Needs kvn: (1) approve L-08 from .agent-local/review/2026-10-13c/L-08/index.html before merging (if rejected, revert merge e13aba8 and set L-08 back to review); (2) R-00: commit the R26 working tree with the blocks in handoffs/R-00.md, push, D-06; decide AGENTS.md/CLAUDE.md in R26; (3) K-05: L-09's units are 'proposed'; some descriptions overclaim ("ordered by hand configuration difficulty", "Basic counting handshapes") while the order is by hands, motion and duration; (4) Scenario's KANAWA coaching line describes movement and location (for L-19).
- Plan corrections recorded in handoffs: L-10 also edited src/vision/types.ts (optional RecordingMeta fields) and its test lives at src/storage/referenceIndex.test.ts, not src/data/; 07 section 4 is superseded by the post-R-01 port rule; R26's lockfile was out of sync and was regenerated with npm 10.
- Next: kvn merges integration/2026-10-13c into main and pushes. Nothing pushed or merged by the agent.

### 2026-10-13 15:20 | kvn | UI approval for integration/2026-10-13c
- Approved in chat from the before/after renders (desktop + phone, .agent-local/review/2026-10-13c/L-08/): L-08 (0.5x start then 1x, 0.25/0.5/0.75/1 speed buttons, raw framing with "Position in the original video frame" and Zoom to hands, "Mirrored: copy it like a mirror", wrist-anchored ghost, one-row phone transport). Recorded by claude-code.

### 2026-10-13 15:40 | kvn (recorded by claude-code) | R-00 committed in R26; AGENTS.md decision
- What: kvn committed and pushed the M0 port to R26 as 761ec32 ("Learn: port Suvana Learn (M0) from Suvana d9a6aaf", 54 files). R26 tree clean; gates re-run on 761ec32: npm@10 ci ok, tests 188 passed + 2 skipped, build 143.82 kB gzip, no '/learn/' in dist.
- Decision (kvn, chat): apps/learn/AGENTS.md and apps/learn/CLAUDE.md stay out of R26.
- Plan correction for R-02: the port command excludes AGENTS.md and CLAUDE.md as well as suvana.config.json, vercel.json and package-lock.json, and `--check` ignores them (07 section 5).
- Found: learn-ssl-module has no Git auto-deploy (no deployment followed the push); D-06 is the CLI redeploy in 07 section 6.
- Next: kvn runs D-06 (deploy preview, check, promote) and logs the deployment id.

### 2026-10-13 17:15 | kvn (recorded by claude-code) | D-06 redeploy
- What: deploy. learn-ssl-module.vercel.app promoted to dpl_6sS4P7JMYmYS6CzkYA7JB8qYNrPh (preview learn-ssl-module-c8kam2nxb), built from R26 761ec32, which ports Suvana d9a6aaf. Rollback target: dpl_4gfgnSdmCw8msd5dhc6nzMhknPLH (334beba).
- Checks: live site 200 and serves the ported bundle (index-CkacNhbm.js); /references/* now `public, max-age=86400, stale-while-revalidate=604800` (was a year, immutable); preview checked before promotion; kvn checked the camera flow in the browser.
- Found: the CLI needed `npx vercel login` first ("Not authorized" otherwise); deploys use `--scope kavindu-rakns-projects`. No Git auto-deploy on this project.
- Next: D-06 can be marked done. R-03 (M1) ports the next Learn milestone.

### 2026-10-13 17:40 | kvn (recorded by claude-code) | decisions DN-05, DN-06, DN-10, DN-11, DN-14
- What: decision. kvn took the plan's recommendations, in chat:
  - DN-05: no corpus video before the demo (option a). L-15a, L-15b and K-06 are cancelled; Learn ships with the improved skeleton.
  - DN-06: not needed (no video).
  - DN-10: as D-A14. Codex's L-12 proposes concrete looser thresholds with a rendered mock; kvn approves before anything is built.
  - DN-11: learner progress stays per browser (IndexedDB), with reset and a demo profile.
  - DN-14: ask Karindra (K-03) with a 15 Oct deadline; on no reply, rebuild under kvn's EAS with package help.suvana.alerts (I-12a, 16 Oct).
- Needs kvn: copy these into DECISIONS.md and mark L-15a, L-15b and K-06 cancelled on the board (agents do not edit either).
- Next: codex starts with the L-12 threshold proposal; antigravity skips L-15b and I-12a for now.

### 2026-10-13 18:30 | kvn (recorded by claude-code) | T-01 and K-03
- What: done. T-01: IT22552860_FINAL.docx created as a byte-identical copy (cp -p); IT22552860_DRAFT.docx and IT22552860_DRAFT-preview.pdf keep their 11 Oct modified times. Only FINAL is edited from now on.
- K-03: messages sent on 13 Oct to Karindra (APK route a/b/c, Suvana strings, no server; deadline Thu 15 Oct, then rebuild per D-A19), Lithira (glosses export, animation URLs, emotion_clf.joblib, Whisper IDs, OK to show avatar under Suvana, sign-detector uptime, mapper on the 20 L-22a sentence labels; deadline Fri 16 Oct) and Lahiru (demo model and label order, .tflite, test split, venv versions, hosting OK; deadline Fri 16 Oct). Wording from 05-integration section 5.
- K-09: supervisor message drafted, not yet sent.
- Next: replies (or silence at each deadline) are logged as they arrive.

### 2026-10-13 19:20 | kvn (recorded by claude-code) | Q-07 and Q-06a results; new scoring bug
- Q-07 (desktop Chrome, learn-ssl-module.vercel.app): raising only the right hand draws the lime (Right) skeleton. Labels are correct; S1 does not occur; no L-26 label fix needed.
- Q-06a: iPhone (iOS, WebKit): camera starts and one Practice take completes; after switching to another app and back the page shows "Camera disconnected" (L-04's lost-stream detection), and "Try again" restores the camera. Android: camera keeps working after an app switch with no prompt. Failure to fix: on iOS, restart the camera automatically when the page becomes visible again if it was running before (codex fix per Q-06a, pending kvn's OK).
- Seen on the phone: the reference transport overflowing left and the grey scrubber box; both already fixed by L-08 on main, live after R-03.
- New bug (not in 04-bugs.md; proposed id S6): `handednessesIn()` (apps/learn/src/scoring/normalize.ts:96) counts a reference hand that appears in even one frame, so 75 of 501 references that L-10 classes as one-handed (two hands together in < 20% of tracked frames) are scored and shown as two-handed: 42 with the stray hand in < 10% of tracked frames, 26 at 10-30%, 7 at >= 30% (likely the same hand relabelled). Effect: two hand cards with one missing, a missing-hand hint, and a small score drag. Proposed fix (scoring change, kvn decides): count a reference hand only above a minimum share of tracked frames, re-running calibration to show separation does not drop. Measured from public/references by claude-code, 13 Oct.
- Next: kvn decides whether both fixes become codex tasks.

### 2026-10-13 20:25 | antigravity | Q-04
- What: done: Playwright smoke test suite for Learn against vite preview with fake camera, testing first-run onboarding, Esc countdown cancel staying in Practice, Enter on focused Retry, and blocked IndexedDB rendering sign list with StorageNotice.
- Branch @ sha: agent/antigravity/Q-04-e2e @ HEAD
- Gates: guard ok (164 passed) | learn lint 0 warnings | tests 191 passed, 9 skipped | build 144.76 kB gzip | e2e 4 passed (11.6s)
- Screenshots: n/a
- Needs kvn: none
- Next: L-14 (Meaning coverage: verified-first browse and a 'meaning not yet verified' chip)
### 2026-10-13 22:15 | antigravity | D-01
- What: done (review). Created tools/smoke/smoke.mjs implementing 06-deploy.md section 4 post-deployment checks (status codes and cache headers), tools/smoke/README.md, and refreshed DEPLOYMENT.md matching project table, env, deploy order, Hobby caveat, recognition container options, domain steps, and smoke verification.
- Branch @ sha: agent/antigravity/D-01-smoke @ HEAD (see git log)
- Gates: sync guard 164 checks passed; smoke CLI verified (--help, missing arg exits 1, network failure detection exits 1); DEPLOYMENT.md matches 06-deploy.md.
- Screenshots: n/a (CLI tooling and documentation task).
- Needs kvn: review and merge branch.
- Next: L-19 (Scenario cleanup).
### 2026-10-13 22:05 | antigravity | I-07
- What: done (review). Enforced --placeholder-dev-only requirement in scripts/seedGlosses.ts (prints warning banner and exits 1 if flag missing); created scripts/importGlosses.ts supporting dry-run by default, Cloudinary URL remapping (--remap-base), and MongoDB upsert (--write/--apply); documented ADMIN_EMAILS with example in .env.local.example.
- Branch @ sha: agent/antigravity/I-07-communicate-scripts @ HEAD (see git log)
- Gates: sync guard 164 checks passed; Communicate npm run lint clean (0 errors, 0 warnings); Communicate build passed with NEXT_PUBLIC_BASE_PATH=/communicate (27 routes generated); script execution verified (refusal on seedGlosses, dry-run and URL remapping on importGlosses).
- Screenshots: n/a (backend/CLI scripts and environment documentation).
- Proposed diff: `scripts/importGlosses.ts` in Communicate's `suvanaOnly` in `tools/sync/upstreams.json` (handoff).
- Needs kvn: review and merge branch.
- Next: D-01 (Deployment smoke script and DEPLOYMENT.md refresh).
### 2026-10-13 18:52 | codex | I-05
- What: done for review: reconciled 5909a56 without losing L-22a sentence behavior; declared all four converter differences and added guards plus two format-enumeration tests. No reference generation, video export or R26 writes.
- Branch @ sha: agent/codex/I-05-converter-port @ task HEAD (base bca1688; final SHA in branch log).
- Gates: converter 14 passed; npm 10 ci; Learn lint 0 warnings, 191 passed / 9 skipped, build 144.76 kB gzip; guard 168; reference-converter status clean at 5909a56; diff check passed.
- Screenshots: n/a.
- Needs kvn: review/merge; root README provenance/sync-log proposed diff is in handoff for hot-file owner.
- Plan correction: fourth undeclared difference is merged L-22a's test file. Clean status means declared divergence, not a completed tools backport. ASSET_VERSION unchanged because references unchanged.
- Next: L-12 implementation still waits for chat approval; optional L-17 calibration work next.
### 2026-10-13 18:49 | codex | R-02
- What: done for review: port learn --to <R26> [--check], five exclusions including Learn agent files, deletion mirroring and safety preflight. No real R26 port.
- Branch @ sha: agent/codex/R-02-port-command @ task HEAD (base bca1688; final SHA in branch log).
- Gates: 8 temporary-repo tests passed (including no writes to either Git tree in --check); guard 164; syntax/diff checks passed. Disposable sparse R26 copy: 3 add / 9 modify / 0 delete; check and apply agree.
- Screenshots: n/a; CLI only.
- Needs kvn: review/merge; older plan's three-file exclusion list needs the two agent-file exclusions per 13 Oct chat.
- Next: I-05. L-12 remains proposal-only pending chat approval.
### 2026-10-13 19:15 | codex | L-23a
- What: done for review: default/demo database isolation, guarded persisted selection, explicit-profile progress reset; old default data preserved. No profile UI or real browser reset.
- Branch @ sha: agent/codex/L-23a-profile @ task HEAD (base bca1688; final SHA in branch log).
- Gates: npm 10 ci; lint 0 warnings; 199 passed / 9 skipped; build 144.76 kB gzip without new warnings; guard 164; diff check passed; eight fake IndexedDB tests and native Chromium integration passed.
- Screenshots: n/a (storage layer only).
- Needs kvn: review/merge. L-23 owner must confirm reset, clear current session and refresh derived UI after switching; integration rules in handoff.
- Plan correction: mastery is derived from attempts, not a stored table; no schema bump required. Native tests used an isolated browser context, preserving kvn's real data.
- Next: L-12 implementation and L-13 await approved L-12 numbers. L-15a skipped per DN-05. R-02, I-05, L-17 and L-23a each remain independent review branches; no push or merge.
### 2026-10-13 18:38 | codex | L-12 part 1
- What: partial: concrete looser thresholds and rendered comparison mock only; no game implementation. Proposed Try 50/70, unrevealed Recall 50 after two stars, every sign >=1 star to pass, 5 attempts/day, goal-day streak, XP=sum of best stars.
- Branch @ sha: agent/codex/L-12-game-logic @ task HEAD (base bca1688; final SHA in branch log).
- Gates: npm 10 ci; lint 0 warnings; 191 passed / 9 skipped; build 144.76 kB gzip; guard 164; diff check passed.
- Screenshots: .agent-local/screens/L-12/index.html; desktop/phone draft comparison, proposal and rule details. Hypothetical mock, no app UI adopted.
- Needs kvn: approve or replace numbers and edge rules in handoffs/L-12.md in chat. D-A14 supersedes draft acceptance values; DN-05=no video (skip L-15a), DN-11=per-browser IndexedDB/reset/demo confirmed.
- Next: R-02 then I-05; L-12 implementation waits for approval; L-13 follows approved L-12.

### 2026-10-13 19:55 | codex | L-12 approved implementation
- What: done for review: kvn approved in chat with first Try star 60 and third Recall star 60; implemented 60/70/60, all-signs-one-star unit pass, 5-attempt goal, goal-day streak and best-star XP. All approved edge rules included.
- Branch @ sha: agent/codex/L-12-game-logic @ task HEAD (proposal cfebd34; implementation SHA in branch log).
- Gates: npm 10 ci; lint clean; 204 passed / 9 skipped; build 144.76 kB gzip; guard 164; game.ts V8 coverage 100% including 64/64 branches; diff check passed.
- Screenshots: .agent-local/screens/L-12/index.html, approved 60/70/60 mock states added; original proposal snapshots preserved.
- Needs kvn: review/merge; thresholds already approved. Board/spec draft acceptance values need kvn's update; no agent edit to board/decisions.
- Next: L-13 stacked on this logic branch, using Recall unlock 70. Path/Practice/Progress consumer UI stays with its assigned owners.

### 2026-10-13 20:13 | codex | L-13
- What: done for logic/API review: due-first single Next, 2:1 finite-session mix, truthful reasons, approved-unit start API, pure next-exercise rules and ADAPTATION.md. Recall unlock uses approved second-star threshold 70.
- Branch @ sha: agent/codex/L-13-adaptation @ task HEAD, stacked on agent/codex/L-12-game-logic @ 890c082 (main base 8dfb949).
- Gates: npm 10 ci; lint 0 warnings; 221 passed / 9 skipped; build 145.12 kB gzip; guard 164; diff check passed. Actual Practice one-item selector revisits score 30 before an unseen sign in regression coverage. Packages/lockfiles unchanged.
- Screenshots: n/a (learner/session logic only). L-12 approved 60/70/60 mock already rendered.
- Needs kvn: review/merge L-12 then L-13. K-05 curriculum approval and L-11/L-16 UI hooks still have their assigned owners; no new Path button claimed here.
- Plan correction: strict no-new-while-due applies to single Next; finite sessions implement the specified 2:1 interleave. Fresh low scores receive an honest low-match reason, not a fictional score-drop reason. Details and exact hookup are in handoffs/L-13.md and learner/ADAPTATION.md.
- Next: L-11/L-16 integrate the APIs in their UI lane. No push, merge, messages, R26 mutation or deployment by codex.
### 2026-10-13 19:04 | codex | L-17
- What: done for review: typed hints plus string compatibility, Close match >=85, active-duration timing, real-pair-proven path hint, mirrored missing-hand wording, max two hints. Finger states/corrections stay hidden.
- Branch @ sha: agent/codex/L-17-hints @ task HEAD (base bca1688; final SHA in branch log).
- Gates: npm 10 ci; lint 0 warnings; 202 passed / 11 skipped; build 145.17 kB gzip; guard 164; read-only calibration and 314-pair exact numeric comparison passed; existing finger audit unchanged.
- Screenshots: .agent-local/screens/L-17/index.html; before/after desktop and phone, isolated synthetic fixture using real ScoreBadge/styles. Needs kvn's wording decision.
- Needs kvn: review/merge and wording adoption; no finger-state revival. HINT_MIN_DEVIATION candidate 2.23 is derived from same-sign p95, but wrong-sign detection remains weak; no correctness claim.
- Plan correction: preserve legacy strings for current consumers; L-21 consumes typedHints. fingerStates comment-only correction proposed in handoff due to task boundary. No Q-04 e2e script yet.
- Next: L-23a profiles. L-12/L-13 still wait for L-12 chat approval; L-15a skipped per DN-05=no video.

### 2026-10-13 20:45 | codex | L-30
- What: done for review. Score reference hands by L-10's >=20% two-hand rule, otherwise dominant label. All 501 checked: 78 stray-label references corrected; 341 two-handed numeric results unchanged against the parent snapshot. Scores change for affected references; 85/60 bands were not recalibrated.
- Branch @ sha: agent/codex/L-30-stray-hands @ task HEAD (final SHA in branch log), explicitly stacked on agent/codex/L-17-hints @ 39b69ab, rebased onto main 8dfb949. Merge L-17 first; L-29 is independent.
- Calibration: before 74.6% separation with 65.4% majority baseline; after 75.7% separation with 65.4% majority baseline. Same 1,516 pairs and corpus hash; 557 takes / 33 signs, one signer. Stop gate passed; no learner-accuracy claim. Corpus read in place, never moved or committed.
- Gates: npm 10 ci, lint 0 warnings, 215 passed / 4 skipped, build 145.31 kB gzip, guard 164. Opt-in after measurement passed separately; no screenshots required. HINT_MIN_DEVIATION re-derived as experimental 2.00; finger corrections/states remain hidden.
- Plan correction: a missing-hand/direct versus actual-hand/mirrored zero-score tie initially removed five positives from calibration. Prefer the real comparison for one-handed ties, preserving score zero and the original cohort; two-handed behavior unchanged.
- Needs kvn: review/merge bottom-up; documentation owner records the new scorer result separately from the historical figure. No push, merge, deployment, R26 edit or device check performed.
### 2026-10-13 20:26 | codex | L-29
- What: done for review: preserve running-camera intent through background loss; one automatic full restart on return; live-stream resume, explicit off and visible-disconnect behavior preserved. No PracticeView edit.
- Branch @ sha: agent/codex/L-29-ios-camera-resume @ task HEAD (base 8dfb949; final SHA in branch log).
- Gates: npm 10 ci; lint clean; 201 passed / 2 skipped with corpus present; build 144.97 kB gzip; guard 164; pure lifecycle tests and eight actual-hook fake-webcam browser scenarios passed; diff check passed.
- Screenshots: n/a; no device check claimed.
- Needs kvn: review/merge and repeat iPhone Q-06a after the next deploy, including abandoned countdown/take and explicit off. No automatic deployment by codex.
- Next: L-30 stacked on L-17, with before/after calibration and the 74.6% separation stop gate, each result reported with the 65.4% baseline. Calibration directory stays ignored and in place.

### 2026-10-14 00:30 | claude-code (integration prep, 08 section 12) | integration/2026-10-13d
- What: merged with --no-ff onto main 8dfb949, stacks bottom first: Q-04, D-01, I-07, I-05, R-02, L-23a, L-12, L-13 (on L-12), L-17, L-30 (on L-17), L-29. No conflicts; LOG.md kept every entry.
- Left out (changes requested): L-19: 8 of 12 scenario hints that describe sign form (handshape, movement, timing, similarity, question-sign duration) are still shown to learners, against its own acceptance and hard rule 2 (only 4 flagged); also new UI issues (Recall placeholder overlaps the reference title on desktop, low-contrast yellow pills, orange focus box on the briefing title). Its renders had no "before"; claude-code rendered them from main (.agent-local/review/2026-10-13d/L-19/). L-14: renders unusable for adoption (before and after are byte-identical on phone; the chip is not visible in any image); also needs kvn's call on whether dataset English labels (e.g. HELLO, THANK YOU on yohan_* signs) count as meanings, since about 250-340 cards would carry the chip.
- Gates on the merged tree without L-14/L-19: Learn lint 0 warnings, tests 248 passed + 12 skipped, build 145.89 kB gzip; Playwright e2e 4 passed; sync guard 168. With all 13 (before removal) also: Shell 44 tests + build; Communicate lint + build; converter unittest 14; tools/sync port tests 8.
- Review (parallel, read-only; the scoring/game group review did not complete, so claude-code checked it directly): L-12 constants are exactly kvn's approval (60/70, Recall 60 after two stars, unit pass 1 star, goal 5); L-13 unlocks Recall at two stars (70). L-30: separation 75.7% after vs 74.6% before, same 65.4% baseline, one signer; L-17 left scores unchanged (L-30's before = 74.6%). No hard-rule violation in the merged set.
- Follow-ups (minor, not blocking): L-17 timing hint reads "compare the pace at 0.5x" with no direction (fix in L-21 wording); L-23a also splits Record's reference recordings and latency samples by profile and leaves the sessionStorage practice session unkeyed (kvn decision before L-23; add clearSession on profile switch to L-23's acceptance); R-02: tools/sync/README's `--to ../R26-SE-019` only works from the primary checkout (use C:/Users/User/Documents/R26-SE-019 from lane worktrees), and a future R26 .vercelignore would be deleted by the port unless excluded; I-05: no guard on the --all sentence exclusion, README sync record stale; Q-04: tools/screens/test-results/ is not gitignored, reuseExistingServer on 5194 can silently test another lane's server; D-01: smoke.mjs prints PASSED when optional checks are skipped; I-07: the seed still writes placeholders when run with --placeholder-dev-only (never against the demo database), and the Communicate script edits are undeclared in upstreams.json.
- Plan corrections: (1) the ADMIN_EMAILS example `admin@suvana.help,kvn@suvana.help` (I-07 .env.local.example, D-01 DEPLOYMENT.md) uses a domain kvn does not own yet; set ADMIN_EMAILS to kavindu.rakn@gmail.com only (06-deploy section 2). (2) Ignored Build Step `git diff --quiet HEAD^ HEAD -- .` skips a build when the last pushed commit does not touch the app; use `git diff --quiet $VERCEL_GIT_PREVIOUS_SHA $VERCEL_GIT_COMMIT_SHA -- .`.
- Board: Q-04, D-01, I-07, I-05, R-02, L-23a, L-12, L-13, L-17, L-30, L-29 done; L-14, L-19 changes requested.
- Needs kvn: approve L-17's feedback wording from .agent-local/review/2026-10-13d/L-17 (if rejected, L-17 and L-30, which is stacked on it, come out); re-check L-29 on the iPhone after the next deploy. Then merge integration/2026-10-13d and push.

### 2026-10-14 01:10 | kvn (recorded by claude-code) | L-17 wording rejected; plain words for learners
- Decision (kvn, chat): L-17's hint wording is too formal and is not adopted. Learn is for Sinhala speakers whose first language is not English, and for every age including children; learner-facing words must be short, everyday and friendly (no "reference", "active signing duration", "0.5x" in hint text). L-17's logic stays (L-30 is stacked on it); its hintText() wording is replaced by a follow-up before any public deploy.
- Plan correction (all lanes): every learner-facing string in Learn follows this rule from now on, and kvn approves wording from screenshots. Existing copy to simplify: the L-07 guide, L-08's playback labels, Scenario and Progress text (L-26 polish, or a dedicated plain-words task).
- Next: kvn merges integration/2026-10-13d; codex rewrites L-17's hint text with kvn-approved simple wording.

### 2026-10-14 02:10 | kvn (recorded by claude-code) | decisions: L-17 wording, Antigravity tasks to Codex, suvana deployment
- L-17 wording (kvn's words, for codex): close match "Great job! That looks correct." / two-handed "Great job! Both hands look correct." (claude-code changed "looks" to "look" for grammar; kvn may revert); hand path "Your hand moved another way, do it again!"; too slow "Nice try! But little slow."; too fast "Nice try! But little fast."; one hand missing "Use your other hand too."; both hands missing "Please use your hands."; hands not seen "Show your hands, turn the lights on!"; broken reference "Oops, this sign is not ready yet."; anything else "Watch again, try again." Timing hint must now say slow or fast.
- Antigravity stops. All 10 open Antigravity tasks move to codex (kvn has spare Codex allowance; Claude's allowance is kept for integration and talking with kvn): L-14, L-19 (both changes requested), L-23, L-25, L-31, I-06, I-10, I-11, I-12a, Q-05. Board owner changes are kvn's.
- D-02: the Learn project was created as "suvana" (deployment suvana-mu.vercel.app, from main 7eb446e; root, /learn/ and assets checked OK). It must be renamed suvana-learn and get the domain suvana-learn.vercel.app, because apps/shell/vercel.json rewrites /learn to https://suvana-learn.vercel.app/learn. Node 24.x and the Ignored Build Step are still to set.

### 2026-10-14 02:10 | claude-code | L-08b
- What: done (review). Reference playback blends between recorded frames, so the 0.5x start is smooth (57 pictures/s instead of 13); kvn reported it as lag on suvana-mu.vercel.app.
- Branch @ sha: agent/claude/L-08b-smooth-playback (on main 7eb446e; see git log)
- Gates: guard 168; lint 0 warnings; tests 251 passed + 12 skipped; build ok 146.00 kB gzip
- Screenshots: n/a (motion only; measured)
- Needs kvn: merge; check playback on the next deploy.
- Next: none for claude-code until L-12 and K-05 unblock L-11 (L-12 is now on main; K-05 is kvn's).

### 2026-10-14 18:21 | codex | L-17b
- What: done for review. Use exactly kvn's short hint strings in hintText(), the empty-reference scoring return, and the two dev fixtures with old close-match text. Timing hints carry slow/fast from the unrounded ratio; scores and hint selection stay unchanged.
- Branch @ sha: agent/codex/L-17b-plain-hints @ task HEAD (final SHA in branch log), fresh from origin/main 3a8d552; no stack.
- Gates: npm 10 ci (Learn/screens), lint 0 warnings, 271 passed / 4 skipped, build 145.95 kB gzip, guard 168; existing browser smoke 4 passed on Codex port 5184. Additional parent comparison: 25,344 hint inputs and 501 reference pairs unchanged except text/new direction field.
- Screenshots: .agent-local/screens/L-17b/index.html; 40 before/after images across ten hint states, desktop 1280x800 and phone 390x844. Isolated synthetic fixture with real ScoreBadge/CSS, like L-17; 20 exact-text/viewport checks passed. Representative images visually inspected; no device-check claim.
- Needs kvn: review rendered cards and merge the leaf branch. Broader plain-words cleanup remains separate; no hot files or scoring math changed. Corpus untouched; generated tracked reports restored. No push, merge, port or deployment performed.
- Plan corrections: none; directly authorized by kvn's chat and the 14 Oct wording decision.
### 2026-10-14 19:00 | codex | L-29b
- What: done for review. Preserve camera-on intent across mute/end before or after visibility/pagehide/blur using a labelled untuned 1.5 s grace. Unmute can end a pause; a visible persistent loss still reports Camera disconnected. One return-time restart, with explicit off/cancellation preserved. ?camdebug=1 shows bounded timestamped lifecycle events on screen.
- Branch @ sha: agent/codex/L-29b-ios-camera @ task HEAD (final SHA in branch log), fresh from origin/main 3a8d552; no stack. PracticeView has only two small edits: preparation flag and interrupted-capture notice.
- Loading: shared model/WASM promise begins on Practice sign entry or Scenario playing, never Hero/browsing/briefing; no early camera permission. Tested one model/WASM request per flow, reused by camera start. Wording for adoption: Getting ready… the first time takes a little longer. Scenario shows it in the visible prompt header.
- Gates: npm 10 ci (Learn/screens), lint 0 warnings, 268 passed / 4 skipped, build 150.16 kB gzip, guard 168, existing browser smoke 4 passed. Additional Chromium hook checks 19 passed; loading checks and countdown/recording abandonment passed with zero logged attempts. Corpus untouched; generated tracked reports restored. No iPhone-check or startup-time claim.
- Screenshots: .agent-local/screens/L-29b/index.html, 18 desktop/phone images: real loading before/after, isolated pause/start, debug after. Needs kvn's wording/UI approval and physical iPhone re-test after the next deploy; no push, merge, deploy or R26 edit performed.
- Plan correction: existing phone Scenario layout clips the camera below the long prompt; loading text stays visible in the header. Broader layout repair remains Scenario/polish work. Direct chat assignment; board/decisions unchanged.
### 2026-10-14 | codex (second lane) | L-14 rework
- What: English corpus names count as display coverage per kvn's chat decision; stable covered-first browse, untranslated-label chip, correct English language attribute. No translations or sign descriptions added.
- Branch @ sha: agent/codex/L-14-meaning-coverage @ task HEAD (base 3a8d552; final SHA in git log).
- Gates: npm 10 ci; lint 0 warnings; 255 passed / 12 skipped; build 147.78 kB gzip; sync guard 168; Playwright 4 passed; diff check clean.
- Screenshots: .agent-local/screens/L-14/index.html; fresh main before and after at desktop 1280x800 / phone 390x844. AYUBOWAN chip visible; HELLO has no chip. Old unusable images preserved separately.
- Plan correction: English Nouns now correctly have no chip. Category labels alone cannot verify MRACH/MILIYANAYA. No learner preference files changed.
- Needs kvn: UI adoption and merge; update the board/decision record. Never pushed or merged.
- Next: L-19 rework from origin/main, independent UI leaf branch.
- L-14 visual-review follow-up on the same branch: scoped chip cards grow beyond 88px so the sign name stays visible on desktop; final after renders refreshed. Lint 0 warnings, 255 passed / 12 skipped, build 147.78 kB gzip, guard 168 repeated.
### 2026-10-14 | codex (second lane) | L-19 rework
- What: all 12 hints flagged pending and shown only to authors, unchanged text; Record tip author-only; honest 3/7 Social preview; playable summary; reference retry; closer-to feedback removed; Guided/Recall variant. Recall title overlap, yellow pills, heading focus box and phone briefing overflow fixed in task-local CSS.
- Branch @ sha: agent/codex/L-19-scenarios @ task HEAD (base 3a8d552; independent UI leaf).
- Gates: npm 10 ci, lint 0 warnings, 254 passed / 12 skipped, build 146.40 kB gzip, guard 168; real-browser failed-reference retry passed; JSON equivalence proves flags only and all 12 hint texts unchanged. Playwright result in handoff.
- Screenshots: .agent-local/screens/L-19/index.html; main before/final after desktop 1280x800, phone 390x844 and 360x800. Capture assertions: learner hint hidden, author hint visible, Recall sign hidden, no title/placeholder overlap.
- Plan correction: 4 flags in the old branch missed 8 hints. Main phone author-nav overlap remains outside this file boundary (L-26); keyboard navigation used for captures.
- Needs kvn: review/adopt/merge. No push or merge by codex; r26_port yes.
- Next: I-12a stays gated on kvn confirming no Karindra answer by 15 Oct; I-06 awaits page decisions; L-23 follows the requested order.
### 2026-10-14 | codex (second lane) | L-23
- What: stars/learned signs/reviews due/daily goal; approved goal streak; per-sign and unit stars; units honestly Plan preview pending K-05; simple adaptation/scoring explainers. My progress/Demo progress uses L-23a; native confirmed reset clears only that profile's attempts, with session queue cleanup and visible storage failures.
- Branch @ sha: agent/codex/L-23-progress @ task HEAD (base 3a8d552; independent UI leaf).
- Gates: npm 10 ci; lint 0 warnings; 251 passed / 12 skipped; build 152.13 kB gzip; guard 168; Playwright 10 passed (4 smoke + 6 new Progress tests), including real profile isolation, reset cancel/confirm/failure, blocked persistence and existing JSON/CSV exports. Diff check clean.
- Screenshots: .agent-local/screens/L-23/index.html; main before/final production after, desktop 1280x800, phone 390x844 and 360x800. Synthetic demo UI fixtures explicitly not study results; no production seed data added.
- Plan corrections: existing exports live in author Study, not Progress; left intact and verified. Review display now matches isDueReview. L-23a's reference/timing profile separation is preserved for kvn's adoption review; no storage engine changes. K-05 pending, so no unit is promoted to approved.
- Needs kvn: adopt/reject UI and merge the four independent branches from this run: L-14 (80f01a9), L-19 (a752530), I-06 (5238c51), L-23 (task HEAD). No push/merge/deploy by codex; Learn UI changes r26_port yes.
- Remaining lane queue, not claimed: I-12a waits for kvn's post-15-Oct no-answer confirmation; L-25 waits for L-22b/L-16b/DN-08; I-10 waits D-04; I-11 waits D-03; Q-05 waits D-03/D-04; optional L-31 waits DN-19/K-05. Other Codex lane's tasks untouched.
### 2026-10-14 | codex (second lane) | I-06
- What: standalone Privacy, draft Terms, Contact and open-core Roadmap pages; working footer links and multi-page build. kvn approved no prices/paid offering and kavindu.rakn@gmail.com in chat.
- Branch @ sha: agent/codex/I-06-shell-pages @ task HEAD (base 3a8d552; independent UI leaf).
- Gates: npm 10 ci; Shell 44 tests, typecheck/build passed; guard 168; all built pages and local page links 200; contact/roadmap assertions; no overflow at desktop/390/360; diff check clean.
- Screenshots: .agent-local/screens/I-06/index.html; clean main before (missing URLs fall back to homepage), final production after. Footer loader excluded; new Roadmap link wraps away from the floating assistant.
- Plan correction: actual privacy includes Communicate speech/history/consented voice uploads, Recognize camera uploads and OS speech in Alerts. DN-04 content-edition selection stays a separate decision; no deployment/legal certification. Existing homepage 98% Sequence Accuracy claim is outside footer-only boundary; exact removal proposed in handoff.
- Needs kvn: UI review/adoption/merge and eventual terms review. No push, merge or deploy by codex; r26_port no.
- Next: L-23 Progress UI. I-12a still awaits deadline/reply confirmation; later dependency gates remain in force.

### 2026-10-14 13:00 | claude-code (integration prep, light) | integration/2026-10-14
- What: merged with --no-ff onto main 3a8d552: L-17b (kvn's hint wording), L-29b (iPhone camera restart, model preload, "getting ready" line, ?camdebug=1 panel), L-14 (meaning chip; English dataset names count, kvn 14 Oct), L-19 (all 12 scenario hints hidden from learners, author mode only, text unchanged), L-23 (Progress page), I-06 (Privacy, Terms, Contact, Roadmap pages; kvn approved the open-core roadmap with no prices and kavindu.rakn@gmail.com as contact). No conflicts; LOG kept every entry. Antigravity's old L-14/L-19 branches are superseded.
- Gates: Learn npm@10 ci, lint 0 warnings, tests 279 passed + 12 skipped, build ok; Playwright e2e 10 passed; Shell 44 tests + build; sync guard 170.
- Checks (light, by claude-code, no reviewer agents): L-17b strings match kvn's wording exactly; L-19 hides every hint from learners and rewords none; L-14's 366 English names are all real yohan_* glosses (no kaggle/Sinhala names); no invented SSL content, no figures beyond "75/100" in a seeded demo render, no secrets, no board edits by agents. Every branch has before/after renders.
- Warning: Learn's main JS is 158.55 kB gzip (budget 160; it was 146.00). The next feature will exceed it unless views are split off (lazy-load Progress, Scenario, Record, Library, Study).
- kvn's checks recorded: Q-06a done (iPhone: camera starts, a take completes, app switch fails -> L-29/L-29b; Android: fine). D-02 done (suvana-learn.vercel.app/learn/ serves main; camera starts on the phone; first start about a minute on the iPhone because of about 9 MB of model files -> L-29b preload). L-29 did not fix the iPhone app switch; L-29b is the follow-up and needs kvn's iPhone re-test after deploy.
- Follow-ups: I-06 page wording is formal for the public and says "kvn" twice (use the full name); lazy-load views for bundle size (codex).
- Board: L-14, L-19, L-23, I-06, D-02, Q-06a done.
- Needs kvn: adopt or reject each UI change from .agent-local/review/2026-10-14/index.html; then merge and push; then iPhone re-test.

### 2026-10-14 14:00 | kvn (recorded by claude-code) | 14 Oct approvals and iPhone re-test
- Verdict: kvn adopted all six UI changes from the before/after renders in .agent-local/review/2026-10-14/: L-17b, L-29b, L-14, L-19, L-23, I-06. Merged integration/2026-10-14 into main and pushed; Vercel deployed the latest commit to suvana-learn.vercel.app.
- Q-06a re-test (iPhone, after L-29b): the camera now restarts by itself every time kvn switches to another app and back. Bug A19 fixed.
- Note: commit f4c610e also started tracking .claude/launch.json (allowed by the Q-01 .gitignore); lane worktrees with an untracked copy must move it aside before switching branches.
- Next: K-05 (curriculum approval) unblocks claude-code's L-11; codex follow-ups: lazy-load views (main JS 158.55 kB of 160), plainer I-06 wording with kvn's full name.

### 2026-10-14 15:00 | kvn (recorded by claude-code) | K-05 curriculum decisions
- Decision (kvn, chat), from L-09's 21 proposed units: (1) unit order: Starter, Greetings, Numbers 1-5, Restaurant, Everyday words and directions, Letters A-M, Letters N-Z, Numbers 20-99, Days, Months, Colours, People and family, Places, Transport, Big numbers, then the large word groups (action words, things, describing words, time words, position words, small words); (2) split every large unit into groups of about 10 signs, keeping L-09's difficulty order inside each, so no learner is stuck behind a 144-sign unit; (3) unit titles and descriptions in plain words, with no claim beyond how the order was made (one/two hands, still/moving, length); (4) DN-19: no third scenario (L-31 not needed).
- Meaning correction (kvn, native speaker): ANDANAWA means "cry", not "dressing" (translations.ts line 87; kvn edits it himself; ANDINAWA stays "wear").
- Next: codex applies (1)-(3) in scripts/curriculum-report.mjs and regenerates src/data/curriculum.ts with status 'approved'; kvn changes translations.ts; then K-05 is done and L-11 (Path view) is unblocked.
### 2026-10-14 20:12 | codex | Learn lazy views follow-up
- What: done for review. Progress/Scenario now lazy; Record/Library/Study were already lazy. Hero/Practice stay eager; secondary views share a brief Loading… status fallback. Ready UI unchanged.
- Branch @ sha: agent/codex/learn-lazy-views @ task HEAD (final SHA in branch log), fresh from main 64dd3db; independent.
- Size: fresh Vite builds 158.55 -> 140.46 kB gzip main JS (18.09 kB less; 19.54 kB below budget). Deferred code still loads when selected.
- Gates: npm 10 ci (Learn/screens), lint 0 warnings, 287 passed / 4 skipped, build passed, guard 170, browser suite 10 passed. Extra production check verifies zero secondary view requests on first paint, one fetch per view, loading fallback and Progress-to-Practice sign navigation.
- Screenshots: .agent-local/screens/learn-lazy-views/index.html, main before/after ready Progress/Scenario and loading after at desktop/phone. Corpus untouched; generated reports restored. r26_port yes after merge; nothing pushed, merged or deployed.
- Plan correction: only Progress and Scenario required new lazy imports. Needs kvn: review/merge. Next: I-06 plain wording on a separate main-based branch.
### 2026-10-14 20:24 | codex | I-06b
- What: done for review. Plain, friendly copy in Privacy, Terms, Roadmap and Contact; kvn -> Kavindu Ranathunga, including the contact owner line. All original data-handling facts, optional voice metadata, rights/safety limits, draft label, future-plan caveats, support limits and contact address retained. Full section-by-section fact audit in handoff.
- Branch @ sha: agent/codex/I-06b-plain-pages @ task HEAD (final SHA in branch log), fresh from main 64dd3db; independent of Learn's lazy-view fix 14868e3.
- Gates: npm 10 ci; Shell 44 tests, typecheck/build passed; guard 170; diff check clean. Same element structure, links, scripts and numeric facts; all pages/local page links 200; no overflow at 1280/390/360. Existing Shell homepage size warning unchanged.
- Screenshots: .agent-local/screens/I-06b/index.html; 32 images covering all four pages before/after at desktop/phone, including full-page copies for all paragraphs. All four full-page after renders visually inspected.
- Needs kvn: adopt/reject wording and merge the separate branches. r26_port no; no CSS, behavior, prices, facts or board/decision changes. Nothing pushed, merged or deployed.
### 2026-10-14 | codex (second lane) | K-05 curriculum
- What: generator now applies kvn's approved topic order, balanced groups near ten with a strict 12-sign cap, plain titles/descriptions and approved status. Regenerated curriculum.ts; 54 units, 490 distinct signs, all 503 existing placements and every original within-group sequence preserved.
- Branch @ sha: agent/codex/K-05-curriculum @ task HEAD (fresh origin/main 64dd3db; final SHA in git log).
- Gates: npm 10 ci; lint 0 warnings; 283 passed / 12 skipped; build 158.61 kB gzip; guard 170; production Playwright 10 passed; generator --check and exact pre/post preservation checks passed; diff check clean. translations.ts and meaningCoverage.ts hashes unchanged.
- Screenshots: .agent-local/screens/K-05/index.html; main before/after desktop 1280x800 and phone 390x844, new ordering/approval and split Action words visible. Full final 54-unit/count table in handoffs/K-05.md.
- Plan corrections: named K-05 decision journal entry is not present on fetched main; kvn's direct 14 Oct chat instruction supplies full authorization. Progress browser test's obsolete proposed-unit assertion updated to approved states. Corpus quirks preserved: EQUAL is in Numbers 1-5, 3 and letter N are absent; no labels invented or corrected.
- Needs kvn: check the full list/counts, review renders and merge if adopted; fix ANDANAWA himself separately. No board/decisions edits, push, merge, deployment or messages by codex. r26_port yes.

### 2026-10-15 | codex (second lane) | K-05 natural-order follow-up
- What: generator and output now use kvn's approved alphabet, weekday, calendar-month and numeric orders before splitting. Letters A-M stays together with 13 signs, the sole cap exception. Renamed First numbers and Numbers 30-90; 53 approved units, 490 unique glosses and all 503 placements preserved. Starter/other groups keep their exact sequences; no labels added, removed or renamed.
- Branch @ sha: agent/codex/K-05-curriculum @ task HEAD (new commit on the previous increment, rebased cleanly from c91657e to b3b2a17 onto origin/main f20dd27 per protocol). kvn's ANDANAWA=cry correction included unchanged; translations.ts and meaningCoverage.ts have no task diff.
- Gates: npm 10 ci (Learn/screens); lint 0 warnings/errors; 287 passed / 12 skipped; build 158.60 kB gzip; guard 170; production Playwright 10 passed; generator --check, exact placement/group preservation and protected-file hashes passed; diff check clean.
- Screenshots: .agent-local/screens/K-05-natural-order/index.html; twelve fresh desktop 1280x800 / phone 390x844 Progress before/after images at start/letters/numbers, visibly showing renamed titles and the single 13-sign A-M unit. Updated complete 53-unit/count table in handoffs/K-05.md.
- Plan correction: fetched main now contains the 14 Oct K-05 decision journal entry; 15 Oct chat authorizes natural-order exceptions and supersedes the old strict cap for A-M only. No board/decisions edits or unrelated tasks.
- Needs kvn: review renders/table and merge if adopted. No push, merge, deployment or messages by codex. r26_port yes.

### 2026-10-15 12:00 | kvn (recorded by claude-code) | K-05 follow-up decisions
- Decision (kvn, chat): letters, weekdays, months and number groups use their natural order (A to Z, Monday to Sunday, January to December, small to big) instead of easiest-first; all other groups keep L-09's order. Letters A-M stays one unit of 13 (the only unit above 12).
- Titles: "Numbers 1-5" becomes "First numbers" (the corpus has 1, 2, 4, 5 and EQUAL, no 3). claude-code proposed "Numbers 20-99" -> "Numbers 30-90" (it holds 30 to 90, no 20) in the message kvn sent; kvn may still reject it from the renders.
- One integration for all three Codex branches, after the K-05 follow-up.

### 2026-10-15 12:30 | claude-code (integration prep, light) | integration/2026-10-15
- What: merged with --no-ff onto main f20dd27: learn-lazy-views (Progress and Scenario load only when opened), I-06b (Privacy, Terms, Roadmap, Contact in plain words; "kvn" replaced by Kavindu Ranathunga), K-05 (53 approved units in kvn's order, split near 10, natural order for letters/days/months/numbers, plain titles). All three merged cleanly.
- Gates: Learn npm@10 ci, lint 0 warnings, tests 287 passed + 12 skipped, build ok with main JS 140.46 kB gzip (budget 160; was 158.55); Playwright e2e 10 passed; Shell 44 tests + build; sync guard 170.
- Checks (light, by claude-code, no reviewer agents): translations.ts and meaningCoverage.ts unchanged against main; generated units hold A-M and O-Z in order, MONDAY to SUNDAY first, JANUARY to DECEMBER then MONTH, YEAR, MRACH, numbers ascending with EQUAL and MILIYANAYA last; every unit status approved; no brand names, figures or secrets in the diff ("kvn" appears only in generator comments, not in UI); no "kvn" left on the four Shell pages. Every branch has before/after renders.
- K-05 left at review: the units and DN-19 are decided and ANDANAWA is fixed, but the acceptance item "meanings for U1 and the everyday-words unit verified by kvn" still needs kvn to confirm the 23 existing meanings (Starter and Everyday words and directions 1-2). Agents changed no meaning.
- Board: K-05 review; L-31 cancelled (DN-19 no). DECISIONS: DN-19 decided, D-A20.
- Needs kvn: adopt or reject each change from .agent-local/review/2026-10-15/index.html; then merge and push; confirm or correct the Starter and Everyday-words meanings. Then L-11 (Path view) is unblocked.

### 2026-10-15 14:00 | kvn (recorded by claude-code) | 15 Oct approvals; K-05 done; board catch-up
- kvn approved every change in .agent-local/review/2026-10-15/index.html (K-05 parts 1 and 2 including "Numbers 30-90", I-06b, lazy-loaded views), merged integration/2026-10-15 into main and pushed.
- K-05 meanings: kvn confirmed the 23 existing meanings in Starter and Everyday words and directions 1-2 as correct (ANDANAWA = cry was his earlier fix). K-05 is done; L-11 is unblocked.
- Board catch-up from earlier LOG entries (13 Oct): T-01, K-03 and Q-07 done.
- Open for kvn: K-04, K-09 and K-13 postponed by kvn; Karindra's K-03 deadline is 15 Oct (DN-14: no reply means I-12a rebuild on 16 Oct); Lithira's is 16 Oct; who builds L-11 and the other claude-code Learn tasks is kvn's choice (Codex or a new Claude chat).

### 2026-10-15 | kvn (recorded by claude-code) | claude-code's Learn tasks move to codex
- Decision (kvn, chat): Codex builds the seven remaining claude-code Learn tasks: L-11, L-16a, L-24, L-16b, L-27, L-21, L-26. Claude's allowance is kept for integration prep, the R26 ports (R-03, R-04, R-05), Q-08 and talking with kvn. Board: owner codex, branches agent/codex/<same name>.
- Lane: the second Codex window (antigravity worktree, ports 5193/5194) builds them one after another in that order, after I-12a if DN-14 needs it. L-25 stays with it. Its I-10, I-11 and Q-05 go to the first Codex window.
- Hot files: for these tasks the second Codex window owns PracticeView.tsx, views.css, App.tsx (L-11) and Hero.tsx (L-24, L-27); read "CC" as that window in the 10-schedule.md hot-file table.
- Stacking: kvn allows these seven to stack on each other (an exception to 08 section 4, for this chain only). Each handoff says "stacked on ..." and its renders compare against the parent branch; kvn merges bottom-up.
- Plan correction: L-24's Hero button opens the first sign in Watch, which L-16a adds, so L-24 is built after L-16a (the board lists only L-11).

### 2026-10-15 | codex (Learn UI lane) | I-12a
- What: ready for review. app.json uses slug/scheme suvana-alerts and Android package help.suvana.alerts; removed Karindra's extra.eas project binding. App name stays Suvana; eas.json and runtime code need no edits.
- Branch @ sha: agent/codex/I-12a-alerts-eas @ task HEAD (final SHA in git log), fresh from origin/main a4a98aa; independent.
- Gates: npx tsc --noEmit passed; sync guard 170 passed; exact config-delta and locally resolved Expo config assertions passed; diff check clean. No build or device verification.
- Audit: no old-scheme links or hard-coded old package/project binding remain. Background plugin derives the Java package from app.json; relative service, explicit intents, internal bridge/channel/action IDs and notification routes remain consistent. Full evidence and proposed upstreams.json coupling/guard in handoffs/I-12a.md; declaration not applied in this lane.
- Screenshots: n/a, config only. SSL content/figures untouched; r26_port no.
- Plan correction: kvn's direct 15 Oct chat confirms DN-14 rebuild and authorizes I-12a now, before its 16 Oct board date; old projectId removed instead of a placeholder. No board or decisions edits.
- Needs kvn: review branch, then run eas init in apps/alerts under his own Expo account; I-12 APK build/install stays manual. No build, push, merge, deploy, account changes or messages performed.
- Next: L-11 starts the Learn UI chain from 16 Oct.
### 2026-10-15 | codex (first window) | L-18 and lane ownership
- What: L-18 ready for review early, ahead of L-21. Optional replay pairs index original reference/attempt frames, including tracking gaps; worstFrameIndex indexes the original attempt. Reuses winning DTW path; scores/hints unchanged. Two-hand replay uses the tracked reference hand with most valid frames; worst moment is on that hand's path. Full contract in handoffs/L-18.md.
- Branch @ sha: agent/codex/L-18-alignment @ task HEAD (final SHA in git log), fresh origin/main a4a98aa; no stack.
- Gates: npm 10.9.9 ci --offline; lint clean; 304 passed / 5 skipped; build main JS 140.75 kB gzip; guard 170; diff check clean. Forty-pair numeric/hint preservation and local scoring benchmark passed: median 1.89415 -> 1.98120 ms (+4.60%, within 10%). Generated report changes restored.
- Screenshots: n/a, logic only. No SSL content or screen files changed. r26_port yes.
- Decision (kvn, chat): from 16 through 21 Oct the other Codex window builds L-11, L-16a, L-24, L-16b, L-27, L-21, L-26 and owns PracticeView.tsx, views.css, Hero.tsx. This window leaves them untouched and records any exact proposed diff in its handoff. This window takes I-10 after D-04/I-01, I-11 after D-03, Q-05 after D-03/D-04.
- Plan correction: 10-schedule.md still lists Antigravity for I-10/I-11/Q-05 although BOARD.md assigns Codex; screen ownership is per kvn's window split above. No edits to BOARD.md/tasks.json/DECISIONS.md.
- Needs kvn: review and merge L-18 before L-21; reconcile schedule/window ownership. No push, merge, deployment or messages by codex.

### 2026-10-15 | claude-code (integration prep, light) | integration/2026-10-15b
- What: merged with --no-ff onto main a4a98aa: I-12a (Alerts app.json: slug and scheme suvana-alerts, Android package help.suvana.alerts, Karindra's EAS project ID removed; app name stays Suvana) and L-18 (scoring keeps the winning DTW path as replay pairs in original frame numbers, plus worstFrameIndex, for L-21). Both merged cleanly; LOG kept both entries.
- Gates: Learn npm@10 ci, lint 0 warnings, tests 296 passed + 13 skipped (no calibration corpus in this worktree), build ok, main JS 140.75 kB gzip (budget 160); sync guard 170. apps/alerts after the merge is identical to I-12a's branch, where codex ran tsc --noEmit (passed).
- Checks (light, by claude-code): app.json differs only in slug, scheme, package and the removed project ID; no soundguard://, karindragimhan69 or old project ID left in apps/alerts; the background plugin takes its Java package from app.json. L-18 computes score, hands and hints as before; its frame mapping uses the same frame selection as extractHandFeatures. No UI, SSL content, figures or secrets in either diff.
- Karindra (reply to kvn's note, 15 Oct): Alerts needs no server; it runs on-device ("Edge AI") and works offline. DN-14 (kvn, chat, 15 Oct): rebuild under kvn's own Expo account regardless of any later reply.
- Follow-ups: the first Codex window (upstreams.json owner) applies I-12a's proposed app.json coupling and guard; kvn runs eas init and then the preview build (I-12).
- Needs kvn: merge integration/2026-10-15b and push. Board: I-12a and L-18 done.

### 2026-10-15 | codex (first window) | I-12a-sync-guard
- What: applied the exact merged I-12a handoff proposal to alerts.couplings["app.json"] and appended its app.json guard; existing Suvana name guard retained. Protects slug/scheme suvana-alerts and package help.suvana.alerts, rejects Karindra's old identity/project binding, and allows kvn's future EAS projectId.
- Branch @ sha: agent/codex/I-12a-sync-guard @ task HEAD (final SHA in git log), fresh origin/main d527398; explicitly requested by kvn.
- Gates: sync guard 171 passed; parsed manifest exactly equals HEAD plus the two proposed changes; diff check clean. No app/runtime edits; screenshots n/a; r26_port no.
- Needs kvn: review and merge this branch. Existing I-12 EAS steps are separate. No push, merge, deployment or account operations by codex.

### 2026-10-15 | codex (first window) | I-09 speech container readiness
- What: bounded build/start/auth check ready for review; README follows DN-03 laptop-only, lists exact model IDs to confirm, matching TRANSLATE_API_KEY/STT_API_KEY, cache ownership, loopback/native/Docker ports and URL registration. Runtime files unchanged. I-08 is independently ready on agent/codex/I-08-recognition-container @ 90fd77c.
- Branch @ sha: agent/codex/I-09-speech-container @ task HEAD (final SHA in git log), fresh origin/main f611b0a; no stack.
- Gates: existing Dockerfile built from exact tracked runtime snapshot; pip check passed. Image 10,645,268,903 bytes; empty-cache CPU float32 startup health observed after 760.4 s (2 s polling), auth required and missing-key multipart request 401. No real-audio quality/latency or cached-start result. Model API preflight and framework hook probe passed; final sync/diff/boundary checks in handoff.
- Finding: fallback Wav2Vec2 loaded four missing/new classifier-head parameters and four unexpected checkpoint-head parameters. Health OK does not validate emotion. Needs Lithira's correct classifier/loader or kvn's explicit ASR-only choice using existing STT_ENDPOINT_PATH=/translate?emotion=false; neutral/null is a disabled placeholder. No configuration change applied.
- Evidence: handoffs/I-09.md; .agent-local/evidence/I-09-{build.log,first-start.json,first-start.log}; local populated cache codex-i09-cache-c7383592 retained. Test container/key removed; no user secrets read. Screenshots n/a; SSL content untouched; r26_port no.
- Decision refresh: fetched main now decides DN-03/04/08; L-20 not started during the requested I-08 -> I-09 sequence, and L-22b still needs K-07. No board/decisions edits.
- Plan correction: legacy speech docs implied the fallback worked without Lithira's artifact; the observed missing/newly initialized head prevents accepting it as trained emotion output. Model-quality/demo acceptance remains separate from HTTP health.
- Needs kvn: review/merge I-08 from its rendered UI comparison and I-09 notes; choose emotion path, confirm model revisions/classifier, then actual key/URL setup and audio rehearsal (D-05/K-11). I-08 sync declaration/guard proposal remains in its handoff. No push, merge, deployment, account writes or messages by codex.

### 2026-10-15 | kvn (recorded by claude-code) | I-12 Alerts APK done; board catch-up
- I-12 (kvn): ran eas init under his own Expo account (project linked in app.json, commit b5c25e6) and `eas build -p android --profile preview`. The APK installs and runs on kvn's Android phone without the laptop; in airplane mode a sound alert still worked. Published as GitHub Release alerts-v1.0.0: https://github.com/kavindu-rakn/Suvana/releases/download/alerts-v1.0.0/suvana-alerts-1.0.0.apk (267 MB; never committed). That URL is the one I-10 links from /alerts/.
- Note: speech captions use Android speech recognition and need internet unless on-device recognition is turned on in the app's options with the offline language pack downloaded while connected.
- kvn merged agent/codex/I-12a-sync-guard (sync guard 171 with his project ID; checked by claude-code before the merge).
- Board: I-12a, L-18 and I-12 done.

### 2026-10-15 | kvn (recorded by claude-code) | decisions due 16 Oct
- Decided (kvn, chat, after claude-code's pros and cons): DN-02 Railway Hobby from 18 Oct with the laptop tunnel as fallback; DN-04 (a); DN-08 whole sentence clips, experimental, lowest priority; DN-20 yes from 17 Oct. Taken as recommended, no objection from kvn: DN-03 laptop only; DN-09 verified English meaning, else gloss label; DN-13 own instance, said up front. DN-15 recorded as decided on 14 Oct by I-06. DECISIONS D-A21 to D-A29.
- Consequences: kvn signs up for Railway and runs D-04 on 18 Oct after I-08 (hosting needs Lahiru's OK); K-04 accounts (Atlas, Cloudinary, NEXTAUTH_SECRET) are needed before D-03 on 17 Oct; K-07 (kvn) converts the 20 labelled sentence clips; L-25 only if the Learn chain is on track on 19 Oct; claude-code sets up the claude-thesis worktree and kickoff on 17 Oct.
### 2026-10-15 | codex (Learn UI lane) | L-11
- What: review. New lazy Path shows approved units, stars and game-layer states; unit detail offers Watch/Try and a capped eight-sign session. Practice Next follows the queue and shows L-13's reason. Free Practice remains open.
- Branch @ sha: agent/codex/L-11-path @ task HEAD (final SHA in git log), stacked on origin/main 150a4c6 as the first task of kvn's authorized chain.
- Gates: npm 10 ci Learn/screens; lint 0 warnings; 296 passed / 13 skipped; build within 160 kB gzip; guard 171; browser 13 passed including seeded unlock/session and 390/360 checks; diff check clean.
- Screenshots: .agent-local/screens/L-11/index.html, desktop 1280x800/phone 390x844 empty and synthetic seeded before/after plus unit details. Before is parent Progress because Path was absent; no study results. Visually inspected.
- Plan correction: use merged approved game rules, not stale plan thresholds. kvn authorized starting on 15 Oct. No SSL content/figures added; r26_port yes after milestone merge.
- Needs kvn: UI adoption from renders and eventual bottom-up merge. No push, merge or deploy. Next: L-16a stacked on this branch.

### 2026-10-15 | codex (Learn UI lane) | L-16a
- What: review. Each sign opens Watch at 0.5x; My turn opens Try. Pure tested stage machine; Recall disabled until L-16b. Results show actual stars and nextExercise advice; attempts log stage try/sessionId; capture-end/result-shown marks emitted. Guide updated.
- Branch @ sha: agent/codex/L-16a-watch-try @ task HEAD, stacked on agent/codex/L-11-path e0dfb16. Parent-only before/after renders.
- Gates: npm 10 ci; lint 0 warnings; 298 passed / 13 skipped; build 142.82 kB gzip; guard 172; final production Playwright 14 passed. Two earlier loaded-run timeouts passed in isolation and the full final suite. Diff check clean.
- Screenshots: .agent-local/screens/L-16a/index.html; Watch, Try and result at desktop 1280x800/phone 390x844. Results use explicitly synthetic landmarks/fake camera, not K-13 hands or learner evidence; inspected. Phone result polish remains L-26.
- Plan corrections: no video (L-15b cancelled); optional SkeletonPlayer autoSpeedUp and guide/browser changes are necessary supporting files. No SSL content, bands, scoring or reward-rule changes; r26_port yes.
- Needs kvn: UI adoption and eventual bottom-up merge. No push, merge or deploy. Next: L-24 stacked on this branch, before Recall, per kvn's order.

### 2026-10-15 | codex (Learn UI lane) | L-24
- What: review. Hero start opens the first sign of the first open approved unit in Watch; finite session and blocked-storage handoff included. Completion shows new stars without double counting, today's goal, next open unit and a free-practice continuation.
- Branch @ sha: agent/codex/L-24-cta-complete @ task HEAD, stacked on agent/codex/L-16a-watch-try 5347f3c; parent-only comparison renders.
- Gates: npm 10 ci; lint 0 warnings; 301 passed / 13 skipped; build 146.99 kB gzip; guard 172; production browser 17 passed; diff check clean.
- Screenshots: .agent-local/screens/L-24/index.html; desktop/phone Hero, direct destination and synthetic seeded completion before/after, visually inspected. Decorative Hero preview cards/figures unchanged; no SSL content added. r26_port yes.
- Needs kvn: UI adoption and a real-camera landing-to-enabled-Record check under 30 seconds (not claimed from mocks). No push, merge or deploy. Next: L-16b Recall stacked on this branch; DN-09 uses verified English meaning, else gloss.

### 2026-10-15 | codex (Learn UI lane) | L-16b
- What: review. Recall unlocks after two Try stars; cue is verified English meaning else the existing gloss. Reference/ghost/reasons hidden until reveal or result. Revealed flag stays sticky for a take; scored Recall logs stage, reveal flag and sessionId; existing game rules decide rewards.
- Branch @ sha: agent/codex/L-16b-recall @ task HEAD, stacked on agent/codex/L-24-cta-complete 32039e8; before/after compare only this task against that parent.
- Gates: npm 10 ci; lint 0 warnings; 302 passed / 13 skipped; build 147.29 kB gzip; guard 173; final production browser 21 passed. Browser checks caught hidden post-result reference; Recall-specific desktop/phone layout fixed and assertions retained. Diff check clean.
- Screenshots: .agent-local/screens/L-16b/index.html, desktop/phone cue, reveal and result before/after; synthetic two-star history/camera/result fixtures on existing content, not learner/K-13 evidence; visually inspected. No SSL content or scoring rules changed. r26_port yes.
- Needs kvn: UI adoption and later real-phone checks. No push, merge or deploy. Next: L-27 camera lifecycle. L-18 now merged on origin/main f611b0a; rebase this own stack onto it before L-21.

### 2026-10-15 | codex (Learn UI lane) | L-27
- What: review. Browsing/Watch/hidden pages release camera tracks; view-level intent restores once only in an active Try/Recall. Manual stop/failure/browsing revoke restart. Hidden takes cancelled unscored. L-29b vision hook unchanged. Hover copy gated; Hero ticker defaults restored.
- Branch @ sha: agent/codex/L-27-camera-off @ task HEAD, stacked on agent/codex/L-16b-recall cbae144; parent-based renders.
- Gates: npm 10 ci; lint 0 warnings; 305 passed / 13 skipped; build 147.79 kB gzip; guard 173; production browser 26 passed + 2 Safari-event regressions passed; diff check clean.
- Screenshots/evidence: .agent-local/screens/L-27/index.html, desktop/phone live/browse before/after; synthetic camera. before-tracks.json live -> after-tracks.json ended on both. Tests verify three returns with no duplicate starts, bfcache and blur-only ended-stream recovery.
- Plan correction: renders included per kvn's chain rule. L-18 already in base runtime; f611b0a updates board/decisions only. Own stack will rebase before L-21. No SSL content/scoring changes; r26_port yes.
- Needs kvn: UI adoption and physical iPhone re-test. No push, merge or deploy. Next: L-21 replay; then L-26 last. L-25 remains conditional on sentence data and priority.

### 2026-10-15 | codex (Learn UI lane) | L-21
- What: review. Replay uses original L-18 frame pairs at half speed, pauses at the scorer's selected moment, and has one keyboard scrubber. Desktop side by side/phone stacked; at most two typed tips, faded once improving, plus actual star change. No perfect-execution/string-filter/finger-focus claims.
- Branch @ sha: agent/codex/L-21-replay @ task HEAD, stacked on agent/codex/L-27-camera-off 5eae5fa. Owned five-task stack rebased cleanly onto main f611b0a; no Learn/screens runtime change. New SHA mapping in handoff.
- Gates: npm 10 ci Learn/screens; lint 0 warnings; 308 passed / 13 skipped; build 149.14 kB gzip; guard 173; production browser 31 passed; diff check clean.
- Screenshots: .agent-local/screens/L-21/index.html, result and controls before/after at 1280x800, 390x844, 360x800. Explicit synthetic frozen corpus-pose take and history (K-13 absent); high match displays are not real learner/accuracy evidence; visually inspected.
- Plan correction: off-finger highlights/states remain disabled under D-A15/L-30's unvalidated-method gate. No new SSL content, scoring changes, push, merge or deploy. r26_port yes.
- Needs kvn: rendered adoption and real-clip check when available. Next: L-26 last; conditional L-25 still waits for L-22b/data and priority.

### 2026-10-15 | codex (Learn UI lane) | L-26
- What: review. Touch preview before Watch; reachable phone camera/Record controls with a 40vh reference and vertical scrolling; pane headers clear media; author tabs fit phone and compact desktop; Scenario fits 360px. Result starts focus at its heading before replay. Plain no-hands tips, visible focus and reduced-motion delays removed. Light explorer contrast spots corrected; Q-07 already passed, labels untouched.
- Branch @ sha: agent/codex/L-26-polish @ task HEAD, stacked on agent/codex/L-21-replay 05f0ee0; parent-based before/after renders. Seven-task Learn UI chain now committed for review.
- Gates: npm 10.9.9 ci Learn/screens; lint 0 warnings/errors; 310 passed / 13 skipped; production build 149.39 kB gzip (budget 160); all 174 sync guards; final production browser 43 passed, including all 360/375/390 stage/result layouts, 861/1024/1280/1440 author controls, Recall flags, replay and L-29b camera regressions; diff check clean.
- Screenshots: .agent-local/screens/L-26/index.html, 69 matched parent/current pairs at 1280x800, 390x844, 360x800, plus four after-only Try/Record scroll details. Final overviews/changed states visually inspected; 42 ordinary render layout samples have no page overflow. Synthetic session/history/hand fixtures; K-13 unavailable, existing corpus pose repeated for replay as L-21/L-17b fixture practice. No learner signing, accuracy or study result claimed. No new SSL content/order or scoring changes; r26_port yes.
- Plan correction: L-26 covers every shipped screen; L-25 remains deferred for L-22b/data and the later-priority slot. Owned CSS also removes the obsolete author-banner gap. No AppNavBar/native camera source change. Needs kvn: UI adoption, physical iPhone Safari restart and real-camera landing-to-Record timing under 30s; real K-13 replay later. No push, merge or deploy.
### 2026-10-15 | codex (first window) | I-08 recognition container
- What: ready for review early at kvn's request, ahead of D-04 on 18 Oct. CPU serving requirements, explicit runtime copies and 171-class health check; additive /api/info labels/backend/model; Back to Suvana and light/dark URL theme; reproducible 50-window benchmark. Existing model, labels, preprocessing and WebSocket protocol unchanged.
- Branch @ sha: agent/codex/I-08-recognition-container @ task HEAD (final SHA in git log), fresh origin/main 150a4c6; no stack.
- Gates: Docker build and pip check passed; image reports 3,089,271,082 bytes; default startup on custom PORT=7862 became healthy and loaded 171 labels. Linux 50-window median/p90: tf_function 146.093/163.558 ms, keras_predict 287.236/461.513 ms; matching rounded confidences, tf_function retained. Synthetic blank JPEGs, not signer/accuracy/hosted-device results. Recognition pytest 35 passed; syntax, browser 12 combinations, guard 171 and diff checks passed.
- Screenshots: .agent-local/screens/I-08/index.html (before/after desktop 1280x800, phone 390x844, layout 360x800, plus light after). Real static page renders; API/inference tested separately. Local build/benchmark logs in .agent-local/evidence. SSL content untouched; r26_port no.
- Plan correction: direct chat authorizes I-08 on 15 Oct. DEPLOY-SUVANA.md's missing-label/regeneration note is stale and outside this boundary; label files exist and must not be regenerated. Guard/declaration additions are proposed in handoffs/I-08.md per the task boundary. L-20 remains waiting for DN-04; L-22b for K-07/DN-08.
- Needs kvn: review/adopt UI from renders, merge I-08, apply proposed sync declarations, then handle D-04 hosting. No push, merge, deployment or messages by codex. Next: I-09 on a fresh origin/main branch.

### 2026-10-15 | codex (first window) | L-20 licence mode and attribution
- What: owned-file implementation ready for review on agent/codex/L-20-licence-mode, fresh origin/main f611b0a. Full 501-reference free academic edition remains default; Library shows NC/no-payments/no-ads notice and both corpus credits. CC0 preview selects 141 declared CC0 references and blocks excluded direct frame selections; public NC assets are still copied, so this is not a commercially cleared distribution.
- Decision: kvn explicitly unblocked L-20 after I-08/I-09; D-A23 is present. kvn supplied the original Yohan Kaggle URL in chat; dataset-page title verified, URL added, old TODO resolved. No new SSL content/figures or video permission.
- Gates: npm 10 ci passed; lint 0 warnings; 309 tests passed/5 skipped after sandbox EPERM rerun; full build 140.81 kB gzip, CC0 build 140.83 kB; 10 browser smoke tests passed; 12 edition/theme/viewport checks passed (501 vs 141, scenario Preview, no page errors, panel geometry/link contrast); sync guard 171; diff check clean. Generated scoring reports restored.
- Screenshots/evidence: .agent-local/screens/L-20/index.html and .agent-local/evidence/L-20/browser.json. Before/after desktop/phone/narrow Library, additional light and CC0 states; never committed. Baseline phone navigation overlap/navbar overflow remains outside this task; screenshots navigate directly to the real Library state.
- Handoff: handoffs/L-20.md includes exact unapplied Hero/App notice/attribution diffs for the Learn UI owner, plus tested contentCoverage helper and Path Preview integration contract. PracticeView.tsx, views.css and Hero.tsx untouched. Library is author-only today; do not claim the learner-wide NC notice is finished until the owner's wiring is rendered/adopted. PathView is absent on this main; that acceptance item waits for its owner rather than inventing another Path.
- Needs kvn: review the Library renders and merge this branch; Learn UI owner applies/renders learner notice and unit Preview wiring. r26_port yes at next milestone from merged main. No push, merge, deploy, env/account changes or messages. DN-08 remains experimental/lowest priority; L-22b still waits for K-07, not started.

### 2026-10-15 23:30 | claude-code (integration prep, light) | integration/2026-10-15c
- What: merged with --no-ff onto main f611b0a, Learn chain bottom-up: L-11 (Path), L-16a (Watch then Try), L-24 (start button, session complete), L-16b (Recall), L-27 (camera off while browsing), L-21 (side-by-side replay), L-26 (phone and accessibility polish); then I-08 (recognition container and page), I-09 (speech readiness notes), L-20 (credits, NC notice in Library, CC0 preview build). All ten merged cleanly; LOG kept all ten entries.
- Gates: Learn npm@10 ci, lint 0 warnings, tests 315 passed + 13 skipped, build ok, main JS 149.55 kB gzip (budget 160); browser suite 43 passed on a separate port (5174) because 5194 was held by the Codex window's preview; sync guard 175. Recognition pytest and Docker builds not rerun here (codex: 35 passed; image built and healthy).
- Checks (light, by claude-code): no brand names, accuracy figures, secrets, binaries or "kvn" in the added code; translations, meaning coverage, curriculum, label files, package files and vercel.json untouched; Hero decorative cards unchanged; no sign descriptions in new learner text. Every UI task has before/after renders; spot-checked L-11, L-16a, L-21, L-24 and L-26.
- Noticed for kvn (not blockers): the "Nice work!" heading shows the focus outline when the screen opens; Watch on a phone shows the full video frame so the hand is small ("Zoom to hands" fixes it); a unit can show "Mastered" with 14/21 stars because Mastered comes from the learner model and the third star only from Recall.
- Open items: L-20's learner-facing NC notice (Hero/App) is proposed in handoffs/L-20.md for the Learn window, since the Library is author-only (D-A23 wants a visible notice); I-08's proposed sync declarations go to the first Codex window (upstreams.json owner); I-09 found the emotion fallback loads mismatched classifier weights, so speech runs ASR-only unless Lithira sends his classifier.
- Needs kvn: adopt or reject each change from .agent-local/review/2026-10-15c/index.html (integration worktree); then merge and push; then phone checks on the deployed Learn (iPhone camera after L-27, landing to first Record under 30 s).

### 2026-10-16 10:45 | kvn (recorded by claude-code) | 15 Oct evening approvals
- kvn adopted all ten changes from the renders in .agent-local/review/2026-10-15c/ (integration worktree): L-11, L-16a, L-24, L-16b, L-27, L-21, L-26, I-08, L-20, and I-09 (notes only). Merged integration/2026-10-15c into main and pushed; Vercel deploys Learn from main.
- Board: L-11, L-16a, L-24, L-16b, L-27, L-21, L-26, I-08, I-09 and L-20 done.
- Still open from these tasks: kvn's phone checks on the deployed Learn (iPhone camera after app switch with L-27; landing to first Record under 30 s for L-24); the learner-facing NC notice and Path Preview from handoffs/L-20.md (Learn window); I-08's proposed sync declarations (first window); I-09 emotion path (ASR-only unless Lithira sends his classifier); the three small points in the review page (focus outline on "Nice work!", Watch zoom on phones, "Mastered" beside 14/21 stars), kvn to decide.
- Next for claude-code: R-03, the M1 port of Learn into the R26 working tree (17 Oct).
### 2026-10-16 | codex | I-08-sync-guard
- What: applied I-08's exact merged sync proposal: two coupling entries, two Suvana-only paths, four guards. Existing declarations and synced/recorded retained.
- Branch: agent/codex/I-08-sync-guard, fresh origin/main 72cd406; explicitly requested by kvn.
- Gates: sync guard 181 passed; parsed manifest equals HEAD plus I-08's three proposal blocks; diff check passed. Runtime/assets unchanged; screenshots n/a; r26_port no.
- Needs kvn: review and merge before stacked Q-03. No push, merge or deployment. L-22b still waits for K-07.

### 2026-10-16 | codex | Q-03 CI gaps (early)
- What: workflow/event/ref concurrency cancellation; manual-only recognition/speech Docker matrix; isolated standalone R26 Learn job; Suvana/R26 dist assertions; four-module source brand check with narrow internal-name exceptions and six failure-case tests. New tools/ci helpers reuse Learn's pinned TypeScript parser; no dependency/runtime/UI/content changes.
- Branch: agent/codex/Q-03-ci stacked on agent/codex/I-08-sync-guard 44fb0b1; both rebased cleanly onto origin/main 33e0dd5 after kvn's plan-only update.
- Gates: npm 10 ci; lint 0 warnings; Learn 323 passed/5 skipped after sandbox EPERM rerun; Suvana 149.55 kB gzip, R26 149.11 kB; both dist checks 4 HTML assets/2 WASM files; 6 helper tests; brand scan 128 source files; actionlint 1.7.12 syntax validation; sync guard 181; diff check. Recognition and speech Docker builds both exit 0 from tracked-only snapshots (speech cached, recognition fresh dependency resolution/pip check). Logs/image IDs in handoffs/Q-03.md and ignored .agent-local/Q-03/.
- Plan correction: explicit chat authorizes Q-03/ci.yml on 16 Oct instead of 20 Oct; its R-01/I-01/I-02 dependencies are merged. Board/tasks/decisions untouched. Screenshots n/a; r26_port no; L-22b remains waiting for K-07.
- Needs kvn: review/merge I-08-sync-guard then Q-03-ci, push/open PR and require hosted CI green; manually dispatch CI on the reviewed ref for the Docker matrix. Hosted CI is unverified and Q-03 is not done until it passes. No push, merge, deployment or messages by codex.

### 2026-10-16 | codex | L-20 learner notice and Path follow-up
- What: applied L-20's exact proposed Hero/footer notice and expandable credits; wired filtered-index coverage into Path cards/details. Incomplete units stay Preview despite saved full-edition stars, cannot run a full unit session or unlock successors; only available references enter queues. No curriculum/content/CSS/config changes.
- Branch: codex/L-20-learner-notice-preview (final SHA in git log); fresh from origin/main 72cd406, rebased cleanly to 33e0dd5 after its approval-record-only update.
- Gates: Learn/screens ci passed; lint 0 warnings/errors; Vitest 320 passed, 13 skipped; builds full 150.17 kB gzip / CC0 150.20 kB; Playwright 46 passed; sync guard 175 passed; diff check clean. Windows lock/cache and Vitest sandbox rename issues resolved by confirmed local-server cleanup/authorized normal-user reruns.
- Screenshots: .agent-local/screens/L-20-learner-wiring/index.html; real full/CC0 before/after Hero, Path, unit detail, footer at 1280x800 and 390x844; extra CC0 Months 1 (6/8 coverage) comparisons and expanded-credit after renders. No seeded screenshot progress. Evidence: no page errors/overflow in the captured combinations.
- Handoff: handoffs/L-20-learner-wiring.md; r26_port yes. Plan correction: separate follow-up for the deferred L-20 wiring explicitly requested by kvn; historical handoff and board/decisions untouched.
- Needs kvn: review renders and merge; milestone R26 port remains separate. No push, merge or deploy done. CC0 remains a selection preview with the existing physical-asset caveat.
- Next: L-25 is on after L-22b lands; kvn is doing K-07. Sentence work not started here.

### 2026-10-16 | claude-code (integration prep, light) | integration/2026-10-16
- What: merged with --no-ff onto main 33e0dd5: I-08-sync-guard (four Recognize guards), Q-03 (CI concurrency, R26-form Learn build, dist and brand checks, manual Docker matrix; stacked on I-08-sync-guard) and L-20 learner wiring (learner-visible NC notice and credits; CC0 Preview units on the Path). All merged cleanly.
- Gates: Learn npm@10 ci, lint 0 warnings, tests 320 passed + 13 skipped, build ok, main JS 150.17 kB gzip; tools/ci tests 6 passed, brand check 128 files, Suvana dist check; sync guard 181; browser suite 46 passed (45 on port 5174, plus camera.spec on 5194 because one test hard-codes that port).
- Checks (light): no brand names, figures, secrets or protected-file changes; the new learner text is the notice, credits and one Preview line. L-20 renders spot-checked.
- Needs kvn: adopt L-20 from .agent-local/review/2026-10-16/ (integration worktree); merge and push; then check that GitHub Actions passes on main (Q-03 is done only when hosted CI is green). Follow-up for the Learn window: camera.spec.ts should use the configured base URL instead of port 5194.

### 2026-10-16 14:40 | kvn (recorded by claude-code) | 16 Oct approvals; K-07 and Q-03 done
- kvn adopted L-20's learner notice and Path Preview from the renders in .agent-local/review/2026-10-16/ (integration worktree), merged integration/2026-10-16 into main and pushed. Hosted CI on main 34f43cc passed (GitHub Actions, push run), so Q-03 is done.
- K-07 (run by claude-code at kvn's request, 16 Oct): the converter (R26 learn-ssl-module/tools venv, MediaPipe 1.0.1) turned 19 of the 20 labelled "SSL Sentences" clips into kaggle_sent_*.json references with the dataset's own labels, CC0 licence and provenance. Skipped: "doctor koheda inne.mp4" (hands in 70% of frames, below the 0.7 coverage bar) and the unnamed ".mp4". Staged outside the repo at C:\Users\User\Documents\Suvana-wt\_staging\K-07-sentences (3.1 MB; log K-07-convert.log); the first Codex window copies them in on L-22b.
- kvn sent the Learn window the three small fixes (focus box only for keyboard users, Watch zoomed to the hands on phones, two rendered options for the "Mastered" wording) and the camera.spec.ts port fix; the first window started L-22b.
- Lahiru and Lithira: no reply yet (both due 16 Oct).
- Board: Q-03 and K-07 done.

### 2026-10-16 | codex | Learn small fixes from 15 Oct review
- What: automatic heading focus keeps the screen-reader announcement without an outline; keyboard controls retain :focus-visible rings. Practice Watch starts zoomed below 768 px, keeps desktop/Try/Recall defaults and the manual full-frame toggle. camera.spec.ts uses its configured baseURL.
- Branch: agent/codex/learn-small-fixes (final SHA in git log), fresh from origin/main 34f43cc, clean rebase to b0ce3d4's approval-only update.
- Gates: npm@10.9.9 ci in Learn/screens; lint zero warnings/errors; Vitest 320 passed, 13 skipped; build 150.19 kB gzip; 51 browser checks passed on configured port 5197; guard 181; diff check clean. No package/config/content/game-rule changes.
- Renders: .agent-local/screens/learn-small-fixes/index.html, at 1280x800, 390x844 and 360x800. Badge chooser: badge-options.html in that folder. Actual first Starter reference for Watch; synthetic progress for completion/badges explicitly disclosed.
- Badge choice pending: A shows Well practised; B shows Passed until all stars then Mastered. Both source-built options rendered on Path and Progress, with 14/21 and 21/21-star fixtures; exact unadopted patches in handoffs/learn-small-fixes.md. Neither option selected in production while kvn chooses.
- Needs kvn: choose A/B from the renders, then review/merge the branch. No push/merge/deploy. r26_port yes at a later milestone. Plan correction: direct chat authorizes these hot-file fixes; board/decision files untouched.
- Next: L-22b is in the first Codex window after K-07; L-25 waits for it to land.

### 2026-10-16 | codex | Learn small fixes: kvn selects badge B
- Decision: kvn selected B in chat after rendered comparison: Passed until all stars, then Mastered.
- What: applied the reviewed label patch in Path and Progress; clarified the separate individual-sign mastery explanation. No star/mastery/game/scoring/unlock rules changed.
- Branch: agent/codex/learn-small-fixes, second increment after ec7e5f8 (final SHA in git log).
- Gates: lint zero warnings/errors; Vitest 320 passed, 13 skipped; final build 150.19 kB gzip; full Playwright 52 passed on configured port 5197; sync guard 181; diff check clean. New regression proves internal mastered at 14/21 displays Passed, internal passed at 21/21 displays Mastered, and successors still unlock under existing rules.
- Renders: .agent-local/screens/learn-small-fixes/index.html refreshed with final selected-B Path/Progress and 21/21 states at 1280x800, 390x844, 360x800; added before/after explanatory copy. Synthetic progress remains disclosed; screenshots ignored.
- Needs kvn: review/merge the completed branch. No push, merge or deploy. Handoff learn-small-fixes.md updated; r26_port yes. L-25 still waits for L-22b to land.
### 2026-10-16 | codex | L-22b experimental sentence data (early)
- What: copied only 19 K-07 kaggle_sent_*.json files byte-for-byte; regenerated real manifest 501 -> 520 without copying staging manifest. Exact source labels/IDs/files preserved in sentences.ts; optional meanings only from unchanged translations.ts; exported exact experimental label. No unnamed clip or skipped doctor reference added.
- Isolation: normal loader/picker and single-sign recommendation queues exclude sentences; explicit sentence loader shares the edition-filtered index/frame API. Curriculum generator and original single-sign regression contracts retain their corpus; index fills null sentence attribution only from the unique existing matching dataset/source/licence credit, preserving raw JSON bytes.
- Branch: agent/codex/L-22b-sentences, fresh origin/main 34f43cc, rebased cleanly to plan-only b0ce3d4. Explicit chat starts the task on 16 Oct after K-07 instead of 18 Oct; board/tasks/decisions untouched.
- Gates: npm 10 ci, lint 0 warnings/errors; 334 tests passed/5 skipped; Suvana 149.23 kB gzip, standalone R26 148.79 kB, both dist checks 4 HTML assets/2 WASM files; curriculum --check without writes; sync guard 181; diff check. Six-second/151-frame real-excerpt scoreAttempt benchmark local warmed median 7.914 ms, observed p90/max 10.612 ms; CI enforces median <50 ms, hosted branch CI still pending.
- Evidence: 19 identical copied files, 3,267,878 bytes and 2,834 frames; source labels, SHA256s, timings and logs in ignored .agent-local/L-22b/. Handoff: handoffs/L-22b.md; r26_port yes at next milestone. No UI changes/screenshots, scoring changes, invented meanings/translations, video or L-25 work.
- Needs kvn: review/merge/push branch and require hosted CI green; include data/logic in next R26 mirror. L-25's D-A24 priority/go-no-go remains separate. No agent push, merge, deploy or external messages.

### 2026-10-16 15:40 | claude-code (integration prep, light) | integration/2026-10-16b
- What: merged with --no-ff onto main b0ce3d4: learn-small-fixes (no outline on headings focused by the app, keyboard outlines kept; Watch starts zoomed to the hands under 768 px; unit badge option B chosen by kvn in chat with codex: Passed until all stars, then Mastered; camera.spec.ts uses the configured base URL) and L-22b (19 K-07 sentence references, manifest 501 -> 520, sentences excluded from single-sign flows, experimental label constant). Both merged cleanly.
- Gates: Learn npm@10 ci, lint 0 warnings, tests 326 passed + 13 skipped, build ok, main JS 149.25 kB gzip; tools/ci tests 6 passed, brand check, Suvana dist check; sync guard 181; browser suite 52 passed on port 5174 (the camera test no longer needs 5194).
- Checks (light): no protected files, brand names, figures or binaries; sentences.ts holds the dataset labels verbatim and takes meanings only from translations.ts (none added). Spot-checked the phone Watch, Path badge and session-complete renders.
- Needs kvn: adopt from .agent-local/review/2026-10-16b/ (integration worktree); merge and push; check GitHub Actions on main. Next: L-25 (sentence challenge UI) is unblocked for the Learn window under D-A24.

### 2026-10-16 15:30 | kvn (recorded by claude-code) | 16 Oct afternoon approvals; L-22b done
- kvn adopted the three small Learn fixes from the renders in .agent-local/review/2026-10-16b/ (integration worktree): no outline on headings the app focuses (keyboard outlines kept); Watch starts zoomed to the hands on phones; unit badge option B (Passed until all stars, then Mastered). Merged integration/2026-10-16b into main and pushed; hosted CI on 83c01dd passed.
- L-22b done: 19 sentence references in Learn's data, kept out of single-sign flows.
- Next (kvn's messages to codex): L-25 sentence challenge UI in the Learn window under D-A24; the Alerts download part of I-10 in the first window (Recognize URL waits for D-04).
- Board: L-22b done.

### 2026-10-16 | codex | L-25 experimental whole-sentence challenge
- What: appended the final Path challenge, gated by the preceding approved Path units and edition coverage. Lazy nested SentenceView needs no App.tsx routing edit. Catalogue joins the sentence-only index to the 19 existing K-07 IDs/files; raw dataset labels/whitespace and verified-only optional meanings are preserved.
- Flow: whole-reference skeleton Watch at 0.5x, Try with reference, dataset-label Recall with hidden reference and sticky reveal state, capture limit 2x each reference duration, one whole-reference DTW match. SENTENCE_EXPERIMENTAL_LABEL remains visible in all states. Saved attempts always use stage sentence; no sentence stars/sequence/translation or calibrated correctness claim invented. No-hands/cancelled takes stay unscored; camera releases for Watch/results/leaving.
- Branch: agent/codex/L-25-sentences-ui (final SHA in git log), fresh merged origin/main 83c01dd then clean rebase to 7a7f7a0's plan-only approval records. Initial old-main mismatch was resolved after kvn clarified the merge, before edits.
- Gates: npm@10.9.9 ci Learn/screens; final lint 0 warnings/errors; Vitest 330 passed, 13 skipped; build 149.27 kB gzip main JS; full browser suite 62 passed on port 5197; guard 181; brand check 128 tracked files; Suvana dist check 4 HTML assets/2 WASM; diff check clean.
- Renders: .agent-local/screens/L-25/index.html. Before/after locked/open end-of-Path at 1280x800, 390x844, 360x800; supplementary new catalogue/Watch/ready Try/Recall/result states at each size. Real reference skeletons; synthetic unlock histories/camera results disclosed. No page errors/overflow in render evidence; both-theme layout/notice layering checked by browser tests. Artifacts ignored.
- Handoff: handoffs/L-25.md; r26_port yes. Data/translation/curriculum/scoring/learner/hot/config/package files untouched; no source video. Plan correction: explicit chat starts L-25 on 16 Oct rather than the original 19 Oct slot; board/decisions untouched.
- Needs kvn: review/adopt the renders, merge/push and require hosted CI green; later milestone R26 port. No agent push, merge, deploy, purchases or external messages. Sentence matching remains experimental and uncalibrated; physical-device/signer validation is not claimed.
### 2026-10-16 | codex | I-10 Alerts download portion
- What: /alerts/ now links kvn's v1.0.0 Android APK from the hero and installation section, labelled Android only and 267 MB. Replaced dev-build/bundler/pairing flow with phone download/install/microphone steps. Sound awareness is offline after installation; captions retain the device/language-pack caveat. Only alerts/index.html changed in product code.
- Branch: agent/codex/I-10-shell-wiring, refreshed onto merged integration main 83c01dd after kvn's correction, then rebased cleanly to plan-only 7a7f7a0. Explicitly authorized Alerts-only scope early; hosted Recognize URL remains deferred until D-04 on 18 Oct. Full I-10 remains partial; board/tasks/decisions untouched.
- Gates: npm 10 ci; Shell 44 tests passed; type-check/build passed with Vite's >500 kB chunk warning; brand scan 128 files; sync guard 181; diff check. APK HTTP HEAD returned 200, Android package content type, 267194102 bytes; no APK body downloaded or fresh native install test.
- Renders: .agent-local/screens/I-10/index.html, 24 before/after PNGs of hero and actual installation section at desktop 1280x800, phone 390x844, narrow 360x800, light/dark. Six browser combinations per phase: no horizontal overflow/page errors; after asserts exact links/copy and keyboard focus. Visually inspected desktop/phone/narrow samples; existing fixed assistant overlap at a lower 360 scroll position noted in handoff, download buttons unobscured. Evidence ignored/uncommitted.
- Handoff: handoffs/I-10.md; r26_port no; no SSL content/accuracy claims, JS/CSS/config/landing-page changes, deployment, push, merge or messages. Needs kvn: adopt/reject renders, review/merge/push branch and check hosted CI/deployed page; Recognize follow-up after D-04.

### 2026-10-16 17:00 | claude-code (integration prep, light) | integration/2026-10-16c
- What: merged with --no-ff onto main 7a7f7a0: L-25 (experimental whole-sentence challenge as the last Path item: Watch, Try, Recall from the dataset label; experimental label always shown; no sentence stars or translations) and I-10's Alerts part (Download Android APK button, version 1.0.0, 267 MB, with plain install steps; Recognize URL waits for D-04). Both merged cleanly.
- Gates: Learn npm@10 ci, lint 0 warnings, tests 330 passed + 13 skipped, build ok, main JS 149.27 kB gzip; Shell 44 tests + build; tools/ci tests 6 passed, brand check, Suvana dist check; sync guard 182; browser suite 62 passed on port 5174.
- Checks (light): no protected files, brand names, figures or binaries (one "accuracy" word is a test comment saying the self-comparison is not accuracy); new learner text shows dataset labels as written and invents no meaning or order. Spot-checked L-25 list and Recall on phone and the Alerts install section.
- Noticed for kvn: on phones the sticky experimental label covers the "Choose another sentence" button in Recall.
- Needs kvn: adopt from .agent-local/review/2026-10-16c/ (integration worktree); merge, push, check GitHub Actions and the deployed /alerts/ page.

### 2026-10-16 18:10 | kvn (recorded by claude-code) | 16 Oct evening approvals; L-25 done, I-10 in progress
- kvn adopted L-25 (experimental whole-sentence challenge) and I-10's Alerts part (Download Android APK button and install steps) from the renders in .agent-local/review/2026-10-16c/ (integration worktree), and merged integration/2026-10-16c into main.
- L-25 follow-up sent to the Learn window: on phones the sticky experimental label must stop covering the "Choose another sentence" button in Recall.
- I-10 stays in progress: the hosted Recognize URL is wired after D-04 (18 Oct).
- Board: L-25 done; I-10 in-progress.

### 2026-10-16 | codex | L-25 phone notice follow-up
- What: reserved separate Back/experimental-notice rows below the app bar on phones under 768px; sentence content scrolls in its own area above the bottom tabs. The exact SENTENCE_EXPERIMENTAL_LABEL stays fully visible without covering Recall controls. Desktop behavior, SSL content, scoring and capture rules unchanged.
- Branch: agent/codex/L-25-notice-layout, fresh origin/main 82592a3; final fetch unchanged. Explicit kvn follow-up to merged L-25; board/tasks/decisions and hot files untouched.
- Gates: npm@10.9.9 ci Learn/screens; lint zero warnings/errors; Vitest 330 passed, 13 skipped; production build main JS 149.27 kB gzip; full browser suite 64 passed (including two new both-theme phone Recall regressions); sync guard 182; diff check clean.
- Renders: .agent-local/screens/L-25-notice-layout/index.html; paired Recall at 390x844 and 360x800 plus working chooser renders. Notice no longer covers the chooser; all control hit points and pointer/Enter activation verified. Supplemental 1280x800 Recall PNGs byte-identical. No page errors/overflow. Synthetic unlock/camera fixtures disclosed; screenshots ignored.
- Handoff: handoffs/L-25-notice-layout.md; r26_port yes. Needs kvn: adopt/reject renders, merge/push and check hosted CI; later R26 milestone port. No agent push, merge, deploy or external messages.

### 2026-10-16 19:15 | kvn (recorded by claude-code) | L-25 notice layout merged
- kvn merged agent/codex/L-25-notice-layout into main (fast-forward to 75f51ac) and pushed, after adopting its renders: on phones the sentence challenge's experimental label no longer covers "Choose another sentence". Checked by the previous integrator: lint 0, 330 tests + 13 skipped, build 149.27 kB gzip, browser suite 64 passed, sync guard 182.
- Board: no change (follow-up to L-25, which is done).

### 2026-10-16 19:50 | claude-code | R-03 M1 port to R26
- What: ported merged Suvana main 75f51ac into the R26 working tree with `sync.mjs port learn` (78 add / 44 modify / 0 delete in learn-ssl-module/web; package.json unchanged). Started a day early at kvn's request; rehearsed first in a throwaway clone. Nothing committed in R26.
- Branch @ sha: agent/claude/R-03-m1-port (handoff and this entry only); R26 base 761ec32.
- Gates: in learn-ssl-module/web npm@10 ci, 338 tests passed + 5 skipped, oxlint exit 0, build ok (main JS 148.82 kB gzip), no `/learn/` in dist. The test run rewrites calibration-report.md and weight-fit-report.md with the current scorer's figures (L-30); both restored from R26 HEAD so R26 matches Suvana. Refreshing them is kvn's call (L-28).
- Screenshots: .agent-local/screens/R-03/index.html (claude worktree): live site before, R26 build after, landing page, Path and end of Path, desktop and phone; no errors or overflow.
- Needs kvn: commit in R26 with the two blocks in handoffs/R-03.md, push, then D-07 redeploy; afterwards codex records ported sha 75f51ac in upstreams.json.
- Next: R-04 (M2) on 19 Oct.

### 2026-10-16 20:15 | kvn (recorded by claude-code) | R-03 and D-07 done: R26 M1 port live
- kvn committed the R-03 working-tree port in R26 as d0bfd21 ("Learn: port Suvana Learn (M1) from Suvana 75f51ac"), pushed it, and redeployed learn-ssl-module.vercel.app: preview dpl_6zXE9XWDnV3SgRvEeYDqFmmvYDDo, production dpl_Cd3mPjHDgSNjLjRsct6q1NU56ZCs (from d0bfd21). Rollback target: the M0 production deployment dpl_4jdWJTHd3nxH7bFhW793FQDiue5E.
- Suvana sha ported: 75f51ac6907aab963811ae8050ac66e0681b8cd9.
- Checked by claude-code after the redeploy: the site returns 200 and serves the same main bundle as the R-03 build (index-DxNGxcyg.js); /references/kaggle_sent_MAGE_NAMA.json, /references/kaggle_100.json, /wasm/vision_wasm_internal.wasm and /models/hand_landmarker.task return 200; references carry the 1-day cache with revalidation.
- R26 tree: the pre-deploy `npm test` rewrote calibration-report.md and weight-fit-report.md again (the current scorer's figures, L-30); they are not part of the site. Discard them before R-04 so the port's clean-tree check passes.
- Next: codex records ported sha 75f51ac in tools/sync/upstreams.json on its next slot (07 section 5); R-04 (M2) on 19 Oct.
- Board: R-03 and D-07 done.
### 2026-10-16 19:20 | claude-code-thesis | T-04 learner-model worked example
- What: done. New test apps/learn/src/learner/workedExample.test.ts runs one placeholder sign (SIGN-A, not a corpus gloss) through Try 30, Try 50, Try 76, unrevealed Recall 66 and a check 5 days later, using the real mastery.ts, game.ts, nextExercise.ts and startUnitSession; it prints and asserts two tables (EWMA, need, due, stars; next exercise, Path session order, reason). No product code changed. The tables are copied unedited into Thesis\final-source\04-design.md (new folder) as Tables 4.4 and 4.5, with section 4.4.5's learner-model text rewritten to the merged L-13 rules; rubric renumbered 4.6.
- Branch @ sha: agent/claude/T-04-worked-example (final SHA in git log), from origin/main 82592a3.
- Gates: Learn npm ci, lint 0 warnings/errors, tests 331 passed + 13 skipped, build ok (main JS 149.27 kB gzip), tsc ok; sync guard 182.
- Screenshots: n/a.
- Needs kvn: merge the branch. Optional: at the 5-day check the reason reads "review: score dropped" (Recall 66 below Try 76) rather than "not practised for 5 days"; this follows the literal rules and the thesis explains it. Plan correction: 09 section 3 says stars use 60/85; the code uses Try 60/70 and Recall 60 (60/85 is the label scale).
- Next: T-07 commercialisation, T-02 Ch1/4/5 (DN-16, app screenshots in the thesis, is still open: kvn is asked before T-02 relies on it), T-03, L-28.
### 2026-10-16 20:10 | claude-code-thesis | T-07 commercialisation write-up
- What: done (early; board day 19 Oct). New docs/commercialisation.md: open core as a roadmap only (DN-04 (a), DN-15: no prices, no paid offering), licences (360 of 501 single-sign references CC BY-NC-SA; cc0 build is a preview, not a cleared edition; video provenance), privacy (Learn and Alerts on-device; Recognize uploads camera frames to its server), costs with source and date, competitor table re-checked 16 Oct with URLs, and a checklist before any commercial step.
- Branch @ sha: agent/claude/T-07-commercialisation (final SHA in git log), from origin/main 82592a3; independent of T-04.
- Gates: sync guard 182; brand check passed; docs only.
- Screenshots: n/a.
- Needs kvn: merge. Three CHECKs, not blocking: no licence file at the repo root (needed for "open core"); teammates' upstream licences not recorded; Cloudinary plan not recorded. Thesis 7.7 exists, so T-03 updates it from this document.
- Next: T-02 (Ch1/4/5) needs DN-16 (app screenshots in the thesis), which is still open.
### 2026-10-16 21:30 | claude-code-thesis | T-02 Ch1/Ch4/Ch5 draft (early)
- What: partial (drafted early; refresh on 19 Oct after 09:00). Thesis\final-source\01-introduction.md, 04-design.md and 05-implementation.md rewritten from the draft sources for what is merged: learning path (53 units, 490 signs), Watch/Try/Recall, stars/goal/streak, tips and replay, capture change without recalibration, two-hand rule, scenarios with Recall mode, experimental sentence challenge, Suvana deployment, tests/CI, caching; Q-06/Q-08/Q-09/D-09/D-10/I-14 placeholders. Every change marked CHANGED; README.md explains the folder.
- Branch @ sha: agent/claude/T-02-thesis-ch1-4-5 (handoff + LOG only; final SHA in git log), from origin/main 75f51ac.
- Gates: n/a (text outside the repo); self-check: no recognition accuracy, participants or sub-brands; 74.6% only with 65.4%.
- Screenshots: n/a.
- Needs kvn: (1) DN-16 app screenshots, open, needed 19 Oct; (2) the 1.4 claim is narrowed because shipped Learn hides per-finger corrections (D-A15); (3) for Ch6: L-30 moved separation from 74.6% to 75.7% (same 65.4% baseline; AUC not re-measured), so choose which scorer Ch6 reports. Plan corrections in handoffs/T-02.md (09 sections 2 and 3 out of date on finger states, L-30 and star thresholds).
- Next: T-02 refresh 19 Oct; T-03 Ch6/7/8 on 20 Oct after Q-09; L-28 Learn docs on 20 Oct.

### 2026-10-16 21:45 | kvn (recorded by claude-code-thesis) | DN-16 decided: no app screenshots in the thesis
- What: decision. kvn in chat: "DN-16: no app screenshots in the thesis." CC-T removed the screenshot slot comment from Thesis\final-source\04-design.md 4.4.5; no other draft text depended on it.
- Branch @ sha: agent/claude/T-02-thesis-ch1-4-5 (handoff T-02 updated; final SHA in git log).
- Gates: n/a.
- Screenshots: n/a.
- Needs kvn: record DN-16 = no in DECISIONS.md (agents don't edit it). Still open for T-03: which separation figure Ch6 reports (74.6% before L-30, 75.7% after; same 65.4% baseline).
- Next: T-02 refresh 19 Oct; T-03 and L-28 on 20 Oct.

### 2026-10-16 22:10 | claude-code (integration prep, light) | integration/2026-10-16d
- What: merged with --no-ff onto main 61817f6 the thesis lane's three branches: T-04 (learner-model worked example as a test; placeholder signs SIGN-A/B/C, no product code), T-07 (docs/commercialisation.md: open core as a roadmap only, no prices, licences, costs with sources, competitors) and T-02 (handoff + LOG only; thesis text is outside the repo; records kvn's DN-16 = no app screenshots). All merged cleanly.
- Gates: Learn npm@10 ci, lint 0, tests 331 passed + 13 skipped, build ok (main JS 149.27 kB gzip); tools/ci tests 6 passed, brand check 128 files, Suvana dist check; sync guard 182. No UI change, so no browser suite or renders.
- Checks (light): no protected files, sub-brands, secrets or Suvana prices; 74.6% is quoted with its 65.4% baseline and "not the 90% target"; the T-07 per-finger claim was already dropped.
- Correction to handoffs/R-03.md: shipped Learn shows no "Focus on" finger chips (only the dev fixtures page has them; worstFingers is logged, not shown). So Learn's landing line "with corrections down to individual fingers" (Hero.tsx subline) and the "Joint-Level DTW Feedback" card ("feedback down to individual fingers") are not true today, on Suvana and on learn-ssl-module (M1). Shipped feedback is the score, timing (too fast or too slow), hand path and the side-by-side replay. The fix is a copy change in the Learn window (kvn adopts from renders), then a port.
- Noticed: docs/commercialisation.md quotes the old scorer's 74.6%; which figure to report (74.6% before L-30, 75.7% after, same 65.4% baseline) is kvn's open choice for Ch6, and this document should follow it.
- Needs kvn: merge integration/2026-10-16d and push; then the records patch (T-04 and T-07 done, T-02 in progress, DN-16 decided).

### 2026-10-16 22:20 | kvn (recorded by claude-code) | Thesis lane merged; T-04 and T-07 done; DN-16 recorded
- kvn merged integration/2026-10-16d into main: the thesis lane's T-04 worked-example test, T-07 commercialisation write-up and T-02 handoff.
- DN-16 recorded in DECISIONS.md as D-A30: no app screenshots in the final thesis (kvn's answer in chat with the thesis lane, 16 Oct).
- Still open for kvn: which separation figure the thesis and docs report (74.6% before L-30, 75.7% after, same 65.4% baseline); a root licence file for "open core" (T-07 CHECK); the Learn landing page's per-finger claim (copy fix in the Learn window, adopted from renders).
- Board: T-04 and T-07 done; T-02 in-progress (refresh on 19 Oct).

### 2026-10-16 22:45 | kvn (recorded by claude-code) | Finger feedback: L-33 test and pass bar (D-A31)
- Decision (kvn in chat): per-finger feedback is one of Learn's novelties, so instead of dropping it, run one time-boxed test of per-sign, per-finger cut-offs (L-33, Learn window, Phase 1 on 17 Oct, Phase 2 by 18 Oct only after a pass and kvn's go). Pass bar set before the run: at most 20% of correct attempts show a false Wrong, and at least 50% of clearly different fingers are labelled Wrong, on held-out takes (D-A31).
- Context: one global cut-off failed twice (L-17: 14.5% of different-sign fingers flagged at a 5% false-alarm cut-off; L-30: 17.2%), and L-21 removed the old "Focus on" chips, so shipped Learn shows no finger feedback today. Only 23 of the 33 calibration signs have at least 8 takes, so labels could appear on those signs at most.
- Held until the result: the copy fix for the landing page's per-finger lines (Hero.tsx subline and the "Joint-Level DTW Feedback" card), on Suvana and learn-ssl-module.
- kvn sends the L-33 brief to the Learn window.
- Board: L-33 added (codex, 17 Oct, todo).

### 2026-10-16 | codex | L-33 Phase 1 PASS; Phase 2 awaits go
- Branch agent/codex/L-33-finger-cutoffs from fetched origin/main 430e8c7. New opt-in read-only fingerCutoffs.calibration.test.ts; no scorer, score values, runtime labels or UI changes.
- Fixed before results: Wrong p98, Almost p90, nearest rank / strict >; four take-level folds, first training reference per sign/fold. Clear fingers selected only from training cross-sign mean > both signs' own same-sign p95; anatomical fingers only, no authored SSL labels.
- Separation on one signer's recordings, never learner accuracy: 67/506 correct attempts with any Wrong (13.24% <=20%); 8,021/11,353 clearly different fingers caught (70.65% >=50%): preset aggregate PASS. All different-sign fingers Wrong 29,395/72,900 (40.32%); earlier L-17/L-30 sampling differs. 23 eligible signs, all on Path. Only 12 individually <=20% false alarms; aggregate pass is not individual validation.
- JANUARY Kaggle spot check only: no Wrong/Almost on one recording against four fold references; not four independent takes or acceptance evidence. Corpus read in place, before/after hash equal; no corpus or reports written/copied/regenerated. Rules, all denominators, missing-hand exclusions, per-sign rates, fingerprint and reproduction in handoffs/L-33.md.
- Gates: npm 10 ci, lint, 333 tests passed / 14 skipped; build 149.27 kB gzip; sync guard 182 passed. Separate opt-in measurement passed; sandbox temp-rename restriction required approved rerun. No screenshots (Phase 1 only), hot files, push, merge, deploy or messages. r26_port: yes, future R-04 after review/merge.
- Needs kvn: review Phase 1 handoff and explicitly say go in chat before Phase 2. Labels stay hidden pending that decision.

### 2026-10-16 | codex | L-33 Phase 2 ready for rendered UI review
- kvn explicitly said "go" after the Phase 1 pass; continued agent/codex/L-33-finger-cutoffs after 886b877. Added reference-keyed generated p98/p90 cut-offs with corpus/reference/scorer provenance, exact reproduction test and eligibility/missing-data tests. Scores and existing evaluation files unchanged; no corpus or calibration-report writes.
- Result card shows Correct / Almost / Wrong with no finger numbers, only for calibrated reference IDs. Table covers 23 eligible references; default picker shows labels on 22 signs. Kaggle JANUARY, unsupported/local references and missing/invalid hands stay hidden. Full-data final fitting against shipped references is not additional held-out evidence; Phase 1 aggregate pass does not validate every sign individually.
- Hot file touched: PracticeView.tsx only for prop wiring. New ScoreBadge.css avoids views.css/index.css/App.tsx changes. Before/after desktop 1280x800 and phone 390x844: .agent-local/screens/L-33/index.html, real references and explicitly synthetic diagnostic results; no learner/accuracy evidence. One-hand/two-hand/ineligible/other-signer-reference cases checked.
- Final gates: npm 10 ci, lint, 341 tests passed / 15 skipped; build 155.08 kB gzip; guard 182 passed. Separate table verification 9/9; existing production replay browser tests 3/3, including 360px layout. origin/main still 430e8c7. Handoff contains provenance, limits, source boundaries and reproduction.
- Needs kvn: rendered UI adoption, then normal merge/R-04 port (r26_port: yes, 19 Oct). No push, merge, deploy, port or messages performed; planner-owned files untouched.

### 2026-10-16 23:10 | claude-code (integration prep, light) | integration/2026-10-16e
- What: merged with --no-ff onto main 430e8c7: L-33 (Phase 1 held-out per-sign finger cut-off test, PASS against D-A31; Phase 2 after kvn's go: Correct / Almost / Wrong on the result card for the 22 Path signs with fitted cut-offs; other signs unchanged; scores, stars and replay unchanged). Merged cleanly.
- Independent re-run (read-only, corpus in the primary checkout): Phase 1 reproduced exactly: false Wrong on 67/506 correct attempts (13.24%, bar <=20%); 8,021/11,353 clearly different fingers Wrong (70.65%, bar >=50%); all different-sign fingers 40.32%. Shipped-table check against the corpus: 2/2 passed. One signer's recordings, never learner accuracy.
- Gates: Learn npm@10 ci, lint 0, tests 341 passed + 15 skipped, build ok (main JS 155.08 kB gzip, was 149.27; limit 160); tools/ci tests 6 passed, brand check 128 files, Suvana dist check; sync guard 182; browser suite 64 passed on port 5174.
- Checks (light): no protected files, brand names or figures in learner text (headings, finger names, D-A12 labels only); hot file PracticeView.tsx touched for prop wiring only, as declared.
- For kvn's adoption: per-sign false-Wrong rates vary widely (about 5% for HELLO, THANK YOU, HOUSE, GREEN; CHOOSE 4/8); the sign-by-sign mean is 19.5%. Real learners will see more false Wrongs than the signer's own takes. About 1 in 4 correct attempts shows Almost or Wrong somewhere. "Great match" can appear beside a Wrong finger. JANUARY qualifies but shows no labels (the app picks its Kaggle recording).
- Needs kvn: adopt or reject from .agent-local/review/2026-10-16e/ (integration worktree); if adopted, merge and push, then the landing-page wording follow-up and R-04 port.

### 2026-10-16 23:30 | kvn (recorded by claude-code) | L-33 adopted; finger labels back for 22 signs
- kvn adopted L-33 as built from the renders in .agent-local/review/2026-10-16e/ (integration worktree) and merged integration/2026-10-16e into main: Correct / Almost / Wrong per finger on the result card for the 22 Path signs with fitted cut-offs; other signs show no finger labels.
- Evidence (D-A31 bar, held-out takes, one signer, never learner accuracy): false Wrong on 13.24% of correct attempts (bar <=20%; sign-by-sign mean 19.5%); 70.65% of clearly different fingers Wrong (bar >=50%); 40.32% of all different-sign fingers. Reproduced independently by claude-code.
- Demo: use a sign with few false Wrongs (HELLO, THANK YOU, HOUSE or GREEN).
- Follow-ups: the landing-page wording (Hero.tsx subline and the "Joint-Level DTW Feedback" card) to say finger feedback covers signs with enough recordings (Learn window, from renders); docs and thesis that say "no per-finger feedback" (02-learn-vision.md, 09-thesis-final.md, docs/commercialisation.md, thesis Ch1 1.4) are now out of date (thesis lane, T-02 refresh, T-03, L-28); R-04 port on 19 Oct.
- Board: L-33 done.
### 2026-10-17 00:10 | claude-code-thesis | T-07 follow-up: L-33 finger labels
- What: done. docs/commercialisation.md no longer says "do not claim per-finger feedback": it says the 22 Path signs with fitted cut-offs show Correct/Almost/Wrong finger labels (L-33, adopted by kvn 16 Oct), other signs none, wording "finger feedback for signs with enough recordings", figures only under handoffs/L-33.md's rules; and the labels are fitted to yohan_* (NC) references only, so a CC0-only edition has none.
- Branch @ sha: agent/claude/T-07-l33-finger-labels (final SHA in git log), from origin/main 430e8c7; merge with or after integration/2026-10-16e.
- Gates: sync guard 182; brand check passed; docs only.
- Screenshots: n/a.
- Needs kvn: merge after integration/2026-10-16e. Thesis Ch1/4/5 drafts (outside the repo) are flagged and get the L-33 text in the 19 Oct T-02 refresh.
- Next: T-02 refresh 19 Oct; T-03 and L-28 20 Oct.

### 2026-10-17 10:30 | claude-code (integration prep, light) | integration/2026-10-17a; hosted CI fix
- Hosted CI on main failed for f6bc524 and a15c7b0 (16 Oct evening): Learn's fingerCutoffs.generate.test.ts compared the stored scorer fingerprint with one computed on Linux. The stored value (e4e3e37) came from Windows working copies where dtw.ts and landmarks.ts still hold CRLF although git stores LF; hosted CI computed the true value (2024785c). Local Windows gates, including integration/2026-10-16e, could not see this.
- Fix (agent/claude/L-33-ci-eol, outside the board, for kvn to accept or reject): the test hashes the scorer files with LF line endings and the table stores 2024785c. No scorer, cut-off or UI change; the opt-in table check against the corpus regenerates the shipped table exactly (2/2). All 23 reference fingerprints already matched git.
- Also merged with --no-ff onto main a15c7b0: agent/claude/T-07-l33-finger-labels (docs/commercialisation.md describes the L-33 labels; docs only) and agent/codex/L-33-landing-copy at option B (63967f6; option A is c6fd5d0). Hero.tsx only, two strings; no handoff file or LOG entry on that branch (its review notes are in .agent-local).
- Gates: Learn npm@10 ci, lint 0, tests 341 passed + 15 skipped, build ok (main JS 155.11 kB gzip); tools/ci tests 6 passed, brand check 128 files, Suvana dist check; sync guard 182; browser suite 64 passed on port 5174.
- Checks (light): no protected files, figures or brand names; both wording options claim only what ships (score, timing and movement tips, replay, finger labels on some signs); decorative cards untouched (D-A4).
- Noticed: apps/learn/AGENTS.md still says finger states stay hidden (out of date since L-33; for L-28).
- Needs kvn: choose A or B from .agent-local/review/2026-10-17a/ (integration worktree); if A, claude-code switches Hero.tsx to c6fd5d0 with one commit; then merge, push and check that hosted CI is green again.

### 2026-10-17 10:45 | kvn (recorded by claude-code) | Landing wording B adopted; CI fix accepted
- kvn chose option B for Learn's landing page from the renders in .agent-local/review/2026-10-17a/ (integration worktree): "Sign to your camera. Get a score against recordings from real signers, tips on timing and hand movement, and a side-by-side replay. Some signs also show finger labels." (card 03 says the same), and merged integration/2026-10-17a into main.
- Also merged: claude-code's fix for the red hosted CI (L-33 scorer fingerprint taken from CRLF working copies; now line-ending independent) and the thesis lane's T-07 follow-up (docs/commercialisation.md describes the L-33 finger labels).
- Next: confirm hosted CI is green on main; R-04 port on 19 Oct carries L-33, the wording and the fix to R26.
- Board: no change (follow-ups to L-33 and T-07, both done).

### 2026-10-17 22:13 | codex | Shell trailing-slash hotfix
- What: added explicit /learn/ and /communicate/ rewrites before their wildcard rules in apps/shell/vercel.json; exact destinations supplied by kvn. Existing config preserved; optional cleanUrls left unset.
- Branch: agent/codex/shell-trailing-slash, fresh origin/main 5342b436e4d0f4e47d6333ed8ab9f021cafcfbda; final SHA in git log.
- Gates: npm 10.9.9 ci; routing assertions 3 passed; Shell tests 44 passed after sandbox EPERM elevated retry; typecheck/build passed (existing >500 kB chunk warning); brand check 128 files; sync guard 182; diff check clean. Install reported existing Lenis deprecation and one high-severity audit finding; no dependency changes.
- Screenshots: n/a, config-only fix. Product diff is only eight lines in vercel.json; handoff contains the reproducible Node test and production URL checklist. No SSL content or research figures touched; r26_port no.
- Plan correction: kvn directly assigned this unscheduled hotfix and authorized apps/shell/vercel.json today. Board/tasks/decisions untouched.
- Needs kvn: review/merge/push and deployment, then coordinate claude-code to rerun node tools/smoke/smoke.mjs https://suvana-shell.vercel.app and explicitly verify /communicate/ plus existing routes. Extensionless legal-page support is unchanged. Production repair remains unverified locally. No push, merge, deploy or external messages by this agent.
- Handoff: docs/plan/handoffs/shell-trailing-slash.md.

### 2026-10-17 21:30 | kvn (recorded by claude-code) | K-04 and D-03 done: Communicate and the Shell are live
- K-04: kvn created the MongoDB Atlas M0 cluster (Network Access open to Vercel), a Cloudinary account and the secrets, and the Vercel projects suvana-communicate (prj_NUUARnkxBDvw4jVyCAl5QpH1FUqr) and suvana-shell (prj_3itANrMlBkyllH49fw29y6gaw93w) beside suvana-learn, with the env vars in 06-deploy.md section 2 (NEXTAUTH_URL unset; GEMINI_API_KEY and VITE_RECOGNIZE_URL unset for now). Secrets live only in Vercel.
- D-03: Communicate builds with base path /communicate; kvn registered and signed in on its own URL, so the Atlas connection works. No seed was run, so the production database holds no placeholder animations.
- Shell hotfix (no board ID): /learn/ and /communicate/ returned 404 on the Shell because the wildcard rewrites miss the bare trailing slash, which broke the landing page's Learn buttons and Learn's sign-in return link. codex added two explicit rewrites (agent/codex/shell-trailing-slash, checked by claude-code: Shell 44 tests, build, brand check, sync guard 182); kvn merged it; production dpl_2ZFGumVWJMfq1oUQtBDFdWsgDUNJ.
- Smoke (claude-code, tools/smoke/smoke.mjs on https://suvana-shell.vercel.app with the standalone Learn check): 10 passed, 0 failed. Its 4 warnings are /privacy, /terms, /contact and /pricing: the Shell links those pages as *.html, which load (200); clean URLs are optional.
- Next: I-11 (shared sign-in across the Shell, first Codex window); D-04 Recognize on Railway on 18 Oct after Lahiru's OK, then I-10 sets VITE_RECOGNIZE_URL.
- Board: K-04 and D-03 done.

### 2026-10-18 10:30 | kvn (recorded by claude-code) | Sign-in at the homepage, Recognize at /recognize, suvana.help now; Safe Browsing flag
- I-11: kvn's check on 17 Oct passed (signed in at suvana-shell.vercel.app/communicate/login; the session shows on /, /learn/ and /communicate). No code change needed.
- Google Safe Browsing flags suvana-shell.vercel.app; Search Console (verified by kvn) names it "Possible Phishing Detected on User Login" with no sample URLs: Chrome saw a password saved for suvana-communicate.vercel.app (where kvn first registered, as claude-code had instructed) typed into suvana-shell.vercel.app/communicate/login. Cause: our own sign-in page reachable on two of our own hosts. suvana-communicate.vercel.app and suvana-learn.vercel.app have no record; Lithira's site is clean. kvn reported the false positive; the review request waits until sign-in exists on suvana.help only (account task), so the "fixed" answer is true.
- Decisions (kvn in chat): D-A32, sign-in belongs to the homepage (/login and /register); D-A33, Recognize at suvana.help/recognize with the R26-safety rule. kvn bought suvana.help on 18 Oct (Vercel: $1.99 first year, $32.12 renewal), attached it to suvana-shell and verified it in Search Console (no issues), instead of on 20 Oct (K-08).
- Checked by claude-code for R26 safety: sync.mjs can only port Learn to R26; every other component flows R26 -> Suvana only. kvn's R26 commits since Lahiru's last (12 Oct) are the two Learn ports, which touched nothing outside learn-ssl-module/web. Learn's account code is off in R26 (no suvana.config.json).
- Found: the sign-in page and the Shell landing claim emotion detection, but Suvana's speech is speech-to-text only (D-A22, I-09); fixed in the account task.
- Board: I-11 done.
- Next: codex "Suvana account at the front door" (first window); D-04 Railway after Lahiru's OK, then codex "Recognize at /recognize".

### 2026-10-18 03:24 | codex | Suvana account at the front door (D-A32/D-A33)
- What: restarted agent/codex/suvana-account from current origin/main 83a5200, including kvn's decisions. Previous unfinished attempt and report changes preserved in a named Git stash. Root /login and /register now serve Communicate's account forms via two narrow Shell HTML proxies; Auth.js, User, MongoDB and all auth writes remain in Communicate.
- Routing: legacy Shell host gets the authorized path-preserving 308 to suvana.help; old module account URLs redirect to root pages with query intact. Direct Communicate account visits redirect canonical; API/static routes stay outside this gate. Public provider metadata reported the same upstream hostname via both hosts, so no guessed Host/x-forwarded-host classifier is used: Shell supplies an explicit non-secret account-HTML routing marker. Header evidence and limits are in the handoff.
- Account behavior: signed-in visitors skip forms server-side; callbackUrl accepts safe relative paths only, default /. Root anchors avoid Next basePath; sign-in/sign-up retain callbacks. Shell Start Now and signed-out links, Communicate links and Learn SIGN_IN_URL updated. Removed both Shell emotion claims and account-page emotion copy; two wording options rendered, A is review default pending kvn adoption.
- Gates: Communicate lint and /communicate production build passed; callback/origin tests 6 passed; Shell npm10 ci, 52 tests, typecheck/build passed (existing chunk warning); Learn npm10 ci, lint, 350 passed/7 skipped, build 155.11 kB gzip; config-free standalone build 154.64 kB gzip and desktop/phone zero-account-control/link/request checks. Config restored; R26 never edited. Brand check 132 tracked source files; sync guard 212; diff check clean. Existing dependency audit findings recorded; no package/lockfile changes.
- Integration evidence: local production build passed 16 entry/session/API cases, two direct-host root aliases and one static-asset case; both browser return flows passed with mocked Auth.js/registration responses and synthetic inputs. No database or production writes. All Communicate changes declared with Suvana-only reasons and guards.
- Renders: .agent-local/screens/suvana-account/restart-review.html, 22 ignored images: exact-base before forms, A/B root forms, both changed Shell sections before/after at 1280x800 and 390x844, plus standalone Learn. Visually inspected samples; retook scroll-reveal captures. Handoff: docs/plan/handoffs/suvana-account.md; final SHA in git log. r26_port yes (Learn source/tests only, later mirror).
- Needs kvn: choose/adopt wording from renders, review/merge/push, allow deployment, then run the handoff's production host/session/module checks before the Google review request. Hosted routing and flag clearance remain unverified. No push, merge, deploy, external messages or owner-managed plan edits by this agent.

### 2026-10-18 03:53 | codex | Recognize at /recognize (D-A33, D-04)
- Branch: agent/codex/recognize-path, explicitly stacked on unmerged account e3492de; origin/main still 83a5200. Review the incremental diff against e3492de and merge account first. The chat authorizes this exception to the normal UI leaf rule and the two hot files.
- What: exact/slash/nested Shell HTTP rewrites to Railway with a fixed HTML-base render hint; Recognition relative assets and prefixed API/TTS/widget requests; direct socket URL supplied by optional RECOGNIZE_PUBLIC_ORIGIN metadata. Back to Suvana becomes / and the non-gating shared-session account appears only under the prefix. Shell card prefers /recognize/; VITE_RECOGNIZE_URL stays fallback-only.
- Safety: only Suvana's Recognition copy changed; no model, label, preprocessing, frame protocol or R26 operations. New setting unset at root: complete info/labels JSON matches the before container, original own-host socket/home behavior and zero account controls/requests. All changed Recognition files declared with Suvana-only reasons and guards; runbook corrected. Unowned Shell HTML comment/no-JS cleanup proposal is in the handoff, not applied.
- Gates: required recognition pytest 35 passed; new Python tests 7 passed; browser-helper tests 3 passed; Shell npm10 ci, 57 tests, typecheck/build passed (180.55 kB gzip, existing chunk warning); Docker image sha256:5328f519d8f99456cfa3850927248d09242289a0849a2de1f4a8692b21dbcf05 built and both test modes healthy; brand check 134 files; sync guard 228; diff check clean. No package/lockfile changes; existing install audit finding noted in handoff.
- Integration: root, bare prefix and slash prefix at desktop/phone had no page errors or failed local resources; actual local sockets returned frame_result from synthetic color-bar camera input. Canonical Suvana Origin handshake got reset_ack. Signed-in/unavailable account fixtures retain camera use. Not real signing/phone/accuracy evidence. Read-only Railway info currently 200, 171 classes, tf_function; new publicOrigin absent pending owner rollout.
- Renders: .agent-local/screens/recognize-path/index.html, twelve ignored before/after/root/account-fixture PNGs at 1280x800 and 390x844; inspected samples. Existing Shell phone overflow signal appears before and after; no Shell CSS changes. Handoff: docs/plan/handoffs/recognize-path.md; r26_port no; final SHA in git log.
- Needs kvn: adopt renders, merge account then recognize-path; set Railway RECOGNIZE_PUBLIC_ORIGIN=https://suvana-production.up.railway.app; deploy backend and verify publicOrigin first, then Shell. Check suvana.help/recognize, /recognize/api/info (171), one real phone recognition/direct wss socket, optional account return and home link. Hosted readiness remains unverified. No agent push, merge, deploy or messages.

### 2026-10-18 12:30 | claude-code (integration prep, light) | integration/2026-10-18a
- What: merged with --no-ff onto main 83a5200: agent/codex/suvana-account (D-A32: account pages at /login and /register on the homepage through a marked HTML-only Shell proxy; signed-in visitors redirected; safe return paths; suvana-shell.vercel.app redirects to suvana.help; Communicate's own sign-in pages redirect to suvana.help/login; platform-wide wording, options A and B; emotion-detection claims removed) and agent/codex/recognize-path, stacked on it (D-A33: /recognize forwarded to Railway; the WebSocket connects straight to the Railway origin from RECOGNIZE_PUBLIC_ORIGIN; Back to Suvana and the shared account bar). Both merged cleanly.
- Gates: Communicate npm@10 ci, lint, 6 return-path tests, build with base path; Shell 57 tests and build; Learn lint, 342 tests passed + 15 skipped, build 155.11 kB gzip; recognition pytest 42 passed (incl. the two required files) and 3 page tests; tools/ci tests 6 passed; brand check 134 files; Suvana dist check; sync guard 228; browser suite 64 passed on port 5174 (account branch).
- Checks (light): no protected files, model or label files, brand names or figures. R26: Learn's only change is the sign-in link, inert without suvana.config.json (codex's standalone build: no account button, links or requests); Recognize changes stay in services/recognition.
- Recognize vs R26 (sync.mjs status): Suvana's copy matches Lahiru's latest R26 code (ec2604a) apart from declared changes (Suvana page, container, faster tf_function run of the same best_model.h5, extra /api/info fields). Recognition quality is his model's; nothing here changes it.
- Railway (D-04): live at https://suvana-production.up.railway.app in Singapore; /api/info numClasses 171, model best_model.h5; WebSocket answers; about 0.8 GB memory idle. kvn's check: it works, but recognition felt weak (quality is Lahiru's model; no figure measured).
- Needs kvn: choose wording A or B from .agent-local/review/2026-10-18a/ (integration worktree); set RECOGNIZE_PUBLIC_ORIGIN on Railway before merging; merge and push; then claude-code runs the production checklist and kvn submits the Google review. Codex saved its superseded first account attempt in the shared git stash; drop it after the merge.

### 2026-10-18 13:00 | kvn (recorded by claude-code) | Account wording B; Railway setting
- kvn chose wording option B for the account pages from the renders in .agent-local/review/2026-10-18a/ ("Welcome to Suvana." / "Welcome back" / "Join Suvana"). claude-code switched accountCopy to B on integration/2026-10-18a; Communicate lint and build, sync guard 228 and brand check pass.
- claude-code set RECOGNIZE_PUBLIC_ORIGIN=https://suvana-production.up.railway.app on the Railway service at kvn's request (non-secret, no redeploy); the merge's Recognize rebuild picks it up.

### 2026-10-18 13:45 | claude-code | Production checks after integration/2026-10-18a; legacy-host slash fix
- Production (b1a4333; hosted CI green): suvana.help/login and /register serve the option B account pages; /communicate/login, /communicate/register, /api/login and /api/register on suvana.help redirect to the root pages with the return link; on suvana-communicate.vercel.app the sign-in and sign-up pages (and its root /login, /register) redirect to suvana.help while its API and /communicate/_next assets do not; suvana.help /, /learn/, /communicate, /communicate/api/auth/session and /alerts/ load; /recognize and /recognize/api/info answer (numClasses 171). Smoke on https://suvana.help: 11 passed, 0 failed (4 warnings: legal pages are linked as *.html).
- Sign-in now happens only on suvana.help, the cause of Google's flag.
- Gap fixed here (agent/claude/shell-legacy-slash, kvn authorized apps/shell/vercel.json): the legacy-host rule "/:path*" missed "/" and paths ending in "/" on suvana-shell.vercel.app (/, /learn/, /alerts/, /recognize/ still served there). Two more host-conditioned redirects ("/" and "/:path*/"), plus a routing test. Shell 59 tests and build, brand check, sync guard 228.
- Railway did not start a build for the merge (no deployment, none skipped), so Recognize still ran 83a5200 without RECOGNIZE_PUBLIC_ORIGIN; kvn triggers "Deploy Latest Commit". If later pushes also fail to trigger, deploy from the dashboard.

### 2026-10-18 14:15 | kvn (recorded by claude-code) | suvana.help live with one sign-in and /recognize; D-04, K-08, D-09, I-10 done
- kvn adopted the account pages with wording B and Recognize at /recognize from the renders in .agent-local/review/2026-10-18a/ (integration worktree), merged integration/2026-10-18a, then agent/claude/shell-legacy-slash; hosted CI green on 8c1ee98.
- Railway (D-04): Recognize runs at https://suvana-production.up.railway.app in Singapore (asia-southeast1) with RECOGNIZE_PUBLIC_ORIGIN set; /api/info reports numClasses 171 and the public origin. Railway did not auto-build the merge, so kvn used Deploy Latest Commit. Uptime ping not set up: the Railway Hobby service is always on, and claude-code checks /api/info at each integration and on 20-21 Oct (plan correction for kvn to accept).
- K-08 and D-09: kvn bought suvana.help (18 Oct), attached it to suvana-shell, verified it in Google Search Console (no issues); the smoke on https://suvana.help passed 11/11 (4 warnings: legal pages are linked as *.html).
- I-10: the Shell's Recognize card opens /recognize/ (D-A33); the Alerts download part was done on 16 Oct. kvn's phone check: on suvana.help/recognize the top bar showed his name and a sign was recognised.
- Account (D-A32): kvn's check: sign-in started from Learn's account button returned him to Learn. Every suvana-shell.vercel.app address and Communicate's own sign-in pages redirect to suvana.help.
- Google: kvn submitted the Search Console review for suvana-shell.vercel.app ("Possible Phishing Detected on User Login"), now that sign-in exists only on suvana.help.
- Housekeeping: codex's superseded first account attempt is still in the shared git stash (stash@{0}); drop it when convenient.
- Board: D-04, K-08, D-09 and I-10 done.

### 2026-10-18 04:58 | codex | I-14 part 1: Learn deep link ready for review
- What: exact edition-filtered single-sign ?sign= entry opens Practice Watch; encoded spaces supported; invalid/empty/case/sentence/edition-missing values preserve normal startup. No Communicate button or gloss mapping.
- Branch @ sha: agent/codex/I-14-deep-link (final SHA in git log), from origin/main 4d52d987e966503c3cf133103e183d1985442647; origin re-fetched unchanged before commit.
- Gates: npm 10 ci; lint 0 warnings; 354 tests passed / 15 skipped; build 155.21 kB gzip; test typecheck passed; sync guard 228; full browser suite 67/67. No-config R26 full/CC0 builds passed (154.75/154.77 kB), same browser tests 3/3 at /, four actual edition cases passed with no account UI/requests; standalone JS has no account routes/code.
- Screenshots: .agent-local/screens/I-14/index.html, before/after desktop 1280x800 and phone 390x844 for BAG EKA and unknown; actual references, existing guide closed, no synthetic attempts. Desktop unknown is byte-identical.
- Overlap: local 35-token Communicate seed/notebook lists agree; exact intersections are 23 of 490 Learn glosses in full and 0 of 141 in CC0. Source-list measurement only; actual I-13 imported animation overlap is not measurable yet. Lists and method in handoffs/I-14.md.
- Plan correction: kvn authorized part 1 today, App.tsx ownership and this supplied worktree in chat; old schedule/full-task scope predates that instruction. Part 2 waits for I-13; planner records untouched.
- Needs kvn: review rendered startup change for adoption and normal branch review/merge; r26_port yes after merge. No push, merge, deploy, actual R26 port or messages performed.
### 2026-10-18 | codex | Q-05 demo runbook and live assistant check
- What: DEMO.md now has a 12-minute script, 18 Oct canonical routes/hosting, honest claims, Learn profile/reset preparation, device plan, local/offline/tunnel/hotspot/rollback/Chrome-warning fallbacks and rehearsal checklist. Docs only; r26_port no.
- Branch: agent/codex/Q-05-demo, fresh origin/main 4d52d987e966503c3cf133103e183d1985442647; final SHA in git log.
- Gates: sync guard 228/228; documentation assertions passed (11 continuous timed steps = 720 seconds, four local links, exact prompts/results and paired thesis figures); whitespace/scope review. No runtime tests/builds or full device/fallback rehearsal claimed.
- Live: signed-out suvana.help assistant answered literal “how do I sign X”, “translate Y to SSL”, “describe the handshape for Z” with dataset-letter cards and unsupported guidance; 0/3 refusals, FAIL. Actual replies recorded as failure evidence in DEMO.md section 7; assistant excluded as a live SSL teacher. Homepage also visibly contains recognition accuracy and testimonial claims contrary to plan evidence limits; recorded for separate correction, no UI changed.
- Plan correction: kvn assigned Q-05 early (board says 20 Oct) and explicitly authorized hot file DEMO.md on 18 Oct; supplied live routes, Railway Singapore and Safe Browsing review status supersede stale plan/runbook statements. No BOARD/tasks/DECISIONS edits.
- Screenshots: n/a (docs-only task, board no); browser accessibility output is live assistant evidence, not real-signing or learner evidence.
- Needs kvn: review/merge/push; obtain/fill TODO(Lahiru) confirmed signs, rehearse laptop/Android and fallbacks, verify rollback targets/account/warning state, and assign assistant/homepage corrections separately. No guessed signs, invented SSL instructions or research results. No push, merge, deploy, rollback or external messages by agent.
- Handoff: docs/plan/handoffs/Q-05.md.

### 2026-10-18 21:00 | claude-code (integration prep, light) | integration/2026-10-18b
- What: merged with --no-ff onto main 4d52d98: I-14 part 1 (Learn opens ?sign=GLOSS in Practice Watch when GLOSS exactly matches an edition-filtered single-sign gloss; works in the R26 form with no account code; tracked-list overlap with Communicate 23 words, imported dictionary not measurable yet) and Q-05 (DEMO.md: timed script on suvana.help, say-up-front list, fallbacks, demo profile; Recognize sign list TODO(Lahiru)). Both merged cleanly.
- Gates: Learn npm@10 ci, lint 0, tests 354 passed + 15 skipped, build ok (main JS 155.21 kB gzip); tools/ci 6 passed; brand check 134 files; Suvana dist check; sync guard 228; browser suite 67 passed on port 5174.
- Q-05 found on the live site (not fixed here): the homepage assistant answered "how do I sign X", "translate Y to SSL" and "describe the handshape for Z" with built-in category tips that describe how SSL signs are formed (apps/shell/src/assistant/kb.ts CATEGORY_TIPS; the same tips are in services/recognition/webapp/assistant.py), 0/3 refusals, against hard rule 2. The homepage (apps/shell/index.html) shows "98.8% Sequence test accuracy", "98% Sequence Accuracy" and two named testimonials, against hard rule 3. All present since the 30 Aug sync (1968cf2).
- Needs kvn: adopt I-14 from .agent-local/review/2026-10-18b/ and merge; send codex the content-safety fix (assistant tips and refusals, homepage figures, testimonials per kvn's decision).

### 2026-10-18 10:20 | codex | Content safety ready for rendered review
- Branch: agent/codex/content-safety from origin/main 76a31f246ea4fb39a37800f3aae79f07c5af5870 (integration/2026-10-18b already included; re-fetched unchanged); final SHA in git log.
- What: removed unverified category signing guidance from both assistants; camera-only cards, deterministic English/Sinhala request refusal before retrieval/cloud calls, clickable exact Learn-gloss recording links with generic fallback. Shared 490-gloss list is reproduced from existing single-sign metadata, without mappings or new SSL content. Model prompts match the rule; Recognition changes declared/guarded as Suvana-only.
- Homepage: only the two requested accuracy claims changed, to the verified 171-label count. Testimonial markup remains identical to base; DEMO records real quotes collected by Lahiru, kept by kvn's decision, never study results. DEMO section 7 replaces unsafe quote with local retest evidence and a one-line removal reason.
- Gates: Shell npm10 ci, 79 tests, typecheck/build (main 180.55 kB gzip; existing size advisory); Recognition required pytest plus new tests 63 passed, existing browser-path helper 3 passed; sync guard 233; brand check 137 sources; metadata reproduction and removed-phrase grep pass; model/label Git blobs unchanged; diff check clean.
- Retest: all 4 requested prompts refuse on both actual local browser widgets (8/8); exact HELLO/BAG EKA links also pass (4/4). No provider/model calls, live key, credentials, camera, production changes or SSL-correctness/accuracy claim. Finite local checks only; raw evidence .agent-local/content-safety/retest.json.
- Renders: .agent-local/screens/content-safety/index.html, 16 inspected before/after desktop 1280x800 and phone 390x844 images for stats/spec and each hello reply. Existing phone loader/hero pointer interception required keyboard activation in both captures; no CSS change.
- Plan correction: directly assigned by kvn with hot-file/DEMO authorization; planner records untouched. Handoff: docs/plan/handoffs/content-safety.md. r26_port no; R26/model/labels untouched. No push, merge, deploy or messages.
- Needs kvn: rendered adoption and branch review/merge, then deploy Shell and Recognition and rerun the four prompts on both hosted surfaces; local pass is not deployment acceptance.

### 2026-10-18 23:30 | claude-code (integration prep, light) | integration/2026-10-18c
- What: merged with --no-ff onto main 76a31f2: agent/codex/content-safety (both assistants refuse to describe how signs are made or translate into SSL and link the exact Learn sign via ?sign=; CATEGORY_TIPS removed from apps/shell/src/assistant/kb.ts and services/recognition/webapp/assistant.py; generated list of Learn's 490 single-sign glosses for exact links; homepage "98.8% Sequence test accuracy" and "98% Sequence Accuracy" replaced by Recognize's label count 171; testimonials untouched by kvn's decision, 18 Oct: real quotes collected by Lahiru; DEMO.md section 7 records the local retest, 8/8 refusals).
- Gates: Shell npm@10 ci, 79 tests, build; gloss list --check 490; recognition pytest 63 passed (with the pinned fastapi/pydantic from requirements-runtime.txt) and 3 page tests; brand check 137 files; sync guard 233. Removed tip phrases: no tracked source matches outside LOG/handoffs.
- Checks (light): no model, label or protected files; Lahiru's assistant.py change declared Suvana-only with guards; R26 untouched.
- Noticed for kvn: the stats row now shows 171 twice; the homepage Learn card still says "corrections down to individual fingers" (finger labels cover 22 signs).
- Needs kvn: adopt from .agent-local/review/2026-10-18c/ (integration worktree); merge and push; then the hosted retest of the assistant prompts on suvana.help.

### 2026-10-18 | kvn (recorded by claude-code) | Content safety live; testimonials kept (D-A34); Q-05 done, I-14 part 1 merged
- kvn adopted and merged integration/2026-10-18b (I-14 part 1 deep link, Q-05 DEMO.md) and integration/2026-10-18c (content safety). D-A34: the three homepage testimonials stay; they are real quotes collected by Lahiru.
- Live retest by claude-code on https://suvana.help (homepage assistant, browser, signed out, 18 Oct): 'how do I sign X', 'translate Y to SSL', 'describe the handshape for Z' and 'how do I sign hello' all returned "Suvana does not describe how signs are made and does not translate into SSL. Use Learn to watch the reference recording instead." (4/4 refusals); links go to /learn/?sign=X, ?sign=Y, ?sign=Z and /learn/ (lowercase "hello" is not an exact gloss). The homepage no longer shows 98.8% or 98%.
- Railway again did not rebuild after the merge (the pushed head commit changes only LOG.md, so the watch path appears to skip it). kvn chose manual deploys: watch paths stay, claude-code flags when a click is needed after any merge that changes services/recognition, and claude-code added a health check (/api/info, 300 s) so a new copy only takes over once the model answers. kvn deployed 06c653e; the fixed Recognize assistant was live about 40 s later (/api/info still numClasses 171 with publicOrigin).
- Live retest of the Recognize assistant on https://suvana.help/recognize/ (browser, signed out, 18 Oct): the same four prompts returned the same refusal (4/4) with the same Learn links.
- Board: Q-05 done (Recognize sign list stays TODO(Lahiru) in DEMO.md); I-14 in-progress (part 2, 'Practise in Learn' in Communicate, waits for I-13).

### 2026-10-18 | kvn (recorded by claude-code) | Thesis separation figure (D-A35); assistant usefulness; Q-06 briefed
- D-A35 (kvn in chat): the thesis reports 75.7% separation for the current scorer with the 65.4% baseline, and one sentence that the draft's 74.6% came from the earlier scorer. The thesis lane was told (T-02 refresh, T-03 Ch6, L-28); AUC for the current scorer stays out or TODO(AUC) until codex re-measures it (agent/codex/auc-remeasure; the earlier scorer must reproduce 74.6% and 0.744 first).
- kvn's feedback: the content-safety fix made the assistant unhelpful ("how do I sign" now returns only a refusal and a link). claude-code's live test: it still answers meanings and browsing, but matches "is hello a sign" to A and "why is my sign not recognised" to an unrelated phrase, and knows only Recognize's 171 labels. codex task agent/codex/assistant-useful: helpful answers from verified facts (Learn's 490 signs with verified meanings, Recognize's labels, Suvana's own rules), still never describing a sign's form or translating.
- Q-06 (kvn's device check) briefed: permission deny/retry, full Watch/Try/Recall, app switch, rotation, slow network, camera unplug, sign-in, one recognition, Alerts download, on iPhone Safari, Android Chrome and the laptop; claude-code writes handoffs/Q-06.md from kvn's notes.

### 2026-10-18 | codex | D-A35 ROC AUC remeasurement
- What: added opt-in console-only auc.calibration.test.ts, disabled unless AUC_CALIBRATE=1; identical calibration.test.ts pair construction and normalizedDistance, exact Mann-Whitney AUC with half-credit ties. No product/scorer/report/corpus changes.
- Branch: agent/codex/auc-remeasure, fresh origin/main d0e81652f1926401076e071fba50c8308c25966f (required decision included); final SHA in git log. Directly assigned by kvn; owner-managed plan files untouched.
- Earlier scorer 8c98520^ = 39b69aba5a26fb90d68dd6a20148cd9ac5d556ef: 74.6042216358839% separation against 65.4353562005277% majority baseline; AUC 0.7438785089879341 (0.744). Historical reproduction passed before current measurement.
- Current scorer at d0e8165: 75.65963060686016% separation against 65.4353562005277% majority baseline; AUC 0.7579394699581384 (0.758). Same 1,516 pairs (524 same-sign, 992 different-sign), 557 takes / 33 signs; no non-finite exclusions. Separation on one signer's recordings, never learner accuracy; no improvement claim.
- Corpus: read primary calibration folder in place, hash before/after both runs bad16fe51e84c31852e4e78ca1230e3a18e8460b4813a2f3886bfb5de7f87265 (sorted filename + NUL + bytes, L-30 convention). Earlier module/dependencies copied byte-for-byte from Git to ignored .agent-local only. All three report hashes unchanged; no report regenerated/restored.
- Gates: npm10.9.9 ci, lint no warnings; routine suite 360 passed/10 skipped (new opt-in AUC skipped; two existing report writers explicitly skipped to honor no-write boundary, remaining calibration assertions ran); build 155.21 kB gzip; sync guard 233; two separate AUC runs 1/1 each. Sandbox Vitest EPERM occurred before tests; approved normal-environment retry passed. Whitespace/scope/append-only checks before commit.
- Screenshots: n/a (no UI); SSL content none; r26_port yes (one inert test only). No push, merge, deploy, report/thesis edits or messages.
- Needs kvn: review/merge/push and let thesis lane use AUC 0.758 with 75.7% separation / 65.4% baseline and one-signer limitation. Handoff: docs/plan/handoffs/auc-remeasure.md, exact rows/provenance/reproduction commands and gate limitations.
### 2026-10-18 | claude-code-thesis | T-07 follow-up: separation per D-A35
- What: done. docs/commercialisation.md now reports 75.7% separation for the current scorer (after L-30) with its 65.4% majority-class baseline on 1,516 pairs (524 same-sign, 992 different-sign) from one signer, one sentence that the draft's 74.6% came from the earlier scorer, and TODO(AUC) for the current scorer (0.744 is the earlier scorer's). Not accuracy, not an improvement claim.
- Branch @ sha: agent/claude/T-07-separation-d-a35 (final SHA in git log), from origin/main 68d12f0.
- Gates: sync guard; brand check passed; docs only.
- Screenshots: n/a.
- Needs kvn: merge; record D-A35 in DECISIONS.md if not already done. TODO(AUC) is replaced once agent/codex/auc-remeasure merges.
- Next: T-02 refresh 19 Oct applies D-A35 and L-33 to the thesis drafts; T-03 and L-28 on 20 Oct.
### 2026-10-18 11:31 | codex | Homepage copy follow-up ready for review
- Branch: agent/codex/homepage-copy from origin/main 68d12f0bf4386d461ef711982b6652001dee6a46; re-fetched unchanged before commit; final SHA in git log.
- What: removed only the duplicate Recognize labels stat tile; remaining stat markup unchanged. Replaced the exact quoted overview Learn-card paragraph with the full supplied option B copy, including Some signs also show finger labels. Existing auto-fit handles four tiles; no CSS change. Removed the obsolete existing test assertion requiring the deleted tile; actual spec-count test remains.
- Inventory only: second Learn module description (index.html 257-259), Corrections feature paragraph (335-337), and Nadeesha Perera testimonial's qualitative accuracy/reliability wording (438). Other first-party claims and all testimonials remain unchanged; src/alerts contain no additional positive per-finger/accuracy claim. Details and lexical non-claims in handoffs/homepage-copy.md.
- Gates: Shell 79 tests in 6 files, typecheck/build (main 180.55 kB gzip; existing size advisory), brand check 137 files, sync guard 233, diff check and exact HTML-only-transformation/preservation check passed. No new dependency, runtime logic, source content or accuracy figure.
- Renders: .agent-local/screens/homepage-copy/index.html; 12 inspected before/after screenshots at desktop 1280x800 and phone 390x844 for overview cards, stats and the unchanged second Learn module card. Exact paragraph/four-tile assertions pass in both viewports. Testimonial region hash unchanged.
- Plan correction: kvn directly assigned the hot-file exception; planner-owned records untouched. r26_port no. No push, merge, deploy, messages, R26 or upstream/model/label changes.
- Needs kvn: adopt from renders and normal branch review/merge; any change to the other inventoried claims needs a separate instruction.
### 2026-10-18 | codex | assistant-useful (kvn direction)
- Branch: agent/codex/assistant-useful from origin/main 68d12f0bf4386d461ef711982b6652001dee6a46. Ready for branch/render review, not adopted or deployed.
- What: both assistants now answer from one generated source-backed union (490 Learn glosses, 171 Recognize labels, 131 equal names ignoring case, 530 records). Helpful teaching answers link the exact recording and explain practice controls; troubleshooting selects practical app advice before lookup. Meanings, membership, categories and curriculum order keep their source provenance; missing English in Lahiru's JSON stays unknown. No invented gloss mapping, signing form, SSL translation or word order.
- Safety: shared intent policy and phrase checks; useful platform/rule/Alerts/account/privacy answers; no repeated camera tips on cards. Optional models accept only the approved local wording and cannot add facts. Local stays default. Recognize changes and guards are declared Suvana-only; no inference/model/label/account code changes or R26 port.
- Gates: Shell 116 tests plus typecheck/build pass (existing main size advisory); recognition pytest 111 pass; existing standalone transport/account tests 3 pass; generated knowledge and compatibility generator --check pass; sync guard 240; brand check and diff check pass. 65 fixed questions have complete JS/Python payload parity, and 65 actual local Recognize HTTP replies pass; /api/info remains 171 labels, 30 frames and 0.7 threshold. No real provider/key/camera or hosted test.
- Renders: 48 inspected before/after PNGs at 1280x800 and 390x844, six representative replies on homepage and Recognize; .agent-local/screens/assistant-useful/index.html. Raw HTTP evidence: .agent-local/assistant-useful/local-retest.json. Screens and local tooling are uncommitted.
- Plan correction: direct assignment and tools/sync/upstreams.json authorization supersede the earlier blanket teaching refusal; BOARD/tasks/DECISIONS unchanged. Source limitation and exact checks are in docs/plan/handoffs/assistant-useful.md. r26_port: no. No push, merge, deploy or messages.
- Needs kvn: review rendered UI and branch, adopt/merge/deploy, then hosted retest. Flag the existing manual Railway deploy step after merge; local verification is not deployment acceptance.

### 2026-10-18 | kvn (recorded by claude-code) | integration/2026-10-18d: AUC 0.758, homepage copy, useful assistant, T-07 follow-up
- kvn adopted from renders (.agent-local/review/2026-10-18d/ in the integration worktree) and merged integration/2026-10-18d: agent/codex/auc-remeasure, agent/claude/T-07-separation-d-a35, agent/codex/homepage-copy and agent/codex/assistant-useful.
- AUC: the earlier scorer reproduced 74.6% and ROC AUC 0.744 first; the current scorer then measured 75.7% separation (65.4% baseline) and ROC AUC 0.758 on the same 1,516 pairs from one signer. D-A35 now carries 0.758. The thesis lane replaces TODO(AUC) in docs/commercialisation.md and the thesis drafts in the T-02 refresh.
- Homepage: the duplicate 171 tile is gone; the overview Learn card reads option B ("Some signs also show finger labels"). Two other homepage lines still say feedback goes down to individual fingers (the Modules Learn card and the pipeline item); codex brief given to kvn.
- Assistant: both assistants answer from one generated index (490 Learn signs, 171 Recognize labels, 530 records) with practice steps, exact Learn links, meanings from Learn's translations, browsing, troubleshooting and Learn's rules; describing how a sign is made and translating into SSL are still refused. claude-code's unscripted check: 10 of 18 new questions answered well; 8 hit "I cannot find that name" (for example 'teach me numbers', 'how do I use recognize', 'can I use this on my phone'). Second round briefed to codex.
- Sinhala labels (D-A36): 68 assistant cards show a Sinhala spelling from Recognize's labels next to Learn's English meaning. kvn checked them and supplied 13 corrected spellings: 100 meters: මීටර් 100; 50 meters: මීටර් 50; ambaranawa: අඹරනවා; andanawa: අඬනවා; bag eka: බෑග් එක; nurse: හෙදිය/නර්ස්; peenawa: පේනවා; phone eka: ෆෝන් එක; pigana hodanawa: පිඟාන හෝදනවා; randu karagannawa: රණ්ඩු කරනවා; waadi wenawa: වාඩි වෙනවා; wamaata harenna: වමට හැරෙන්න; wamata U turn eken harenna: වමට යූ ටර්න් එකෙන් හැරෙන්න. Recognize shows and speaks the same misspelled words after recognising these signs. codex applies kvn's spellings as a Suvana-only correction layer (both assistants, Recognize's on-screen word and its speech) in assistant round 2; sinhala_labels.json and labels.npy stay untouched; R26 keeps Lahiru's spellings, and kvn tells Lahiru.
- Integration: one conflict in apps/shell/src/assistant/signingSafety.test.ts, resolved by keeping the assistant branch's tests and the homepage branch's label-count check. Gates: Learn lint 0, tests 354 passed + 16 skipped, build 155.21 kB gzip; Shell 117 tests and build; Recognize pytest 111 passed; platform test passed; tools/ci 6; brand check; Learn dist; knowledge and gloss index --check; sync guard 240; diff check clean.
- Correction: the two claude-code entries above, D-A35 and codex's assistant-useful heading were dated 19 Oct; the true date is 18 Oct (commits 68d12f0 and d0e8165). Fixed in this commit.
- Branches: seven merged local branches deleted at kvn's request (T-02-thesis-ch1-4-5, T-07-l33-finger-labels, I-10-shell-wiring, L-25-notice-layout, L-25-sentences-ui, Q-05-demo, content-safety); origin had only main.
- Needs: Railway "Deploy Latest Commit" (services/recognition changed); claude-code then retests both assistants live.

### 2026-10-18 | codex | Homepage finger wording, part 2
- What: exactly two supplied replacements in apps/shell/index.html: Modules Learn paragraph and “Corrections, not just a score” paragraph now qualify finger labels with “Some signs”. No CSS/layout-rule, runtime, other copy, test or dependency changes; testimonials unchanged (D-A34).
- Branch: agent/codex/homepage-fingers from origin/main 874196f203c5f8e139072c89d685570a36bb7777; integration/2026-10-18d verified merged first. Plan correction: kvn directly assigned this follow-up and explicitly authorized index.html for these two passages only. Owner-managed plan files untouched.
- Gates: Shell baseline/final 117 tests each, typecheck/build passed (main 180.55 kB gzip; unchanged >500 kB advisory); brand check 140; sync guard 240; diff check; whole-file byte-preservation after only CRLF-to-LF normalization and exactly two supplied replacements. Testimonial section hash unchanged: 6de6976e1a82863a4363e15ba0fb3128464f08ef69ce3cceffd188e560f24946.
- Renders: .agent-local/screens/homepage-fingers/index.html; eight inspected actual production before/after PNGs of both passages at 1280x800 and 390x844, complete target paragraphs visible, no CSS/content fixtures. Phone Chromium emulation only. Preview restarted outside sandbox after initial browser reachability timeout; no product workaround.
- Needs kvn: rendered adoption and normal branch review/merge/push/deploy. No push, merge, deploy or external messages by agent. r26_port no; SSL content/research figures untouched.
- Handoff: docs/plan/handoffs/homepage-fingers.md; preservation script and evidence ignored under .agent-local/homepage-fingers/.
### 2026-10-18 | codex | assistant-useful-2
- Branch: agent/codex/assistant-useful-2; started from origin/main 874196f after integration/2026-10-18d, updated to 117539a when the fresh-checkout knowledge fix landed. Its reference-index rebuild and LF handling are preserved; generated-data conflicts were regenerated. Ready for branch/render review, not adopted or deployed.
- What: category and exact approved-unit requests precede teach/lookup; missing meanings are omitted; unknown requests retain real suggestions plus Starter/month/letter/number actions. New practice, Recognize-use, phone and Starter help cite their app-page/code sources in policy. Reverse English lookup uses only exact verified Learn meanings; no invented amma/mother/water mapping. All original 65 questions remain alongside the supplied 18, with full TS/Python payload parity. Optional-model rules and form/SSL/order refusals remain.
- D-A36: exactly kvn's 13 spellings overlay display and speech, including nurse speakText හෙදිය. Server recognition/labels/speech, warm-up, offline TTS builder, both assistants and Shell signs.json share the correction layer. Cache identity hashes label/language/spoken text, preventing stale spelling audio. New source, loader, Docker packaging, couplings and tests are declared/guarded Suvana-only.
- Protection: original Sinhala JSON and labels.npy Git bytes match origin/main; raw JSON bytes also match the before snapshot (existing Windows CRLF preserved). No other label fields/order change. No homepage index.html, Learn source, model, inference, account or R26 edits. r26_port: no.
- Gates: Shell 138 tests plus typecheck/build pass (existing main-size advisory); recognition pytest 137 pass; existing standalone platform JS tests 3 pass; knowledge --check, sync guard 249, brand and diff checks pass. Real local service retest: 83 question replies, 171 display rows and 13 corrected cache routes pass; /api/info unchanged at 171/30/.7. Cache-route bytes are explicitly synthetic transport fixtures, not speech quality or accuracy evidence; no real TTS/model-provider calls or camera session.
- Renders: 64 reviewed before/after PNGs, 1280x800 and 390x844, six reported dead ends plus ANDANAWA and WAADI WENAWA on homepage and Recognize. Contact sheet: .agent-local/screens/assistant-useful-2/index.html. Raw local evidence: .agent-local/assistant-useful-2/local-retest.json. Uncommitted local artifacts.
- Plan correction: direct assignment and tools/sync/upstreams.json authorization; planner-owned records unchanged. Handoff: docs/plan/handoffs/assistant-useful-2.md. Needs kvn's rendered adoption/branch review, merge/deploy and hosted retest; flag the existing manual Railway deploy step after merge. No push, merge, deploy or messages.

### 2026-10-18 | kvn (recorded by claude-code) | integration/2026-10-18e: homepage finger wording, assistant round 2, Sinhala spellings; no AI key (D-A37)
- CI: hosted CI on main went red after the 18d merge. The Shell test's knowledge check needed Learn's gitignored reference index, and its source hashes were taken from Windows CRLF copies. claude-code's agent/claude/ci-knowledge-check (117539a) rebuilds the index first and hashes sources as git stores them; kvn merged it and CI is green.
- Live retest after 18d (browser and API, signed out): the homepage assistant gives practice steps and /learn/?sign=HELLO for 'how do I sign hello' and still refuses 'describe the handshape for A'; the Recognize assistant answered 5/5 test prompts as expected on the new Railway build (171 labels, 30 frames, 0.7).
- kvn adopted from renders (.agent-local/review/2026-10-18e/ in the integration worktree) and merged integration/2026-10-18e: agent/codex/homepage-fingers (no homepage line says "down to individual fingers" any more) and agent/codex/assistant-useful-2 (category and unit requests first, help for practice, Recognize and phone use, no dead ends; D-A36's 13 spellings in both assistants, Recognize's recognised word and its speech, through webapp/data/sinhala-corrections.json; sinhala_labels.json and labels.npy untouched).
- claude-code's unscripted check: 23 of 26 questions answered well. Three slips go into the next codex brief: 'sign for mother' says no match and then suggests MOTHER, bare 'help' opens the HELP sign, and 'how do i learn sign language' opens the SIGN LANGUAGE sign.
- D-A37 (kvn in chat): no AI provider key; the assistants run on the verified index only, and the gear settings are removed (codex brief given). privacy.html's Gemini section is corrected in the same task.
- Gates: Shell 138 tests and build; Recognize pytest 137 passed; platform test 3; tools/ci 6; brand check; knowledge --check, also on a clean CI-style copy; sync guard 249; diff check clean.
- Branches: deleted after merge: agent/codex/auc-remeasure, agent/codex/homepage-copy, agent/codex/assistant-useful, integration/2026-10-18d and agent/claude/ci-knowledge-check.
- Needs: Railway "Deploy Latest Commit" (services/recognition changed); claude-code then retests both assistants and a corrected word live.

### 2026-10-18 | codex | assistant-no-key (D-A37): verified index only and routing fixes
- Branch: agent/codex/assistant-no-key from origin/main 7a769ce, after integration/2026-10-18e merged. Status: review; r26_port: no.
- Removed both assistant key-setting gears/panes/styles. Homepage uses only its browser engine, with no provider client or /api/assistant traffic. On load, both widgets delete their exact legacy credential/preferences entries; other site data remains. Recognize sends only message/history, retaining clear conversation and Verified index. Its independent page-level overlay/model settings gear remains unchanged and tested.
- Shared routing: exact named Learn gloss before meaning reverse lookup (MOTHER/EAT); help/help me return help; the exact Learn-sign-language question returns the practice guide. Named HELP/SIGN LANGUAGE remain available. Privacy page and shared reply accurately describe browser/server index answers and no AI-provider question traffic.
- Safety, strict grounding, D-A36 spellings, original label bytes, server endpoints, hosting config, inference/model and homepage index.html remain unchanged. Recognize couplings are Suvana-only with four new guards. No new dependency or R26 edits.
- Gates: npm ci; Shell 153 tests/typecheck/build; Recognize pytest 151; platform JS 3; complete TS/Python parity for 97 questions; actual local HTTP 97/97; browser 44 replies across both viewports/widgets (also rerun against the production Shell build), storage cleanup/disabled-storage boot and no provider requests; knowledge --check; sync guard 253; brand and diff checks pass. Existing main bundle-size advisory and dependency audit issue recorded in handoff; no scoped dependency changes. No external provider/TTS calls or real camera session.
- Renders: 12 reviewed before/after PNGs, desktop 1280x800 and phone 390x844, both open assistant headers and changed privacy section. Contact sheet: .agent-local/screens/assistant-no-key/index.html. Handoff: docs/plan/handoffs/assistant-no-key.md. Artifacts remain local/uncommitted.
- Plan correction: directly assigned by kvn, sync manifest and privacy hot files authorized; planner-owned records untouched. Needs kvn's rendered adoption/branch review, then his merge/deploy and hosted retest; existing Railway Deploy Latest Commit remains manual. No push, merge, deploy or messages.

### 2026-10-18 | kvn (recorded by claude-code) | 18e live; Q-06 done; integration/2026-10-18f (no AI key, Back fix); R-04 ported
- 18e live retest by claude-code (signed out, after kvn's Railway deploy): CI green on main; Recognize shows kvn's spellings (andanawa අඬනවා, nurse හෙදිය/නර්ස්; uncorrected labels unchanged) and /api/speak returns audio for them; the Recognize assistant answered 7/7 test prompts as expected; the homepage assistant browses numbers and shows අඬනවා; the homepage has no per-finger claim and no duplicate tile. kvn listened on Recognize: fine.
- Q-06 (kvn): the device check passed except one failure: browser Back to the homepage (from Learn, Communicate, login, sign-up, Recognize, Alerts) showed a white screen. Cause: the homepage's exit sweep covers the page before navigating and the back/forward cache restored it still covered. Fix agent/claude/shell-back-button (110de73): uncover on a restored pageshow. Handoff: handoffs/Q-06.md.
- kvn adopted from renders and merged integration/2026-10-18f: agent/codex/assistant-no-key (D-A37: no gear or key settings on either assistant, old saved keys cleared, no homepage calls to /api/assistant, privacy.html and the privacy answer say no question goes to an AI provider; 'sign for mother' opens MOTHER, bare 'help' gives help, 'how do i learn sign language' gives the practice guide) and the Back fix.
- Gates: Shell 153 tests and build; Recognize pytest 151 passed; platform test 3; tools/ci 6; brand check; knowledge --check, also on a clean CI-style copy; sync guard 253; diff check clean; protected files untouched.
- R-04 (kvn moved it to 18 Oct): Learn ported from Suvana 7a769ce into the R26 working tree (10 added, 8 modified, all in learn-ssl-module/web/src). R26 gates: 362 tests passed, lint clean, build 154.75 kB gzip, no /learn/ paths, no account code or requests; the two calibration reports the tests rewrote were restored. Screenshots and commit blocks: handoffs/R-04.md.
- Board: Q-06 done; R-04 done (D-08 next: kvn commits, pushes and redeploys learn-ssl-module).
- Needs: Railway "Deploy Latest Commit" (Recognize assistant changed); kvn presses Back to the homepage once on a phone after the Vercel deploy; codex records ported sha 7a769ce in upstreams.json on its next slot.

### 2026-10-18 | kvn (recorded by claude-code) | D-08: learn-ssl-module redeployed with M2; 18f live
- kvn committed the R-04 working-tree port in R26 as 4265671 ("Learn: port Suvana Learn (M2) from Suvana 7a769ce"), pushed it, and redeployed learn-ssl-module.vercel.app: preview dpl_84gMKFXZ53LvDowR7HsgjNUzt6Fb, production dpl_FS7ADJQbmZy4tP8yzV1JRu4yRFE3 (from 4265671). Rollback target: the M1 production deployment dpl_Cd3mPjHDgSNjLjRsct6q1NU56ZCs.
- Suvana sha ported: 7a769ce8f967bbe55c0b56a30c8b0076eaaf036a. The R26 commit holds exactly the 18 ported files, all in learn-ssl-module/web/src; a fresh `sync.mjs port learn --check` from main 9355713 finds no differences.
- Checked by claude-code after the redeploy: the site returns 200 and serves the same main bundle as the R-04 build (index-ByVNvB_3.js) with the new wording ("Some signs also show finger labels") and no account code; /references/kaggle_100.json, /wasm/vision_wasm_internal.wasm, /models/hand_landmarker.task and /?sign=HELLO return 200.
- 18f live retest (signed out): CI green on main; the homepage assistant has no gear or key settings, makes no /api/assistant request and clears old saved keys; the Recognize assistant has no settings panel and clears its old saved settings; 'sign for mother' opens MOTHER, 'help' gives help, 'how do i learn sign language' gives the practice guide, ANDANAWA still shows අඬනවා; privacy.html says the assistants use Suvana's built-in index and no longer mentions Gemini. kvn: Back to the homepage now works on his phone.
- Board: D-08 done.
- Next: codex records the M2 port in tools/sync/upstreams.json (agent/codex/record-r04-port, in progress); R-05 final port and D-10 on 21 Oct.
### 2026-10-18 | codex | Record R-04 M2 Learn port
- Branch: agent/codex/record-r04-port, existing clean task branch at refreshed origin/main 9355713ca2a75b0e5f74bed6ac021131f96d59d6; reused without stacking. kvn explicitly authorized tools/sync/upstreams.json for this record; r26_port no.
- What: fetched R26 and recorded published M2 4265671ead48335381863505cda89c28c9551936 (Learn: port Suvana Learn (M2) from Suvana 7a769ce) in Learn.synced, recorded 2026-10-18, with note naming source Suvana 7a769ce8f967bbe55c0b56a30c8b0076eaaf036a and prior M0/M1. Verified ancestry through d0bfd21 and 761ec32; no Learn source difference since the ported Suvana source.
- Plan correction: checked record initially refused only undeclared AGENTS.md/CLAUDE.md, which R-02 already excludes from ports. Declared those two existing Suvana-only instruction files in Learn, then normal record passed without --force. No other component, coupling, guard or sync code change; unrelated JSON formatting preserved. R26 working tree clean and untouched apart from fetched Git refs; R26 gates inherited from R-04 handoff and kvn's confirmation, not rerun.
- Status after: synced 4265671, upstream head 4265671, nothing new upstream; Everything matches its upstream. Old M0/M1/M2 backlog gone. Only informational identical package-lock coupling remains, retained intentionally.
- Gates: sync guard 255/255; node --test tools/ci/*.test.mjs 6 passed/0 failed/0 skipped; diff check and exact manifest/LOG/scope preservation checks. Screenshots n/a, no UI/product/SSL/figure changes.
- Needs kvn: normal Suvana branch review/merge/push. No push, merge, deploy or external messages by agent. Root README/owner-managed plan records/other handoffs untouched; handoff: docs/plan/handoffs/record-r04-port.md.

### 2026-10-18 | claude-code-thesis | T-02 refresh: Ch1/Ch4/Ch5 ready for review
- What: done (review), at kvn's request on 18 Oct. Thesis\final-source\01-introduction.md, 04-design.md and 05-implementation.md now describe main d17a561: L-33 finger labels for 22 signs (4.4.4 has the method and held-out figures under L-33's wording rules), D-A35 figures (75.7%, ROC AUC 0.758, 65.4% baseline; 74.6%/0.744 named once as the earlier scorer's), suvana.help with one homepage sign-in, /recognize, the ?sign= link, assistants on the verified index with no AI key, Q-06 result, the M2 port. OUT OF DATE banners removed; placeholders are [TODO(task): ...]. docs/commercialisation.md: TODO(AUC) -> 0.758.
- Branch @ sha: agent/claude/T-02-refresh (final SHA in git log), from origin/main d17a561.
- Gates: sync guard; brand check passed; no app code.
- Screenshots: n/a.
- Needs kvn: review the three chapters (README.md in final-source explains the markers); two CHECKs (1.4 claim wording; whether Component 1's landing page still links the standalone module). TODO(Q-08), TODO(Q-09) and TODO(D-10) wait on those tasks.
- Next: L-28 Learn docs, then T-03 Ch6/7/8.
### 2026-10-18 | claude-code-thesis | L-28 Learn docs match what shipped
- What: done. apps/learn/README.md rewritten for main d17a561 (Path, Watch/Try/Recall, capture change, tips, replay, finger labels for 22 signs, stars/goal/streak, ADAPTATION.md link, scenarios with Recall mode, experimental sentence challenge, ?sign=, licence mode, no video, account and profiles; caching and ASSET_VERSION rule; downloads 155.2/25.3/24.3 kB gzip; D-A35 figures; L-33 under its wording rules). PROGRESS-CRITIQUE.md and RECORD-UIUX-PLAN.md got dated done/historical status notes.
- Branch @ sha: agent/claude/L-28-learn-docs (final SHA in git log), from origin/main d17a561.
- Gates: docs only; base run: lint 0, 354 passed + 16 skipped, build ok; sync guard 255; brand check passed.
- Screenshots: n/a.
- Needs kvn: merge (r26_port yes). Found, not fixed (outside L-28's files): generated calibration/weight-fit reports still say "74.6% accuracy" for the earlier scorer; the scoring bench still uses the pre-L-07 capture window, so the thesis's 1.8 ms scoring cost comes from shorter takes; the study export lacks stage/reveal columns. Details in handoffs/L-28.md.
- Next: T-03 Ch6/7/8 drafts.
### 2026-10-18 | claude-code-thesis | T-03 Ch6/Ch7/Ch8 drafts (early, pending Q-08/Q-09)
- What: partial (drafted; TODO(Q-09), TODO(Q-08), TODO(D-10) remain). Thesis\final-source\06-results.md, 07-discussion.md, 08-conclusion.md: D-A35 figures (75.7%, 65.4%, ROC AUC 0.758; the draft's 74.6%/0.744 named once as the earlier scorer's), other 6.1 tables labelled earlier scorer, new finger-label results (Table 6.7, L-33 wording rules), engineering verification table, objectives tables in 09's wording (O1 never "met" without Q-09), limitations, commercialisation from docs/commercialisation.md, new 7.8 panel responses (PP2 quotes ADAPTATION.md exactly), future work.
- Branch @ sha: agent/claude/T-03-thesis-ch6-7-8 (handoff + LOG only; final SHA in git log), from origin/main d17a561.
- Gates: n/a (text outside the repo); self-check clean.
- Screenshots: n/a.
- Needs kvn: review; five CHECKs in handoffs/T-03.md (re-measure the other 6.1 tables or keep them labelled; regenerate figures; re-run the scoring bench at the shipped capture window; no sequence level; team landing page link).
- Next: fill TODO(Q-09) when the latency run exists and TODO(Q-08)/TODO(D-10) on 21 Oct.

### 2026-10-18 | kvn (recorded by claude-code-thesis) | Q-06 devices confirmed
- What: decision/record. kvn in chat: the Q-06 device check used "iPhone in Safari, an Android phone in Chrome, and a laptop in Chrome". Thesis Ch5 5.4 and Ch6 Table 6.9 (final-source) name them; the check passed except Back to the homepage, fixed the same day.
- Branch @ sha: agent/claude/T-02-refresh (handoff T-02 updated; final SHA in git log).
- Gates: n/a.
- Screenshots: n/a.
- Needs kvn: none.
- Next: TODO(Q-08), TODO(Q-09) and TODO(D-10) in the thesis drafts.

### 2026-10-18 | kvn (recorded by claude-code) | integration/2026-10-18g: T-02 refresh, L-28 Learn docs, T-03 drafts
- kvn merged integration/2026-10-18g: agent/claude/T-02-refresh (docs/commercialisation.md now gives ROC AUC 0.758 for the current scorer and names the earlier scorer's 74.6% / 0.744 once), agent/claude/L-28-learn-docs (apps/learn/README.md rewritten for main d17a561 under D-A35 and L-33's wording rules; PROGRESS-CRITIQUE.md and RECORD-UIUX-PLAN.md get dated status notes; r26_port yes, reaches R26 at R-05) and agent/claude/T-03-thesis-ch6-7-8 (handoff only; the Ch6-Ch8 text is outside the repo). Integration fix: removed a trailing blank line in handoffs/T-02.md.
- Gates: sync guard 255, tools/ci 6, brand check, diff check clean; no code changed (L-28's base run: Learn lint 0, 354 passed + 16 skipped, build ok).
- Thesis: Ch1/Ch4/Ch5 ready for kvn's review; Ch6/Ch7/Ch8 drafted with TODO(Q-08), TODO(Q-09) and TODO(D-10). T-03's decisions for kvn: re-measure Tables 6.1, 6.5, 6.6 and the per-sign figure for the current scorer, or keep them labelled "earlier scorer"; redraw the earlier-scorer figures (T-05); re-run the scoring benchmark with the shipped capture window; Table 6.10's team landing-page link. No sign-sequence level was built (L-32 stays backlog; no gloss orders arrived). Q-06 devices confirmed by kvn: iPhone 15 Pro Max in Safari, Samsung Galaxy Note 8 in Chrome and a laptop in Chrome (handoffs/Q-06.md and the thesis updated).
- Found by the thesis lane, open: the generated calibration-report.md and weight-fit-report.md still call the earlier scorer's separation "accuracy"; scoring.bench.test.ts sizes takes for the pre-L-07 window, so the 1.8 ms scoring cost comes from shorter takes than learners now record; the study export has no stage or reveal columns (no study is planned before the demo).
- kvn's answers: re-measure the earlier-scorer Ch6 tables (codex agent/codex/eval-refresh, which also re-runs the scoring benchmark at the shipped capture window and changes the generated reports to say separation); his component's team landing page links learn-ssl-module.vercel.app (Table 6.10). Lahiru replied ok to the spelling message; his demo sign list is still awaited (DEMO.md TODO(Lahiru)). K-13: kvn recorded both clips (about 13 s each, outside every repo); claude-code converted them to 640x480 y4m in Suvana-wt/_fixtures for Q-09.
- Schedule (D-A38): viva Tue 20 Oct 13:00; backend freeze Tue 20 Oct 02:30; then frontend revamps (Antigravity) and non-code actions only.
- Board: T-02 done, L-28 done, T-03 in-progress (waits on Q-08, Q-09 and D-10).


### 2026-10-18 | codex | Evaluation refresh for T-03 CHECKs 1–3 / L-28 findings 1–2
- Branch: agent/codex/eval-refresh from fresh origin/main 724feedd8bcaa952b9e5d7da7161d5aa3c617151; direct kvn assignment, measurement/report wording only. Status: review; r26_port: yes (tests, reports and scoped Learn README wording). Planner-owned records and thesis files untouched.
- Earlier scorer 39b69aba (8c98520^) reproduced thesis Tables 6.1, 6.5, 6.6 and all six quoted per-sign values before current measurement. Same 557 recordings / 33 signs, 32 usable; 1,516 pairs (524/992). Earlier 74.6% separation / 65.4% baseline, AUC 0.744; current 75.7% / 65.4%, AUC 0.758. One fluent signer, never learner accuracy or an improvement claim. Corpus read in place, before/after SHA-256 bad16fe51e84c31852e4e78ca1230e3a18e8460b4813a2f3886bfb5de7f87265.
- Current DTW same/different medians 0.424 / 0.637; score means 57.9 / 28.4, medians 62 / 24, share >=50 62.4% / 21.1%, descriptive mean-score gap 29.5. Complete earlier/current tables and all 32 per-sign values in handoff. Same first 60 reference IDs: 1,766 earlier finite pairs versus 1,770 current, four newly finite documented; closest three remain 0.135 / 0.140 / 0.157. No filtering to force old counts.
- Updated benchmark/export timing stand-ins to shipped max(2 x duration, duration + 3000 ms); final isolated practice median/p90 4.3/16.1 ms, scenario 17.0/70.7 ms on Ryzen 5 5500U, 12 logical CPUs, 15.4 GiB, Windows 10.0.26300, Node 24.12.0. Old 1.8 ms labelled shorter pre-L-07 take; reference library/sample also differs. Scoring stage only; Q-09 remains unmeasured.
- Generated reports say separation with full 65.4% baseline; weight report distinguishes its 24-sign 60.9% subset baseline. Writers require CALIBRATE/WEIGHTS_FIT opt-in and support external CALIBRATION_DIR. README agrees while preserving historical anchor-fit numbers. CSV/JSON/provenance for figures remain ignored under .agent-local/eval-refresh/{earlier,current}; no per-take data committed. No scorer, anchors, cut-offs or product changes.
- Gates: cached npm 10.9.9 locked install; lint pass; routine tests 357 passed/13 skipped (no test-name exclusions); build 155.21 kB gzip <=160; sync guard 255. Historical/current opt-ins 6 each, report regeneration 5, isolated bench 1 passed. Snapshot byte equality, source/corpus/reference hashes, identical sample IDs, exact CSV-to-JSON and report/output checks pass. Sandbox Vitest EPERM rerun with normal filesystem access, unchanged gates.
- Handoff: docs/plan/handoffs/eval-refresh.md, with commands, complete comparisons and machine/provenance details. Needs kvn's review, normal merge/push/R26 port and thesis/T-05 redraw, using 1,770 for the current distinct-pair caption. No UI change/screenshots, push, merge, deploy or external messages.
### 2026-10-18 | codex | Q-09 latency: stopped at real hands-ready gate
- Branch: agent/codex/Q-09-latency from origin/main 724feedd8bcaa952b9e5d7da7161d5aa3c617151; final task SHA in git log. r26_port: no.
- Added only tools/screens/e2e/latency.spec.ts and tools/screens/latency-report.mjs, plus Q-09 handoff and this append. Production build, existing preview config, real MediaPipe, fixed external K-13 camera input, opt-in benchmark with no retries or silent exclusions. Learn source/config/dependencies unchanged.
- Measurement blocked: BAG EKA Try/camera-running/GPU initialization succeeded, but Show your hands remained and Record stayed disabled through the readiness check. Stopped as kvn required; no latency trial started and no latency figure or O1 completion claim. The cause is unconfirmed. No alternate clip or mocked hands used to force a result.
- Full generated output and Playwright failure output are embedded verbatim in handoffs/Q-09.md for T-03. Raw/build/failure evidence stays ignored under .agent-local/Q-09/2026-10-18T14-17-31-925Z/. Clips remain external test input only; no upload/reference conversion. no-hands was present but unused after the stop.
- Gates: Learn npm ci, lint, 354 tests passed/16 skipped, build 155.21 kB gzip; sync guard 255; new spec TypeScript and report syntax checks pass. Sandbox network/temporary-rename failures were resolved by authorized execution outside the sandbox. Existing Playwright full run: 66 pass, 1 local-preview ERR_CONNECTION_REFUSED at sentence.spec.ts:77, 1 skip (new opt-in benchmark). Exact failing case passed 1/1 on a fresh-preview isolated recheck; all 67 existing cases passed across the run/recheck. The four original smoke.spec.ts cases passed in the full run.
- Plan correction: kvn moves Q-09 to today for viva Tue 20 Oct 2026 13:00 Asia/Colombo and supplies this antigravity checkout for Codex; planner-owned records untouched.
- Needs kvn: resolve why the recorded clip does not reach real hand readiness before a new benchmark. T-03 retains O1 as unverified by Q-09. Review/merge remains kvn's action. No push, merge, deploy, messages or R26 changes.

### 2026-10-18 | kvn (recorded by claude-code) | integration/2026-10-18h: evaluation refresh, Q-09 tooling; thesis paused
- kvn merged integration/2026-10-18h: agent/codex/eval-refresh (the earlier scorer reproduced the thesis's Tables 6.1, 6.5, 6.6 and per-sign values first; current-scorer values for all of them are in handoffs/eval-refresh.md; scoring benchmark at the shipped capture window; generated reports say separation with the 65.4% baseline and are written only on opt-in; r26_port yes) and agent/codex/Q-09-latency (opt-in latency benchmark and report script).
- Q-09 measured nothing: with kvn's K-13 clip, Learn's hands-ready check never passed, so Record stayed disabled and no trial ran (handoffs/Q-09.md). Cause unconfirmed. O1 (300 ms) stays unverified; fix the clip after the viva.
- Gates: Learn lint, 354 tests passed + 16 skipped, build 155.21 kB gzip; sync guard 255; tools/ci 6; diff check clean.
- Thesis paused until after the viva (kvn): final thesis due Wed 28 Oct; the thesis lane resumes only when kvn says so.
- Lahiru has not yet sent his demo sign list (DEMO.md TODO(Lahiru)).
- Board: K-13 done (clips recorded and converted); Q-09 in-progress (blocked on the clip).

### 2026-10-19 | Codex | Recognize card animation
- Direct user request: added abstract CSS camera scan and pulsing tracking points to the Shell Recognize card, with dark-theme contrast and a reduced-motion still state.
- Branch codex/recognize-card-animation, based on supplied uifixes/suvana.help @ 77811bd. Plan correction: user-assigned Shell follow-up uses current UI-fix baseline instead of older origin/main; no planner-owned files edited.
- Gates: clean install, 157 Shell tests, typecheck/build, 255 sync guards, diff check passed. Existing build chunk advisory remains. Before/after phone captures both flag pre-existing page-wide overflow; Recognize art and controls fit.
- Review: .agent-local/screens/recognize-card-animation/index.html; desktop 1280x800 and phone 390x844 in both themes, motion/reduced-motion browser checks. Handoff: docs/plan/handoffs/recognize-card-animation.md.
- Needs kvn: visual adoption and any merge/push/deploy. No SSL content or figures changed; no R26 port.

### 2026-10-19 | Codex | Recognize artwork refinement
- User rejected the oversized scan panel; replaced it and its text with a small hand outline and sequentially pulsing fingertip points. Retained theme contrast and reduced-motion support.
- Follow-up on codex/recognize-card-animation after dbba5ee; direct user-assigned Shell scope. No invented SSL content or figures.
- Validation: 157 Shell tests, typecheck/build, 255 sync guards and diff check passed. Desktop/phone, light/dark and reduced-motion browser checks passed; existing chunk warning and phone page overflow flag remain.
- Rendered review: .agent-local/screens/recognize-card-refinement/index.html; handoff docs/plan/handoffs/recognize-card-refinement.md. Needs kvn's visual adoption and manual merge/push/deploy.
- Gate caveat: repeat npm ci hit a Windows locked Rollup binary. Restored exact native dependency without manifest/lockfile changes, then tests/typecheck/build passed again; the clean-install repeat remains limited by that lock.

### 2026-10-19 | Codex | Recognize hand proportions
- User-approved hand concept refined with longer fingers and palm: 112px wide, 140px high. Updated thumb point alignment; existing animation and themes retained.
- Gates: 157 Shell tests, typecheck/build, 255 sync guards, diff check passed. Clean-install repeat skipped for previously established live-preview native-binary lock; existing bundle warning remains.
- Desktop/phone light/dark and reduced-motion evidence: .agent-local/screens/recognize-hand-proportions/index.html. Handoff: docs/plan/handoffs/recognize-hand-proportions.md. Same task branch; no SSL content or figures changed. Needs kvn visual adoption and manual merge/push/deploy.

### 2026-10-19 | Codex | Shell landing navigation
- Reworked section navigation labels to About, What you can do, How it works, Feedback; improved current/focus states, mobile visibility, 44px tap targets, `aria-current`, and responsive smooth-scroll offset.
- Browser captures/checks: desktop, 390px phone, 360px phone; light/dark; section jump/active state. Existing unrelated phone full-page overflow flag persists. `git diff --check` passed; tests/build not run this turn.
- Review screenshots: .agent-local/screens/shell-nav/index.html. Handoff: docs/plan/handoffs/shell-nav.md.
- Review finding outside scope: named testimonials and “Tested by…” copy conflicts with project plan stating no study participants. Verify source or owner review before public use. No SSL content or figures edited.

### 2026-10-19 | Codex | Restore landing nav styling
- Restored the landing nav's serif editorial look with animated teal-to-gold underline and hover lift; removed the rounded pills while retaining clearer section names and the mobile second row.
- Added reduced-motion support. Browser checks covered desktop/390/360, light/dark, 44px targets, section jump/current state, hover animation, and reduced motion. Contact sheet refreshed at .agent-local/screens/shell-nav/index.html. `git diff --check` passed; tests/build not run.
- Handoff addendum: docs/plan/handoffs/shell-nav.md. Needs kvn visual review and manual merge.

### 2026-10-19 | Codex | Remove landing page section links
- At user request removed section links, their responsive styling, and JS section scroll/current tracking. Logo, theme and account controls remain in the header.
- Browser check: desktop/390/360 and light/dark; section links absent, remaining controls rendered. Existing page-wide phone overflow flag persists. `git diff --check` passed; tests/build not run.
- Review screenshots: .agent-local/screens/shell-nav-removed/index.html. Handoff: docs/plan/handoffs/shell-nav-removed.md. No SSL content or figures touched; merge/push/deploy remain manual.

### 2026-10-19 | Codex | Shell landing responsiveness
- Made the landing hero, module cards, grids, pipeline, testimonials and assistant panel fit phone, tablet, desktop, wide and landscape viewports; retained light/dark styling and the card fade while removing mobile copy drift.
- Plan correction: kvn directly assigned this new Shell task in chat; no matching BOARD/tasks.json row exists. Planner-owned files left unchanged.
- Gates: Shell `npm run build` passed (typecheck + production build); 255 sync guards passed. Browser geometry after module animation settled covered widths 280–2560 plus 480x320 and 844x390; page and module overflow cleared. No test suite run.
- Before/after renders: .agent-local/screens/shell-responsive/index.html (light/dark, phone/tablet/desktop/wide; focused Recognize card captures). Handoff: docs/plan/handoffs/shell-responsive.md.
- Needs kvn's screenshot review and manual merge/push/deploy if accepted; no SSL content or figures changed.

### 2026-10-19 | Codex | Pipeline card staircase
- Equalized all four Pipeline cards across wrapped grid rows. At 1172px and wider, kept them in four equal columns and added a deliberate 28px descending step between cards; phone and tablet retain an even stacked or wrapped grid.
- Browser checks in light and dark themes: at 1280px each card measures 279x464px; all four dimensions match at 390, 768, 1280, and 1600px. Width checks from 320 to 1920px, including the 1171/1172px layout boundary, found no document overflow.
- Shell build/typecheck passed; 255 sync guards and diff check passed. Existing Vite bundle advisory remains (644.91 kB main chunk). Test suite not run.
- Before/after renders and contact sheet: .agent-local/screens/pipeline-card-stairs/index.html. Handoff: docs/plan/handoffs/pipeline-card-stairs.md.
- Plan correction: kvn directly assigned this follow-up in chat; no matching BOARD.md/tasks.json row exists. Planner-owned files left unchanged. Needs kvn screenshot review and manual merge/push/deploy if accepted.

### 2026-10-19 | codex | PR #10 Shell CI blocker
- Direct kvn assignment; branch codex/pr-10-shell-ci from PR head 165f9467fed96db346e4a8c89372754779a338ac. Plan correction: unscheduled PR blocker, scoped to Shell test/fixture and this handoff/log; no planner or hot-file edits.
- Failed job 117963610228 in run 39223350679: 156 tests passed, one failed because git show origin/main is unavailable in shallow Actions checkout; build did not start.
- Pinned exact model prompt and ordered 65 original questions from main 7a74cc4fce5a85e74b719beace425e4e838617a0 in a test fixture, verified identical on PR head. Exact safety equality/count/grounding checks retained; no runtime/UI/content changes.
- Gates: npm 10.9.9 ci, 157 Shell tests, typecheck/build, 255 sync guards, diff check pass. Reproduced original missing-ref failure in a depth-one clone without origin/main, then verified all 157 tests and build with the patch there. Existing bundle warning remains. Sandbox EPERM required normal-access reruns.
- Handoff: docs/plan/handoffs/pr-10-shell-ci.md. Needs kvn: apply fix commit to codex/pipeline-card-stairs and push, then check hosted CI. No push/merge/deploy/messages; r26_port no.

### 2026-10-19 | Codex | Shell footer start link
- Direct user assignment on uifixes/suvana in main worktree: replaced Start Now button with inline gradient start? registration link; matched Learn heading spacing/type and added focus/reduced-motion styling. Marquee and bottom footer unchanged.
- Plan correction: unscheduled chat task with explicit branch/worktree override; no planner-owned files edited.
- Gates: 157 Shell tests, typecheck/build, 255 sync guards and diff check pass. Existing bundle advisory remains. Clean npm ci blocked by Windows EPERM; dependencies restored through npm install --no-package-lock without lockfile changes.
- Desktop/390/360 light/dark before/after renders and browser focus/Enter/overflow/reduced-motion checks: .agent-local/screens/shell-start-cta/index.html. Handoff: docs/plan/handoffs/shell-start-cta.md. No SSL content/figures changed. Visual review and merge/push/deploy remain kvn's.

### 2026-10-19 | Codex | Unified Shell account page
- Direct user assignment on uifixes/suvana/main worktree: combined signup/signin UI with Shell styling/header; one Shell Sign Up entry. Existing /login and /register remain compatible initial modes with unchanged auth APIs, safe callbacks and registration fallback. Footer start? already targets /register.
- Shared #header CSS is bundled by both apps from packages/branding; Next build/tracing root includes shared source. Narrow sync coupling/guard updates protect the integration. No package/lockfile, route rewrite, SSL content or research-figure changes.
- Gates pass: Shell 157 tests/typecheck/build; Communicate lint/TypeScript/build; 6 account-helper tests; 260 sync guards; diff check. Existing Shell bundle advisory remains. Clean install not repeated after prior Windows dependency locks.
- Local browser checks pass for mocked signup/signin errors, fallback/success callback flow and mode state; 360/390/768/1280 light/dark, keyboard/theme/reduced motion, normal hover/orbit and matching Shell/account header. All credential writes mocked; live auth not proven.
- Before/after desktop/phone review: .agent-local/screens/unified-account/index.html. Handoff: docs/plan/handoffs/unified-account.md. Plan correction: unscheduled chat assignment explicitly overrides lane/branch setup. Needs kvn visual adoption and manual merge/push/deploy of both apps, then live-account smoke test; no breaking-change approval needed.

### 2026-10-19 | Codex | Account browser-review refinements
- Implemented comments 1–13 on uifixes/suvana/main worktree: removed marked copy/decorations, exact replacement paragraph, one sliding Login/Register switch, animated brand mark, slimmer black/white Sign Up and landing-footer bottom links.
- Shared footer CSS preserves Shell's existing footer; account layout adapts to viewport height/width and short landscape without hiding overflow. Error states condense optional decoration to keep controls visible. Routes/auth handlers/callback behavior unchanged.
- Gates: Shell 157 tests/typecheck/build; Communicate lint/TypeScript/build; 263 sync guards and diff check pass. Existing Shell bundle advisory and prior clean-install lock limitation remain.
- Browser checks: 22 viewport/mode fits with no document scrolling, clipping or header/footer overlap; visible synthetic errors fit at 320x568, 903x532, 480x320; pointer/keyboard switch, logo motion, reduced motion, themes and mocked account flows pass. No live account writes or real-device keyboard claims.
- Before/after review: .agent-local/screens/account-review/index.html. Handoff: docs/plan/handoffs/account-review.md. Plan correction: direct user review overrides normal task/branch setup; planner files untouched. Needs kvn visual adoption and manual merge/push/deploy/live-account smoke test.

### 2026-10-19 | Codex | Stable account modes and theme colors
- On uifixes/suvana/main worktree: restored supplied light/dark slate action colors on Shell and account forms/alternate links; removed account header signup so theme toggle is at right. Both inert form/heading variants reserve identical card/switch geometry.
- User chose UI-only for passkeys after password-only backend inspection. Use Passkey is a disabled Coming soon preview above Login; no auth/API/database/dependency changes.
- Gates: Shell 157 tests/typecheck/build; Communicate lint/TypeScript/build; 263 sync guards and diff check pass. Prior clean-install lock limitation and existing Shell bundle advisory remain.
- Browser: exact card/switch geometry and requested colors pass 14 viewport/theme cases; prior 22 fit cases, short-screen errors, mocked auth callbacks/errors, keyboard/theme/reduced motion also pass. Separate subtitle edits in accountCopy.ts preserved outside this commit; renders/builds include them.
- Before/after review: .agent-local/screens/account-stable/index.html. Handoff: docs/plan/handoffs/account-stable.md. Plan correction: direct session task overrides board/lane setup. Needs kvn visual review/adoption and manual merge/push/deploy; real passkeys intentionally out of scope.

### 2026-10-19 | Codex | Account submit-section alignment
- Fixed the remaining 18px mode shift in submit button and alternate-account sentence. Inner form slots now fill the reserved height and anchor submit at the bottom; authentication and UI-only passkey scope unchanged.
- Browser assertions pass for exact submit/sentence/card/switch bounds in 14 viewport/theme cases, plus 22 responsive-fit combinations and three short-screen error cases. Communicate lint/TypeScript/build, 263 sync guards and diff check pass.
- Before/after: .agent-local/screens/account-actions/index.html. Handoff: docs/plan/handoffs/account-actions.md. Existing accountCopy.ts edits preserved outside commit. Plan correction: direct session follow-up on uifixes/suvana/main worktree; planner files untouched. Visual review and merge/push/deploy remain manual.

### 2026-10-19 | Codex | Account branding and compact footer
- Restored responsive mobile wordmark; centered mobile account welcome without duplicate mark. Desktop uses the existing logo silhouette as a large masked backdrop with moving gold/teal gradient and fixed geometry; no floating/rotation.
- Removed account-footer title in both layouts. Desktop copyright/link-row centers match (57px footer); mobile copyright enlarged to 12px and nearly matches link-row width (235.13px vs 236.27px, about 66.59px footer). Existing footer links/targets and Shell footer preserved.
- Gates: Shell 157 tests/typecheck/build; Communicate lint/TypeScript/build; 263 sync guards and diff check pass. Browser brand/footer/static-animation checks, header fit from 280–390px, 14 mode/theme alignment cases and 22 viewport/mode fits pass. Existing Shell bundle advisory and prior clean-install limitation remain.
- Review: .agent-local/screens/account-brand/index.html. Handoff: docs/plan/handoffs/account-brand.md. Separate accountCopy.ts edits kept outside commit. No SSL/research figures/auth changes; passkey stays UI-only. Plan correction: direct session follow-up on uifixes/suvana/main worktree; planner files untouched. Visual adoption and merge/push/deploy remain manual.
