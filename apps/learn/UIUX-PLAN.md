# UI/UX implementation plan — SSL Learn

Written 16 Aug 2026. Target: PP2, end of August (~2 weeks).

This plan is grounded in a code audit and in measurements taken against the
running app, not in general advice. Every claim below that carries a number was
measured; where a figure is a floor or an estimate it says so.

---

## 1. The scheduling fact that drives everything

**The UI must be finished and frozen before the first pilot participant touches
it.** SUS ≥ 70 is one of the four proposal targets, and SUS is measured on
whatever interface participants actually use. Learning gain is measured the same
way. So this is not optional polish that can slip past the pilot — it is the
research instrument, and it has a hard deadline earlier than PP2 itself.

That cuts both ways. It is the reason to do this work now, and the reason it
cannot expand indefinitely: it competes for the same two weeks as deploying to
Vercel, recruiting participants, the camera session that produces the latency
figures, team integration and the PP2 slides.

The audit produced **63 proposals totalling roughly 165 hours**. That is four
weeks of full-time work and it does not fit. What follows is the subset that
fits, ordered so that stopping early still leaves a coherent product.

### Sequencing against the rest of PP2

Deploy to Vercel on **day 1**, before any of this. It is the only item nobody
else can do, it blocks the pilot, and pilot recruitment has lead time that runs
in parallel with coding rather than competing with it. Deploy first, start
recruiting, then build — and redeploy as each phase lands.

---

## 2. What is actually wrong

The starting point is better than it looks. There are real design tokens, a
consistent dark theme, thoughtful comments explaining why things are as they
are, and a genuinely good learner model underneath. The colour palette is sound:
every text/background pair passes WCAG AA, several comfortably
(`--text` on `--surface` is 14.02:1, `--text-dim` on `--surface` is 6.54:1).

This is a level-up, not a rebuild. But four things are badly wrong.

### 2.1 The app re-downloads its entire corpus on every tab switch

`src/storage/bundledReferences.ts` fetches `manifest.json`, then fires a parallel
fetch for **every one of the 362 reference files — 19.4 MB of JSON**. Four views
(`PracticeView`, `ScenarioView`, `LibraryView`, `ProgressView`) each call it
independently on mount, with no cache of any kind.

Measured in a 375×812 mobile viewport on `localhost`, which is the best case
there is — no network latency, no bandwidth limit:

| | Measured |
|---|---|
| Initial load | ≥202 requests, ≥13.89 MB decoded, 843 ms |
| JS heap after initial load | **70.6 MB** |
| A single switch to the Library tab | **726 requests, 36.95 MB decoded, 1269 ms** |
| Heap after that one tab switch | **95.7 MB** |
| DOM nodes after that one tab switch | 425 → 2931 |

Two caveats, stated honestly. The initial-load figures are a **floor**: the
resource-timing buffer caps at 250 entries and it filled. And the 726/36.95 MB
tab-switch figure is inflated by React StrictMode double-invoking effects in
dev — production would be ~363 requests and ~19.4 MB. Still catastrophic, and
still on every tab switch.

None of the four views actually needs the frame data. `ProgressView` maps to
`r.gloss` and nothing else. `LibraryView` shows gloss, signer, duration and frame
count in the row, and needs frames only for the one player the user opens.

Nothing else in this plan matters until this is fixed. "Fluid, seamless, never
lags" is not reachable on top of a 19 MB tab switch, and a 95 MB heap is a
tab-kill risk on a low-end Android.

### 2.2 Every single interactive element fails the touch minimum

Audited in a 375×812 viewport: **381 of 381 interactive elements are below
44×44 px.** Not most — all of them. Chips are 24 px tall. Tabs are 37 px. The
"Suggested next" link is 20×17 px.

381 controls also sit on one screen, which is a Hick's-law problem before it is
an ergonomics one.

The deeper mobile failure is structural. `.record-layout` is a two-column grid
that collapses to one column below 900 px, which stacks a 16/9 camera band on
top of a long panel. On a phone the "Record attempt" button lands roughly
700–900 px down the page. **The learner cannot see themselves and press record
at the same time** — and that is the entire interaction.

### 2.3 The app has no motion

Four CSS transitions in the whole codebase. Zero `@keyframes`. Zero
`prefers-reduced-motion` support.

