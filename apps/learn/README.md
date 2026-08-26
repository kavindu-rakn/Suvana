# SSL Learn — web app (PP2)

Interactive Sri Lankan Sign Language learning & practice module (R26-SE-019, Component 4).
React + Vite + TypeScript, with MediaPipe Tasks Vision running fully in the browser —
no video ever leaves the user's device.

## Run it

```bash
npm install   # also copies the MediaPipe WASM runtime into public/wasm (postinstall)
npm run dev   # http://localhost:5173
```

Requires a webcam. `npm run build` produces a static `dist/` deployable anywhere
(e.g. Vercel, same as the team's SSL-Transformer app).

## How it fits together

- `src/vision/handTracker.ts` — creates the MediaPipe `HandLandmarker` (VIDEO mode,
  2 hands, GPU delegate with CPU fallback). The WASM runtime and the model are served
  from **our own origin** (`public/wasm`, `public/models`) so demos don't depend on a
  CDN: `public/wasm` is regenerated from `node_modules` on every install by
  `scripts/copy-wasm.mjs`.
- `src/vision/types.ts` — `HandFrame` / `TrackedHand`: the plain-JSON frame format that
  the upcoming reference-recording tool and DTW comparison will operate on.
- `src/vision/useHandTracking.ts` — React hook owning the webcam stream, per-frame
  detection, skeleton overlay, and FPS / inference-latency stats (tracked from day 1
  because of the ≤300 ms feedback-latency target). Views subscribe to frames via a
  callback; the recorder buffers them.
- `src/components/` — `PracticeView` (live tracking), `RecordView` (countdown →
  record → review → save), `LibraryView` (replay / export / import / delete),
  `SkeletonPlayer` (replays recordings from landmarks alone — no video is stored).
- `src/storage/recordingStore.ts` — recordings persist in IndexedDB.

## Deploying (needed for user testing)

The camera needs a secure context. `localhost` counts, but nobody else can reach
your laptop — so a pilot requires a deployment.

The app is a static build with no backend, so Vercel needs almost nothing.

**Deploy from the CLI**, not by importing the repo. Vercel's "Import Git
Repository" flow only lists repositories the Vercel account *owns*, and this
module lives in a repo owned by a teammate — being a collaborator is not enough.
The CLI uploads the folder from disk and never touches GitHub, and the resulting
project belongs to whoever ran it:

```bash
cd learn-ssl-module/web
npx vercel@latest login
npx vercel@latest --prod
```

Answer `./` for the code directory (you are already in `web`) and decline the
offer to customise build settings — `vercel.json` sets framework, build command
and output directory, and Vercel's own Vite detection agrees with it. The upload
honours `.gitignore`, so `public/wasm` is not sent; `npm install` regenerates it
there via the postinstall hook.

Note that `vercel.json` cannot carry comments — the schema rejects unknown
properties, including a `"// note"` key — so the reasoning lives here instead.
The `Cache-Control: immutable` rule covers `models`, `references` and `wasm`
because every file in them is content-addressed by name and never changes in
place. `public/reference-index.json` is deliberately **outside** those
directories: it is regenerated whenever the corpus changes, so caching it for a
year would serve a stale vocabulary.

What a participant actually downloads:

| When | What |
|---|---|
| First paint | ~90 kB gzip JS + CSS, plus a **32 kB gzip reference index** (see the budget note below) |
| Choosing a sign | that one recording's frames (tens of kB), cached after |
| First **Start camera** | ~11 MB WASM runtime + 7.8 MB hand model, cached immutably |

The heavy tracking assets are deferred until the camera is actually started, and
are a one-off per participant.

> **The reference index is over its budget.** `UIUX-PLAN.md` §5 sets ≤20 kB
> gzip as a falsifiable acceptance criterion. It was already over at 23 kB with
> 362 references, and the 26 Aug corpus growth to 501 took it to **32 kB gzip /
> 303 kB raw**. It is fetched on first paint by every learner, so this is a real
> cost, not a bookkeeping detail.
>
> Roughly half the raw size is six fields — `attribution`, `note`,
> `sourceDataset`, `licence`, `signer`, `source` — repeated across all 501
> entries while carrying **two distinct values each**, one per corpus. Hoisting
> them into a per-source lookup keyed off `source` would cut the raw size by
> about 45% and should bring the gzip figure back under budget. That is a change
> to the index format and its consumers, so it is deliberately **not** bundled
> with the corpus growth — it wants its own change and its own verification.

### Running a pilot session

Attempts stay in the participant's own browser — nothing is uploaded, and no
video is ever captured to disk, which is what keeps the ethics story simple.

**The export is the facilitator's job, not the participant's.** It lives in
author mode, which a learner never sees: open `?mode=author`, go to **Study**,
enter the participant code you assigned (a code, never their name), and hit
**Export results**.

- **CSV** — one row per attempt, for a spreadsheet or stats tool, with the
  measured feedback latency for that attempt and the session it belonged to.
- **JSON** — the same rows plus per-sign summaries (`firstScore`, `lastScore`),
  session and attempt totals, and the latency summary for that machine.

Columns that carry a target:

| Column | Used for |
|---|---|
| `session_id` | Grouping attempts into sittings. Blank = free practice or a scenario turn, which are practice but not a numbered session. |
| `score`, `created_at` | Learning gain, per sign or per session |
| `latency_total_ms` | The ≤300 ms target. **Blank means not measured — never read it as zero.** |

`totals.sessions` in the JSON counts distinct sessions, which is the
denominator the "≥20% learning gain after 10 sessions" claim needs.

So one export covers three of the four proposal targets: learning gain, feedback
latency, and the attempt data behind accuracy. **SUS needs a questionnaire
outside the app** — nothing in here collects it.

They send you the file. Each participant needs their own browser profile or
device — two people sharing one browser share one IndexedDB and their data will
merge.

## Reference recordings

References ship bundled in `public/references/` (listed in `manifest.json`) and
come from two sources, kept distinguishable by a `source` field:

1. **The team's Kaggle corpus** (`source: "kaggle-dataset"`) — real SSL signers,
   converted to landmarks by `../tools/convert_references.py`. See
   `../tools/README.md` for the dataset, its CC0 licence, and conversion rules.
2. **Team recordings** (`source: "team-recording"`, `provisional: true`) — made
   in the Record tab. Per CLAUDE.md these are *test attempts for calibration,
   not ground truth*, so they are:
   - **labelled everywhere they appear** — an amber *provisional* badge in the
     Library and a warning above the reference in Practice and Scenario;
   - **outranked automatically**: `src/storage/references.ts` always prefers a
     non-provisional reference for the same gloss, whatever the dates. Drop in a
     School-for-the-Deaf recording later and it takes over with no deletions.

`src/scoring/references.test.ts` validates every bundled reference on each
`npm test`: manifest matches disk, 21 landmarks per hand, provenance present,
hands tracked in most frames, and — the important one — each reference scores a
perfect 100 against itself and strictly less against any other sign.

### Team workflow: recording your own

Only needed for glosses neither corpus covers. Of the seven the Introductions
scenario needs, **YOU, WHERE and CAN now ship** — WHERE and CAN arrived on
26 Aug 2026 when a converter bug was fixed (it globbed `*.mp4` and so never saw
the 41% of the Yohan corpus stored as `.mov`; see
`../../tools/reference-converter/README.md`).

That leaves **ME, NAME, WHAT and YOUR** genuinely uncovered — no such clips
exist in either corpus under any extension, so these are the ones that need
recording. `ME` is a special case: the corpus holds `I`, and whether that is the
same SSL sign is a question for the School for the Deaf, not a rename to apply.

For a usable reference: fill the frame from roughly the waist up, keep both
hands inside it for the whole sign, use even front lighting and a plain
background, and perform the sign once at a natural pace. The review screen
reports hand-tracking coverage — re-record anything below ~90%.

1. Open the **Record** tab, enter your name, pick a gloss.
2. Record → review the replay → **Save to library**.
3. In **Library**, hit **Export all for repo** — it downloads every recording
   plus a `manifest.json`.
4. Move those files into `public/references/` and commit. They then ship bundled
   with the app, so the whole team (and any demo machine) gets the same
   reference set.

Recordings store only landmark coordinates (~200 KB per sign), never video, so
they're safe to commit and share.

> Until you do step 3–4, your recordings live **only in your own browser's
> IndexedDB** — a cache clear loses them and nobody else can see them.

## Sign scoring (DTW)

`src/scoring/` compares a practice attempt to a reference recording:

- `normalize.ts` — turns each hand into per-frame features split into a
  **handshape** block (21 landmarks made wrist-relative and scaled by hand
  size → invariant to position and camera distance) and a **trajectory** block
  (the wrist path, centred and scaled → captures how the hand moves). Includes
  aspect-ratio correction so distances aren't distorted by the 16:9 frame.
- `dtw.ts` — classic dynamic time warping; aligns two sequences in time so
  attempts signed faster/slower than the reference still match.
- `score.ts` — `scoreAttempt(attempt, reference)` → overall 0–100 score,
  per-hand breakdown, per-landmark deviations mapped to fingers, and corrective
  hints. Handles one- and two-handed signs.

**Handedness.** Every attempt is scored twice — as performed and mirrored — and
the better result wins (`result.mirrored` says which). Sign languages let the
signer choose their dominant hand, so a left-dominant learner performing a
right-handed reference is signing *correctly* and must not be scored as a
missing hand.

Tested with `npm test` (vitest): self-match → 100; invariant to translation,
zoom, signing speed and capture resolution; discriminates wrong handshapes and
trajectories; points feedback at the finger that deviates.

### Score-scale calibration

The distance→score anchors are **fitted to measured data**, not guessed. The
corpus records many takes of each sign by one signer, which labels itself: two
takes of one sign are a correct rendition performed twice, takes of different
signs are a wrong-sign attempt. `src/scoring/calibration.test.ts` measures both
distributions over 557 takes of 33 signs and regenerates
[`calibration-report.md`](calibration-report.md) on every run.

| pair | p10 | median | p90 |
|---|---|---|---|
| same sign, another take | 0.220 | **0.474** | 0.788 |
| a different sign | 0.396 | 0.661 | 0.949 |

`D_PERFECT`/`D_ZERO` are set to the correct-rendition p10/p90, so the best tenth
of correct renditions score 100 and the worst tenth score 0. **The previous
values (0.05/0.35) were far too tight — `D_ZERO` sat below the median correct
rendition, so a genuinely correct attempt scored zero.**

> **This grades; it does not classify.** Best achievable separation between the
> two distributions is **73.8%**, and measured cross-sign distances start at
> 0.134 (`30` vs `40`) — some distinct signs are closer together than two takes
> of one sign typically are. A high score means *this target sign was performed
> well*, not *this was the right sign*. Appropriateness (`rubric.ts`) therefore
> compares only within a scenario's small vocabulary, never all 490 references.
> `src/scoring/anchors.probe.test.ts` reports the closest confusable pairs.

> **Still provisional:** every calibration take is by one fluent signer, so this
> captures natural variation of a *correct* rendition, not a learner's wider
> spread. Re-fit against real learner attempts graded by an SSL teacher before
> quoting the proposal's ≥90%-accuracy figure.

#### Where the calibration takes live

`calibration/` (557 takes, 15 MB) is **gitignored** — it is derived data, not
source. Both `calibration.test.ts` and `weights.fit.test.ts` read it, and both
use `describe.skip` when it is absent, so on a machine without it they go
**silently green rather than red**. A missing corpus therefore looks like a
passing suite; check the count in `calibration-report.md` if a figure looks off.

Archived outside git so it survives this laptop:

```
OneDrive/Documents/S L I I T/Y4S1/RP/Dataset/learn-calibration-takes.zip
```

3.4 MB zipped, 557 entries. Unzip into `apps/learn/calibration/` to restore.

Regenerating it from scratch instead needs the source videos, which are in the
same OneDrive folder (`YohanAbhishek - CC BY-NC-SA 4.0/Dataset - Original`):

```bash
python tools/reference-converter/convert_references.py --dataset "<...>/Dataset - Original" \
  --all --all-takes-out apps/learn/calibration --only "$(cat tools/reference-converter/calibration_signs.txt)"
```

The committed `calibration-report.md` and `weight-fit-report.md` preserve the
resulting numbers either way, so the published figures do not depend on any of
this surviving — only the ability to re-derive them does.

### Fitted feature weights, and three rejected changes

`W_SHAPE`/`W_TRAJ` are fitted by grid search over the same corpus
(`src/scoring/weights.fit.test.ts` → [`weight-fit-report.md`](weight-fit-report.md)),
now **0.8 / 0.2** rather than the assumed 0.7 / 0.3.

Separation rises monotonically with `W_SHAPE`, peaking at **78.6% when movement
is discarded entirely**. We deliberately did not take that maximum: the search
optimises *"is this the same sign?"*, a classification objective, while this
scorer *grades a known sign*. Movement is a phonological parameter of SSL, and a
scorer blind to it would award full marks to a learner with the right handshape
and the wrong movement. Optimising the available metric instead of the actual
goal is the mistake being avoided here.

Changes tried and rejected — each is a result, not a dead end:

| Change | Effect | Verdict |
|---|---|---|
| Sequence-stable instead of per-frame hand-size scaling | 73.7% → 73.4% | No effect; reverted |
| Trajectory as frame-to-frame **velocity** instead of centred position | 73.5% → 75.5% separation | **Reverted despite winning.** Per-frame velocity differences are small next to hand size, so a learner moving in entirely the wrong direction still scored 100 — caught by `score.test.ts`. |
| `W_SHAPE` = 1.0 (drop movement) | 78.6%, the maximum | Rejected on the same grounds |

The velocity result is worth keeping in view: absolute position genuinely does
carry noise (where the signer stood), so a *scale-aware* movement feature that
keeps gross-path sensitivity would likely beat both. That is future work.

## Learner model v1 (heuristic)

`src/learner/` tracks the learner and picks what to practise next:

- `attemptLog.ts` — every scored attempt is persisted (gloss, score, worst
  fingers, timestamp; no frames). This log is also the input the deferred
  error-mining work (K-means/PrefixSpan, Sep–Oct) will consume.
- `mastery.ts` — per-sign mastery as a recency-weighted score average (newest
  attempt counts half), banded New / Learning / Improving / Mastered
  (mastered needs ≥ 3 attempts). Practice selection ranks signs by
  *need* = unseen first, then weakness (75%) + staleness (25%, full after
  5 days). Deliberately simple and explainable; BKT + RL replaces it in the
  final phase without changing the attempt log.

The Practice tab logs every attempt and pre-selects the suggested sign (★);
the Progress tab shows summary tiles and per-sign mastery, weakest first.

## Scenarios

`src/scenario/` + `src/data/scenarios/` run a scripted conversation where each
turn asks for **one** sign, scored through the existing DTW path. Two of the
five proposal-approved scenarios ship:

| Scenario | Turns | Reference source |
|---|---|---|
| **Social Gathering (Introductions)** | 7 (ME, YOU, NAME, WHAT, WHERE, CAN, YOUR) | **3 of 7 runnable** (YOU, WHERE, CAN — all Yohan corpus, real signers). ME, NAME, WHAT and YOUR show *reference pending*. Aligned with Malkith's avatar glosses, so this is the integration demo. |
| **Restaurant** | 5 (KANAWA, BONAWA, 500, MILADII GANNAWA, BILPATHA) | Kaggle corpus — **real signers**. Demo this when reference quality matters. |

Verified end to end: with the Restaurant vocabulary loaded, a correct
performance scores 100 and performing a *different* sign from the same scenario
scores 33 or below with appropriateness 0 and the confusion named — including
the visually similar KANAWA/BONAWA pair. ~9 ms per turn.

- **Data-driven.** A scenario is a JSON file listing turns
  (`partnerLine`, `prompt`, `gloss`, `hint`). Adding another of the five
  proposal-approved scenarios means authoring JSON and listing it in
  `src/data/scenarios/index.ts` — no engine changes.
- **Graceful degradation.** Turns whose gloss has no reference recording are
  shown as *reference pending* and skipped, so the scenario runs with partial
  vocabulary and grows automatically as references land.
- **No silo.** Every turn logs to the same `attemptLog` as the Practice tab, so
  mastery and the progress dashboard cover scenario work too. The logged score
  is the **DTW accuracy**, not the rubric total, so "mastery" means one thing
  everywhere.

### Rubric — what is measured, and one honest deviation

*This section is written to be quotable in the report and defensible in a viva.*

The proposal scores each turn on four components: accuracy 40%,
appropriateness 30%, fluency-timing 20%, **non-manual markers 10%**. The
proposal names the components but does not define how to compute them, so the
definitions below are ours and are stated explicitly rather than implied.

**Deviation: non-manual markers are not scored.** They are facial expression,
head tilt and body movement — linguistically meaningful in SSL, but this build
tracks **hand landmarks only** (MediaPipe HandLandmarker, 21 points per hand).
The signal simply is not captured, so any number reported for it would be
fabricated. Their 10% is reallocated to accuracy, giving **50 / 30 / 20**.
Scoring non-manual markers requires face/pose landmarks and is named as future
work. The deviation is stated in `src/scenario/rubric.ts` and rendered in the
scenario summary UI, so a reader meets it without reading the source.

| Component | Weight | Operational definition | Known limitation |
|---|---|---|---|
| **Accuracy** | 50% | DTW distance between the attempt and the reference recording for that gloss, over wrist-normalised hand landmarks, mapped to 0–100. | Depends on reference quality; the distance→score anchors are not yet calibrated (see Calibration TODO above). |
| **Appropriateness** | 30% | *Did the learner produce the requested sign rather than a different one?* The attempt is scored against every **other** gloss in the library; the score reflects how far the requested gloss beats the best competitor. A tie scores 50. | A **closed-set** judgement: it can only detect confusion with signs we hold references for. It cannot detect a sign outside the library, and it grows sharper as the library grows. |
| **Fluency & timing** | 20% | Ratio of attempt duration to reference duration, symmetric in log space so twice-too-fast and twice-too-slow are penalised equally. Full marks within ±25% of reference pace. | Whole-clip pace only. It does not assess rhythm *within* a sign, or holds and transitions. |

Two design points worth stating explicitly:

1. **Fluency is a separate axis because DTW deliberately discards speed.** Time
   warping is what lets a slow learner still score well on accuracy; pace is
   therefore judged on its own rather than being invisible.
2. **Unmeasurable ≠ zero.** If a component has no data — appropriateness when
   the library holds a single sign, fluency when a take has no duration — it
   reports **n/a** and its weight is redistributed across the remaining
   components. Scoring it 0 would be a silent penalty for a gap in our data
   rather than a fault in the learner's signing.

> The conversational order in `introductions.json` is a **draft pending
> validation by an SSL teacher** (School for the Deaf, Ratmalana). Each turn
> asks for a single gloss; the surrounding text is English context, never a
> claim about SSL word order.

## Feedback latency — proposal target ≤300 ms

*This section is written to be quotable in the report and defensible in a viva.*

The proposal commits to feedback within 300 ms. That was previously supported
only by component figures, which is a weaker claim than it sounds: it omitted
React's commit, the browser's paint, and the fact that a scenario turn scores an
attempt several times over. The app now measures the whole path on real
attempts.

### Operational definition

The clock starts at the **capture of the final frame of the attempt** — the
earliest instant the system could know the sign was finished — and stops when
the **corrective feedback has been painted**:

| Stage | What it covers |
|---|---|
| **Hand tracking** | MediaPipe landmark inference on that final frame, the skeleton overlay draw, and the hand-off to scoring |
| **Sign scoring** | DTW alignment against the reference; in a scenario turn, also the rubric's appropriateness pass over the scenario vocabulary |
| **Showing feedback** | React's commit plus the browser's paint of the score and hints |

**Excluded, because JavaScript cannot observe them:** the camera's own
sensor→browser delay before the frame reaches us, and the display's response
time after we paint. Every figure is therefore a *software pipeline* latency and
should be quoted as such — not as glass-to-glass.

The measurement **errs high** in two places, which is the safe direction for an
"under 300 ms" claim: the take ends on whichever frame arrived last, charging us
up to one frame interval (~33 ms at 30 fps) of waiting; and the paint mark is
taken at the frame boundary *after* the paint, adding up to one more.
`src/metrics/useFeedbackLatency.ts` explains why a layout effect and two nested
`requestAnimationFrame`s are both needed to land that mark honestly — the
obvious alternatives (`useEffect`, a single rAF) each silently mis-measure.

Samples taken while the tab is backgrounded are discarded: `requestAnimationFrame`
is throttled there, so the number would measure the tab being hidden rather than
the app being slow.

### Where the numbers appear

- **Progress tab** — median, 95th percentile, share within 300 ms, and the
  stage breakdown, from that browser's own attempts. Marked *provisional* below
  20 samples, where a 95th percentile is really just "the second slowest one".
- **Pilot export** — the JSON carries the summary plus every sample; the CSV
  carries four latency columns per attempt row, joined on the attempt id and
  **left blank, never 0, where no sample was taken**. This is the point of
  measuring it during the pilot: the target is a claim about real machines, and
  a pilot is where a spread of them gets tested.

### What can be measured without a camera

`src/metrics/scoring.bench.test.ts` times the **scoring stage** against the real
reference corpus on every `npm test`, regenerating
[`latency-report.md`](latency-report.md) — the same pattern as
`calibration-report.md` and `weight-fit-report.md`.

Two things about that bench are worth stating, because both were mistakes caught
while writing it:

1. **The stand-in attempt is built at webcam frame rate, not the reference's.**
   DTW fills an n×m matrix, and a learner records for `reference duration +
   1500 ms` at ~30 fps, so a take carries far more frames than the reference
   does. Timing a reference against itself measured a workload roughly a third
   of the real size. Recycling the reference's frames to the right *length* is
   sound here precisely because this path's cost depends only on the two
   sequence lengths and never on the landmark values.
2. **Its figures are the cost of the algorithm, not what a learner waits for.**
   Each is the median of repeated runs after a warm-up; a single cold run
   inflated the 95th percentile by roughly 8× through JIT and GC noise. The
   number a participant actually experiences is the live end-to-end one, which
   keeps its noise.

So: quote the bench as *scoring cost*, and the Progress tab / pilot export as
*feedback latency*. They are not interchangeable.

## Roadmap (PP2)

1. ~~In-browser hand tracking~~ ✅
2. ~~Reference-recording tool (landmark sequences saved/shared as JSON)~~ ✅
3. ~~DTW scoring of practice attempts vs references + corrective feedback~~ ✅
4. ~~Learner model v1 (mastery tracking, weighted practice selection) + dashboard~~ ✅
5. ~~Social Gathering (Introductions) scenario~~ ✅ *(retargeted from Restaurant —
   see the handoff; Restaurant needs food/drink vocabulary we have no references for)*
6. ~~Real reference data from the team's Kaggle corpus~~ ✅ *(80 signs from real
   signers: 25 A–Z fingerspelling + 55 verbs — well past the 20–30 target, and
   56 of them two-handed, which exercises the two-handed scoring path with real
   data)*
