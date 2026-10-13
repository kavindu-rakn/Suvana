# 04 Learn bug register (12 Oct 2026)

Sources: the bug audit and the learnability audit (code read with targeted reads; camera flows were **not** exercised live), plus the hostile review. Paths are under `apps/learn/src/` unless stated. Line numbers are approximate where marked `~`.

Every bug marked "R26: yes" is also live on learn-ssl-module.vercel.app (checked against R26 `origin/main`), so its fix is ported at the next milestone (M0 on 14 Oct for the blockers).

Severity: **MAJOR** = breaks the demo, a guardrail, or the PP2 answer. **MEDIUM** = misleads the learner. **MINOR** = everything else.
Status values: `open`, `fixed (task, sha)`, `won't fix (reason)`. Only kvn changes status here, during the daily merge.

## 1. Confirmed bugs

| ID | Sev | Bug | Evidence (file:line) | Repro | Fix | Task | R26 | Status |
|---|---|---|---|---|---|---|---|---|
| A1 | MAJOR | Esc always returns to the Hero, even when a view uses Esc; the camera stops | `components/AppNavBar.tsx:~75-77` ignores `defaultPrevented`; `components/PracticeView.tsx:496-507`, badges `:578, :745` | Practice, pick a sign, Record, press Esc to cancel the countdown: app leaves to the Hero | `if (e.defaultPrevented) return`; Practice handlers `preventDefault`, registered in the capture phase (AppNavBar's window listener can run first: it mounts before PracticeView, `App.tsx:123` vs `:140`, so a bubble-phase `preventDefault` may arrive too late) | L-02 | yes | open |
| A2 | MAJOR | Enter/Space hijacked on the result screen; Enter on the focused Retry goes to the next sign | `PracticeView.tsx:470-495`; autofocus `:281-283` | Finish a take, press Enter: next sign instead of retry | Skip global shortcuts on interactive targets | L-02 | yes | open |
| A3 | MAJOR (guardrail) | Per-finger "accuracy %" is invented by formula (weak finger 45-75, others 88-99); ScoreBadge falls back to the overall score for every finger | `PracticeView.tsx:384-408`; `ScoreBadge.tsx:94-170, 201-242` | A take scoring 20 shows other fingers at 88% | Measured Correct/Almost/Wrong (DN-17) states; remove fallback | L-01 | yes | open |
| A4 | MAJOR (PP2) | `startSession` never called; `completeRef` never attached; attempts carry no `sessionId`; export shows 0 sessions | `learner/session.ts:121-133`; `PracticeView.tsx:68, 93, 285-287, 372`; `pilot/exportResults.ts:80` | Grep finds `startSession` only in tests | Reachable sessions from the Path; sessionId logged | L-13, L-11, L-16a | yes | open |
| A5 | MAJOR (PP2) | "Suggested"/"Next" always picks an unseen sign (need = 1), so weak signs are never revisited | `learner/mastery.ts practiceNeed`; `PracticeView.tsx:167, 427-455` | Score 30, press Next: a new sign | Due reviews first; 2:1 interleave | L-13 | yes | open |
| A6 | MAJOR | One IndexedDB rejection blanks Practice, Scenario, Progress, Library, Study | `Promise.all` at `PracticeView.tsx:111-122`, `ScenarioView.tsx:50-57`, `ProgressView.tsx:129-135`, `LibraryView.tsx:32-39`, `StudyView.tsx:26-33` | Block site storage, open Practice: empty sign list | `safeLoad` / `allSettled` + notice | L-05, L-03 | yes | open |
| A7 | MAJOR | A lost camera is never detected; "REC" can run forever | `vision/useHandTracking.ts` (no `onended`); frame-driven auto-finish (`PracticeView.tsx:108`, `RecordView.tsx:~121`, `useSignCapture.ts`) | Unplug a USB webcam while running, press Record | `onended`/`onmute` + wall-clock backstops | L-04, L-03 | yes | open |
| A8 | MAJOR | An exception in `processFrame` silently kills the rAF loop | `useHandTracking.ts:115/145/188/215` | WebGL context loss after backgrounding (inferred) | try/catch -> error + Restart | L-04 | yes | open |
| A9 | MAJOR | One-year `immutable` cache on un-hashed references, wasm and model | `apps/learn/vercel.json`; R26 same on `/(models\|references\|wasm)/` | Regenerate a reference: returning browsers keep the old one for a year | 1-day max-age + SWR; `ASSET_VERSION` query | L-06 | yes | open |
| A10 | MAJOR (standalone) | Deployment root `/` returns 404; Hero `href="/"` and Sign-in (`/communicate/login`) dead without the shell | `vercel.json outputDirectory`; `components/Hero.tsx:155, 161`; `app/session.ts:25` (`SIGN_IN_URL`) | Open suvana-learn.vercel.app/ | Suvana-only redirect; account/home links gated by VITE_SUVANA | L-06, R-01 | n/a in R26 form | open |
| A11 | MINOR | Missing-hand hint and hand cards name the reference's hand when mirrored | `scoring/score.ts:198-203, 291`; `ScoreBadge.tsx:68` | Mirrored take missing a hand | Flip the label when mirrored | L-17, L-01 | yes | open |
| A12 | MINOR | Ghost canvas never sized (300x150 bitmap stretched) | `PracticeView.tsx:195-234`; `components/views.css:3187` | Toggle ghost (M) | Size to `video.videoWidth/Height`; wrist anchor | L-08 | yes | open |
| A13 | MINOR | Empty reference logged as 0; delta uses `slice(0,-1)` | `score.ts:272-281`; `PracticeView.tsx:362, 410-418` | Reference with no hands | Don't log; delta by id | L-03 | yes | open |
| A14 | MINOR | Two label scales (tier 90/75/60 vs band 85/60); "Master/Fluent" over-claims | `ScoreBadge.tsx:192-199` | Score 80: "Getting there" next to "Fluent Signing" | `band()` only | L-01 | yes | open |
| A15 | MINOR | Blocked localStorage gives a white screen; no ErrorBoundary | `RecordView.tsx:50`; `StudyView.tsx:23-24`; `main.tsx` | Block storage, open Record | Guard reads; ErrorBoundary | L-05 | yes | open |
| A16 | MINOR | Scenario count includes unplayable turns; failed refs never retried; raw glosses shown | `ScenarioView.tsx` summary, `startScenario`; `PracticeView.tsx:659` | Social Gathering always "3 of 7" | Playable counts; retry; `glossLabel` | L-19, L-01 | yes | open |
| A17 | MINOR | Raw TypeError on insecure origins; stale "Video element is not mounted" after Leave | `useHandTracking.ts:128, 136` | Phone over `vite --host` HTTP | Secure-context check; clear on mount | L-04 | yes | open |
| A18 | MINOR | Listener churn at frame rate (lint 479); camera stays on while browsing/hidden; global GSAP lagSmoothing; hover hint on touch tablets | `PracticeView.tsx:469-527, 675, 682`; `Hero.tsx:52` | Watch the camera light while browsing | Stable callbacks; stop stream; restore; `(hover: hover)` | L-02, L-27 | yes | open |
| A19 | MAJOR (iPhone) | After an app switch on iPhone the camera is gone: "Camera disconnected" until the learner taps "Try again" (Android keeps working) | `vision/useHandTracking.ts` visibility restore; iOS ends camera tracks while the page is in the background | iPhone: start the camera in Practice, switch to another app, come back | Restart once automatically on return if the camera was running | L-29 | yes | open |
| A20 | MAJOR (scoring) | One-handed references scored as two-handed: a hand label seen in even one reference frame counts as a hand (78 of 501 references by L-10's rule) | `scoring/normalize.ts:96` `handednessesIn` | Practise a one-handed sign whose reference has a stray second label: two hand cards, one "missing" | Count a second hand only by L-10's two-hand rule; re-run calibration | L-30 | yes | open |
| L-B5 | MAJOR (learnability) | "Close match" shown regardless of score; "Check your" hints filtered out; no timing or path hints | `score.ts:187-229`; PracticeView `resultNotes` | Low score with right handshape (inferred) | Gate at 85; typed hints; timing/path | L-17, L-21 | yes | open |
| L-B8 | MEDIUM | Learner-facing tip sends learners to the author-only Record tab; team-written movement/location hints shown as fact | `ScenarioView.tsx:406-407`; `data/scenarios/restaurant.json`, `data/scenarios/introductions.json` (Social Gathering) | Open Social Gathering | Author-mode only; hide flagged hints | L-19 | yes | open |
| L-B10 | MINOR | Fixed capture window `durationMs+1500` cuts off novices; no hands-in-frame gate; `lang="si"` on English text | `PracticeView.tsx:99`; `aww-pane-si-sub` (`PracticeView.tsx:624`) | Hesitate after the countdown | 2x window + trimming; readiness gate; fix lang | L-07, L-01 | yes | open |
| L-B1 | MAJOR (learnability) | Per-clip zoom hides where the hands are and the movement size | `components/SkeletonPlayer.tsx` `fitToFrame=true`; `vision/drawing.ts:70-96` | Any sign | Raw framing default + zoom toggle (no silhouette) | L-08 | yes | open |
| H1 | MINOR | Hero says "20 categories" while Practice shows 18 (unverified: the 18) | `components/Hero.tsx:12` (feature copy); `:228` is the `card-vocab-badge` inside a preview card, which stays as is (kvn) | Compare Hero and Practice | Count from data, only if kvn says this copy is not part of the preview cards | L-24 | yes | open (needs kvn) |
| H2 | n/a | Hero decorative preview cards (88% MATCH, 5 Day Streak, Fluent badge) look like stats | `components/Hero.tsx` | - | - | - | - | **won't fix (kvn decision, 11 Oct)**; DEMO.md says they are decorative |
| P1 | MINOR | Emoji in the DOM of the no-hands panel (against PROGRESS-CRITIQUE's rule) | `PracticeView.tsx:787-801` | Take with no hands | Remove | L-26 | yes | open |
| X1 | MINOR (brand) | Recognize serves `soundguard.js/.css` and mounts `/api/soundguard` | `services/recognition/webapp/server.py:115-121`; `webapp/static/soundguard.{js,css}` served by the `/` StaticFiles mount (`server.py:226`) | Request `/soundguard.js` (index.html does not load it) | Internal names only; allow-list in the CI brand grep | Q-03 | - | open |

## 2. Suspicions: confirm on a real device

| ID | Suspicion | Test | Task |
|---|---|---|---|
| S1 | Handedness labels may be swapped (raw unmirrored video fed to MediaPipe; `vision/types.ts:22` says "anatomical") | Raise only your right hand; read the label | Q-07; UI-label fix in L-26; scoring untouched |
| S2 | No CPU fallback when the GPU delegate fails (`vision/handTracker.ts:40`, `delegate: 'GPU'`) | Device without WebGL2 | L-04 retry |
| S3 | iOS Safari video paused/black after an app switch | iPhone: switch apps and return | L-04; Q-06a/Q-06 |
| S4 | Handedness flicker splits one-handed takes (`score.ts:236-238`, `normalize.ts:72`) | Long one-handed take | Optional in L-17, test first |
| S5 | An extra hand is never penalised | Sign a one-handed sign with two hands | Design gap: document in ADAPTATION/scoring notes; no fix before the demo |
| S6 | "That looked closer to X" can be wrong (known limit) | - | Removed in L-19 |
| S7 | A hidden tab during recording bloats the take | Switch tabs mid-take | L-03/L-04 abandon on hidden |
| S8 | Progress is per browser; kvn's test attempts show on the demo laptop | - | L-23a/L-23 demo profile and reset |

## 3. Plan-level hazards (not code bugs yet; prevented by the plan)

| ID | Hazard | Prevention |
|---|---|---|
| P-R26 | Porting Suvana's `vercel.json` redirect `/` -> `/learn/` to R26 would send learn-ssl-module.vercel.app to a 404 | `vercel.json` is a declared coupling; `sync.mjs port` never copies it (R-02); R26 gets header changes by hand in R26 form (07) |
| P-ENV | Committing `apps/learn/.env` would break the "no .env in git" rule | R-01 uses `apps/learn/suvana.config.json` instead |
| P-LOC | A silhouette behind hands-only references invents location | No silhouette (L-08) |
| P-VID | Redistributing Kaggle clips that originate from YouTube | DN-05 before any video |
| P-BAND | Longer capture window shifts scores against the 85/60 bands | Learner-take trimming (L-07); thesis states bands not recalibrated |

## 4. Open items carried from Learn's plan docs

- `PROGRESS-CRITIQUE.md` 5.3 (re-shoot six frames, no scroll at 375, reduced-motion stagger, Scenario hub unchanged): L-26.
- `RECORD-UIUX-PLAN.md`: floating title overlap at narrow widths, phone-width verification never done: L-26. Author-mode screenshots for the report: optional.
- Practice and Record do not use `useSignCapture`; the countdown/capture logic exists in three copies. **Do not migrate before the demo**; each copy gets a backstop (L-03, L-04).

## 5. Riskiest untested areas (test order)

1. Camera lifecycle on real phones (Q-06a on 15 Oct, Q-06 on 19 Oct).
2. Keyboard flows (Q-04).
3. Handedness labels (Q-07).
4. Storage failure modes (Q-04 with IndexedDB blocked).
5. Deployment shape (D-01 smoke).
6. Adaptation over many attempts (L-13 tests).
7. The three capture copies (Q-04, manual).
