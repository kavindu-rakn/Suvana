# 10 Schedule, 12-22 Oct 2026 (demo-ready 21 Oct; demo and thesis 22 Oct)

## Lanes

- **CC** = Claude Code: Learn UI (PracticeView, ScoreBadge, SkeletonPlayer, new views), agent instruction files, R26 port runs.
- **CX** = OpenAI Codex: Learn logic and platform (vision, storage, learner, scoring, configs), tools/sync, services, CI.
- **AG** = Google Antigravity: shell, Communicate scripts, Alerts, isolated Learn modules (curriculum, video component, scenarios, progress UI, sentence UI), screenshot/E2E tooling, docs and runbooks. Its browser makes it the default for checks of deployed URLs.
- **CC-T** = a second Claude Code session for thesis drafts and docs (DN-20). If kvn says no, CC takes T-04 and L-28, and kvn drafts T-02/T-03 with CC's help on 20-21 Oct.
- **K** = kvn.

## Daily rhythm

- **Morning (09:00):** agents `git fetch` and start from the latest `main` that kvn pushed the evening before.
- **During the day:** agents work only on their lane's tasks for the day.
- **18:00:** handoffs due, with screenshots and contact sheets for UI tasks.
- **Evening (19:00-21:00):** kvn reviews contact sheets, adopts or rejects, merges bottom-up, pushes, updates BOARD/DECISIONS (K-10).
- **kvn's budget:** about 3 h review plus about 3 h of his own tasks per day. Days that exceed it are marked; move his tasks, not the agents', if he runs out.

## Mon 12 Oct (tonight)

| Who | Tasks |
|---|---|
| K | K-01 merge re-sync + this plan, local excludes, R26 pull; K-02 confirm DN-12 (already implemented on `docs/revolution-plan`; reviewed with the K-01 merge) and decide any others he can |

## Tue 13 Oct: blockers and tooling

| Lane | Tasks (in order) | Owned files |
|---|---|---|
| CC | Q-01 agent files; L-02 keyboard; L-01 finger states (leaf, stacked on L-02) | `AGENTS.md`, `CLAUDE.md`, `apps/learn/{AGENTS,CLAUDE}.md`, `services/recognition/{AGENTS,CLAUDE}.md`, `.gitignore`, `README.md` (one line); `AppNavBar.tsx`, `PracticeView.tsx`, `ScoreBadge.tsx`, `views.css`, new `scoring/fingerStates*` |
| CX | L-04 camera lifecycle; L-05 storage; L-06 cache headers | `vision/**`, `RecordView.tsx`, new `storage/*`, `ScenarioView/ProgressView/LibraryView/StudyView.tsx` (load lines), `main.tsx`, `apps/learn/vercel.json`, new `app/assetVersion.ts`, reference loader |
| AG | Q-00 screenshot tooling; I-01 shell brand + Recognize URL; I-02 Alerts strings | `tools/screens/**`, `apps/learn/fixtures.html`, `apps/learn/src/dev/**`, `apps/shell/**`, two Alerts files |
| K | K-02 needed-by decisions (DN-01, 10, 11, 17, 18); K-03 teammate messages; K-09 supervisor; T-01 thesis copy; K-04 create suvana-learn; K-13 fixture clips; evening K-10 | about 6 h |

**Hot-file owners:** CC: README, AGENTS, CLAUDE, .gitignore, PracticeView, views.css, App.tsx. CX: apps/learn/vercel.json. Nobody: package.json, lockfiles, upstreams.json, ci.yml.

## Wed 14 Oct: M0 live, portability, curriculum data

| Lane | Tasks | Owned files |
|---|---|---|
| CC | R-00 M0 manual port (morning, after kvn merged L-01/02/04/05/06); L-03 capture robustness; L-07 onboarding (leaf, stacked on L-03) | R26 working tree `learn-ssl-module/web/**`; `PracticeView.tsx`, new `Onboarding.*`, new `scoring/trimTake*` |
| CX | R-01 portability (`suvana.config.json`); I-04 recognition sync | `vite.config.ts`, `suvana.config.json`, `App.tsx`, `Hero.tsx` (gating only), `app/session.ts`, `app/AccountButton.tsx`, `tools/sync/upstreams.json`, `services/recognition/**` |
| AG | L-10 reference metadata; L-09 curriculum + coverage (stacked on L-10); Q-02 .gitattributes; I-03 stale docs | `scripts/build-reference-index.mjs`, new `scripts/curriculum-report.mjs`, new `data/curriculum.ts`, `.gitattributes`, `DEMO.md`, `DEPLOYMENT.md`, `TODO-PP2.md` |
| K | D-02 deploy suvana-learn; D-06 R26 M0 commit + redeploy (evening); Q-07 handedness; K-04 Atlas/Cloudinary; DN-05, DN-06, DN-14 decisions; K-10 | about 6.5 h (heavy: D-06 can slip to 15 Oct morning) |