Worse, two of the four never fire. `.score-badge .ring-value`
(`views.css:390`) and `.mastery-bar > div` (`views.css:571`) both mount already
at their final value, and `PracticeView`'s result branch unmounts entirely
between takes, so every attempt is a fresh mount. The two animations that exist
are dead code.

### 2.4 The five tabs are not peers

`Record` and `Library` are authoring tools. `RecordView` writes ground-truth
references with a provenance field; `LibraryView` exports JSON behind an alert
telling the user to move files into `public/references/` and commit. A hearing
learner in the pilot is shown, as equal-weight peers, two tools whose success
criterion is a git commit. `ProgressView` additionally carries a pilot-study
export panel and a system latency panel that belong to the researcher.

---

## 3. Constraints this plan will not break

1. **Performance is sacred.** A webcam stream and MediaPipe WASM inference
   already run every frame. Anything that steals main-thread time damages a
   measured research target.
2. **No heavy dependencies.** Current deps are react, react-dom and
   `@mediapipe/tasks-vision`. No framer-motion, no Tailwind, no UI kit, no
   virtualization library. Native CSS and the Web Animations API only.
3. **Research-integrity disclosures survive.** The `provisional` badge, the
   DRAFT scenario-order note, the disclosure that non-manual markers are not
   scored, and licence attribution are **decluttered by disclosure, never by
   removal**. Phase 1 turns them into a named component so they are impossible
   to lose by accident.
4. **Never invent SSL content.** No new glosses, no invented sentence order, no
   guessed English meanings.

---

## 4. The plan

Effort is in focused hours. Roughly 5–6 h/day is realistic alongside everything
else, so ~54 h is about ten working days.

### Phase 0 — Make it fast (14 h) · *prerequisite for everything*

**0.1 — Build-time reference index + lazy frames (7 h)**
Files: `scripts/build-reference-index.mjs` (new), `src/storage/bundledReferences.ts`,
`src/storage/references.ts`, all four views.

Add a Node script wired into `prebuild`/`predev` (no new dependency) that reads
`public/references/*.json` and emits `index.json` — everything except `frames`:
id, gloss, signer, durationMs, frameCount, fps, dimensions, provisional, source,
licence, attribution. Generated from the real corpus this is **88 KB raw /
17.5 KB gzip for all 362 entries**, replacing 19.4 MB.

Keep licence and attribution *in the index* so Library can render attribution
without loading a single frame.

Then rewrite `bundledReferences.ts` as two module-level cached functions:
`loadReferenceIndex()` with a `??=` in-flight promise so all four views share one
request forever, and `loadReferenceFrames(file)` with the same dedupe plus an
LRU cap of ~24 entries so a long Library browse cannot grow unbounded. Add
`loadReferenceFramesMany()` for the scenario vocabulary. Persist across reloads
with the Cache Storage API (~15 lines, stores `Response` objects directly, no
`db.ts` schema migration), versioned off the index build so a re-converted
corpus invalidates cleanly.

`references.ts` becomes generic over a `RecordingMeta` — `captureRate()` uses
`rec.frameCount` instead of `rec.frames.length` — so local IndexedDB recordings
mix in unchanged.

> ⚠️ This proposal's *solution* was not adversarially verified — the reviewer
> that would have checked it died when the account hit its spend limit. The
> *problem* is confirmed: I measured it directly against the running app.
> Treat the design as sound but unreviewed, and test the Library and Scenario
> paths carefully.

**0.2 — Cut MediaPipe out of the initial bundle (4 h)** *(verified)*
Files: `src/vision/drawing.ts`, `handTracker.ts`, `useHandTracking.ts`,
`types.ts`, `SkeletonPlayer.tsx`.

`SkeletonPlayer` statically imports `DrawingUtils`, so the whole library is in
the initial chunk even for a learner who never starts the camera. Measured: the
library does not tree-shake — importing only `DrawingUtils` still costs
134,902 B raw / 40,041 B gzip.

