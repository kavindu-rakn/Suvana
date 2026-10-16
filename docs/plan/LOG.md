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
