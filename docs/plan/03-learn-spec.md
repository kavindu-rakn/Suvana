# 03 Suvana Learn: implementation spec (13-21 Oct)

Applies to `apps/learn` in Suvana. Every change must stay portable to R26 `learn-ssl-module/web` (07-r26-mirror.md). Task IDs refer to BOARD.md, where each task's full acceptance criteria live; this file gives the design and the cross-cutting rules.

## 0. Rules for every Learn change

- **SSL content:** never invent it. Meanings only from `src/data/translations.ts` (kvn-verified; agents never add entries). Gloss order only from Lithira's mapper or a real corpus clip. Scenario hints written by the team are hidden from learners until validated. No drawing may imply a body location the data does not contain.
- **Figures:** never invent them. Scores are "match scores"; 74.6% only with 65.4%. Every new threshold is listed as an "untuned UI constant" in `learner/ADAPTATION.md` or a scoring note.
- **UI changes:** before/after screenshots at desktop 1280x800 and phone 390x844 (360x800 for layout tasks) made with `tools/screens/shoot.mjs` (Q-00) into `<worktree>/.agent-local/screens/<ID>/`, plus a contact sheet. kvn adopts or rejects. UI tasks are **leaf branches** (nothing stacks on top of them).
- **CSS:** new components bring their own co-located CSS file (`PathView.css` etc.). `src/components/views.css` and `src/index.css` are hot files edited only by their owner of the day (10-schedule.md).
- **Portability:** nothing imports from outside `apps/learn`. Suvana-only behaviour sits behind `import.meta.env.VITE_SUVANA === '1'` (after R-01). Every task states `r26_port`.
- **Gates:** `npm run lint` no new warnings (0 after L-02 and L-04); `npm test` passes with new logic tested; `npm run build` keeps main JS <= 160 kB gzip (today 142.7 kB).
- **Storage:** every `localStorage`/IndexedDB access is wrapped and degrades to "progress can't be saved in this browser".
- **Privacy:** camera video never leaves the device. Any corpus video comes from Cloudinary URLs in a manifest; no dataset file or clip is ever committed.
- **Cache:** whenever a reference, wasm or model file changes, bump `ASSET_VERSION` (L-06), because browsers that visited before L-06 hold a year-long immutable cache.

## 1. Feature map

| Feature | Tasks | Answers | kvn screenshot decision | SSL-content source |
|---|---|---|---|---|
| Honest finger states, one label scale | L-01 | Guardrail; O1 (helpful feedback) | Yes | None (measured deviation) |
| Keyboard fixes | L-02 | Demo reliability | No | None |
| Capture robustness, camera lifecycle, storage resilience | L-03, L-04, L-05 | "Works on any device" | L-05 notice only | None |
| Cache headers, root redirect, asset versions | L-06 | Deployment | No | None |
| Onboarding, readiness gate, longer window, take trimming | L-07 | Learnability; O1 | Yes | None (generic copy) |
| Playback: 0.5x, speed, mirror label, raw framing, ghost | L-08 | Learnability | Yes | Reference landmarks only; no silhouette |
| Reference metadata, curriculum, scenario coverage | L-10, L-09, K-05 | PP1 levels; PP2 difficulty; O3 | No (tables to kvn) | Corpus references; order approved by kvn |
| Game logic: stars, units, unlocks, goal, streak | L-12 | PP1 game, levels, goals; O3 engagement design | No | None |
| Adaptation fix, reasons, ADAPTATION.md | L-13, T-04 | PP2 ("rule-based or learned?"); O2 | No | None |
| Meaning coverage | L-14 | Learnability | Yes | translations.ts only |
| Real-signer video (conditional) | L-15a, L-15b, K-06 | Learnability | Yes | Corpus clips permitted by DN-05 |
| Path view, "Why this sign?" | L-11 | PP1; PP2 visibility | Yes | Curriculum (kvn-approved) |
| Watch then Try, perf marks | L-16a | Core loop; O1 latency (Q-09) | Yes | Reference/video |
| Recall | L-16b | PP1 "not just accuracy" | Yes | Cue: verified meaning or gloss label (DN-09) |
| Hints engine, alignment | L-17, L-18 | O1 helpful feedback | No | None |
| Replay compare, result card | L-21 | O1 | Yes | Reference landmarks |
| Scenario cleanup, recall variant | L-19 | O3; guardrail | Yes | Existing scenario JSON; hints hidden |
| Third scenario (optional) | L-31 | O3 | Yes | Corpus signs; English context by kvn |
| Licence mode, attribution | L-20 | Commercialisation | Yes | LICENSES.md |
| Sentence challenge | L-22a, K-07, L-22b, L-25 | PP1 "a sentence" | Yes | Kaggle sentence clips; dataset labels as cues |
| Sequence from memory (optional) | L-32 | PP1 "a set of words" | Yes | Lithira's mapper output only |
| Progress dashboard, demo profile | L-23a, L-23 | PP2 visibility; demo hygiene | Yes | None |
| Hero CTA, session-complete | L-24 | PP1 goals; time to first attempt | Yes | None; decorative Hero cards unchanged |
| Polish, a11y, camera off | L-26, L-27 | Any device | L-26 yes | None |
| End-to-end latency | Q-09 | O1 (<= 300 ms) | No | None |
| Learn to Communicate deep link | I-14 | O4 | Yes | Exact gloss-id overlap only |