Replace it with ~30 lines of canvas code. The reviewer verified all 21 landmark
connection pairs against `HandLandmarker.HAND_CONNECTIONS` at runtime — exact
match, same order — so inline the topology and add a test asserting equality
(tests aren't bundled, so the test may import MediaPipe freely).

**Done — with one correction to the original guidance.** The advice was to batch
each hand into one `Path2D` (3 draw calls instead of 42). Measured, that is
wrong on both counts: it changes **27% of the inked pixels**, because
overlapping antialiased edges composite once instead of once per shape, and it
is *slower* (0.022 ms vs 0.017 ms per frame) — `Path2D` setup costs more than
the draw calls it saves on paths this small.

Drawing shape-by-shape instead is **pixel-identical** to the MediaPipe output:
0 differing pixels across 85 frames (34 two-handed, 528,899 inked pixels). On
the overlay learners correct against, that guarantee is worth more than a
micro-optimisation that wasn't one.

Hardcode `lineWidth: 5` and `radius: 5`. Do **not** add DPR scaling here — the
reference canvases are 1280×720 and it would double stroke weight. That belongs
to a separate change.

Then make `handTracker.ts` import MediaPipe dynamically inside
`createHandLandmarker()`, keep `import type` at the top (erased at build), and
add a `describeError` case for the new dynamic-import failure mode. Prefetch on
idle from `App.tsx` so the click-time fetch is a warm cache hit.

Result: **389,397 B / 118.93 kB gzip → ~254,000 B / ~77 kB gzip**, a third off
the critical path, and 120–250 ms less parse time on a low-end phone.

After this, **regenerate `latency-report.md`** — `metrics/latency.ts` counts the
overlay draw inside `trackingMs`, so the existing numbers describe the old build.

**0.3 — Pause inference during the result phase (3 h)**
Files: `src/vision/useHandTracking.ts`, `useSignCapture.ts`, `PracticeView.tsx`,
`ScenarioView.tsx`, `SkeletonPlayer.tsx`.

`useHandTracking` re-schedules `detectForVideo` unconditionally while the camera
runs. `PracticeView` sets phase `result` but never stops it, so full landmark
inference (10–25 ms/frame on low-end hardware) keeps burning the main thread
while the learner reads their score — and no frame consumer exists in that phase.

Add `pause()`/`resume()` that cancel the rAF but leave the stream and
`video.srcObject` intact, so the self-view keeps playing and resume is instant.
Don't clear the overlay on pause — drop it to 0.35 opacity so the last skeleton
reads as frozen, not broken.

Also throttle `SkeletonPlayer` to the recording's own frame rate (references are
~25 fps but the loop repaints at display refresh, redrawing identical pixels),
and pause offscreen players with an `IntersectionObserver`.

**This is the change that pays for every animation in Phase 3.** It hands back
15–25 ms of main thread per frame at exactly the moment the reveal runs.

**Done — late, and after Phase 3 rather than before it.** This was skipped when
Phase 0 was built and only caught during a completeness audit, so Phases 3 and 4
shipped without the frame budget they were designed to spend. `pause()`/
`resume()` now bracket the Practice result, the Scenario turn result and the
Record review screen; the stream stays live so resuming costs nothing, and the
overlay holds its last skeleton at 35% rather than clearing. The
`IntersectionObserver` half of the original proposal (pausing offscreen
`SkeletonPlayer` loops) was **not** built — frame dedupe in Phase 3B covers most
of it, and at most two players are ever mounted.

### Phase 1 — The design system (8 h)

**1.1 — Three-tier tokens (3 h).** `views.css` leaks 14 raw hex literals past the
token layer (`#fbbf24` appears six times), there is no spacing scale (16 distinct
padding/gap values), and `--accent` does six unrelated jobs — brand kicker,
button fill, focus ring, mastery-bar fill, sparkline stroke, and the "improving"
level chip — so it cannot be retuned without silently changing the meaning of a
data visualisation.

Restructure into raw palette → semantic → component tokens, where only the
semantic tier is referenced by component rules. Add a 9-step spacing scale and a
5-step radius scale. Give the integrity amber its own semantic name
(`--integrity`) distinct from `--caution`, so a warning colour change can never
quietly restyle a research disclosure.

Change `body { min-height: 100vh }` to `100dvh` — this alone fixes the iOS
Safari toolbar jump.

**1.2 — Fluid type scale + font stack (2 h).** `'Segoe UI'` renders differently
on every OS. Move to a proper system stack, add a modular scale with `clamp()`,
and use `font-variant-numeric: tabular-nums` on the live readouts (fps,
inference ms, elapsed seconds, score) so digits stop jittering as they change.

**1.3 — Elevation model (1.5 h).** Dark UIs cannot use shadow alone; layer by
luminance plus a light top border. Also: `background-attachment: fixed` on
`body` (`index.css:39`) forces a full-viewport repaint on every scroll frame —
replace it with a fixed pseudo-element.

