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

### 2026-10-14 | codex (second lane) | L-19 rework
- What: all 12 hints flagged pending and shown only to authors, unchanged text; Record tip author-only; honest 3/7 Social preview; playable summary; reference retry; closer-to feedback removed; Guided/Recall variant. Recall title overlap, yellow pills, heading focus box and phone briefing overflow fixed in task-local CSS.
- Branch @ sha: agent/codex/L-19-scenarios @ task HEAD (base 3a8d552; independent UI leaf).
- Gates: npm 10 ci, lint 0 warnings, 254 passed / 12 skipped, build 146.40 kB gzip, guard 168; real-browser failed-reference retry passed; JSON equivalence proves flags only and all 12 hint texts unchanged. Playwright result in handoff.
- Screenshots: .agent-local/screens/L-19/index.html; main before/final after desktop 1280x800, phone 390x844 and 360x800. Capture assertions: learner hint hidden, author hint visible, Recall sign hidden, no title/placeholder overlap.
- Plan correction: 4 flags in the old branch missed 8 hints. Main phone author-nav overlap remains outside this file boundary (L-26); keyboard navigation used for captures.
- Needs kvn: review/adopt/merge. No push or merge by codex; r26_port yes.
- Next: I-12a stays gated on kvn confirming no Karindra answer by 15 Oct; I-06 awaits page decisions; L-23 follows the requested order.