## 2. Blockers (13-14 Oct): L-01..L-06

- **L-01 finger states.** New `src/scoring/fingerStates.ts`: group `HandScore.perLandmark` by `LANDMARK_FINGER`; `off` if the finger's max deviation > `HINT_MIN_DEVIATION` (0.1, `score.ts:69`); `close` if > 0.05 (untuned); else `on`. Remove the invented formula (`PracticeView.tsx` ~384-408) and ScoreBadge's fallback that copies the overall score to every finger (`ScoreBadge.tsx` 201-242). One label scale from `band()` (85/60); delete "Master Execution"/"Fluent Signing" tiers in ScoreBadge (`:192-199`). Remove `lang="si"` from the English meaning (`aww-pane-si-sub`) and show the meaning once. **Do not touch the Hero's decorative cards.**
- **L-02 keyboard.** AppNavBar: `if (e.defaultPrevented) return` before Esc -> Hero (~line 75), and Practice registers its Esc handler in the capture phase (AppNavBar's window listener is registered first, so the guard alone does not work; see 04-bugs.md A1). Global shortcuts skip button, a, select, input, textarea, `[contenteditable]`. Destructure stable callbacks so the listener is not rebound per frame (fixes lint `PracticeView.tsx:479`, the global-shortcuts effect).
- **L-03 capture.** Wall-clock backstop `setTimeout(finish, captureMs + 500)`; `Promise.allSettled` on initial load; no attempt logged when `hands.length === 0`; delta by previous attempt id; abandon the take on tracking `error` or hidden tab.
- **L-04 camera.** `track.onended/onmute` -> stop + "Camera disconnected" + Restart; try/catch around `processFrame`; `window.isSecureContext` check ("Camera needs HTTPS"); GPU delegate failure -> retry once with CPU; `visibilitychange`/`pageshow` re-play; clear stale error on mount; backstops in RecordView and useSignCapture (the three capture copies stay; migrating to `useSignCapture` is post-demo debt). Fixes lint `src/vision/useHandTracking.ts:207`.
- **L-05 storage.** `src/storage/safeLoad.ts` never rejects; `StorageNotice` with its own CSS; guarded localStorage reads (RecordView:50, StudyView:23-24); top-level ErrorBoundary with Reload in `main.tsx`.
- **L-06 deploy shape.** `apps/learn/vercel.json` (today `public, max-age=31536000, immutable`): `/learn/(models|references|wasm)/(.*)` -> `public, max-age=86400, stale-while-revalidate=604800`; redirect `/` -> `/learn/` (Suvana only; never ported to R26, where it would redirect to a 404). `ASSET_VERSION` query on references, wasm and model URLs.

## 3. Curriculum and reference metadata (14-15 Oct): L-10, L-09, K-05

- **L-10** extends `scripts/build-reference-index.mjs` (already run by `predev`/`prebuild`/`pretest`; `package.json` untouched) to add per reference: `hands` (1|2), `motion` (`still`|`moving` from normalised wrist path length; threshold documented as untuned), `durationMs`, `licence` (from id prefix), `hasMeaning`.
- **L-09** `scripts/curriculum-report.mjs` prints the exact verified-meaning count and per-category tables, and writes `src/data/curriculum.ts` with units marked `status: 'proposed'`, generated by rules, not by hand:
  - **U1 Starter (hard rule):** `kaggle_*` AND (verified meaning OR self-explaining letter/number/month) AND one hand AND still; 5-8 signs, easiest first by duration. If fewer than 5 qualify, the report says so and proposes relaxing "still" before relaxing "kaggle_*".
  - Later units: by existing category (A-Z split in two, 20-99, 100-1 million, months, verbs, additional words, the Restaurant scenario's glosses, Yohan categories), each ordered by difficulty (1-hand still -> 2-hand moving -> duration), then the sentence unit last (if DN-08).
  - **Scenario coverage table** for the five proposal scenarios (healthcare consultation, job interview, social gathering, restaurant, emergency): which existing glosses could be single-sign turns, with licence. It proposes no order and no translations. kvn decides on a third scenario (DN-19).
- **K-05** kvn approves or edits units (status `approved`) and verifies meanings for U1 and the everyday-words unit himself in `translations.ts`. If DN-05 permits video, U1 should prefer signs with permitted video; this is an acceptance check on K-05, not a reason to include Yohan signs.

## 4. Game layer and adaptation (15-18 Oct): L-12, L-13, L-11, L-24, L-23a, L-23

- **L-12** `src/learner/game.ts` (pure, fully branch-covered): `starsFor(gloss)` 0-3 (1 = Try >= 60; 2 = Try >= 85; 3 = Recall >= 60 with `revealed=false`); `unitState(unit)` `locked|open|passed|mastered` (passed = all signs >= 2 stars; mastered = all signs mastered: EWMA >= 0.85 after >= 3 attempts); U1 always open; passing unit N opens N+1; `dailyGoal` default 10 scored attempts per local day; `streak`; `xp` = total stars. Attempt entries gain optional `stage` (`try|recall|sentence`), `revealed`, `sessionId`; old entries default to `try`; the pilot export (`pilot/exportResults.ts`) keeps working.
- **L-13** in `mastery.ts`/`session.ts` plus pure `nextExercise.ts`: due reviews (need > 0.5) before new signs; new sign only when no due review exists; sessions of N interleave about 2 reviews : 1 new; `startSession` reachable from the Path ("Practise this unit", N=8). Reasons: `review: score dropped`, `review: not practised for N days`, `new: next in unit`, `retry: last two tries below 60`. Next-exercise rules as in 02 Pillar 5. `learner/ADAPTATION.md` is the source for the thesis PP2 answer. Test: a sign scored 30 resurfaces before an unseen sign.
- **L-11** `PathView.tsx` (+ own CSS), nav entry, unit cards and detail, "Practise this unit", "Why this sign?" chip; adds `tools/screens/e2e/path.spec.ts`.
- **L-24** Hero CTA opens the first open unit's first sign in Watch; `SessionComplete.tsx` (stars earned, daily goal, next unit). Decorative Hero cards untouched (kvn, 11 Oct). The Hero's "20 categories" copy vs 18 in Practice is a minor bug; change it only if kvn says the copy is not part of the preview cards.
- **L-23a** (codex) storage profiles (`default`, `demo`) and `resetProgress(profile)`; **L-23** (antigravity) the Progress UI: units and stars, streak and goal, due today, learned (>= 2 stars) and mastered, "How adaptation works", "How scoring works", Reset (with confirmation), Demo profile switch, Export unchanged.

## 5. Practice stages (17-18 Oct): L-16a, L-16b

- A pure, tested `practiceStages.ts` machine: `watch -> try -> recall`.
- **Watch:** `SignVideo` when the manifest has the reference (L-15b, if DN-05 permits), else the skeleton at 0.5x; "My turn".
- **Try:** as today; attempts logged with `stage: 'try'` and `sessionId`; stars and the next-exercise suggestion on the result card.
- **Recall (L-16b):** reference pane replaced by the cue (DN-09); "Reveal (costs the 3rd star)"; no hints before reveal; after scoring the reference is shown beside the result.
- **Perf marks (L-16a):** `performance.mark('suvana:capture-end')` when capture stops and `performance.mark('suvana:result-shown')` when the result renders. Q-09 measures them over 20 runs with the K-13 clip (O1).
- `prefers-reduced-motion` respected; L-02 keyboard behaviour preserved.

## 6. Onboarding and capture protocol (14 Oct): L-07

- Three-step overlay (frame yourself; watch at 0.5x then "My turn", mirror explained; what 85/60 match bands mean, not correctness), on first run and from "How it works".
- Readiness: live "hands in frame" pill; Record disabled until hands are seen in 5 consecutive frames.
- Capture window = `max(2 x reference.durationMs, durationMs + 3000)`.
- **Learner-take trimming:** leading and trailing no-hand frames are trimmed before scoring, matching how the converter trims references (cite the converter code in the handoff). Without this, idle frames in the longer window would shift scores against the bands, which were set under the old protocol. The thesis states that the capture protocol changed and that the bands were not recalibrated.

## 7. Playback (15 Oct): L-08

As 02 Pillar 1: 0.5x for 2 loops then 1x; speed control; "Mirrored" label; **raw framing by default** in a plain rectangle labelled "position in the original video frame"; "Zoom to hands" toggle; **no silhouette**; ghost canvas sized to `video.videoWidth/Height` and translated so its wrist sits on the learner's tracked wrist.

## 8. Feedback (17-19 Oct): L-17, L-18, L-21

- **L-17** (`score.ts` `buildHints` ~187-229, new `hints.ts`): "Close match" only at >= 85; timing hint when `attemptActiveMs / reference.durationMs` is outside [0.67, 1.5]; path hint when the trajectory term contributes more than the handshape term (prove on a real attempt pair that it can fire under 0.8/0.2 weighting, or drop it and say so); missing-hand hint uses the learner's hand when mirrored (`:198-203`, `:291`); typed hint objects `{kind, finger?, ratio?}`, at most 2. Score values unchanged.
- **L-18** export `alignment` and `worstFrameIndex` from DTW; median scoring time within 10% of today.
- **L-21** `ReplayCompare.tsx` (side by side, synced along the alignment, 0.5x, pause at the worst frame, off fingers highlighted); result card = band + finger states + up to 2 hints + stars change; remove the `'Check your '` string filter; hints behind "Show tips" once `improving`; phone stacks the replays.

## 9. Video (15-16 Oct, conditional on DN-05): L-15a, K-06, L-15b

- **L-15a** `tools/reference-converter/export_clips.py --dataset-dir --out --allow-list [--dry-run]`: maps each permitted `kaggle_*` reference's `sourceFile` to its clip; writes mp4 (H.264, 480p, muted, +faststart), webm and jpg poster; trims only if references store offsets (today they do not: `convert_references.py:204-215` drops leading/trailing no-hand frames and rebases timestamps to 0, so an untrimmed clip includes rest frames the skeleton lacks). Refuses an `--out` inside a git repo.
- **K-06** kvn exports and uploads to Cloudinary `suvana/learn/clips/`; updates the "no video frames are redistributed" statements in the same change.
- **L-15b** `SignVideo.tsx` (`muted playsinline loop preload="metadata"`, 0.5x then 1x, mirror toggle, poster, skeleton fallback); `public/references/video-manifest.json` `{refId: {mp4, webm, poster, licence, source}}`, empty until K-06; a test rejects non-`kaggle_` entries; credit copied verbatim from `LICENSES.md` plus the takedown note.

## 10. Scenarios (17 Oct): L-19

Social Gathering "Preview: 3 of 7 signs available", not completable; Record tip author-mode only; playable-turn counts; failed references retried; `glossLabel` everywhere; movement/location hints flagged `pendingSignerValidation: true` and **hidden from learners**; "That looked closer to X" removed; recall variant (skeleton revealed after the attempt).

## 11. Licence mode (18 Oct): L-20

`VITE_CONTENT` = `all` (default) | `cc0`. Under `cc0` the index drops `yohan_*`, and units and scenarios with missing signs show as Preview. Attribution panel lists both corpora with licence, link and "modified (landmark extraction)". The Yohan source URL is added only from the dataset page; otherwise the TODO stays.

## 12. Sentence challenge (15-19 Oct, conditional on DN-08): L-22a, K-07, L-22b, L-25

- **L-22a** lists the 21 "SSL Sentences" labels exactly as the dataset gives them and prepares the converter command. Go/no-go evidence for DN-08: are the labels meaningful sentences (usable as cues) or numeric?
- **K-07** kvn converts them to `kaggle_sent_*.json` and hands the files to the L-22b worktree.
- **L-22b** `src/data/sentences.ts` (`refId`, dataset label verbatim, optional meaning only from translations.ts); excluded from single-sign browse and recommendations; manifest and licence test accept them; perf test 6 s vs 6 s under 50 ms.
- **L-25** `SentenceView.tsx`: Watch the whole clip at 0.5x; Try with the reference; Recall with the dataset label as cue; capture window 2x the clip; one reference; badge "Experimental: whole-sentence match, not calibrated" always visible; last unit on the Path.
- If the labels are unusable or DN-08 = drop, the thesis says the sentence request is unanswered except through Recall of single signs.

## 13. Polish (20 Oct): L-26, L-27

No horizontal scroll at 360/375/390 on every screen; reference pane 40vh on phones without title overlap; tap-to-preview on touch; emoji removed from the no-hands panel (`PracticeView.tsx:787-801`); reduced motion; focus order and AA contrast spot-check; Q-07 label fix if needed. L-27: camera stops while browsing or hidden; hover hint only under `(hover: hover)`; restore `gsap.ticker.lagSmoothing` on Hero unmount.

## 14. Definition of done for "Learn great" (21 Oct)

- [ ] All MAJOR bugs in 04-bugs.md fixed and ported to R26.
- [ ] Path, Watch/Try/Recall, stars, daily goal, streak, session-complete work on phone and desktop, adopted from screenshots.
- [ ] Honest feedback: no `%` per finger; timing and path hints (or the path hint dropped with a reason); replay.
- [ ] ADAPTATION.md written; "Why this sign?" live; worked example (T-04) reproduces real output.
- [ ] Sentence challenge live and labelled experimental, or dropped by DN-08.
- [ ] Video live for permitted clips, or absent by DN-05; either way no unpermitted footage.
- [ ] Lint 0 warnings; tests pass; build <= 160 kB gzip; Playwright smoke passes; Q-09 latency measured.
- [ ] Same commit live at suvana-shell.vercel.app/learn/ (or suvana.help/learn/) and learn-ssl-module.vercel.app.