**1.4 — Motion tokens with reduced-motion enforced at the token layer (2 h).**
Define duration and easing tokens, then under
`@media (prefers-reduced-motion: reduce)` set the duration tokens themselves to
`1ms`. Enforcing it at the token layer means no future animation can forget to
respect it.

**1.5 — Split decorative from interactive borders (1 h).** `--border` on
`--surface` measures **1.33:1**, which fails WCAG 2.1 SC 1.4.11 (3:1 for UI
component boundaries). This is fine for a decorative card edge but not for input
and control borders. Split into `--border-subtle` and `--border-interactive`.

*(This is the one contrast failure in the palette. Everything else passes.)*

### Phase 2 — Mobile shell and IA (15 h)

**2.1 — Mobile-first foundation (1.5 h).** Viewport meta, `dvh` units,
safe-area insets, `overscroll-behavior` containment.

**2.2 — Rebuild the mobile record shell (7 h)** — the single biggest UX win.

Blocking prerequisite: `views.css:16` uses a *descendant* selector
(`.camera-stage video, .camera-stage canvas`) that forces absolute
full-bleed positioning onto every nested canvas. Rescope to direct children
(`.camera-stage > video`, `.camera-stage > canvas.tracking-overlay`) before
nesting anything inside the stage.

Then: make `.camera-card` `position: sticky; top: 0` so the learner always sees
themselves; move the reference `SkeletonPlayer` *inside* `CameraStage` (it
already accepts `children`) as a picture-in-picture at bottom-right; add
tap-to-swap with `role="button"`, `tabindex=0` and a visible glyph — a
discoverable control, not a hidden gesture. Suppress the PiP transport controls
on mobile since it loops continuously.

The reference living inside the camera frame reads as one task rather than two
(Gestalt common region), and it solves the real problem: seeing yourself and
what you are copying simultaneously.

Carry the `provisional` note into the PiP — do not lose it in the move.

**2.3 — Bottom tab bar (3 h).** Move navigation into the thumb arc on mobile;
keep a rail in landscape and the existing top tabs on desktop.

**2.4 — Touch targets via `pointer: coarse` (2 h).** Sweep every control to
≥44 px using a `@media (pointer: coarse)` block rather than width breakpoints,
so a touch laptop is handled correctly too. Use padding and pseudo-element hit
areas rather than visual size where the design needs small chips.

**2.5 — Learner / author mode split (3 h).** ~15 lines: read `?mode=author` from
the URL, persist to localStorage, expose `readMode()`. Learner mode shows
Practice / Conversations / Progress. Author mode adds Record / Library / Study
(the pilot export and latency panel move there). Entry is a low-salience footer
link — not a secret gesture, which would fail keyboard and AT users and would
have kvn hunting for it on a projector during the viva. Author mode shows a
sticky banner so a screenshot in the report is unambiguous about which mode it
was taken in.

### Phase 3 — The feedback moment (11 h)

This is the emotional core of the product and where "addictive" is actually won.
Currently the peak experience is a static ring whose animation never fires.

**3.1 — Arm the reveal after `paintAt` (1.5 h)** — *do this first; it is the
mechanism that makes everything else safe.*

There is currently no way to run anything expressive at the score moment without
corrupting the research measurement. `renderMs` is measured to the frame boundary
after the result commit. Any entrance animation attached to that commit inflates
a reported figure. And if the reveal starts elements at `opacity: 0`, then at
`paintAt` the feedback is not actually legible — which makes the ≤300 ms claim
untrue in substance even if the number stays the same.

Split the reveal into two acts:

- **Act 1, the measured commit:** final layout, final numeral text, final hints,
  ring already at its final `stroke-dashoffset`. No opacity-0 states, no
  animation classes, no newly-mounted rAF loops.
- **Act 2, everything expressive:** starts strictly after the sample is taken.
  Give `useFeedbackLatency` an optional `onSampled?: () => void` invoked inside
  its existing inner `requestAnimationFrame` — no new rAF, no new timer,
  guaranteed to be the frame after `paintAt`.

**The rule this establishes, which every other animation obeys:**
information-bearing elements may animate `transform` only — they start at
`translateY(...)` and settle to 0, always at full opacity, always readable at
frame one. `opacity` fades from 0 are reserved for purely decorative layers,
which must also be `aria-hidden`.