**Hot-file owners:** CC: PracticeView, views.css. CX: App.tsx, Hero.tsx, vite.config, upstreams.json, README (I-04 sync-log line). AG: .gitattributes, DEMO.md, DEPLOYMENT.md.

## Thu 15 Oct: game logic, playback, tests

| Lane | Tasks | Owned files |
|---|---|---|
| CC | L-08 playback (raw framing, speed, ghost) | `SkeletonPlayer.tsx`, `vision/drawing.ts`, `PracticeView.tsx`, `views.css` |
| CX | L-12 game logic; L-15a clip export (if DN-05 allows); L-22a sentence labels | `learner/game*`, `learner/attemptLog.ts`, `pilot/exportResults.ts`, `data/curriculum.ts` (types), `tools/reference-converter/**` |
| AG | Q-04 Playwright smoke; L-14 meaning coverage | `tools/screens/e2e/**`, `CategorySignNavigator.tsx`, new `data/meaningCoverage*` |
| K | K-05 curriculum approval + meanings (+ DN-19); Q-06a phone check; DN-04, DN-09, DN-15 decisions; K-10 | about 6 h |

**Hot-file owners:** CC: PracticeView, views.css. CX: upstreams.json (if needed). AG: tools/screens package files.

## Fri 16 Oct: Path, adaptation, port command, video component

| Lane | Tasks | Owned files |
|---|---|---|
| CC | L-11 Path view | new `PathView.*`, `App.tsx`, `AppNavBar.tsx`, `tools/screens/e2e/path.spec.ts` |
| CX | L-13 adaptation + ADAPTATION.md; R-02 port command; I-05 converter port | `learner/mastery*`, `learner/session*`, new `learner/nextExercise.ts`, `ADAPTATION.md`, `tools/sync/sync.mjs`, `tools/sync/README.md`, `tools/reference-converter/**`, `upstreams.json`, README (sync-log line) |
| AG | L-15b SignVideo (if DN-05 allows); I-07 Communicate scripts; I-12a Alerts EAS config (if DN-14 = rebuild) | new `SignVideo.*`, `data/videoManifest*`, `public/references/video-manifest.json`, `apps/communicate/scripts/**`, `.env.local.example`, `apps/alerts/app.json`, `eas.json` |
| K | K-06 clips (if DN-05); K-07 sentence conversion (if DN-08, after L-22a); K-04 finish (communicate/shell projects); T-09 own-words Ch2; DN-02, DN-03, DN-08, DN-13, DN-19, DN-20 decisions; K-10 | about 6.5 h |

**Hot-file owners:** CC: App.tsx, views.css. CX: upstreams.json, README. Nobody: PracticeView.

## Sat 17 Oct: M1, Watch/Try, hints, recognition container, Communicate + shell deploy

| Lane | Tasks | Owned files |
|---|---|---|
| CC | L-16a Watch/Try + perf marks; R-03 M1 port | `PracticeView.tsx`, new `practiceStages*`, `views.css`; R26 working tree |
| CX | L-17 hints; I-08 recognition container; L-23a profiles | `scoring/score*`, new `scoring/hints*`, `services/recognition/**`, `storage/profile*`, `storage/db.ts` |
| AG | L-19 scenarios; D-01 smoke + DEPLOYMENT.md | `ScenarioView.*`, `data/scenarios/*.json` (flags only), `scenario/types.ts`, `tools/smoke/**`, `DEPLOYMENT.md` |
| CC-T | T-04 worked example | new `learner/workedExample.test.ts`, `final-source/04-design.md` |
| K | D-03 deploy Communicate then shell; D-07 R26 M1; I-12 APK path decision; T-09; K-10 | about 7 h (heavy: T-09 can move to 18) |

**Hot-file owners:** CC: PracticeView, views.css. AG: DEPLOYMENT.md. CX: upstreams.json.

## Sun 18 Oct: Recall, licence mode, progress, recognition hosted

| Lane | Tasks | Owned files |
|---|---|---|
| CC | L-16b Recall; L-24 Hero CTA + session-complete (separate leaf; second after L-16b) | `PracticeView.tsx`, `practiceStages.ts`, `views.css`, `Hero.tsx` (CTA), new `SessionComplete.*` |
| CX | L-18 alignment; L-20 licence mode; L-22b sentence data (if K-07 done) | `scoring/dtw.ts`, `scoring/score.ts`, reference loader, `LibraryView.tsx`, new `Attribution.*`, `LICENSES.md`, new `data/sentences.ts`, `public/references/kaggle_sent_*` |
| AG | L-23 Progress UI; I-06 shell pages | `ProgressView.*`, `apps/shell/**` |
| K | D-04 Recognize host + ping; T-09 Ch3; K-10 | about 6 h |

