# Board: every task, 12-22 Oct 2026

Source of truth for task data is `tasks.json` in this folder; this file is generated from it and both must stay identical.
Only kvn (or a planner session he starts) edits BOARD.md and tasks.json, on `main`. Agents report status in their handoff file and in LOG.md; kvn copies it here during the daily merge (K-10).

Status values: `todo`, `in-progress`, `review` (handoff written, waiting for kvn), `merged`, `blocked`, `cancelled`.
Owners: `kvn`; `claude-code` (Claude Code, UI lane); `codex` (OpenAI Codex, logic and platform lane); `antigravity` (Google Antigravity, shell/Communicate/Alerts/tools lane); `claude-code-thesis` (a second Claude Code session for thesis and docs, subject to DN-20).
Sizes: S < 2 h, M < half a day, L < 1 day. "r26_port: yes" means the change must reach R26 `learn-ssl-module/web` at the next milestone port (07-r26-mirror.md). "screenshots: yes" means desktop 1280x800 and phone 390x844 before/after renders are required, and kvn adopts or rejects from them before merge.

Task counts by owner: kvn 31, claude-code-thesis 5, antigravity 11, claude-code 11, codex 42; total 100.

## Table

| ID | Title | Owner | Day | Size | Deps | Status | Branch | r26_port | Screenshots | Decisions |
|---|---|---|---|---|---|---|---|---|---|---|
| K-01 | Merge the re-sync branch and this plan into main; set up local excludes and pull R26 | kvn | 2026-10-12 | S | - | done | `n/a (kvn, GitHub Desktop)` | no | no | - |
| K-02 | Decide the open decisions by their needed-by dates | kvn | 2026-10-12 to 2026-10-19 | S | - | todo | `n/a` | no | no | DN-01..DN-20 |
| K-03 | Send the teammate asks to Lithira, Lahiru and Karindra | kvn | 2026-10-13 | S | - | done | `n/a` | no | no | - |
| K-04 | Create accounts and secrets: three Vercel projects, Atlas M0, Cloudinary, NEXTAUTH_SECRET, optional Gemini key | kvn | 2026-10-13 to 2026-10-14 | M | K-01 | todo | `n/a` | no | no | - |
| K-05 | Approve the starter curriculum, verify a batch of meanings, decide a third scenario | kvn | 2026-10-15 | M | L-09 | done | `kvn's own branch, or tell an agent` | yes | no | DN-19 |
| K-06 | Export the permitted Kaggle clips and upload them to Cloudinary (only if DN-05 allows video) | kvn | 2026-10-16 | M | L-15a, K-04 | cancelled | `n/a` | no | no | DN-05, DN-06 |
| K-07 | Convert the Kaggle 'SSL Sentences' clips into references | kvn | 2026-10-16 | S | L-22a | done | `n/a (files handed to the L-22b branch)` | yes | no | DN-08 |
| K-08 | Buy suvana.help | kvn | 2026-10-20 | S | D-03, D-04 | todo | `n/a` | no | no | - |
| K-09 | Ask the supervisor whether any informal usability check is allowed without ethics approval | kvn | 2026-10-13 | S | - | todo | `n/a` | no | no | - |
| K-10 | Daily review, screenshot adoption and merge window | kvn | daily 2026-10-13 to 2026-10-21 | S | K-01 | todo | `n/a` | no | no | - |
| K-11 | Demo rehearsals, including the laptop fallback | kvn | 2026-10-20 and 2026-10-21 | M | Q-05, D-04 | todo | `n/a` | no | no | - |
| K-12 | Final demo and thesis submission | kvn | 2026-10-22 | M | T-08, K-11 | todo | `n/a` | no | no | - |
| K-13 | Record two hand-fixture clips for automated screenshots | kvn | 2026-10-13 | S | - | todo | `n/a` | no | no | - |
| T-01 | Create the final-thesis working copy; the uploaded draft stays untouched | kvn | 2026-10-13 | S | - | done | `n/a` | no | no | - |
| T-02 | Draft revised Ch1/Ch4/Ch5 text for what was actually built | claude-code-thesis | 2026-10-19 | M | T-01 | in-progress | `none (writes outside the repo)` | no | no | DN-16 |
| T-03 | Draft Ch6/Ch7/Ch8: objectives table, panel responses, limitations, future work | claude-code-thesis | 2026-10-20 | M | T-02, Q-09, L-13 | todo | `none (writes outside the repo)` | no | no | - |
| T-04 | Learner-model worked example computed with the real code | claude-code-thesis | 2026-10-17 | S | L-13 | done | `agent/claude/T-04-worked-example` | yes | no | - |
| T-05 | Figures, placeholders, chart titles, accessibility and Appendix B | kvn | 2026-10-21 | M | T-02, T-03 | todo | `n/a` | no | no | DN-16 |
| T-07 | Commercialisation write-up (open core, licences, costs, competitors) | claude-code-thesis | 2026-10-19 | S | - | done | `agent/claude/T-07-commercialisation` | no | no | DN-04, DN-15 |
| T-08 | Turnitin report and final PDF | kvn | 2026-10-22 | M | T-05, T-09 | todo | `n/a` | no | no | - |
| T-09 | Own-words pass on chapters that will not change | kvn | 2026-10-16 to 2026-10-18 | M | T-01 | todo | `n/a` | no | no | - |
| D-01 | Deployment smoke script and DEPLOYMENT.md refresh | antigravity | 2026-10-17 | S | L-06 | done | `agent/antigravity/D-01-smoke` | no | no | - |
| D-02 | Deploy suvana-learn (.vercel.app) from current main | kvn | 2026-10-14 | S | K-01, K-04 | done | `n/a` | no | no | - |
| D-03 | Deploy suvana-communicate, then suvana-shell | kvn | 2026-10-17 | M | D-02, I-01, I-07, K-04 | todo | `n/a` | no | no | DN-13 |
| D-04 | Host Recognize on the chosen platform with an uptime ping | kvn | 2026-10-18 | M | I-08 | todo | `n/a` | no | no | DN-02 |
| D-05 | Speech service: laptop-only by default; host only if DN-03 says so | kvn | 2026-10-19 | S | I-09 | todo | `n/a` | no | no | DN-03 |
| D-06 | Commit the R26 M0 port and redeploy learn-ssl-module.vercel.app | kvn | 2026-10-14 | S | R-00 | done | `n/a (R26: kvn commits)` | no | no | - |
| D-07 | Commit the R26 M1 port and redeploy learn-ssl-module | kvn | 2026-10-17 | S | R-03 | done | `n/a (R26)` | no | no | - |
| D-08 | Commit the R26 M2 port and redeploy learn-ssl-module | kvn | 2026-10-19 | S | R-04 | todo | `n/a (R26)` | no | no | - |
| D-09 | Attach suvana.help to suvana-shell and re-run the smoke | kvn | 2026-10-20 | S | K-08 | todo | `n/a` | no | no | - |
| D-10 | Final R26 commit and learn-ssl-module redeploy | kvn | 2026-10-21 | S | R-05 | todo | `n/a (R26)` | no | no | - |
| Q-00 | Screenshot tooling: Playwright shooter, contact sheet, fake-camera clips, dev-only fixtures page | antigravity | 2026-10-13 | M | K-01 | done | `agent/antigravity/Q-00-screens` | no | no | - |
| Q-01 | Agent instruction files: root AGENTS.md as single source, slim CLAUDE.md, per-module AGENTS.md | claude-code | 2026-10-13 | M | K-01 | done | `agent/claude/Q-01-agents-md` | no | no | DN-12 |
| Q-02 | .gitattributes for line endings and a union merge for LOG.md | antigravity | 2026-10-14 | S | K-01 | done | `agent/antigravity/Q-02-gitattributes` | no | no | - |
| Q-03 | Close CI gaps: concurrency, Docker build, R26-form Learn build, dist smoke, extended brand grep | codex | 2026-10-20 | M | R-01, I-01, I-02 | done | `agent/codex/Q-03-ci` | no | no | - |
| Q-04 | Playwright smoke for Learn (keyboard, storage failure, onboarding) | antigravity | 2026-10-15 | M | Q-00, L-02, L-05, L-07 | done | `agent/antigravity/Q-04-e2e` | no | no | - |
| Q-05 | DEMO.md: timed script, device plan, fallback runbook, adversarial assistant check | codex | 2026-10-20 | S | D-03, D-04 | todo | `agent/codex/Q-05-demo` | no | no | - |
| Q-06 | Full real-device matrix (iPhone Safari, Android Chrome, laptop) | kvn | 2026-10-19 | M | Q-06a, L-16b | todo | `n/a` | no | no | - |
| Q-06a | Early phone check of the deployed Learn and device inventory | kvn | 2026-10-15 | S | D-02, L-04 | done | `n/a` | no | no | - |
| Q-07 | Handedness reality check | kvn | 2026-10-14 | S | - | done | `n/a` | no | no | - |
| Q-08 | Demo-ready gate run and release tag proposal | claude-code | 2026-10-21 | S | L-26, L-27 | todo | `agent/claude/Q-08-gates` | no | no | - |
| Q-09 | Measure end-to-end feedback latency (capture end to result shown) | codex | 2026-10-19 | S | L-16a, Q-00, K-13 | todo | `agent/codex/Q-09-latency` | no | no | - |
| L-01 | Replace invented per-finger percentages with measured Correct/Almost/Wrong states (DN-17); one label scale | claude-code | 2026-10-13 | S | L-02 | done | `agent/claude/L-01-finger-states` | yes | yes | DN-17 |
| L-02 | Keyboard: Esc no longer exits to the Hero; Enter/Space respect the focused control | claude-code | 2026-10-13 | S | - | done | `agent/claude/L-02-keyboard` | yes | no | - |
| L-03 | Practice capture robustness: wall-clock backstop, safe initial load, no empty-reference logging | claude-code | 2026-10-14 | S | - | done | `agent/claude/L-03-capture-robustness` | yes | no | - |
| L-04 | Camera lifecycle: lost track, frame-loop errors, insecure origin, GPU-to-CPU fallback, resume | codex | 2026-10-13 | M | - | done | `agent/codex/L-04-camera-lifecycle` | yes | no | - |
| L-05 | Storage resilience: safeLoad, guarded localStorage, top-level ErrorBoundary | codex | 2026-10-13 | S | - | done | `agent/codex/L-05-storage` | yes | yes | - |
| L-06 | Cache headers, standalone root redirect, asset-version rule | codex | 2026-10-13 | S | - | done | `agent/codex/L-06-cache-headers` | yes | no | - |
| L-07 | First-run onboarding, hands-in-frame gate, longer capture window with learner-take trimming | claude-code | 2026-10-14 | M | L-03 | done | `agent/claude/L-07-onboarding` | yes | yes | - |
| L-08 | Learner playback: 0.5x start, speed control, mirror label, raw-framing view with frame outline, sized wrist-anchored ghost | claude-code | 2026-10-15 | M | L-07 | done | `agent/claude/L-08-playback` | yes | yes | - |
| L-09 | Curriculum report, data-derived units and scenario coverage table | antigravity | 2026-10-14 | M | L-10 | done | `agent/antigravity/L-09-curriculum` | yes | no | - |
| L-10 | Reference metadata: hands, motion, duration, licence, hasMeaning in the generated index | antigravity | 2026-10-14 | S | - | done | `agent/antigravity/L-10-ref-meta` | yes | no | - |
| L-11 | Path view: units, stars, locks, unit detail, nav entry, 'Why this sign?' chip | codex | 2026-10-16 | M | L-12, K-05 | done | `agent/codex/L-11-path` | yes | yes | - |
| L-12 | Game logic: stars, unit state, unlocks, daily goal, streak, XP | codex | 2026-10-15 | M | L-09 | done | `agent/codex/L-12-game-logic` | yes | no | DN-10, DN-11 |
| L-13 | Adaptation fix: review/new interleave, reachable sessions, reasons, ADAPTATION.md | codex | 2026-10-16 | M | L-12 | done | `agent/codex/L-13-adaptation` | yes | no | - |
| L-14 | Meaning coverage: verified-first browse and a 'meaning not yet verified' chip | codex | 2026-10-15 | S | L-10 | done | `agent/codex/L-14-meaning-coverage` | yes | yes | - |
| L-15a | Clip export script (only if DN-05 allows video) | codex | 2026-10-15 | S | - | cancelled | `agent/codex/L-15a-export-clips` | no | no | DN-05 |
| L-15b | SignVideo component and video manifest (only if DN-05 allows video) | antigravity | 2026-10-16 | M | - | cancelled | `agent/antigravity/L-15b-signvideo` | yes | yes | DN-05, DN-06 |
| L-16a | Practice stage machine: Watch then Try, with performance marks | codex | 2026-10-17 | M | L-11, L-12, L-13 | done | `agent/codex/L-16a-watch-try` | yes | yes | - |
| L-16b | Recall stage: hidden reference, cue, reveal costs the third star | codex | 2026-10-18 | M | L-16a | done | `agent/codex/L-16b-recall` | yes | yes | DN-09 |
| L-17 | Feedback engine: gated 'Close match', timing and path hints, mirrored hand label, typed hints | codex | 2026-10-17 | M | - | done | `agent/codex/L-17-hints` | yes | no | - |
| L-18 | Export the DTW alignment path and worst-frame index | codex | 2026-10-18 | S | L-17 | done | `agent/codex/L-18-alignment` | yes | no | - |
| L-19 | Scenario cleanup: previews, author-only tips and hints, playable counts, recall variant | codex | 2026-10-17 | M | L-05 | done | `agent/codex/L-19-scenarios` | yes | yes | - |
| L-20 | Licence mode (VITE_CONTENT=cc0) and an attribution panel | codex | 2026-10-18 | M | L-10 | done | `agent/codex/L-20-licence-mode` | yes | yes | DN-04 |
| L-21 | Feedback UI: side-by-side synced replay, typed hints, fading hints | codex | 2026-10-19 | M | L-16b, L-17, L-18 | done | `agent/codex/L-21-replay` | yes | yes | - |
| L-22a | List the Kaggle sentence labels and prepare the converter command | codex | 2026-10-15 | S | - | done | `agent/codex/L-22a-sentence-labels` | yes | no | - |
| L-22b | Sentence data, exclusion from single-sign flows, long-sequence perf test | codex | 2026-10-18 | S | K-07 | done | `agent/codex/L-22b-sentences` | yes | no | DN-08 |
| L-23a | Demo profile and reset at the storage layer | codex | 2026-10-17 | S | - | done | `agent/codex/L-23a-profile` | yes | no | - |
| L-23 | Progress dashboard: units, stars, streak, due today, explainers, reset and demo profile UI | codex | 2026-10-18 | M | L-23a, L-12, L-13 | done | `agent/codex/L-23-progress` | yes | yes | - |
| L-24 | Hero CTA straight to the first sign; session-complete screen | codex | 2026-10-18 | S | L-11 | done | `agent/codex/L-24-cta-complete` | yes | yes | - |
| L-25 | Sentence challenge UI (last unit on the Path) | codex | 2026-10-19 | M | L-22b, L-16b | done | `agent/codex/L-25-sentences-ui` | yes | yes | DN-08 |
| L-26 | Phone, accessibility and polish pass across Learn | codex | 2026-10-20 | M | L-21, L-23, L-25 | done | `agent/codex/L-26-polish` | yes | yes | - |
| L-27 | Camera off while browsing or hidden; hover hint only on hover devices; GSAP restore | codex | 2026-10-20 | S | L-04, L-16b | done | `agent/codex/L-27-camera-off` | yes | no | - |
| L-28 | Learn docs match what shipped | claude-code-thesis | 2026-10-20 | S | L-26 | todo | `agent/claude/L-28-learn-docs` | yes | no | - |
| L-29 | iPhone: restart the camera automatically after an app switch | codex | 2026-10-16 | S | L-04 | done | `agent/codex/L-29-ios-camera-resume` | yes | no | - |
| L-30 | Score one-handed references as one-handed (ignore stray hand labels) | codex | 2026-10-16 | S | - | done | `agent/codex/L-30-stray-hands` | yes | no | - |
| L-31 | Third scenario from corpus signs (optional, only if kvn approves DN-19) | codex | backlog (earliest 2026-10-19) | M | K-05 | cancelled | `agent/codex/L-31-scenario3` | yes | yes | DN-19 |
| L-32 | Sequence-from-memory level (only if Lithira's mapper supplies an order) | codex | backlog | M | K-03 | todo | `agent/codex/L-32-sequence` | yes | yes | DN-08 |
| L-33 | Per-sign finger cut-offs: one time-boxed test; labels return only if they pass the bar | codex | 2026-10-17 | M | L-17, L-30 | done | `agent/codex/L-33-finger-cutoffs` | yes | yes | - |
| R-00 | M0: manual port of the merged blocker fixes into the R26 working tree | claude-code | 2026-10-14 | S | L-01, L-02, L-04, L-05, L-06, K-01 | done | `none (R26 working tree; never commit)` | no | yes | - |
| R-01 | Portability refactor: base and Suvana-only code driven by suvana.config.json | codex | 2026-10-14 | M | L-06 | done | `agent/codex/R-01-portability` | yes | yes | DN-01 |
| R-02 | sync.mjs `port learn --to <R26>` with --check | codex | 2026-10-16 | S | R-01 | done | `agent/codex/R-02-port-command` | no | no | - |
| R-03 | M1: port Learn into the R26 working tree | claude-code | 2026-10-17 | S | R-02 | done | `none (R26 working tree)` | no | yes | - |
| R-04 | M2: port Learn into the R26 working tree | claude-code | 2026-10-19 | S | R-03 | todo | `none (R26 working tree)` | no | yes | - |
| R-05 | Final Learn port to R26 for the demo | claude-code | 2026-10-21 | S | R-04, L-26, L-27, Q-08 | todo | `none (R26 working tree)` | no | no | - |
| I-01 | Shell: remove the 'SoundGuard Ecosystem' sub-brand, configurable Recognize URL, fix the stale example | antigravity | 2026-10-13 | S | - | done | `agent/antigravity/I-01-shell-brand` | no | yes | - |
| I-02 | Alerts: user-visible strings say Suvana | antigravity | 2026-10-13 | S | - | done | `agent/antigravity/I-02-alerts-strings` | no | yes | - |
| I-03 | Fix stale integration docs and record the Communicate gate | antigravity | 2026-10-14 | S | - | done | `agent/antigravity/I-03-stale-docs` | no | no | - |
| I-04 | Recognition re-sync of Lahiru's 656f371..ec2604a (code and tests only) | codex | 2026-10-14 | M | K-01 | done | `agent/codex/I-04-recognition-sync` | no | no | DN-18 |
| I-05 | Reference-converter: take kvn's port 5909a56 and declare the 3 undeclared diffs | codex | 2026-10-16 | S | I-04 | done | `agent/codex/I-05-converter-port` | yes | no | - |
| I-06 | Shell: Privacy, Terms, Contact and Pricing/business-model pages | codex | 2026-10-18 | M | I-01 | done | `agent/codex/I-06-shell-pages` | no | yes | DN-04, DN-15 |
| I-07 | Communicate own instance: placeholder-seed guard, gloss import script, env example | antigravity | 2026-10-16 | S | - | done | `agent/antigravity/I-07-communicate-scripts` | no | no | - |
| I-08 | Recognition container: Docker build, latency comparison, /api/info, back link and theme | codex | 2026-10-17 | M | I-04 | done | `agent/codex/I-08-recognition-container` | no | yes | - |
| I-09 | Speech container: build check and readiness notes | codex | 2026-10-19 | S | - | done | `agent/codex/I-09-speech-container` | no | no | - |
| I-10 | Shell: wire the hosted Recognize URL, Alerts download section, phone pass | codex | 2026-10-19 | S | D-04, I-01 | in-progress | `agent/codex/I-10-shell-wiring` | no | yes | - |
| I-11 | Verify the shared session behind the Vercel rewrite; fix if needed | codex | 2026-10-19 | S | D-03 | todo | `agent/codex/I-11-auth-rewrite` | no | no | - |
| I-12a | Alerts rebuild config under kvn's EAS (only if DN-14 = rebuild) | codex | 2026-10-16 | S | I-02 | done | `agent/codex/I-12a-alerts-eas` | no | no | DN-14 |
| I-12 | Alerts APK: Karindra builds from Suvana's tree, or kvn rebuilds under his EAS | kvn | 2026-10-17 to 2026-10-19 | M | K-03, I-02 | done | `n/a` | no | no | DN-14 |
| I-13 | Import Lithira's glosses and animations into kvn's Atlas and Cloudinary | kvn | 2026-10-20 | M | I-07, K-03 | todo | `n/a` | no | no | - |
| I-14 | Learn and Communicate bridge: /learn/?sign=GLOSS deep link | codex | 2026-10-20 | S | L-16a, D-03 | todo | `agent/codex/I-14-deep-link` | yes | yes | - |

## Task details

### K-01: Merge the re-sync branch and this plan into main; set up local excludes and pull R26

- **Owner / day / size:** kvn / 2026-10-12 / S
- **Depends on:** nothing
- **Branch:** `n/a (kvn, GitHub Desktop)` | **r26_port:** no | **screenshots:** no
- **Why:** main (9152637) is 5 commits behind 846d4fd, which holds tools/sync (needed by CI's sync-guards job), the Suvana CLAUDE.md and the 10-Oct re-syncs. Every agent worktree must start from one base, and every agent must be able to read docs/plan on main.
- **Files:** `docs/plan/** (commit)`, `AGENTS.md, CLAUDE.md (commit; DN-12)`, `C:/Users/User/Documents/Suvana/.git/info/exclude (local, untracked)`
- **Acceptance:**
  - [ ] docs/plan/ is committed (on docs/revolution-plan or a docs branch) and both that branch and sync/upstream-2026-10 are merged into main and pushed
  - [ ] `git log main --oneline -8` shows 846d4fd and the plan commit
  - [ ] GitHub Actions CI on main is green, including the sync-guards job (it must pass on main, not only on the branch)
  - [ ] The line `.agent-local/` is appended to C:/Users/User/Documents/Suvana/.git/info/exclude (one file covers every worktree)
  - [ ] Folder C:/Users/User/Documents/Suvana-wt exists
  - [ ] In C:/Users/User/Documents/R26-SE-019: on main, `git pull` fast-forwards to origin/main (this brings Lahiru's 12-Oct commits into kvn's tree); `git status` is clean

### K-02: Decide the open decisions by their needed-by dates

- **Owner / day / size:** kvn / 2026-10-12 to 2026-10-19 / S
- **Depends on:** nothing; decisions DN-01..DN-20
- **Branch:** `n/a` | **r26_port:** no | **screenshots:** no
- **Why:** Several tasks cannot finish without a decision. Each decision in DECISIONS.md has a needed-by date tied to the first task that consumes it.
- **Files:** `docs/plan/DECISIONS.md`
- **Acceptance:**
  - [ ] DN-12 is decided on 12 Oct (before Q-01 starts)
  - [ ] Every other DN has a chosen option and a date in DECISIONS.md by its needed-by date
  - [ ] If kvn answers in chat, the agent he answered records it in its handoff file; kvn (or a planner session) copies it into DECISIONS.md on main

### K-03: Send the teammate asks to Lithira, Lahiru and Karindra

- **Owner / day / size:** kvn / 2026-10-13 / S
- **Depends on:** nothing
- **Branch:** `n/a` | **r26_port:** no | **screenshots:** no
- **Why:** Communicate's animations, the recognition model facts and the Alerts APK depend on teammates. kvn has none of their secrets or data.
- **Files:** none in the repo
- **Acceptance:**
  - [ ] The messages in 05-integration.md section 5 are sent on 13 Oct
  - [ ] Deadlines stated: Karindra 15 Oct; Lithira and Lahiru 16 Oct
  - [ ] Each reply (or silence at the deadline) is logged as a LOG.md entry

### K-04: Create accounts and secrets: three Vercel projects, Atlas M0, Cloudinary, NEXTAUTH_SECRET, optional Gemini key

- **Owner / day / size:** kvn / 2026-10-13 to 2026-10-14 / M
- **Depends on:** K-01
- **Branch:** `n/a` | **r26_port:** no | **screenshots:** no
- **Why:** Suvana has never been deployed. A phone camera needs HTTPS, and Communicate needs its own database because kvn has none of Lithira's secrets.
- **Files:** none in the repo
- **Acceptance:**
  - [ ] Vercel project suvana-learn exists by 13 Oct evening (Root Directory apps/learn, Git integration on kavindu-rakn/Suvana, production branch main)
  - [ ] suvana-communicate and suvana-shell exist by 16 Oct with the Root Directories and env vars in 06-deploy.md section 2
  - [ ] Atlas M0 cluster and a Cloudinary account exist; secrets live only in Vercel env and in local .env.local files, never in git
  - [ ] ADMIN_EMAILS is set in Vercel and in the local apps/communicate/.env.local
  - [ ] Ignored Build Step `git diff --quiet HEAD^ HEAD -- .` is set on each project

### K-05: Approve the starter curriculum, verify a batch of meanings, decide a third scenario

- **Owner / day / size:** kvn / 2026-10-15 / M
- **Depends on:** L-09; decisions DN-19
- **Branch:** `kvn's own branch, or tell an agent` | **r26_port:** yes | **screenshots:** no
- **Why:** Unit order is a curriculum choice and meanings must be human-verified; agents may invent neither. This task absorbs the old DN-07.
- **Files:** `apps/learn/src/data/curriculum.ts`, `apps/learn/src/data/translations.ts`
- **Acceptance:**
  - [ ] Every unit in curriculum.ts is changed from status 'proposed' to 'approved' or edited by kvn
  - [ ] U1 satisfies the hard rule in 03-learn-spec.md section 3 (kaggle_* only, one hand, still, verified or self-explaining meaning)
  - [ ] Meanings for U1 and the everyday-words unit are verified and added to translations.ts by kvn himself
  - [ ] DN-19 (third scenario) is decided from L-09's coverage table

### K-06: Export the permitted Kaggle clips and upload them to Cloudinary (only if DN-05 allows video)

- **Owner / day / size:** kvn / 2026-10-16 / M
- **Depends on:** L-15a, K-04; decisions DN-05, DN-06
- **Branch:** `n/a` | **r26_port:** no | **screenshots:** no
- **Why:** A novice learns better from a person, but the Kaggle corpus mixes public YouTube footage and private interviews, so the CC0 label may not cover redistributing the video. Video is shown only on kvn's explicit DN-05 decision.
- **Files:** `apps/learn/public/references/video-manifest.json (filled by an agent from kvn's URL list)`
- **Acceptance:**
  - [ ] Cancelled if DN-05 = no video
  - [ ] Otherwise export_clips.py has run against kvn's local dataset copy with output outside the repo, filtered to the clips DN-05 permits
  - [ ] Clips are uploaded under suvana/learn/clips/; the public base URL is given to the L-15b owner to fill the manifest
  - [ ] No clip file appears in `git status`
  - [ ] tools/reference-converter/README.md and LICENSES.md statements 'no video frames are redistributed' are updated in the same change that ships the manifest

### K-07: Convert the Kaggle 'SSL Sentences' clips into references

- **Owner / day / size:** kvn / 2026-10-16 / S
- **Depends on:** L-22a; decisions DN-08
- **Branch:** `n/a (files handed to the L-22b branch)` | **r26_port:** yes | **screenshots:** no
- **Why:** The sentence challenge must use real SSL sentences. The dataset is local to kvn and never enters the repo.
- **Files:** `apps/learn/public/references/kaggle_sent_*.json`
- **Acceptance:**
  - [ ] Cancelled if DN-08 = drop
  - [ ] The converter command from L-22a's handoff has run; kaggle_sent_*.json files carry the usual provenance and licence fields
  - [ ] The number of files matches the converted clips (README says 21); failures are listed
  - [ ] kvn copies the files into the codex worktree for L-22b (or commits them on his own branch); agents do not commit them to main

### K-08: Buy suvana.help

- **Owner / day / size:** kvn / 2026-10-20 / S
- **Depends on:** D-03, D-04
- **Branch:** `n/a` | **r26_port:** no | **screenshots:** no
- **Why:** Commercialisation is graded on one Suvana brand at suvana.help. kvn decided to buy only after the .vercel.app deployments are green.
- **Files:** none in the repo
- **Acceptance:**
  - [ ] Bought by kvn only after the 06-deploy.md smoke passes on suvana-shell.vercel.app (first year $1.99; renewal $32.12, both unverified, recorded in docs/commercialisation.md, which T-07 creates)

### K-09: Ask the supervisor whether any informal usability check is allowed without ethics approval

- **Owner / day / size:** kvn / 2026-10-13 / S
- **Depends on:** nothing
- **Branch:** `n/a` | **r26_port:** no | **screenshots:** no
- **Why:** Ethics approval was never applied for. Proposal O5 cannot be claimed, and rehearsing with friends is itself a check with participants. The supervisor has been unresponsive since March.
- **Files:** none in the repo
- **Acceptance:**
  - [ ] The question is sent on 13 Oct; the answer (or no answer by 18 Oct, treated as 'no') is logged in LOG.md and DECISIONS.md
  - [ ] Until a 'yes' arrives, kvn rehearses alone and no other person tries Learn for the project

### K-10: Daily review, screenshot adoption and merge window

- **Owner / day / size:** kvn / daily 2026-10-13 to 2026-10-21 / S
- **Depends on:** K-01
- **Branch:** `n/a` | **r26_port:** no | **screenshots:** no
- **Why:** Agents may not merge or push, and UI changes are adopted only from rendered screenshots.
- **Files:** `docs/plan/BOARD.md`, `docs/plan/tasks.json`, `docs/plan/DECISIONS.md`
- **Acceptance:**
  - [ ] Each evening (target 19:00-21:00): handoffs read, contact sheets reviewed, each UI change adopted or rejected in LOG.md
  - [ ] Green branches merged bottom-up in GitHub Desktop and pushed (kvn's budget: about 3 h review per day; see 10-schedule.md)
  - [ ] BOARD.md and tasks.json statuses updated on main

### K-11: Demo rehearsals, including the laptop fallback

- **Owner / day / size:** kvn / 2026-10-20 and 2026-10-21 / M
- **Depends on:** Q-05, D-04
- **Branch:** `n/a` | **r26_port:** no | **screenshots:** no
- **Why:** The demo must work on any device and survive Wi-Fi or host failure.
- **Files:** `DEMO.md`
- **Acceptance:**
  - [ ] Rehearsal 1 (20 Oct) and rehearsal 2 (21 Oct) each follow DEMO.md end to end on phone and laptop
  - [ ] The laptop fallback (localhost stack plus cloudflared) is exercised at least once
  - [ ] Problems become fix tasks on BOARD.md

### K-12: Final demo and thesis submission

- **Owner / day / size:** kvn / 2026-10-22 / M
- **Depends on:** T-08, K-11
- **Branch:** `n/a` | **r26_port:** no | **screenshots:** no
- **Why:** Final deliverables are due 22 Oct.
- **Files:** none in the repo
- **Acceptance:**
  - [ ] IT22552860_FINAL is submitted with its Turnitin report
  - [ ] The final demo is delivered

### K-13: Record two hand-fixture clips for automated screenshots

- **Owner / day / size:** kvn / 2026-10-13 / S
- **Depends on:** nothing
- **Branch:** `n/a` | **r26_port:** no | **screenshots:** no
- **Why:** Chromium's fake camera shows a test pattern with no hands, so result, finger-state, replay and stars screens can never be rendered for before/after screenshots without a real hand clip.
- **Files:** `C:/Users/User/Documents/Suvana-wt/_fixtures/ (outside every repo)`
- **Acceptance:**
  - [ ] Two clips exist: hands-sign.y4m (about 5 s, kvn imitating one kaggle_* reference shown in Learn) and no-hands.y4m (about 3 s, empty frame)
  - [ ] Converted with ffmpeg to .y4m at 640x480 (command in tools/screens/README.md once Q-00 lands)
  - [ ] The clips are test input only: never committed, uploaded, or used as an SSL reference

### T-01: Create the final-thesis working copy; the uploaded draft stays untouched

- **Owner / day / size:** kvn / 2026-10-13 / S
- **Depends on:** nothing
- **Branch:** `n/a` | **r26_port:** no | **screenshots:** no
- **Why:** The panel deducts 50% if the uploaded draft is edited after 11 Oct. The final thesis is a separate file.
- **Files:** `C:/Users/User/Documents/S L I I T/Y4S1/RP/Thesis/IT22552860_FINAL.docx`
- **Acceptance:**
  - [ ] IT22552860_FINAL.docx exists as a copy
  - [ ] IT22552860_DRAFT.docx and IT22552860_DRAFT-preview.pdf keep their modified times

### T-02: Draft revised Ch1/Ch4/Ch5 text for what was actually built

- **Owner / day / size:** claude-code-thesis / 2026-10-19 / M
- **Depends on:** T-01; decisions DN-16
- **Branch:** `none (writes outside the repo)` | **r26_port:** no | **screenshots:** no
- **Why:** The final thesis must describe the game path, stages, feedback, deployment and any video truthfully.
- **Files:** `C:/Users/User/Documents/S L I I T/Y4S1/RP/Thesis/final-source/01-introduction.md`, `C:/Users/User/Documents/S L I I T/Y4S1/RP/Thesis/final-source/04-design.md`, `C:/Users/User/Documents/S L I I T/Y4S1/RP/Thesis/final-source/05-implementation.md`
- **Acceptance:**
  - [ ] Starts from scratchpad thesis/*.md; describes only features merged by 19 Oct 09:00; each changed paragraph is marked for kvn
  - [ ] Section 5.5 carries placeholders for the deployed URLs and commit sha, filled on 21 Oct from Q-08
  - [ ] States the capture-protocol change (L-07) and that the 85/60 bands were not recalibrated (unless T-03 re-ran the evaluation)
  - [ ] No invented figures or SSL content; draft text implying per-finger percentages is replaced

### T-03: Draft Ch6/Ch7/Ch8: objectives table, panel responses, limitations, future work

- **Owner / day / size:** claude-code-thesis / 2026-10-20 / M
- **Depends on:** T-02, Q-09, L-13
- **Branch:** `none (writes outside the repo)` | **r26_port:** no | **screenshots:** no
- **Why:** PP1 (game, sentence) and PP2 (adaptation) must be answered explicitly and honestly.
- **Files:** `C:/Users/User/Documents/S L I I T/Y4S1/RP/Thesis/final-source/06-results.md`, `C:/Users/User/Documents/S L I I T/Y4S1/RP/Thesis/final-source/07-discussion.md`, `C:/Users/User/Documents/S L I I T/Y4S1/RP/Thesis/final-source/08-conclusion.md`
- **Acceptance:**
  - [ ] The O1-O5 table uses the wording rules in 09-thesis-final.md (never 'Met' for O1 unless Q-09 measured end-to-end)
  - [ ] The PP2 answer quotes ADAPTATION.md rules exactly; 74.6% appears only with 65.4% and AUC 0.744
  - [ ] Engineering numbers come from the Q-08 gate output and Q-09 latency output, cited
  - [ ] No recognition accuracy and no participant figures

### T-04: Learner-model worked example computed with the real code

- **Owner / day / size:** claude-code-thesis / 2026-10-17 / S
- **Depends on:** L-13
- **Branch:** `agent/claude/T-04-worked-example` | **r26_port:** yes | **screenshots:** no
- **Why:** An open draft item and the clearest way to show the PP2 panel how adaptation works.
- **Files:** `apps/learn/src/learner/workedExample.test.ts`, `C:/Users/User/Documents/S L I I T/Y4S1/RP/Thesis/final-source/04-design.md`
- **Acceptance:**
  - [ ] A test runs one sign through 4 scripted attempts using mastery.ts/session.ts/game.ts and prints EWMA, need, stars and the chosen next item with its reason
  - [ ] The thesis table reproduces that output exactly and cites the test

### T-05: Figures, placeholders, chart titles, accessibility and Appendix B

- **Owner / day / size:** kvn / 2026-10-21 / M
- **Depends on:** T-02, T-03; decisions DN-16
- **Branch:** `n/a` | **r26_port:** no | **screenshots:** no
- **Why:** Open CHECKs in the draft.
- **Files:** `C:/Users/User/Documents/S L I I T/Y4S1/RP/Thesis/IT22552860_FINAL.docx`
- **Acceptance:**
  - [ ] The 4 figure placeholders are filled or removed and figures renumbered; chart titles and footnotes complete; alt text and contrast checked
  - [ ] Appendix B describes kvn's own revisions in his words; DN-16 applied; section 5.5 placeholders filled

### T-07: Commercialisation write-up (open core, licences, costs, competitors)

- **Owner / day / size:** claude-code-thesis / 2026-10-19 / S
- **Depends on:** nothing; decisions DN-04, DN-15
- **Branch:** `agent/claude/T-07-commercialisation` | **r26_port:** no | **screenshots:** no
- **Why:** Commercialisation is graded; it feeds the presentation, the pricing page and the thesis if the template allows.
- **Files:** `docs/commercialisation.md`
- **Acceptance:**
  - [ ] Covers open-core editions, licence constraints (CC0 landmarks vs BY-NC-SA; corpus-video provenance), B2B/B2G/NGO lines, on-device privacy, and costs with source and date (domain $1.99/$32.12; Vercel Pro needed for commercial use; recognition host from DN-02)
  - [ ] Competitor table from 02-learn-vision.md with sources; no users, revenue or prices unless kvn supplies them

### T-08: Turnitin report and final PDF

- **Owner / day / size:** kvn / 2026-10-22 / M
- **Depends on:** T-05, T-09
- **Branch:** `n/a` | **r26_port:** no | **screenshots:** no
- **Why:** Submission requirements.
- **Files:** `C:/Users/User/Documents/S L I I T/Y4S1/RP/Thesis/IT22552860_FINAL.docx`
- **Acceptance:**
  - [ ] Turnitin similarity report generated and acceptable; files named by registration number; final PDF exported

### T-09: Own-words pass on chapters that will not change

- **Owner / day / size:** kvn / 2026-10-16 to 2026-10-18 / M
- **Depends on:** T-01
- **Branch:** `n/a` | **r26_port:** no | **screenshots:** no
- **Why:** Moves thesis load off 21 Oct, which already holds rehearsal 2, the final port and the tag.
- **Files:** `C:/Users/User/Documents/S L I I T/Y4S1/RP/Thesis/IT22552860_FINAL.docx`
- **Acceptance:**
  - [ ] Ch2 (literature) and Ch3 (methodology) own-words pass done by 18 Oct
  - [ ] Remaining chapters get their pass on 21 Oct after the T-02/T-03 text is pasted

### D-01: Deployment smoke script and DEPLOYMENT.md refresh

- **Owner / day / size:** antigravity / 2026-10-17 / S
- **Depends on:** L-06
- **Branch:** `agent/antigravity/D-01-smoke` | **r26_port:** no | **screenshots:** no
- **Why:** Suvana has never run in production, and DEPLOYMENT.md is stale (labels row, HF free tier, shell env).
- **Files:** `tools/smoke/smoke.mjs`, `tools/smoke/README.md`, `DEPLOYMENT.md`
- **Acceptance:**
  - [ ] `node tools/smoke/smoke.mjs <base-url>` runs every check in 06-deploy.md section 4 (status codes and cache headers) and exits non-zero on any failure
  - [ ] DEPLOYMENT.md matches 06-deploy.md: project table, env, order, Hobby caveat, recognition hosting options, domain steps

### D-02: Deploy suvana-learn (.vercel.app) from current main

- **Owner / day / size:** kvn / 2026-10-14 / S
- **Depends on:** K-01, K-04
- **Branch:** `n/a` | **r26_port:** no | **screenshots:** no
- **Why:** Learn is static and needs no secrets. Deploying early enables phone testing from 15 Oct; every later merge to main redeploys it automatically.
- **Files:** none in the repo
- **Acceptance:**
  - [ ] https://suvana-learn.vercel.app/learn/ returns 200 (the bare root returns 404 until L-06 is merged, then redirects)
  - [ ] On kvn's phone the camera starts on /learn/
  - [ ] After L-06 merges, `node tools/smoke/smoke.mjs` learn checks pass (once D-01 exists)

### D-03: Deploy suvana-communicate, then suvana-shell

- **Owner / day / size:** kvn / 2026-10-17 / M
- **Depends on:** D-02, I-01, I-07, K-04; decisions DN-13
- **Branch:** `n/a` | **r26_port:** no | **screenshots:** no
- **Why:** One Suvana origin with the shared session and every module.
- **Files:** none in the repo
- **Acceptance:**
  - [ ] suvana-communicate builds with NEXT_PUBLIC_BASE_PATH=/communicate and kvn's Atlas, Cloudinary and secret; register and sign in work on its own URL
  - [ ] https://suvana-shell.vercel.app/ serves the landing, /learn/, /communicate and /alerts/; the smoke script passes
  - [ ] No placeholder animations exist in the production database

### D-04: Host Recognize on the chosen platform with an uptime ping

- **Owner / day / size:** kvn / 2026-10-18 / M
- **Depends on:** I-08; decisions DN-02
- **Branch:** `n/a` | **r26_port:** no | **screenshots:** no
- **Why:** Recognize has no host anywhere; hosting is the only way to show it on a phone.
- **Files:** none in the repo
- **Acceptance:**
  - [ ] Live on the DN-02 host; /api/info reports numClasses: 171; one live recognition works on a phone
  - [ ] Uptime ping every 10 minutes from 20 to 22 Oct
  - [ ] The URL is passed to I-10

### D-05: Speech service: laptop-only by default; host only if DN-03 says so

- **Owner / day / size:** kvn / 2026-10-19 / S
- **Depends on:** I-09; decisions DN-03
- **Branch:** `n/a` | **r26_port:** no | **screenshots:** no
- **Why:** CPU speech inference is slow and hosting costs money; laptop-only keeps kvn's load down.
- **Files:** none in the repo
- **Acceptance:**
  - [ ] Default: DN-03 = laptop only; the speech container runs on the laptop and its URL is registered in Communicate Settings on demo day; DEMO.md says so
  - [ ] If DN-03 = host: a hosted URL is registered and STT tested once

### D-06: Commit the R26 M0 port and redeploy learn-ssl-module.vercel.app

- **Owner / day / size:** kvn / 2026-10-14 / S
- **Depends on:** R-00
- **Branch:** `n/a (R26: kvn commits)` | **r26_port:** no | **screenshots:** no
- **Why:** The live R26 Learn shows invented per-finger percentages and serves a year-long immutable cache. Those fixes must be live early, not on 17 Oct.
- **Files:** none in the repo
- **Acceptance:**
  - [ ] kvn commits the R-00 working-tree changes in R26 with R-00's two blocks and pushes
  - [ ] 07-r26-mirror.md section 6 is followed: preview, share-link check on desktop and phone, promote
  - [ ] https://learn-ssl-module.vercel.app/ returns 200 and shows no '%' next to fingers

### D-07: Commit the R26 M1 port and redeploy learn-ssl-module

- **Owner / day / size:** kvn / 2026-10-17 / S
- **Depends on:** R-03
- **Branch:** `n/a (R26)` | **r26_port:** no | **screenshots:** no
- **Why:** R26 must always have kvn's latest Learn.
- **Files:** none in the repo
- **Acceptance:**
  - [ ] Same as D-06 for M1

### D-08: Commit the R26 M2 port and redeploy learn-ssl-module

- **Owner / day / size:** kvn / 2026-10-19 / S
- **Depends on:** R-04
- **Branch:** `n/a (R26)` | **r26_port:** no | **screenshots:** no
- **Why:** R26 must always have kvn's latest Learn.
- **Files:** none in the repo
- **Acceptance:**
  - [ ] Same as D-06 for M2

### D-09: Attach suvana.help to suvana-shell and re-run the smoke

- **Owner / day / size:** kvn / 2026-10-20 / S
- **Depends on:** K-08
- **Branch:** `n/a` | **r26_port:** no | **screenshots:** no
- **Why:** The one-brand commercial URL.
- **Files:** none in the repo
- **Acceptance:**
  - [ ] suvana.help and www.suvana.help (redirecting to the apex) resolve over HTTPS to suvana-shell
  - [ ] The smoke passes against https://suvana.help; sign-in carries across /, /learn/ and /communicate
  - [ ] VITE_RECOGNIZE_URL (and AUTH_URL if used) updated; a docs agent updates DEPLOYMENT.md and README.md in that day's single-writer slot

### D-10: Final R26 commit and learn-ssl-module redeploy

- **Owner / day / size:** kvn / 2026-10-21 / S
- **Depends on:** R-05
- **Branch:** `n/a (R26)` | **r26_port:** no | **screenshots:** no
- **Why:** The demo build must be live at R26's URL.
- **Files:** none in the repo
- **Acceptance:**
  - [ ] Same as D-06 for the final range; the deployment's git sha is recorded next to the Suvana tag demo-2026-10-21

### Q-00: Screenshot tooling: Playwright shooter, contact sheet, fake-camera clips, dev-only fixtures page

- **Owner / day / size:** antigravity / 2026-10-13 / M
- **Depends on:** K-01
- **Branch:** `agent/antigravity/Q-00-screens` | **r26_port:** no | **screenshots:** no
- **Why:** Every UI task needs desktop and phone before/after screenshots, and Codex has no browser. Result screens need a real hand clip in the fake camera.
- **Files:** `tools/screens/package.json`, `tools/screens/package-lock.json`, `tools/screens/shoot.mjs`, `tools/screens/contact-sheet.mjs`, `tools/screens/README.md`, `apps/learn/fixtures.html`, `apps/learn/src/dev/fixtures.tsx`, `apps/learn/src/dev/fixtures/*.json`
- **Acceptance:**
  - [ ] tools/screens has its own package.json with @playwright/test (npm 10 lockfile); apps/learn/package.json is NOT touched
  - [ ] `node tools/screens/shoot.mjs --base <url> --id <TASK> --label before|after --paths /learn/,...` writes desktop-1280x800 and phone-390x844 PNGs to <worktree>/.agent-local/screens/<TASK>/
  - [ ] `--fake-video <file.y4m>` launches Chromium with --use-fake-device-for-media-stream and --use-file-for-fake-video-capture; README gives the ffmpeg command to make a .y4m
  - [ ] `--seed <attempts.json>` seeds IndexedDB through addInitScript so Path/Progress states can be shot
  - [ ] `node tools/screens/contact-sheet.mjs <TASK>` writes index.html with before/after side by side for kvn
  - [ ] fixtures.html renders ScoreBadge and the result card from JSON fixtures in dev only; `npm run build` output contains no fixtures.html
  - [ ] Learn gates pass
  - [ ] REWORK 13 Oct (kvn review): rebase on main; fixtures.tsx uses the new ScoreBadge props (`hands`, no HandAccuracyInfo/twoHanded/handsData) so `npm run build` (tsc) passes
  - [ ] REWORK: every fixture gloss is a real gloss from public/reference-index.json (STHUTHI, AMMA, SUBHA_UDASANAK are not), the two-handed fixture is a real two-handed reference, and no fixture contains invented hint or coaching text (use strings the scorer actually produces, or none) and no per-finger percentages

### Q-01: Agent instruction files: root AGENTS.md as single source, slim CLAUDE.md, per-module AGENTS.md

- **Owner / day / size:** claude-code / 2026-10-13 / M
- **Depends on:** K-01; decisions DN-12
- **Branch:** `agent/claude/Q-01-agents-md` | **r26_port:** no | **screenshots:** no
- **Why:** Codex and Antigravity read AGENTS.md, Claude reads CLAUDE.md. No rule may be lost and nothing may drift. The plan itself already lives in docs/plan, so this task does not block other tasks. Root AGENTS.md and CLAUDE.md (= @AGENTS.md + Claude-only notes) already exist on docs/revolution-plan (DN-12 implemented, pending kvn's merge in K-01); this task reconciles them and adds the rest.
- **Files:** `AGENTS.md`, `CLAUDE.md`, `apps/learn/AGENTS.md`, `apps/learn/CLAUDE.md`, `services/recognition/AGENTS.md`, `services/recognition/CLAUDE.md`, `.gitignore`, `README.md`
- **Acceptance:**
  - [ ] Root AGENTS.md is 10 KB or less: guardrails, owners, conventions, a summary of docs/plan/08-agent-protocol.md, and a doc index that tells Codex to read apps/learn/AGENTS.md before Learn work (Codex started at the worktree root does not load it)
  - [ ] CLAUDE.md = '@AGENTS.md' plus Claude-only notes; a diff table in the handoff shows every rule of today's CLAUDE.md and where it now lives
  - [ ] apps/learn and services/recognition each have AGENTS.md plus a CLAUDE.md containing only '@AGENTS.md'
  - [ ] No GEMINI.md and no Antigravity workflows are created
  - [ ] In .gitignore, `.claude/` becomes `.claude/*` with `!.claude/rules/` and `!.claude/launch.json`
  - [ ] README.md gets one line linking docs/plan/README.md

### Q-02: .gitattributes for line endings and a union merge for LOG.md

- **Owner / day / size:** antigravity / 2026-10-14 / S
- **Depends on:** K-01
- **Branch:** `agent/antigravity/Q-02-gitattributes` | **r26_port:** no | **screenshots:** no
- **Why:** Three tools on Windows otherwise produce whole-file CRLF/LF diffs, and parallel branches all append to docs/plan/LOG.md.
- **Files:** `.gitattributes`
- **Acceptance:**
  - [ ] `* text=auto` with LF for source and text files, binaries marked binary
  - [ ] `docs/plan/LOG.md merge=union` is present
  - [ ] `git add --renormalize . && git status --short | wc -l` is run: if more than 20 files change, the renormalisation is NOT committed; the list goes to kvn in the handoff

### Q-03: Close CI gaps: concurrency, Docker build, R26-form Learn build, dist smoke, extended brand grep

- **Owner / day / size:** codex / 2026-10-20 / M
- **Depends on:** R-01, I-01, I-02
- **Branch:** `agent/codex/Q-03-ci` | **r26_port:** no | **screenshots:** no
- **Why:** CI never builds the Dockerfiles, never checks Learn in its R26 form, and cannot catch sub-brands outside Learn.
- **Files:** `.github/workflows/ci.yml`
- **Acceptance:**
  - [ ] `concurrency` with cancel-in-progress added
  - [ ] A docker-build job for services/recognition and services/speech runs on workflow_dispatch only (no push)
  - [ ] A job builds apps/learn with suvana.config.json removed and asserts dist/index.html has no '/learn/' paths
  - [ ] A job asserts dist/learn/index.html references only /learn/assets and dist/learn/wasm/*.wasm exists
  - [ ] A grep job fails on 'SoundGuard|SignSpeak|Sawana' in user-visible files under apps/shell, apps/alerts, apps/communicate/app and services/recognition/webapp/static, with an allow-list for internal identifiers (soundguard.js, signspeak.contribute.speakerKey, withSoundGuardBackground)
  - [ ] CI green on the branch

### Q-04: Playwright smoke for Learn (keyboard, storage failure, onboarding)

- **Owner / day / size:** antigravity / 2026-10-15 / M
- **Depends on:** Q-00, L-02, L-05, L-07
- **Branch:** `agent/antigravity/Q-04-e2e` | **r26_port:** no | **screenshots:** no
- **Why:** There are no component or E2E tests; keyboard, storage and onboarding regressions would reach the demo unnoticed.
- **Files:** `tools/screens/e2e/*.spec.ts`, `tools/screens/playwright.config.ts`, `tools/screens/package.json`
- **Acceptance:**
  - [ ] Runs against `vite preview` with the fake camera (K-13 clips when present, else the default pattern)
  - [ ] Specs: onboarding shows on first run; Esc during countdown stays in Practice; Enter on a focused Retry retries; blocked IndexedDB (addInitScript) still renders the sign list with a notice
  - [ ] `npm run e2e` in tools/screens; documented; not yet required in CI
  - [ ] Later UI tasks add their own specs here (new files only)

### Q-05: DEMO.md: timed script, device plan, fallback runbook, adversarial assistant check

- **Owner / day / size:** codex / 2026-10-20 / S
- **Depends on:** D-03, D-04
- **Branch:** `agent/codex/Q-05-demo` | **r26_port:** no | **screenshots:** no
- **Why:** The final demo needs a timed script per module and a rehearsed fallback for every external dependency.
- **Files:** `DEMO.md`
- **Acceptance:**
  - [ ] Timed script for Shell, Learn (starter sign Watch/Try/Recall, Path, feedback, 'Why this sign?'), Communicate (avatar-only if Lithira's data is missing), Recognize, Alerts
  - [ ] A 'say up front' list: deployed vs local, no recognition accuracy quoted, 74.6% only with 65.4%, Hero cards are decorative, no participants
  - [ ] Fallback commands: localhost ports, cloudflared, `vite preview` offline Learn, hotspot
  - [ ] Learn demo-profile and reset steps
  - [ ] Three adversarial assistant prompts ('how do I sign X', 'translate Y to SSL', 'describe the handshape for Z') and the expected refusal; result of running them recorded

### Q-06: Full real-device matrix (iPhone Safari, Android Chrome, laptop)

- **Owner / day / size:** kvn / 2026-10-19 / M
- **Depends on:** Q-06a, L-16b
- **Branch:** `n/a` | **r26_port:** no | **screenshots:** no
- **Why:** Camera lifecycle on real phones is the riskiest untested area.
- **Files:** `docs/plan/handoffs/Q-06.md (written by an agent from kvn's notes)`
- **Acceptance:**
  - [ ] On each device against the deployed URL: permission deny then retry, app switch and return, rotate, camera unplug or disable (laptop), slow network, full Watch/Try/Recall
  - [ ] Failures become fix tasks for 20 Oct

### Q-06a: Early phone check of the deployed Learn and device inventory

- **Owner / day / size:** kvn / 2026-10-15 / S
- **Depends on:** D-02, L-04
- **Branch:** `n/a` | **r26_port:** no | **screenshots:** no
- **Why:** Finding phone camera problems on 19 Oct leaves one day to fix them.
- **Files:** none in the repo
- **Acceptance:**
  - [ ] kvn records which phones he owns or can borrow (iPhone? Android?) in LOG.md
  - [ ] On each: camera starts, one Practice take completes, app switch and return works or fails (noted)
  - [ ] Failures become fix tasks for the codex lane on 16 Oct

### Q-07: Handedness reality check

- **Owner / day / size:** kvn / 2026-10-14 / S
- **Depends on:** nothing
- **Branch:** `n/a` | **r26_port:** no | **screenshots:** no
- **Why:** MediaPipe gets an unmirrored video, so every 'Left/Right hand' label may be swapped (04-bugs.md S1).
- **Files:** none in the repo
- **Acceptance:**
  - [ ] kvn raises only his right hand in Practice and Record and notes the label shown
  - [ ] Result logged in LOG.md; if swapped, a UI-label-only fix is added to L-26 (scoring untouched)

### Q-08: Demo-ready gate run and release tag proposal

- **Owner / day / size:** claude-code / 2026-10-21 / S
- **Depends on:** L-26, L-27
- **Branch:** `agent/claude/Q-08-gates` | **r26_port:** no | **screenshots:** no
- **Why:** Freeze a known-good commit for the demo, the thesis section 5.5 and the final R26 port.
- **Files:** `docs/plan/handoffs/Q-08.md`
- **Acceptance:**
  - [ ] All gates on main: guard, Learn lint (0 warnings), tests, build size, shell, Communicate (MSYS_NO_PATHCONV=1), recognition pytest, alerts tsc, the Playwright smoke
  - [ ] Regression list checked against 04-bugs.md
  - [ ] kvn receives the tag name demo-2026-10-21 and the sha (kvn tags it); the gate output is saved for T-03

### Q-09: Measure end-to-end feedback latency (capture end to result shown)

- **Owner / day / size:** codex / 2026-10-19 / S
- **Depends on:** L-16a, Q-00, K-13
- **Branch:** `agent/codex/Q-09-latency` | **r26_port:** no | **screenshots:** no
- **Why:** Proposal O1 is feedback within 300 ms. Scoring compute (1.8 ms median) is not that objective; end-to-end is cheap to measure.
- **Files:** `tools/screens/e2e/latency.spec.ts`, `tools/screens/latency-report.mjs`
- **Acceptance:**
  - [ ] Reads the performance marks suvana:capture-end and suvana:result-shown (added by L-16a) over 20 runs with the K-13 clip on kvn's laptop
  - [ ] Prints median and p90 with machine and browser details; output saved in the handoff for T-03
  - [ ] No number is quoted anywhere without this output

### L-01: Replace invented per-finger percentages with measured Correct/Almost/Wrong states (DN-17); one label scale

- **Owner / day / size:** claude-code / 2026-10-13 / S
- **Depends on:** L-02; decisions DN-17
- **Branch:** `agent/claude/L-01-finger-states` | **r26_port:** yes | **screenshots:** yes
- **Why:** Fabricated finger % (PracticeView ~384-408, ScoreBadge 94-242) break 'never invent figures', and the tier titles contradict the 85/60 bands. It is live on learn-ssl-module.vercel.app.
- **Files:** `apps/learn/src/scoring/fingerStates.ts`, `apps/learn/src/scoring/fingerStates.test.ts`, `apps/learn/src/components/PracticeView.tsx`, `apps/learn/src/components/ScoreBadge.tsx`, `apps/learn/src/components/views.css`
- **Acceptance:**
  - [ ] fingerStates.ts derives Correct/Almost/Wrong per finger (DN-17 wording) from HandScore.perLandmark grouped by LANDMARK_FINGER; Wrong > 0.1 (HINT_MIN_DEVIATION), Almost > 0.05, otherwise Correct; the 0.05 cut-off is documented as an untuned UI constant; tested
  - [ ] No '%' is rendered next to any finger, in UI or SVG titles (grep check in the handoff)
  - [ ] ScoreBadge no longer copies the overall score to every finger; Scenario results show no per-finger data unless real data is passed
  - [ ] Only band() labels (85/60) remain; 'Master Execution' and 'Fluent Signing' tiers removed (Hero decorative cards untouched)
  - [ ] The English meaning span no longer carries lang="si" and the meaning is not shown twice
  - [ ] Stacked on L-02 (logic) as the leaf branch; lint no new warnings; tests pass; before/after screenshots of a result screen at desktop and phone (fixtures page until K-13 exists)

### L-02: Keyboard: Esc no longer exits to the Hero; Enter/Space respect the focused control

- **Owner / day / size:** claude-code / 2026-10-13 / S
- **Depends on:** nothing
- **Branch:** `agent/claude/L-02-keyboard` | **r26_port:** yes | **screenshots:** no
- **Why:** Bugs A1/A2 are demo-killers: Esc cancels a countdown and throws the learner out; Enter on Retry goes to the next sign. Also lint warning PracticeView.tsx:479.
- **Files:** `apps/learn/src/components/AppNavBar.tsx`, `apps/learn/src/components/PracticeView.tsx`
- **Acceptance:**
  - [ ] AppNavBar returns early when e.defaultPrevented; Practice's Esc handlers call preventDefault and are registered in the capture phase (AppNavBar's window listener is registered first, so a bubble-phase guard alone does not work)
  - [ ] Global shortcuts skip button, a, select, input, textarea and [contenteditable] targets
  - [ ] The keyboard effect no longer depends on the whole tracking object; the PracticeView.tsx:479 warning is gone
  - [ ] Manual check written in the handoff: countdown then Esc cancels and stays in Practice; Enter on focused Retry retries

### L-03: Practice capture robustness: wall-clock backstop, safe initial load, no empty-reference logging

- **Owner / day / size:** claude-code / 2026-10-14 / S
- **Depends on:** nothing
- **Branch:** `agent/claude/L-03-capture-robustness` | **r26_port:** yes | **screenshots:** no
- **Why:** Bugs A6 (Practice part), A7 (Practice backstop) and A13: a take can hang forever, an IndexedDB failure empties the sign list, an empty reference logs a 0.
- **Files:** `apps/learn/src/components/PracticeView.tsx`
- **Acceptance:**
  - [ ] setTimeout backstop finishes the take at captureMs+500 even with no frames
  - [ ] Initial load uses Promise.allSettled; a failed IndexedDB still shows the bundled index (uses L-05's safeLoad if merged)
  - [ ] Attempts with hands.length === 0 are not logged
  - [ ] Delta computed against the previous attempt by id
  - [ ] Tracking status 'error' during capture abandons the take with a message; a take running while the tab is hidden is abandoned

### L-04: Camera lifecycle: lost track, frame-loop errors, insecure origin, GPU-to-CPU fallback, resume

- **Owner / day / size:** codex / 2026-10-13 / M
- **Depends on:** nothing
- **Branch:** `agent/codex/L-04-camera-lifecycle` | **r26_port:** yes | **screenshots:** no
- **Why:** Bugs A7, A8, A17 and suspicions S2, S3, S7: an unplugged or backgrounded camera freezes the app silently; phones over plain HTTP show a raw TypeError.
- **Files:** `apps/learn/src/vision/useHandTracking.ts`, `apps/learn/src/vision/handTracker.ts`, `apps/learn/src/vision/useSignCapture.ts`, `apps/learn/src/components/RecordView.tsx`
- **Acceptance:**
  - [ ] track.onended/onmute stop the stream and set status 'error' with 'Camera disconnected' plus a restart action
  - [ ] processFrame wrapped in try/catch; an error sets status 'error' instead of killing the loop
  - [ ] !window.isSecureContext gives 'Camera needs HTTPS'
  - [ ] If createFromOptions with the GPU delegate rejects, retry once with delegate 'CPU'
  - [ ] visibilitychange/pageshow re-play the video or reacquire an ended stream
  - [ ] A stale error is cleared on remount; wall-clock backstops in RecordView and useSignCapture
  - [ ] Lint warning useHandTracking.ts:207 gone; unit tests for pure helpers where feasible

### L-05: Storage resilience: safeLoad, guarded localStorage, top-level ErrorBoundary

- **Owner / day / size:** codex / 2026-10-13 / S
- **Depends on:** nothing
- **Branch:** `agent/codex/L-05-storage` | **r26_port:** yes | **screenshots:** yes
- **Why:** Bugs A6 and A15: blocked IndexedDB or localStorage blanks Scenario, Progress, Library, Study and Record; any render throw gives a white screen.
- **Files:** `apps/learn/src/storage/safeLoad.ts`, `apps/learn/src/storage/safeLoad.test.ts`, `apps/learn/src/storage/StorageNotice.tsx`, `apps/learn/src/storage/StorageNotice.css`, `apps/learn/src/components/ScenarioView.tsx`, `apps/learn/src/components/ProgressView.tsx`, `apps/learn/src/components/LibraryView.tsx`, `apps/learn/src/components/StudyView.tsx`, `apps/learn/src/components/RecordView.tsx`, `apps/learn/src/main.tsx`
- **Acceptance:**
  - [ ] safeLoad() never rejects; returns [] for failed stores plus storageOk; unit-tested with rejecting fakes
  - [ ] The four views and RecordView use it (data-loading lines only); a non-blocking 'progress can't be saved in this browser' notice (own CSS file, not views.css) appears when storageOk is false
  - [ ] localStorage reads at RecordView:50 and StudyView:23-24 wrapped in try/catch
  - [ ] main.tsx wraps <App> in an ErrorBoundary with a Reload button
  - [ ] Before/after screenshots of the notice state at desktop and phone

### L-06: Cache headers, standalone root redirect, asset-version rule

- **Owner / day / size:** codex / 2026-10-13 / S
- **Depends on:** nothing
- **Branch:** `agent/codex/L-06-cache-headers` | **r26_port:** yes | **screenshots:** no
- **Why:** Bugs A9/A10: year-long immutable caching of un-hashed references, wasm and models; the deployment root returns 404. Browsers that already cached R26 assets keep them for a year.
- **Files:** `apps/learn/vercel.json`, `apps/learn/src/app/assetVersion.ts`, `apps/learn/src/vision/handTracker.ts (WASM_DIR, MODEL_PATH)`, `reference loader file (the one that fetches references/*.json)`
- **Acceptance:**
  - [ ] Suvana vercel.json: /learn/(models|references|wasm)/(.*) -> 'public, max-age=86400, stale-while-revalidate=604800' (no immutable); non-permanent redirect '/' -> '/learn/'
  - [ ] The handoff gives the R26-form vercel.json change (header on /(models|references|wasm)/(.*), NO redirect) for R-00
  - [ ] assetVersion.ts exports ASSET_VERSION; references, wasm and model URLs carry ?v=ASSET_VERSION; the rule 'bump ASSET_VERSION whenever a reference, wasm or model file changes' is written in apps/learn/README.md's maintenance notes or the handoff
  - [ ] Verified later by D-01 smoke

### L-07: First-run onboarding, hands-in-frame gate, longer capture window with learner-take trimming

- **Owner / day / size:** claude-code / 2026-10-14 / M
- **Depends on:** L-03
- **Branch:** `agent/claude/L-07-onboarding` | **r26_port:** yes | **screenshots:** yes
- **Why:** Learnability B3/B10: no guide; Record works before hands are visible; a fixed durationMs+1500 window cuts off hesitant novices.
- **Files:** `apps/learn/src/components/Onboarding.tsx`, `apps/learn/src/components/Onboarding.css`, `apps/learn/src/components/PracticeView.tsx`, `apps/learn/src/scoring/trimTake.ts`, `apps/learn/src/scoring/trimTake.test.ts`
- **Acceptance:**
  - [ ] A 3-step overlay (frame yourself; watch at 0.5x then 'My turn', mirror explained; what the 85/60 match bands mean, not correctness) on first run and from a 'How it works' link; first-run flag stored with try/catch
  - [ ] Live 'hands in frame' pill; Record disabled until hands are seen in 5 consecutive frames
  - [ ] Capture window = max(2 x reference.durationMs, durationMs + 3000)
  - [ ] Leading and trailing no-hand frames are trimmed from the learner's take before scoring, matching how the converter trims references (check tools/reference-converter and cite it); tested
  - [ ] No SSL content; all copy generic
  - [ ] Leaf UI branch stacked on L-03; before/after screenshots at desktop 1280x800 and phone 390x844

### L-08: Learner playback: 0.5x start, speed control, mirror label, raw-framing view with frame outline, sized wrist-anchored ghost

- **Owner / day / size:** claude-code / 2026-10-15 / M
- **Depends on:** L-07
- **Branch:** `agent/claude/L-08-playback` | **r26_port:** yes | **screenshots:** yes
- **Why:** Learnability B1/B6 and bug A12: per-clip zoom hides where the hands were and how large the movement was; 1x looping is too fast; the ghost is a stretched 300x150 bitmap.
- **Files:** `apps/learn/src/components/SkeletonPlayer.tsx`, `apps/learn/src/vision/drawing.ts`, `apps/learn/src/components/PracticeView.tsx`, `apps/learn/src/components/views.css`
- **Acceptance:**
  - [ ] 0.5x for the first 2 loops, then 1x; a visible 0.25/0.5/0.75/1 control replaces the cycling button
  - [ ] 'Mirrored: copy it like a mirror' label when mirrored
  - [ ] Default view is raw framing (fitToFrame=false) inside a plain rectangle labelled 'position in the original video frame'; a 'Zoom to hands' toggle restores the per-clip fit
  - [ ] NO body or head silhouette is drawn (references contain no pose; a body outline would imply a location the data does not contain)
  - [ ] Ghost canvas width/height = video.videoWidth/Height; ghost translated so its wrist sits on the learner's tracked wrist
  - [ ] Before/after screenshots (desktop and phone) for a one-handed and a two-handed sign
  - [ ] Update the Practice guide's step 2 (Onboarding, from L-07) to describe the 0.5x start once it exists

### L-09: Curriculum report, data-derived units and scenario coverage table

- **Owner / day / size:** antigravity / 2026-10-14 / M
- **Depends on:** L-10
- **Branch:** `agent/antigravity/L-09-curriculum` | **r26_port:** yes | **screenshots:** no
- **Why:** Cold start is alphabetical (ADINAWA). The planned 'Greetings / numbers 1-5' starter cannot be built: all five greetings and numbers 1, 2, 4, 5 are yohan_* (non-commercial) and there is no '3' in either corpus.
- **Files:** `apps/learn/scripts/curriculum-report.mjs`, `apps/learn/src/data/curriculum.ts`
- **Acceptance:**
  - [ ] The script prints the exact count of glosses with a verified meaning (resolving ~40 vs ~75) and, per category: gloss, licence, hands, motion, hasMeaning
  - [ ] curriculum.ts exports typed units built ONLY by rules from data, marked status 'proposed'; U1 = kaggle_* AND (verified meaning OR self-explaining letter/number/month) AND one hand AND still, 5-8 signs; later units by category then difficulty
  - [ ] No unit list is hand-written by the agent; no meaning, order claim or sign description is invented
  - [ ] A coverage table: for each proposal scenario (healthcare, job interview, social gathering, restaurant, emergency), which existing glosses could serve as single-sign turns, by licence; no gloss order is proposed
  - [ ] The handoff includes readable tables for K-05

### L-10: Reference metadata: hands, motion, duration, licence, hasMeaning in the generated index

- **Owner / day / size:** antigravity / 2026-10-14 / S
- **Depends on:** nothing
- **Branch:** `agent/antigravity/L-10-ref-meta` | **r26_port:** yes | **screenshots:** no
- **Why:** Difficulty, licence mode and the curriculum need per-reference facts derived from data, never from authored descriptions.
- **Files:** `apps/learn/scripts/build-reference-index.mjs`, `apps/learn/src/data/referenceIndex.test.ts`
- **Acceptance:**
  - [ ] build-reference-index.mjs (already run by predev/prebuild/pretest) adds hands (1|2), motion ('still'|'moving' from normalised wrist path, threshold documented as untuned), durationMs, licence (from id prefix), hasMeaning
  - [ ] apps/learn/package.json is untouched; the output stays generated and gitignored
  - [ ] A test over 3 known references passes

### L-11: Path view: units, stars, locks, unit detail, nav entry, 'Why this sign?' chip

- **Owner / day / size:** codex / 2026-10-16 / M
- **Depends on:** L-12, K-05
- **Branch:** `agent/codex/L-11-path` | **r26_port:** yes | **screenshots:** yes
- **Why:** Answers PP1's 'game with levels and goals'. Learn has no levels, goals or unlocks today.
- **Files:** `apps/learn/src/components/PathView.tsx`, `apps/learn/src/components/PathView.css`, `apps/learn/src/App.tsx`, `apps/learn/src/components/AppNavBar.tsx`, `tools/screens/e2e/path.spec.ts`
- **Acceptance:**
  - [ ] A 'Path' destination in the nav; unit cards show title, stars earned/possible and locked/open/passed/mastered from learner/game.ts
  - [ ] Unit detail lists signs with stars and stage buttons; 'Practise this unit' calls startSession (N=8)
  - [ ] Works with an empty attempt log (U1 open, rest locked)
  - [ ] The 'Why this sign?' chip shows the reason from L-13 if merged (else hidden)
  - [ ] A path.spec.ts smoke is added; before/after screenshots (desktop and phone) using --seed states

### L-12: Game logic: stars, unit state, unlocks, daily goal, streak, XP

- **Owner / day / size:** codex / 2026-10-15 / M
- **Depends on:** L-09; decisions DN-10, DN-11
- **Branch:** `agent/codex/L-12-game-logic` | **r26_port:** yes | **screenshots:** no
- **Why:** The game layer must be pure, tested and explainable to the panel.
- **Files:** `apps/learn/src/learner/game.ts`, `apps/learn/src/learner/game.test.ts`, `apps/learn/src/learner/attemptLog.ts`, `apps/learn/src/pilot/exportResults.ts`, `apps/learn/src/data/curriculum.ts (types only)`
- **Acceptance:**
  - [ ] starsFor: 1 = a Try at >=60; 2 = a Try at >=85; 3 = a Recall at >=60 with revealed=false (constants exported and documented as 'match', not correctness)
  - [ ] unitState: passed when every sign has >=2 stars; mastered when every sign is mastered (EWMA >=0.85 after >=3 attempts); U1 always open; passing unit N opens N+1
  - [ ] dailyGoal default 10 scored attempts per local day; streak = consecutive days with the goal met; xp = total stars
  - [ ] Attempt entries gain optional stage ('try'|'recall'|'sentence'), revealed, sessionId; old entries default to 'try'; pilot export tests pass
  - [ ] Full branch coverage of game.ts

### L-13: Adaptation fix: review/new interleave, reachable sessions, reasons, ADAPTATION.md

- **Owner / day / size:** codex / 2026-10-16 / M
- **Depends on:** L-12
- **Branch:** `agent/codex/L-13-adaptation` | **r26_port:** yes | **screenshots:** no
- **Why:** Bugs A4/A5: weak signs are never revisited and sessions are unreachable. PP2 asked how adaptation works.
- **Files:** `apps/learn/src/learner/mastery.ts`, `apps/learn/src/learner/session.ts`, `apps/learn/src/learner/mastery.test.ts`, `apps/learn/src/learner/session.test.ts`, `apps/learn/src/learner/nextExercise.ts`, `apps/learn/src/learner/ADAPTATION.md`
- **Acceptance:**
  - [ ] Due reviews (attempted signs with need > 0.5) come before new signs; a new sign only when no due review exists; sessions interleave about 2 reviews : 1 new
  - [ ] Each recommendation returns a reason: 'review: score dropped' / 'review: not practised for N days' / 'new: next in unit' / 'retry: last two tries below 60'
  - [ ] nextExercise.ts (pure): two Try attempts below 60 -> offer 0.25x plus ghost; a Recall below 60 -> step back to Try; a Try >=85 -> unlock Recall
  - [ ] A test proves a sign scored 30 is resurfaced before an unseen sign
  - [ ] ADAPTATION.md lists every rule and constant (EWMA 0.5; 0.85/3; 0.6; need formula; 0.5 due threshold; interleave; 60/85) in plain words, says 'rule-based by design', marks untuned constants, and names BKT as future work

### L-14: Meaning coverage: verified-first browse and a 'meaning not yet verified' chip

- **Owner / day / size:** codex / 2026-10-15 / S
- **Depends on:** L-10
- **Branch:** `agent/codex/L-14-meaning-coverage` | **r26_port:** yes | **screenshots:** yes
- **Why:** Learnability B2: most signs show only a transliterated label.
- **Files:** `apps/learn/src/components/CategorySignNavigator.tsx`, `apps/learn/src/data/meaningCoverage.ts`, `apps/learn/src/data/meaningCoverage.test.ts`
- **Acceptance:**
  - [ ] Browse orders signs with a verified meaning (or self-explaining letters, numbers, months) first in each category
  - [ ] Unverified signs show a 'meaning not yet verified' chip
  - [ ] translations.ts is not edited
  - [ ] A recommender preference, if it needs learner/ files, is proposed as a diff in the handoff for the codex lane
  - [ ] Before/after screenshots (desktop and phone)

### L-15a: Clip export script (only if DN-05 allows video)

- **Owner / day / size:** codex / 2026-10-15 / S
- **Depends on:** nothing; decisions DN-05
- **Branch:** `agent/codex/L-15a-export-clips` | **r26_port:** no | **screenshots:** no
- **Why:** Maps each kaggle_* reference to its source clip by the recorded sourceFile so kvn can export permitted clips.
- **Files:** `tools/reference-converter/export_clips.py`
- **Acceptance:**
  - [ ] Cancelled if DN-05 = no video
  - [ ] --dataset-dir, --out (refuses a path inside any git repo), --allow-list <file> (refIds DN-05 permits)
  - [ ] Writes <refId>.mp4 (H.264 480p, muted, +faststart), .webm and a .jpg poster; trims only if the reference stores offsets (the handoff states which)
  - [ ] Dry-run mode prints the mapping and counts; no dataset or clip is committed

### L-15b: SignVideo component and video manifest (only if DN-05 allows video)

- **Owner / day / size:** antigravity / 2026-10-16 / M
- **Depends on:** nothing; decisions DN-05, DN-06
- **Branch:** `agent/antigravity/L-15b-signvideo` | **r26_port:** yes | **screenshots:** yes
- **Why:** Shows a real signer where licence and provenance allow; falls back to the skeleton everywhere else.
- **Files:** `apps/learn/src/components/SignVideo.tsx`, `apps/learn/src/components/SignVideo.css`, `apps/learn/src/data/videoManifest.ts`, `apps/learn/src/data/videoManifest.test.ts`, `apps/learn/public/references/video-manifest.json`
- **Acceptance:**
  - [ ] Cancelled if DN-05 = no video
  - [ ] <video muted playsinline loop preload='metadata'>, 0.5x then 1x, mirror toggle, poster; on error falls back to SkeletonPlayer
  - [ ] video-manifest.json schema {refId:{mp4,webm,poster,licence,source}}, initially empty; a test rejects any non-kaggle_ entry
  - [ ] The credit line is copied verbatim from LICENSES.md (Kahawearachchi et al., Sinhala Sign Language Video Dataset) plus the takedown/contact note DN-05 requires
  - [ ] Rendered with a neutral sample video (not SSL content) for screenshots

### L-16a: Practice stage machine: Watch then Try, with performance marks

- **Owner / day / size:** codex / 2026-10-17 / M
- **Depends on:** L-11, L-12, L-13
- **Branch:** `agent/codex/L-16a-watch-try` | **r26_port:** yes | **screenshots:** yes
- **Why:** The core learning loop starts with watching slowly and imitating.
- **Files:** `apps/learn/src/components/PracticeView.tsx`, `apps/learn/src/components/practiceStages.ts`, `apps/learn/src/components/practiceStages.test.ts`, `apps/learn/src/components/views.css`
- **Acceptance:**
  - [ ] Stage machine watch -> try (recall stub disabled) in a pure, tested practiceStages.ts
  - [ ] Watch shows SignVideo if the manifest has the reference (L-15b merged), else the skeleton at 0.5x, with 'My turn'
  - [ ] Try works as today; attempts logged with stage 'try' and sessionId
  - [ ] Stars change and the L-13 next-exercise suggestion show on the result card
  - [ ] performance.mark('suvana:capture-end') and ('suvana:result-shown') emitted for Q-09
  - [ ] Keyboard flows from L-02 hold; before/after screenshots of each stage (desktop and phone)
  - [ ] Update the Practice guide's step 2 to describe the 'My turn' button once it exists

### L-16b: Recall stage: hidden reference, cue, reveal costs the third star

- **Owner / day / size:** codex / 2026-10-18 / M
- **Depends on:** L-16a; decisions DN-09
- **Branch:** `agent/codex/L-16b-recall` | **r26_port:** yes | **screenshots:** yes
- **Why:** The direct answer to PP1's 'showing the accuracy is not enough': the learner performs from memory.
- **Files:** `apps/learn/src/components/PracticeView.tsx`, `apps/learn/src/components/practiceStages.ts`, `apps/learn/src/components/views.css`
- **Acceptance:**
  - [ ] Recall hides the reference and shows the cue (verified meaning via translationOf, else glossLabel, per DN-09)
  - [ ] 'Reveal (costs the 3rd star)' sets revealed=true; after scoring the reference is shown beside the result
  - [ ] No hints before the reveal in Recall
  - [ ] prefers-reduced-motion respected; before/after screenshots (desktop and phone)

### L-17: Feedback engine: gated 'Close match', timing and path hints, mirrored hand label, typed hints

- **Owner / day / size:** codex / 2026-10-17 / M
- **Depends on:** nothing
- **Branch:** `agent/codex/L-17-hints` | **r26_port:** yes | **screenshots:** no
- **Why:** Learnability B5 and bug A11: feedback never says how to fix the attempt, says 'Close match' at low scores, and names the wrong hand when mirrored.
- **Files:** `apps/learn/src/scoring/score.ts`, `apps/learn/src/scoring/score.test.ts`, `apps/learn/src/scoring/hints.ts`, `apps/learn/src/scoring/hints.test.ts`
- **Acceptance:**
  - [ ] 'Close match' only when score >= 85
  - [ ] Timing hint when attemptActiveMs / reference.durationMs is outside [0.67, 1.5] (untuned constants, documented), ratio rounded to 1 decimal
  - [ ] Path hint when the trajectory term contributes more than the handshape term; a test on at least one real recorded attempt pair shows it can fire (if it cannot under 0.8/0.2 weighting, the handoff says so and the hint is dropped)
  - [ ] Missing-hand hint uses the learner's hand when mirrored
  - [ ] Hints are typed objects {kind, finger?, ratio?}, at most 2, ordered by contribution
  - [ ] Score values unchanged: existing evaluation tests pass unchanged
  - [ ] Re-derive HINT_MIN_DEVIATION from the calibration corpus: at 0.1 it fires on 99.7% of fingers in correct takes (fingerStates.calibration.test.ts), which is why Practice hides every 'Check your ...' hint. Per-finger states (D-A15) return only with cut-offs that separate correct from wrong; export HINT_MIN_DEVIATION from score.ts for fingerStates.ts

### L-18: Export the DTW alignment path and worst-frame index

- **Owner / day / size:** codex / 2026-10-18 / S
- **Depends on:** L-17
- **Branch:** `agent/codex/L-18-alignment` | **r26_port:** yes | **screenshots:** no
- **Why:** The side-by-side replay (L-21) needs the alignment and the worst moment, which are computed and discarded today.
- **Files:** `apps/learn/src/scoring/dtw.ts`, `apps/learn/src/scoring/score.ts`, `apps/learn/src/scoring/alignment.test.ts`
- **Acceptance:**
  - [ ] Score result optionally includes alignment: Array<[refFrame, attemptFrame]> and worstFrameIndex
  - [ ] Median scoring time within 10% of the current benchmark
  - [ ] Unit tests on synthetic sequences with a known worst frame

### L-19: Scenario cleanup: previews, author-only tips and hints, playable counts, recall variant

- **Owner / day / size:** codex / 2026-10-17 / M
- **Depends on:** L-05
- **Branch:** `agent/codex/L-19-scenarios` | **r26_port:** yes | **screenshots:** yes
- **Why:** Learnability B8 and bug A16: an incomplete scenario looks playable; learners are sent to the author tool; team-written movement and location hints are presented as fact.
- **Files:** `apps/learn/src/components/ScenarioView.tsx`, `apps/learn/src/components/ScenarioView.css`, `apps/learn/src/data/scenarios/restaurant.json`, `apps/learn/src/data/scenarios/introductions.json`, `apps/learn/src/scenario/types.ts`
- **Acceptance:**
  - [ ] Social Gathering shows 'Preview: 3 of 7 signs available' and is not counted as completable
  - [ ] The Record tip shows only in author mode
  - [ ] Summary counts only playable turns; failed references retried; glossLabel used everywhere
  - [ ] Hints describing movement or location get pendingSignerValidation: true and are HIDDEN from learners (shown only in author mode) until kvn or a signer validates them; no hint text is rewritten or added
  - [ ] 'That looked closer to X' is removed (it reads as recognition)
  - [ ] A recall variant hides the skeleton until after the attempt
  - [ ] Before/after screenshots (desktop and phone)

### L-20: Licence mode (VITE_CONTENT=cc0) and an attribution panel

- **Owner / day / size:** codex / 2026-10-18 / M
- **Depends on:** L-10; decisions DN-04
- **Branch:** `agent/codex/L-20-licence-mode` | **r26_port:** yes | **screenshots:** yes
- **Why:** 360 of 501 references are CC BY-NC-SA, so a commercial edition needs a CC0-only build, and the NC edition needs proper attribution.
- **Files:** `the reference-index loader file`, `apps/learn/src/components/LibraryView.tsx`, `apps/learn/src/components/Attribution.tsx`, `apps/learn/src/components/Attribution.css`, `apps/learn/public/references/LICENSES.md`, `apps/learn/src/data/licence.test.ts`
- **Acceptance:**
  - [ ] With VITE_CONTENT=cc0 the index excludes yohan_*; units and scenarios with missing signs show as Preview; default 'all' unchanged
  - [ ] Library/About lists both corpora with licence, link and 'modified (landmark extraction)' note
  - [ ] The Yohan source URL is added only if found on the dataset page; otherwise the TODO stays and kvn is asked
  - [ ] A test asserts no yohan_ id survives the cc0 filter; before/after screenshots of the attribution panel

### L-21: Feedback UI: side-by-side synced replay, typed hints, fading hints

- **Owner / day / size:** codex / 2026-10-19 / M
- **Depends on:** L-16b, L-17, L-18
- **Branch:** `agent/codex/L-21-replay` | **r26_port:** yes | **screenshots:** yes
- **Why:** A novice needs to see where the attempt diverged, not just a number.
- **Files:** `apps/learn/src/components/ReplayCompare.tsx`, `apps/learn/src/components/ReplayCompare.css`, `apps/learn/src/components/PracticeView.tsx`, `apps/learn/src/components/ScoreBadge.tsx`
- **Acceptance:**
  - [ ] ReplayCompare plays reference and attempt side by side along the alignment at 0.5x, pausing at worstFrameIndex with off fingers highlighted
  - [ ] Result card: band, finger states, at most 2 typed hints, stars change; the 'Check your' string filter removed
  - [ ] Hints collapse behind 'Show tips' once the sign is 'improving'
  - [ ] Phone layout stacks the replays; no horizontal scroll at 360 px
  - [ ] Before/after screenshots with the K-13 clip (desktop and phone)

### L-22a: List the Kaggle sentence labels and prepare the converter command

- **Owner / day / size:** codex / 2026-10-15 / S
- **Depends on:** nothing
- **Branch:** `agent/codex/L-22a-sentence-labels` | **r26_port:** yes | **screenshots:** no
- **Why:** DN-08 needs evidence: if the 21 sentence clip labels are meaningful (not numeric), a sentence Recall cue exists without inventing anything.
- **Files:** `tools/reference-converter/convert_references.py`, `tools/reference-converter/README.md`
- **Acceptance:**
  - [ ] The handoff lists the 21 'SSL Sentences' source labels exactly as the dataset gives them (from tools/reference-converter docs or a dry-run kvn runs; agents never read datasets into the repo)
  - [ ] Converter supports the sentence category and writes kaggle_sent_*.json with provenance; the exact command is given for K-07
  - [ ] A go/no-go note for DN-08 (labels meaningful? clip lengths?)

### L-22b: Sentence data, exclusion from single-sign flows, long-sequence perf test

- **Owner / day / size:** codex / 2026-10-18 / S
- **Depends on:** K-07; decisions DN-08
- **Branch:** `agent/codex/L-22b-sentences` | **r26_port:** yes | **screenshots:** no
- **Why:** PP1 asked for a set of words or a sentence; real Kaggle sentence clips mean the team never authors an order.
- **Files:** `apps/learn/src/data/sentences.ts`, `apps/learn/src/scoring/longsequence.test.ts`, `apps/learn/src/scoring/references.test.ts`, `apps/learn/public/references/kaggle_sent_*.json (from kvn)`
- **Acceptance:**
  - [ ] Cancelled if DN-08 = drop
  - [ ] sentences.ts maps refId to the dataset label exactly as given and an optional meaning only from translations.ts
  - [ ] Sentence references excluded from single-sign browse and recommendations; the licence-provenance test and manifest accept them
  - [ ] A perf test: 6 s vs 6 s scoring under 50 ms on CI
  - [ ] UI label constant 'Experimental: whole-sentence match, not calibrated'

### L-23a: Demo profile and reset at the storage layer

- **Owner / day / size:** codex / 2026-10-17 / S
- **Depends on:** nothing
- **Branch:** `agent/codex/L-23a-profile` | **r26_port:** yes | **screenshots:** no
- **Why:** Keeps kvn's test attempts off the demo laptop; storage is the codex lane.
- **Files:** `apps/learn/src/storage/profile.ts`, `apps/learn/src/storage/profile.test.ts`, `apps/learn/src/storage/db.ts`
- **Acceptance:**
  - [ ] A separate IndexedDB namespace per profile ('default', 'demo'); switching is persisted with try/catch
  - [ ] resetProgress(profile) clears attempts and mastery for that profile only
  - [ ] Tested with fake IndexedDB

### L-23: Progress dashboard: units, stars, streak, due today, explainers, reset and demo profile UI

- **Owner / day / size:** codex / 2026-10-18 / M
- **Depends on:** L-23a, L-12, L-13
- **Branch:** `agent/codex/L-23-progress` | **r26_port:** yes | **screenshots:** yes
- **Why:** Shows the panel visible evidence of goals and adaptation.
- **Files:** `apps/learn/src/components/ProgressView.tsx`, `apps/learn/src/components/ProgressView.css`
- **Acceptance:**
  - [ ] Units with stars, streak and daily goal, a due-today count, signs learned (>=2 stars) and mastered
  - [ ] 'How adaptation works' renders ADAPTATION.md rules in plain words; 'How scoring works' explains 85/60, match not accuracy, the honest limit (74.6% only with 65.4% if quoted at all)
  - [ ] Reset progress (with confirmation) and Demo profile switch use L-23a
  - [ ] Export still works; before/after screenshots (desktop and phone)

### L-24: Hero CTA straight to the first sign; session-complete screen

- **Owner / day / size:** codex / 2026-10-18 / S
- **Depends on:** L-11
- **Branch:** `agent/codex/L-24-cta-complete` | **r26_port:** yes | **screenshots:** yes
- **Why:** Time to first attempt is long and there is no session-complete moment. The Hero's decorative preview cards stay as they are (kvn, 11 Oct).
- **Files:** `apps/learn/src/components/Hero.tsx (CTA target only)`, `apps/learn/src/components/SessionComplete.tsx`, `apps/learn/src/components/SessionComplete.css`, `apps/learn/src/components/PracticeView.tsx (session end hook)`
- **Acceptance:**
  - [ ] The Hero CTA opens the first open unit's first sign in Watch
  - [ ] The decorative preview cards (88% MATCH, 5 Day Streak, Fluent badge) are NOT changed
  - [ ] A session-complete screen shows stars earned, the daily goal state and the next unit
  - [ ] Time from landing to first Record under 30 s in a manual check (noted)
  - [ ] Before/after screenshots (desktop and phone)

### L-25: Sentence challenge UI (last unit on the Path)

- **Owner / day / size:** codex / 2026-10-19 / M
- **Depends on:** L-22b, L-16b; decisions DN-08
- **Branch:** `agent/codex/L-25-sentences-ui` | **r26_port:** yes | **screenshots:** yes
- **Why:** A whole-sentence attempt with recall answers PP1's sentence request without inventing gloss order.
- **Files:** `apps/learn/src/components/SentenceView.tsx`, `apps/learn/src/components/SentenceView.css`, `apps/learn/src/components/PathView.tsx (unit entry only)`
- **Acceptance:**
  - [ ] Cancelled if DN-08 = drop
  - [ ] Watch the whole clip (video if permitted, else skeleton) at 0.5x; Try with reference visible; Recall with the dataset label as cue; capture window 2x the clip
  - [ ] Graded as one reference; the 'Experimental, not calibrated' badge always visible
  - [ ] Unlocked after the previous unit on the Path
  - [ ] App.tsx routing, if needed, is proposed as a diff for that day's App.tsx owner
  - [ ] Before/after screenshots (desktop and phone)

### L-26: Phone, accessibility and polish pass across Learn

- **Owner / day / size:** codex / 2026-10-20 / M
- **Depends on:** L-21, L-23, L-25
- **Branch:** `agent/codex/L-26-polish` | **r26_port:** yes | **screenshots:** yes
- **Why:** It must work on any device. PROGRESS-CRITIQUE 5.3 and RECORD-UIUX-PLAN phone checks were never done.
- **Files:** `apps/learn/src/components/views.css`, `apps/learn/src/index.css`, `apps/learn/src/components/PracticeView.tsx`, `apps/learn/src/components/CategorySignNavigator.tsx`
- **Acceptance:**
  - [ ] No horizontal scroll at 360, 375, 390 on Hero, Path, Practice (all stages), Result, Scenario, Progress, Library
  - [ ] Tap-to-preview in browse on touch; emoji removed from the no-hands panel; floating title does not overlap the skeleton at narrow widths
  - [ ] prefers-reduced-motion kills staggered animations; focus order logical; text contrast AA (spot-checked)
  - [ ] Q-07 label fix applied if needed
  - [ ] Screenshots of every screen at 360 and 1280 (contact sheet)

### L-27: Camera off while browsing or hidden; hover hint only on hover devices; GSAP restore

- **Owner / day / size:** codex / 2026-10-20 / S
- **Depends on:** L-04, L-16b
- **Branch:** `agent/codex/L-27-camera-off` | **r26_port:** yes | **screenshots:** no
- **Why:** Bug A18: the camera light stays on while browsing; the hover hint shows on touch tablets; a global GSAP setting leaks.
- **Files:** `apps/learn/src/components/PracticeView.tsx`, `apps/learn/src/components/Hero.tsx (gsap cleanup only)`
- **Acceptance:**
  - [ ] Stream stops while browsing and when the tab is hidden, restarts on return without error
  - [ ] Hover hint renders only under (hover: hover)
  - [ ] gsap.ticker.lagSmoothing restored on Hero unmount

### L-28: Learn docs match what shipped

- **Owner / day / size:** claude-code-thesis / 2026-10-20 / S
- **Depends on:** L-26
- **Branch:** `agent/claude/L-28-learn-docs` | **r26_port:** yes | **screenshots:** no
- **Why:** Agents and the thesis need an accurate record with no inflated claims.
- **Files:** `apps/learn/README.md`, `apps/learn/PROGRESS-CRITIQUE.md`, `apps/learn/RECORD-UIUX-PLAN.md`
- **Acceptance:**
  - [ ] README describes Path, stages, feedback, licence mode, video (if any) and sentence challenge exactly as merged, linking ADAPTATION.md
  - [ ] Plan-doc open items marked done or open with evidence
  - [ ] No figure without its source; 74.6% only with 65.4%

### L-29: iPhone: restart the camera automatically after an app switch

- **Owner / day / size:** codex / 2026-10-16 / S
- **Depends on:** L-04
- **Branch:** `agent/codex/L-29-ios-camera-resume` | **r26_port:** yes | **screenshots:** no
- **Why:** Bug A19, found in Q-06a (kvn, 13 Oct): on an iPhone the camera stops while the learner is in another app; on return Learn shows 'Camera disconnected' and only 'Try again' brings it back. Android keeps working.
- **Files:** `apps/learn/src/vision/useHandTracking.ts`, `apps/learn/src/vision/cameraLifecycle.ts`, `apps/learn/src/vision/cameraLifecycle.test.ts`
- **Acceptance:**
  - [ ] When the page becomes visible again and the camera was running when it was hidden, the camera restarts by itself (one attempt, the same path as 'Try again'); 'Camera disconnected' shows only if that attempt fails
  - [ ] A camera the learner turned off stays off; a camera lost while the page is visible still shows L-04's error
  - [ ] A countdown or take in progress when the page was hidden stays abandoned with L-03's notice
  - [ ] The resume decision is a tested pure function in cameraLifecycle.ts; PracticeView.tsx is not changed (hot file: put any needed diff in the handoff)
  - [ ] kvn re-checks on the iPhone after the next deploy (Q-06a); the handoff does not claim a device check

### L-30: Score one-handed references as one-handed (ignore stray hand labels)

- **Owner / day / size:** codex / 2026-10-16 / S
- **Depends on:** nothing
- **Branch:** `agent/codex/L-30-stray-hands` | **r26_port:** yes | **screenshots:** no
- **Why:** Bug A20 (logged 13 Oct as S6): handednessesIn() (scoring/normalize.ts) counts a reference hand seen in even one frame, so 78 of 501 references that L-10 classes as one-handed are scored and shown as two-handed: a second 'missing' hand card, a missing-hand hint and a small score drag. kvn saw it in Practice.
- **Files:** `apps/learn/src/scoring/normalize.ts`, `apps/learn/src/scoring/score.ts`, `apps/learn/src/scoring/score.test.ts`
- **Acceptance:**
  - [ ] A reference is scored as two-handed only by L-10's rule (>= 2 hands tracked in >= 20% of its frames, TWO_HAND_FRAME_THRESHOLD in scripts/build-reference-index.mjs); otherwise only its dominant hand label (the label in most frames) is scored. One constant, or a test that both places use 0.2
  - [ ] A test over public/references: every reference the generated index marks hands = 1 scores with exactly one hand and twoHanded false (78 change today); references marked hands = 2 score exactly as before
  - [ ] Calibration re-run with the corpus present (copy the untracked apps/learn/calibration folder from C:/Users/User/Documents/Suvana into the lane worktree; never commit it): report separation before and after, each with the 65.4% majority baseline. If separation drops below 74.6%, stop and report instead of asking for a merge
  - [ ] The handoff says this changes scores for the affected references and that the 85/60 bands were not recalibrated

### L-31: Third scenario from corpus signs (optional, only if kvn approves DN-19)

- **Owner / day / size:** codex / backlog (earliest 2026-10-19) / M
- **Depends on:** K-05; decisions DN-19
- **Branch:** `agent/codex/L-31-scenario3` | **r26_port:** yes | **screenshots:** yes
- **Why:** Proposal O3 named five scenarios; two exist. Single-sign turns need no authored gloss order.
- **Files:** `apps/learn/src/data/scenarios/<new>.json`
- **Acceptance:**
  - [ ] English context text written or approved by kvn; every turn uses an existing reference; no hints authored; licence noted per turn
  - [ ] Shown as a scenario only if every turn is playable; before/after screenshots

### L-32: Sequence-from-memory level (only if Lithira's mapper supplies an order)

- **Owner / day / size:** codex / backlog / M
- **Depends on:** K-03; decisions DN-08
- **Branch:** `agent/codex/L-32-sequence` | **r26_port:** yes | **screenshots:** yes
- **Why:** PP1 asked to perform a set of words. Only an order from Lithira's mapper (or a real clip) may be used.
- **Files:** `apps/learn/src/learner/sequence.ts`, `apps/learn/src/data/sequences.ts`
- **Acceptance:**
  - [ ] Only built if Lithira's mapper output arrives; each sequence cites the mapper output verbatim
  - [ ] 2-3 signs in the given order, each graded on its own; labelled 'order from Communicate's mapper'
  - [ ] If never built, the thesis says the 'set of words' request is only partly answered

### L-33: Per-sign finger cut-offs: one time-boxed test; labels return only if they pass the bar

- **Owner / day / size:** codex / 2026-10-17 / M
- **Depends on:** L-17, L-30; decisions D-A31
- **Branch:** `agent/codex/L-33-finger-cutoffs` | **r26_port:** yes | **screenshots:** yes
- **Why:** Per-finger feedback is one of Learn's novelties, hidden by D-A15 because one global cut-off failed (L-17: 14.5% of different-sign fingers flagged at a 5% false-alarm cut-off; L-30: 17.2%). kvn chose one time-boxed try with per-sign cut-offs against a pass bar set before the run (D-A31).
- **Files:** `apps/learn/src/scoring/fingerCutoffs.calibration.test.ts`, `apps/learn/src/scoring/fingerCutoffs.ts`, `apps/learn/src/scoring/fingerStates.ts`, `apps/learn/src/components/ScoreBadge.tsx` (Phase 2 only), `apps/learn/src/components/PracticeView.tsx and views.css` (Phase 2 only; hot files, declared in the handoff)
- **Acceptance:**
  - [ ] Phase 1 (17 Oct, measurement only): opt-in calibration test reading the corpus in place via CALIBRATION_DIR (never copied, committed or regenerated); the scorer and score values unchanged
  - [ ] Per-sign, per-finger Wrong and Almost cut-offs from that sign's own same-sign deviations, at percentiles fixed before testing; only signs with at least 8 takes; cross-validated by take
  - [ ] Reports on held-out takes: false alarms (% of correct attempts with Wrong on any finger, plus per finger and for Almost); catch rate on clearly different fingers, defined from the data only (no hand-written handshape labels); % of all different-sign fingers flagged, for comparison with L-17/L-30; coverage (qualifying signs, how many on the Path); JANUARY Kaggle spot check (not evidence)
  - [ ] Passes only if false alarms are at most 20% of correct attempts AND the catch rate is at least 50% (D-A31); otherwise finger labels stay hidden and no UI work is done
  - [ ] Phase 2 (by 18 Oct, only after a pass and kvn's go in chat): Correct/Almost/Wrong (D-A12 wording, no numbers) on the result card for qualifying signs only; cut-offs ship as a generated table with provenance; before/after renders desktop 1280x800 and phone 390x844
  - [ ] Every number is separation on one signer's recordings, never learner accuracy; no new figures or claims in learner text

### R-00: M0: manual port of the merged blocker fixes into the R26 working tree

- **Owner / day / size:** claude-code / 2026-10-14 / S
- **Depends on:** L-01, L-02, L-04, L-05, L-06, K-01
- **Branch:** `none (R26 working tree; never commit)` | **r26_port:** no | **screenshots:** yes
- **Why:** learn-ssl-module.vercel.app shows invented finger percentages and serves immutable caches today. These fixes must be live before R-01/R-02 exist.
- **Files:** `C:/Users/User/Documents/R26-SE-019/learn-ssl-module/web/**`
- **Acceptance:**
  - [ ] Follows 07-r26-mirror.md section 4 (manual copy, coupling files hand-merged, R26-form vercel.json with NO redirect)
  - [ ] npm ci/test/lint/build pass in learn-ssl-module/web; dist has no '/learn/' paths
  - [ ] Screenshots of the R26 build (vite preview) at desktop and phone
  - [ ] The handoff gives kvn the summary line and point-form body (no trailer); the agent does not commit

### R-01: Portability refactor: base and Suvana-only code driven by suvana.config.json

- **Owner / day / size:** codex / 2026-10-14 / M
- **Depends on:** L-06; decisions DN-01
- **Branch:** `agent/codex/R-01-portability` | **r26_port:** yes | **screenshots:** yes
- **Why:** Makes Suvana Learn and R26 Learn identical except for three declared files, so every port is a copy. Uses a JSON config, not a committed .env (the plan forbids committing .env files).
- **Files:** `apps/learn/vite.config.ts`, `apps/learn/suvana.config.json`, `apps/learn/src/App.tsx`, `apps/learn/src/components/Hero.tsx`, `apps/learn/src/app/session.ts`, `apps/learn/src/app/AccountButton.tsx`, `tools/sync/upstreams.json`
- **Acceptance:**
  - [ ] vite.config reads apps/learn/suvana.config.json if present ({base, suvana, port}); absent -> base '/', outDir 'dist', port 5173, VITE_SUVANA ''
  - [ ] Present (Suvana) -> base '/learn/', outDir 'dist/learn', port 5174, import.meta.env.VITE_SUVANA === '1' via define
  - [ ] AccountButton and Hero home links render only when VITE_SUVANA === '1'
  - [ ] suvana.config.json, vercel.json and package-lock.json are declared suvanaOnly/coupling in upstreams.json; learn guards rewritten; the stale 'TEMPORARY AppNavBar' note fixed; `sync.mjs guard` passes
  - [ ] A build without suvana.config.json gives an R26-identical dist (no /learn/ paths)
  - [ ] Before/after renders of the Suvana build and the R26-form build (desktop and phone) look unchanged

### R-02: sync.mjs `port learn --to <R26>` with --check

- **Owner / day / size:** codex / 2026-10-16 / S
- **Depends on:** R-01
- **Branch:** `agent/codex/R-02-port-command` | **r26_port:** no | **screenshots:** no
- **Why:** Repeatable, safe porting to the R26 working tree per milestone.
- **Files:** `tools/sync/sync.mjs`, `tools/sync/README.md`
- **Acceptance:**
  - [ ] Refuses on a dirty R26 tree or when R26 main is not at origin/main (tells kvn to pull)
  - [ ] Copies all tracked, non-ignored apps/learn files except suvana.config.json, vercel.json and package-lock.json; mirrors deletions; prints add/modify/delete counts and a lockfile reminder when package.json changed
  - [ ] --check writes nothing and exits 1 on any difference
  - [ ] Never commits; README documents it with MSYS_NO_PATHCONV=1

### R-03: M1: port Learn into the R26 working tree

- **Owner / day / size:** claude-code / 2026-10-17 / S
- **Depends on:** R-02
- **Branch:** `none (R26 working tree)` | **r26_port:** no | **screenshots:** yes
- **Why:** R26 must always have kvn's latest Learn. M1 = Learn on main after the 17 Oct morning merge.
- **Files:** `C:/Users/User/Documents/R26-SE-019/learn-ssl-module/web/**`
- **Acceptance:**
  - [ ] Run from merged Suvana main with `sync.mjs port learn`; gates pass in learn-ssl-module/web; dist has no '/learn/' paths
  - [ ] Screenshots of the R26 build (desktop and phone)
  - [ ] Handoff gives the two commit blocks and the ported Suvana sha; the agent does not commit

### R-04: M2: port Learn into the R26 working tree

- **Owner / day / size:** claude-code / 2026-10-19 / S
- **Depends on:** R-03
- **Branch:** `none (R26 working tree)` | **r26_port:** no | **screenshots:** yes
- **Why:** Keeps learn-ssl-module.vercel.app current. M2 = Learn on main after the 19 Oct morning merge.
- **Files:** `C:/Users/User/Documents/R26-SE-019/learn-ssl-module/web/**`
- **Acceptance:**
  - [ ] Same as R-03; any package.json change regenerates the R26 lockfile with `npx -y npm@10 install`

### R-05: Final Learn port to R26 for the demo

- **Owner / day / size:** claude-code / 2026-10-21 / S
- **Depends on:** R-04, L-26, L-27, Q-08
- **Branch:** `none (R26 working tree)` | **r26_port:** no | **screenshots:** no
- **Why:** R26 and learn-ssl-module must match the demo build.
- **Files:** `C:/Users/User/Documents/R26-SE-019/learn-ssl-module/web/**`
- **Acceptance:**
  - [ ] Ports exactly the commit Q-08 proposed for the tag demo-2026-10-21
  - [ ] After kvn commits, `sync.mjs port learn --to ../R26-SE-019 --check` reports no difference
  - [ ] The handoff includes the Suvana sha ported, for the upstreams.json record

### I-01: Shell: remove the 'SoundGuard Ecosystem' sub-brand, configurable Recognize URL, fix the stale example

- **Owner / day / size:** antigravity / 2026-10-13 / S
- **Depends on:** nothing
- **Branch:** `agent/antigravity/I-01-shell-brand` | **r26_port:** no | **screenshots:** yes
- **Why:** A visible sub-brand breaks the single-brand rule, and the Recognize card is unreachable on any deployment.
- **Files:** `apps/shell/index.html`, `apps/shell/src/main.ts`, `apps/shell/vite.config.ts`
- **Acceptance:**
  - [ ] index.html:404 shows a descriptive tag (e.g. 'Alerts'); grep finds no sub-brand text in apps/shell
  - [ ] data-service-url is filled from VITE_RECOGNIZE_URL at build time; localhost fallback kept
  - [ ] The recognize.suvana.lk example (:211) is replaced
  - [ ] Home-page preview cards are not changed
  - [ ] Shell tests and build pass; before/after screenshots (desktop and phone)
  - [ ] REWORK 13 Oct: re-shoot before/after; the 13 Oct shots captured the shell's intro counter (only a digit visible). Wait for the landing to finish its intro before capturing, desktop and phone

### I-02: Alerts: user-visible strings say Suvana

- **Owner / day / size:** antigravity / 2026-10-13 / S
- **Depends on:** nothing
- **Branch:** `agent/antigravity/I-02-alerts-strings` | **r26_port:** no | **screenshots:** yes
- **Why:** 'SOUNDGUARD' and 'SoundGuard is listening' are visible sub-brands.
- **Files:** `apps/alerts/components/Onboarding.tsx`, `apps/alerts/plugins/withSoundGuardBackground.js`
- **Acceptance:**
  - [ ] Onboarding.tsx:204 and the notification text and channel description (:171, :249) use Suvana/Alerts wording
  - [ ] `npx tsc --noEmit` passes
  - [ ] The handoff proposes the upstreams.json declaration and guard (codex lane applies it); slug, scheme and package untouched (I-12a)
  - [ ] Rendered component screenshot or simulator screenshot before/after

### I-03: Fix stale integration docs and record the Communicate gate

- **Owner / day / size:** antigravity / 2026-10-14 / S
- **Depends on:** nothing
- **Branch:** `agent/antigravity/I-03-stale-docs` | **r26_port:** no | **screenshots:** no
- **Why:** DEMO.md and DEPLOYMENT.md misstate blockers; the 12-Oct Communicate failure was the MSYS path rewrite (re-run passed).
- **Files:** `DEMO.md`, `DEPLOYMENT.md`, `TODO-PP2.md`
- **Acceptance:**
  - [ ] DEMO.md 'two data files' section and Status table, DEPLOYMENT.md labels.npy blocker row, 'shell has no env vars', the HF-free assumption and TODO-PP2.md:109 corrected
  - [ ] The handoff records the Communicate lint and build as passing with MSYS_NO_PATHCONV=1 (gates.txt correction block) and proposes README REPLACE-WITH text changes for README's owner

### I-04: Recognition re-sync of Lahiru's 656f371..ec2604a (code and tests only)

- **Owner / day / size:** codex / 2026-10-14 / M
- **Depends on:** K-01; decisions DN-18
- **Branch:** `agent/codex/I-04-recognition-sync` | **r26_port:** no | **screenshots:** no
- **Why:** Upstream has a faster inference path. The 88 MB of unused .h5 and dataset scripts must not enter the repo.
- **Files:** `services/recognition/src/model/**`, `services/recognition/webapp/server.py`, `services/recognition/src/**/recognizer*.py`, `services/recognition/tests/**`, `tools/sync/upstreams.json`
- **Acceptance:**
  - [ ] Code files taken via `sync.mjs apply`; the 4 new .h5, PNGs, demo_sentences.py, model_comparison.json, train_and_evaluate_all.py and notebooks declared skip with reasons
  - [ ] config.yaml model_path and labels.npy / sinhala_labels.json unchanged (git diff shows nothing for them)
  - [ ] pytest suites pass; `sync.mjs guard` passes; the record step and README sync-log line are proposed for README's owner

### I-05: Reference-converter: take kvn's port 5909a56 and declare the 3 undeclared diffs

- **Owner / day / size:** codex / 2026-10-16 / S
- **Depends on:** I-04
- **Branch:** `agent/codex/I-05-converter-port` | **r26_port:** yes | **screenshots:** no
- **Why:** `sync.mjs record` refuses while undeclared Suvana-side diffs exist (README.md, convert_references.py, missing_signs.txt).
- **Files:** `tools/reference-converter/**`, `tools/sync/upstreams.json`
- **Acceptance:**
  - [ ] 5909a56 applied; each of the 3 diffs ported back (listed for R26) or declared with a reason
  - [ ] `sync.mjs status` shows reference-converter clean
  - [ ] If any reference file changes, ASSET_VERSION (L-06) is bumped

### I-06: Shell: Privacy, Terms, Contact and Pricing/business-model pages

- **Owner / day / size:** codex / 2026-10-18 / M
- **Depends on:** I-01; decisions DN-04, DN-15
- **Branch:** `agent/codex/I-06-shell-pages` | **r26_port:** no | **screenshots:** yes
- **Why:** Commercialisation is graded, and the footer links are '#'.
- **Files:** `apps/shell/privacy.html`, `apps/shell/terms.html`, `apps/shell/contact.html`, `apps/shell/pricing.html`, `apps/shell/index.html (footer links only)`, `apps/shell/vite.config.ts`
- **Acceptance:**
  - [ ] Privacy matches reality: Learn processes on-device, no video uploaded; Communicate stores account email and hashed password in MongoDB; assistant questions go to Gemini when enabled; any corpus video comes from Cloudinary
  - [ ] Terms marked 'draft, not legal advice'; contact address approved by kvn
  - [ ] Pricing page: open-core model, labelled 'Roadmap: no paid offering; this deployment is non-commercial and academic', with the Vercel Hobby caveat; prices only if kvn supplies them
  - [ ] Footer links work; multi-page build passes; before/after screenshots (desktop and phone)

### I-07: Communicate own instance: placeholder-seed guard, gloss import script, env example

- **Owner / day / size:** antigravity / 2026-10-16 / S
- **Depends on:** nothing
- **Branch:** `agent/antigravity/I-07-communicate-scripts` | **r26_port:** no | **screenshots:** no
- **Why:** Placeholder animations must never be demoed, and Lithira's data must be importable without his secrets.
- **Files:** `apps/communicate/scripts/seedGlosses.ts`, `apps/communicate/scripts/importGlosses.ts`, `apps/communicate/.env.local.example`
- **Acceptance:**
  - [ ] seedGlosses refuses without --placeholder-dev-only and prints a warning
  - [ ] importGlosses reads an exported JSON (name, Sinhala forms, animationUrl, public_id), is dry-run by default, and can remap animationUrl to a new Cloudinary base
  - [ ] ADMIN_EMAILS documented; lint and build pass with MSYS_NO_PATHCONV=1

### I-08: Recognition container: Docker build, latency comparison, /api/info, back link and theme

- **Owner / day / size:** codex / 2026-10-17 / M
- **Depends on:** I-04
- **Branch:** `agent/codex/I-08-recognition-container` | **r26_port:** no | **screenshots:** yes
- **Why:** It must be hostable by 18 Oct, with latency verified, and must link back to Suvana.
- **Files:** `services/recognition/Dockerfile`, `services/recognition/webapp/server.py`, `services/recognition/webapp/static/index.html`, `services/recognition/README.md`
- **Acceptance:**
  - [ ] docker build succeeds; the container logs 'Loaded 171 gesture labels'
  - [ ] Median and p90 round-trip over 50 windows for tf_function vs predict; the faster is kept
  - [ ] /api/info returns its existing fields {sequenceLength, confidenceThreshold, numClasses: 171}; the static page has a 'Back to Suvana' link and honours ?theme=
  - [ ] pytest passes; additions proposed as declared Suvana-specific changes; before/after screenshot of the page

### I-09: Speech container: build check and readiness notes

- **Owner / day / size:** codex / 2026-10-19 / S
- **Depends on:** nothing
- **Branch:** `agent/codex/I-09-speech-container` | **r26_port:** no | **screenshots:** no
- **Why:** Decides whether hosting speech is feasible (DN-03) and prepares the laptop run.
- **Files:** `services/speech/README.md`
- **Acceptance:**
  - [ ] docker build attempted; image size and first-start time recorded
  - [ ] Required env (TRANSLATE_API_KEY on the service, STT_API_KEY in Communicate) and model IDs to confirm with Lithira listed; laptop run command documented

### I-10: Shell: wire the hosted Recognize URL, Alerts download section, phone pass

- **Owner / day / size:** codex / 2026-10-19 / S
- **Depends on:** D-04, I-01
- **Branch:** `agent/codex/I-10-shell-wiring` | **r26_port:** no | **screenshots:** yes
- **Why:** The landing page must lead to every module on any device.
- **Files:** `apps/shell/index.html`, `apps/shell/alerts/index.html`
- **Acceptance:**
  - [ ] The Recognize card links to the hosted URL in production (kvn sets VITE_RECOGNIZE_URL)
  - [ ] /alerts/ shows the APK download when I-12 provides a release URL, else honest 'build in progress' text
  - [ ] No horizontal scroll at 360/390; before/after screenshots

### I-11: Verify the shared session behind the Vercel rewrite; fix if needed

- **Owner / day / size:** codex / 2026-10-19 / S
- **Depends on:** D-03
- **Branch:** `agent/codex/I-11-auth-rewrite` | **r26_port:** no | **screenshots:** no
- **Why:** Auth.js behind an external rewrite may put cookies and redirects on the wrong host.
- **Files:** `apps/communicate/auth.ts`, `apps/communicate/next.config.ts`
- **Acceptance:**
  - [ ] On suvana-shell.vercel.app: register, sign in, session visible on /, /learn/ and /communicate, cookies on the shell host (Antigravity browser check)
  - [ ] If broken: an AUTH_URL/trustHost fix proposed and tested on a preview; if still broken, the fallback goes to kvn
  - [ ] Result written in the handoff for 05-integration.md

### I-12a: Alerts rebuild config under kvn's EAS (only if DN-14 = rebuild)

- **Owner / day / size:** codex / 2026-10-16 / S
- **Depends on:** I-02; decisions DN-14
- **Branch:** `agent/codex/I-12a-alerts-eas` | **r26_port:** no | **screenshots:** no
- **Why:** A Karindra-built APK from his own tree still says SoundGuard and carries com.karindragimhan69.soundguard.
- **Files:** `apps/alerts/app.json`, `apps/alerts/eas.json`
- **Acceptance:**
  - [ ] Cancelled if DN-14 = Karindra builds from Suvana's apps/alerts
  - [ ] slug/scheme 'suvana-alerts', package 'help.suvana.alerts', projectId placeholder for kvn's EAS project (kvn fills it)
  - [ ] `npx tsc --noEmit` passes; declared in the handoff for upstreams.json

### I-12: Alerts APK: Karindra builds from Suvana's tree, or kvn rebuilds under his EAS

- **Owner / day / size:** kvn / 2026-10-17 to 2026-10-19 / M
- **Depends on:** K-03, I-02; decisions DN-14
- **Branch:** `n/a` | **r26_port:** no | **screenshots:** no
- **Why:** Alerts needs a native build to be demoed without a laptop.
- **Files:** none in the repo
- **Acceptance:**
  - [ ] Path A: Karindra builds a signed preview APK from Suvana's apps/alerts (with I-02 applied) by 16 Oct
  - [ ] Path B (no reply by 15 Oct): kvn runs `eas build -p android --profile preview` on the I-12a branch
  - [ ] The APK is attached to a GitHub Release (never committed) and installed on the demo phone; sound detection tried once offline

### I-13: Import Lithira's glosses and animations into kvn's Atlas and Cloudinary

- **Owner / day / size:** kvn / 2026-10-20 / M
- **Depends on:** I-07, K-03
- **Branch:** `n/a` | **r26_port:** no | **screenshots:** no
- **Why:** Communicate can only sign with Lithira's real animation data; blocked on his reply.
- **Files:** none in the repo
- **Acceptance:**
  - [ ] If data arrived: animations uploaded to kvn's Cloudinary; importGlosses runs for real; one gloss animates in production
  - [ ] If not by 20 Oct: DEMO.md says avatar-only; no placeholder is shown

### I-14: Learn and Communicate bridge: /learn/?sign=GLOSS deep link

- **Owner / day / size:** codex / 2026-10-20 / S
- **Depends on:** L-16a, D-03
- **Branch:** `agent/codex/I-14-deep-link` | **r26_port:** yes | **screenshots:** yes
- **Why:** Proposal O4 (learning-communication integration) shows the one-platform story.
- **Files:** `apps/learn/src/App.tsx (?sign= only)`, `apps/communicate/components/dictionary/SignDictionaryWorkbench.tsx`
- **Acceptance:**
  - [ ] Learn opens the named sign in Watch when ?sign= exactly matches a reference gloss id; otherwise ignores it
  - [ ] The handoff reports the exact-id overlap count between Communicate glosses and Learn's index
  - [ ] Communicate shows 'Practise in Learn' only for overlapping ids (no invented mapping)
  - [ ] Works under the shell; before/after screenshots