7. Integration with the team platform; pilot test; PP2 slides

### Open items

- **The Introductions scenario has no references, and cannot get them from this
  dataset.** Confirmed against the complete corpus: no standalone clips for
  ME/YOU/NAME/WHAT/WHERE/CAN/YOUR — they occur only inside sentence clips, and
  segmenting those is scoped as future work. The scenario degrades gracefully
  meanwhile, but needs a decision on its vocabulary source.
- ~~Practice chips need grouping~~ ✅ The picker has search and category filters.
- ~~67 of 141 glosses have no English meaning~~ ✅ **Closed.** Every Sinhala
  transliteration in the corpus now has a human-verified meaning (75 entries in
  `src/data/translations.ts`, confirmed by kvn); the remaining 276 labels are
  already English words and need none. Audited against
  `public/reference-index.json`: zero transliteration-shaped glosses are
  unglossed. The rule still stands for anything added later — never guess a
  meaning, since a wrong one teaches the learner the wrong word.
- **What a learner meets first is a curriculum decision, and only a shallow one
  has been made.** With no attempt history every sign scores the same practice
  need, so the ordering is decided by a tie-break. That tie-break now prefers
  words over fingerspelled letters and numerals, and spreads across categories —
  which is why a first session is `ADINAWA, AFTER, AGAIN, APRIL, ARTICLE` rather
  than `1, 100, 100 METERS, 1000, 10000`. It claims nothing about the order
  *within* vocabulary; that is alphabetical, which is not pedagogy. A signer-
  chosen starter set would be a real improvement and needs the School for the
  Deaf, not code.