That earns one sentence in the latency methodology: *"the reveal animation is
initiated on the frame after the paint mark and therefore cannot enter the
measurement; the score and hints are fully legible at the paint mark."* That is
defensible at viva. "We added animations and the number went up a bit" is not.

**3.2 — Choreograph the score reveal (4 h).** Ring sweep, count-up numeral,
band-dependent celebration, hint cascade — all `transform`/`opacity` only, all
under `data-reveal="on"`, all after Act 1.

**3.3 — Phase-machine choreography (2 h).** Drive idle → countdown → recording →
result from a single `data-phase` attribute on the layout root, so transitions
are declarative CSS rather than scattered conditional classes.

**3.4 — A real 3-2-1 countdown (1.5 h).** Currently a plain number swap.

**3.5 — Stop destroying the correction on retry (1.5 h).** `beginCountdown`
calls `setResult(null)`, so pressing "Try again" instantly unmounts the score,
hints and finger chips the learner was just told to fix. **The corrective
feedback disappears at the exact moment it is needed** — during the countdown and
capture. The product claim is "specific corrective feedback" and the retry path
deletes it.

Keep a `lastResult` that `beginCountdown` does not clear, and render a compact
sticky coach strip (`ME · last 62 · fix index finger, thumb`) through countdown
and recording. Promote "Try again" to sit beside the ScoreBadge as the primary
action; demote "Pick another sign".

**3.6 — Capture progress bar via `transform` (0.75 h).** Currently animates
`width`, which lays out every frame during capture — the one moment the main
thread is busiest.

### Phase 4 — Session loop (6 h) · *the "addictive" layer, if time allows*

`PracticeView` is an infinite chip-picker with no beginning or end. `suggestNext`
already computes the right next sign and it is rendered as one line of body text
competing with a search box, category chips and up to 362 gloss chips. Nothing
ever completes.

There is a research argument for doing this, not just a UX one: the proposal
target is *"≥20% learning gain after 10 sessions"*, and **"session" is currently
undefined inside the product participants use.** Defining it makes the target
measurable.

Add `src/learner/session.ts` built entirely on the existing model — no invented
data. `buildSession(summaries, size = 5)` reuses the exact `practiceNeed` ranking
`suggestNext` already uses, so the set provably follows the same policy. Session
state in `sessionStorage`; IndexedDB `attemptLog` stays the single source of
truth for progress. Reuse `.turn-progress` from ScenarioView for the segment bar.

**A sign counts as done after one scored attempt, not after a good score.**
Gating completion on hitting 85 traps a beginner in an unfinishable loop — the
opposite of self-efficacy — and would bias the study toward participants who
happen to score well early.

Completion card shows real before→after mastery deltas from `summarizeGloss`.
Always keep a "Free practice" escape. Never trap the learner.

**Ethical bound, and it is a real one:** this is a research tool measuring human
participants. Motivation must be intrinsic — competence, progress, mastery.
Explicitly rejected: loss-framed streak guilt, artificial scarcity, manipulative
notifications, fake progress. If a consistency signal ships, it counts up and
never shames. Write that rejection down in the report; it is a defensible design
position, not an omission.

### Phase 5 — Accessibility and verification (6 h) · *not optional*

**5.1 — Focus management (1.5 h).** When the phase machine swaps panels, focus is
lost entirely — a screen-reader user is stranded mid-task. Move focus
deliberately on every phase and stage transition.

**5.2 — Live regions (2 h).** The score, the countdown and the recording state
are announced nowhere. Add `aria-live` regions. For a sign-language product with
a School for the Deaf as partner, shipping an inaccessible interface would be a
poor look regardless of who the direct users are.

**5.3 — Progress legible without colour (1 h).** `--accent-2` (done) and
`--accent` (current) sit about **1.16:1 apart in greyscale** — indistinguishable
to greyscale and to most colour-vision types. The turn-progress bar encodes state
by colour alone. Add shape or text.

**5.4 — Verify against budgets (1.5 h).** Below.

---

## 5. Performance budgets — make them falsifiable

Set these as acceptance criteria and measure them, so "it doesn't lag" is a
result rather than a hope.