**Hot-file owners:** CC: PracticeView, views.css, Hero.tsx. CX: none special. AG: shell index.html.

## Mon 19 Oct: M2, replay, sentence UI, device matrix

| Lane | Tasks | Owned files |
|---|---|---|
| CC | L-21 ReplayCompare + result card; R-04 M2 port | new `ReplayCompare.*`, `PracticeView.tsx`, `ScoreBadge.tsx`; R26 working tree |
| CX | Q-09 latency; I-09 speech container; fix queue from Q-06a | `tools/screens/e2e/latency.spec.ts`, `tools/screens/latency-report.mjs`, `services/speech/README.md` |
| AG | L-25 sentence UI (if DN-08); I-10 shell wiring; I-11 auth via rewrite | new `SentenceView.*`, `PathView.tsx` (unit entry), `apps/shell/**`, `apps/communicate/auth.ts`, `next.config.ts` |
| CC-T | T-02 Ch1/4/5 drafts; T-07 commercialisation doc | `final-source/*.md`, new `docs/commercialisation.md` |
| K | Q-06 device matrix; D-08 R26 M2; D-05 speech (laptop default); I-12 APK build/install; DN-16; K-10 | about 7 h (heavy: D-05 is a 10-minute note if laptop-only) |

**Hot-file owners:** CC: PracticeView. AG: PathView.tsx (unit entry only), App.tsx proposals go to CC. CX: tools/screens package files (Q-09).

## Tue 20 Oct: polish, CI, domain, rehearsal 1

| Lane | Tasks | Owned files |
|---|---|---|
| CC | L-26 phone/a11y polish; L-27 camera off | `views.css`, `index.css`, `PracticeView.tsx`, `CategorySignNavigator.tsx`, `Hero.tsx` (gsap) |
| CX | Q-03 CI gaps; I-14 deep link; fix queue | `.github/workflows/ci.yml`, `App.tsx` (`?sign=` only), Communicate dictionary component |
| AG | Q-05 DEMO.md; D-09 docs update (DEPLOYMENT.md, README.md) after kvn attaches the domain; fix queue for shell/Communicate/Alerts | `DEMO.md`, `DEPLOYMENT.md`, `README.md` |
| CC-T | T-03 Ch6/7/8 drafts; L-28 Learn docs | `final-source/*.md`, `apps/learn/README.md`, `PROGRESS-CRITIQUE.md`, `RECORD-UIUX-PLAN.md` |
| K | K-08 buy suvana.help (if steps green); D-09 attach; K-11 rehearsal 1; I-13 Communicate data (if delivered); K-10 | about 6.5 h |

**Hot-file owners:** CC: views.css, index.css, PracticeView, Hero. CX: App.tsx, ci.yml. AG: DEMO.md, DEPLOYMENT.md, README.md.

## Wed 21 Oct: demo-ready freeze

- **Morning:** CC runs Q-08 (all gates on main, regression list, tag proposal `demo-2026-10-21`), then R-05 (final port). AG reruns the smoke on every deployed URL. CX takes only kvn-approved blocker fixes.
- **K:** merge the last branches; tag; D-10 final R26 redeploy; T-05 figures, placeholders, section 5.5; own-words pass on new text; K-11 rehearsal 2.
- **18:00:** code freeze. Only kvn-approved demo-blocker fixes after this.

## Thu 22 Oct

- **K:** T-08 Turnitin and PDF; K-12 final demo and submission.

## Hot-file owner summary

| Hot file | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 |
|---|---|---|---|---|---|---|---|---|---|
| `PracticeView.tsx` | CC | CC | CC | - | CC | CC | CC | CC | CC (fixes) |
| `views.css` / `index.css` | CC | CC | CC | CC | CC | CC | CC | CC | CC |
| `App.tsx` | CC | CX | - | CC | - | - | CC (proposals) | CX | CC |
| `Hero.tsx` | - | CX | - | - | - | CC | - | CC | CC |
| `apps/learn/vercel.json` | CX | CX | - | - | - | - | - | - | - |
| `apps/learn/package.json` + lockfile | - | - | - | - | - | - | - | - | - |
| `tools/screens/package*.json` | AG | - | AG | - | - | - | CX | - | - |
| `tools/sync/upstreams.json` | - | CX | CX | CX | CX | CX | CX | CX | CX |
| `README.md` | CC | CX | - | CX | - | - | - | AG | kvn |
| `DEPLOYMENT.md` / `DEMO.md` | - | AG | - | - | AG | - | - | AG | AG |
| `.github/workflows/ci.yml` | - | - | - | - | - | - | - | CX | - |
| `AGENTS.md`, `CLAUDE.md`, `.gitignore` | CC | - | - | - | - | - | - | - | - |
| `.gitattributes` | - | AG | - | - | - | - | - | - | - |