| Budget | Target | How |
|---|---|---|
| Initial JS (gzip) | ≤ 80 kB | `npm run build` output |
| Reference index | **≤ 50 B gzip per reference** | `referenceIndex.test.ts`, every `npm test` |
| Data per tab switch | **0 bytes** | DevTools Network, after 0.1 |
| JS heap, Practice idle | ≤ 25 MB | `performance.memory` |
| Long tasks during capture | none > 50 ms | `PerformanceObserver('longtask')` |
| Feedback latency p95 | ≤ 300 ms | existing Progress panel |
| Frame budget during reveal | ≥ 55 fps | DevTools Performance |

> **The index budget was re-expressed per reference on 26 Aug 2026, and it is
> not a relaxation.** It was originally a flat ≤20 kB gzip, set when the corpus
> held 362 references. That figure cannot tell "the index got fatter" from
> "there are more signs" apart, and those want opposite responses — the first is
> a regression, the second is the product working. When the corpus grew to 501
> the flat budget failed on growth alone, while the per-reference cost had in
> fact *improved*.
>
> Against the new criterion the index measures **44.5 B per reference and
> passes**, having come down from 63.5 B — so the same work that broke the old
> budget comfortably clears the new one. 50 B leaves about 11% headroom, enough
> that a genuinely fat new field trips it rather than ordinary drift.
>
> It is also the only budget in this table now checked automatically: the others
> still need someone to run DevTools, but this one gzips the built index on
> every `npm test` and fails the suite. See the note in `README.md` for what the
> remaining cost is made of, and why the `id` field is not removable.

Re-run the latency measurement after Phase 0 and again after Phase 3, and
regenerate `latency-report.md`. If the reveal work moved the number, the Act 1 /
Act 2 split is not holding and that is the thing to fix.

**Test on a real low-end device, not a throttled desktop.** DevTools CPU
throttling does not reproduce mobile GPU compositing or thermal behaviour, and
the camera path cannot be exercised in the embedded browser at all.

---

## 6. Explicitly cut

Deferred to the Sep–Oct final phase, with reasons — worth stating in the report
so they read as decisions rather than omissions:

- **Light mode.** Ship `prefers-contrast` support instead; structure the tokens
  so light becomes a one-hour swap later.
- **Web Worker for DTW.** Scoring is already 3.5 ms median / 16.7 ms p95 for
  practice. Worker transfer overhead would likely exceed the win. Memoise
  attempt and reference features instead if it ever becomes hot.
- **View Transitions API** for tab changes — browser support is not worth the
  risk two weeks out. Plain CSS achieves the same effect.
- **A virtualization library.** `content-visibility: auto` on the Library rows
  plus a capped picker gets most of the win for zero dependency.
- **Camera resolution capping**, canvas DPR sizing, device-class instrumentation
  — real wins, but Phase 0 delivers more per hour.

---

## 7. Two content problems that no amount of UI fixes

Flagging these because they cap how good the learner experience can get, and
neither is a design task:

1. **67 of 141 glosses have no English meaning.** A hearing learner is shown a
   bare Sinhala transliteration like `KANAWA` and cannot act on it. Showing the
   meaning is the single highest-value content change available, and
   `translations.ts` is the right place — filled in by a human, never guessed,
   since a wrong meaning teaches the wrong word.
2. **The Introductions scenario has 0 of 7 references.** kvn's seven recorded
   glosses were never committed and exist only in one browser's IndexedDB. Either
   commit them or demo Restaurant, which runs 5/5 on real-signer references.
   Do this before the pilot, not during.

---

## 8. If you only do three things

1. **Phase 0.1** — the reference index. Without it nothing else can feel fast.
2. **Phase 2.2** — the sticky camera with reference-as-PiP. It fixes the one
   interaction the product exists for.
3. **Phase 3.1 + 3.2** — the armed score reveal. It is the emotional peak, and
   the Act 1 / Act 2 split is what lets you have it without compromising the
   latency claim.

That is about 20 hours and it would change how the app feels more than the other
34 combined.

---

## 9. Provenance of this plan

Six specialist audits (performance, motion, mobile/responsive, information
architecture, visual system, engagement/accessibility) each read the real source,
producing 63 proposals. Each proposal was then sent to an adversarial reviewer
instructed to reject rather than approve.

**41 of 63 were verified. The remaining 22 reviewers failed** when the account hit
its monthly spend limit — including, unluckily, the one for Phase 0.1. Items
whose verification did not complete are marked inline. Where a reviewer rejected
part of a proposal, the tightened version is what appears above.

Measurements against the running app (load cost, heap, touch targets, contrast
ratios) were taken directly and are independent of the agent findings.
