# Record tab (MoCap Studio) — critique and fix plan

Written 31 Aug 2026. Scope: the **Record** author tab only (`RecordView.tsx`,
its `.aww-studio-*` / `.studio-*` / `.aww-hud*` CSS, and its use of the shared
`CameraStage` / `CategorySignNavigator`). Screenshots reviewed:
`suvana-screenshots/learn-record/learn-record-{1..5}.png`.

Grounded in the source and in the five screenshots, not general advice. Follows
the same rules as the Practice and hero passes:

1. Design language is **`Hero.tsx` + `index.css` tokens**. No second vocabulary.
2. No emojis.
3. No two controls that do the same thing.
4. No control that does nothing or leads nowhere.
5. Typography identical to the rest of the module — the `--fs-*` scale and the
   `--sans` / `--mono` families, nothing off-scale.
6. Weigh each change against the fact that this is an **internal research
   instrument**, not a consumer screen.

---

## 1. What Record is, and the standard it should be held to

Record is **author-mode only**. `App.tsx` lazy-loads it, `tabs.ts` keeps it out
of `LEARNER_TABS`, and `UIUX-PLAN.md` §2.4 is blunt about it: *"two tools whose
success criterion is a git commit."* A hearing pilot participant never opens it.

That cuts two ways:

- **It is not under the UI-freeze.** The freeze protects the learner surfaces
  (Practice / Scenario / Progress) once the pilot starts. Record can be reworked
  now — *provided* shared files (`CameraStage`, `CategorySignNavigator`,
  `views.css` shared rules, `index.css` tokens) are touched carefully and every
  such change is regression-checked against Practice and Scenario.
- **It still ships in the report and the viva** as "the tool we built the SSL
  reference corpus with." A half-broken data-entry screen with its primary
  button off-screen undermines the credibility of every reference-derived
  number. It does not need to be beautiful. It needs to be **correct, quiet, and
  visually part of the same product.**

The current screen is none of those things.

---

## 2. Brutal critique

### 2.1 It is the wrong genre

Record is a form: *pick a sign → stand in frame → record → save*. The screen
dresses that up as an awwwards product launch — a `MOCAP STUDIO` pill, a
2.5 rem italic editorial serif headline (`New Vocabulary`), glassmorphism
`backdrop-filter: blur()` toolbars, gradient chips, a live telemetry HUD.

`Hero.tsx` earns that register because it is the **module's front door** — the
one place a learner is being sold the idea. Record is the opposite: a tool used
by four people who already bought in. Every gram of ceremony here is friction on
a repetitive task, and — worse — the ceremony is what pushed the actual controls
off the screen (2.3).

**The standard:** Record should read like the Practice split-screen with the
scoring stripped out. Same shell, same camera stage, same anchored controls,
same `--surface` / `--elev-1` cards, same `.aww-pane-label` kicker. A researcher
opening it should feel they are in the same app, one tab over — not in a
different designer's portfolio piece.

### 2.2 It is running a layout Practice already retired

PR #4 (`fix/learn-practice-critique`, merged) moved Practice to a clean model:

- camera controls **anchored inside the right pane** — `.aww-cam-action`
  (bottom-left, exactly one button at a time), `.aww-cam-rec` (top-right),
  `.aww-cam-countdown` (centred over the video);
- `.aww-back-round` chevron in the pane header as the *only* "pick another sign"
  affordance;
- `.aww-camera-intro` for the permission / idle state;
- `lucide-react` icons (already a dependency);
- **no toolbar, no in-flow HUD bar.**

`RecordView.tsx` still uses the pre-PR-#4 pattern: a floating `.aww-studio-toolbar`
plus a bottom `.aww-hud` bar. That pattern was abandoned for good reasons, and
Record never got the memo.

### 2.3 The primary control is broken and partly off-screen — P0

`.aww-hud`, `.aww-hud-idle`, `.aww-hud-countdown`, `.aww-hud-recording` have
**zero CSS anywhere in the project.** (`grep -n 'aww-hud' src/**/*.css` → nothing.)

So the "Record Take" button, the 3-2-1 countdown, the REC indicator and the
"Motion capture tracks 21 hand landmarks" hint all render as **unstyled block
elements**. `.aww-split-screen { height: 100% }` inside the flex column consumes
the full height and `.aww-practice-env { overflow: hidden }` clips whatever
follows — so the HUD is shoved out of the studio surface. In screenshots 1, 3, 4
and 5 the gold pill ("Turn on Camera" / "Select or Enter a Sign First") is
jammed against the **left edge of the viewport, half cut off**, and the hint
text bleeds onto the page background *below* the dark surface.

**There is no reliably visible way to start a recording.** This is a functional
defect, not polish.

Related: `ScenarioView.tsx` uses the same unstyled `.aww-hud*` classes (and a
likely-undefined `var(--p-coral-500)`). That is a **separate** finding on a
learner surface — flagged here, fixed in its own pass, not in this one.

### 2.4 Design-language / typography violations (rules 1 & 5)

| Where | Problem | Fix |
|---|---|---|
| `views.css:4388` `.studio-prompt-title` | `font-family: var(--serif)` — **the token does not exist** (the Noto Serif token is `--sans`). No fallback → browser default serif at a one-off size. | `var(--sans)`; delete the token ref. Also `views.css:3196`, `:3406`. |
| `.studio-*` / `.aww-studio-*` block | Font sizes `0.72 / 0.75 / 0.78 / 0.85 / 0.88 / 0.9 / 0.95 / 1.25 / 1.4 / 1.8 / 2.5 rem` — **none** from `--fs-2xs … --fs-title`. | Map every one onto the scale. |
| `.aww-pane-title` (Record) `2.5rem`, `#fff` literal | Practice uses the same class but Record overrides it into an editorial headline. | Use the shared `.aww-pane-label` + `.aww-pane-title` as Practice does. Drop `.studio-prompt-title` entirely. |
| `.studio-badge`, `.studio-sign-btn`, `.studio-signer-input-wrap`, pills | `border-radius: 100px` / `999px` literals; `backdrop-filter: blur(16px)` over `rgba(var(--surface-rgb), .75)`. Glassmorphism appears **nowhere** in `Hero.tsx`. | `--r-full`; flat `--surface-2` + `1px solid --border-subtle`, matching `.aww-step`. |
| `.studio-sign-btn` | Three `!important` declarations fighting `.btn`. | Don't restyle `.btn`; use `.btn.ghost` or a plain header control. |
| ad-hoc `24 / 36 / 40 px` paddings | Off the `--s-*` scale. | `--s-6` / `--s-8` / `--s-10`. |

### 2.5 Redundant navigation (rule 3)

There are **three routes to one sign picker**, and the picker component is
mounted **twice**:

1. **`Active Sign: Select a Sign…`** (toolbar button) → opens `.aww-picker-modal`
   containing a `<CategorySignNavigator>`.
2. **`← Browse Categories`** (toolbar button) → renders the **identical**
   `<CategorySignNavigator>` in the left pane.
3. **`← Categories`** (pane-header button, screenshots 2 & 5) → runs the exact
   same `setIsBrowsing(true)` as button 2.

Practice solved this with one affordance: the `.aww-back-round` chevron. Record
should do the same. Delete the modal, delete the toolbar, keep the chevron.

### 2.6 A dead control (rule 4)

Once `isBrowsing` is true, `← Browse Categories` relabels to **`Categories Menu`**
and its `onClick` just sets `isBrowsing = true` again. Clicking it does nothing.

### 2.7 Three custom-sign entry points, two mechanisms (rule 3)

- `+ Custom Sign` (toolbar) → inline input in the left pane.
- `Custom Sign / + New Sign` card inside the navigator → **`window.prompt()`**
  (screenshot 3: *"localhost:5173 says — Enter new uppercase gloss name"*).
- `+ Record "X"` in the empty-search state → inline.

A raw `window.prompt()` — unstyled, unthemed, unvalidated, breaks the frame — in
a screen with this much visual investment is indefensible. Collapse to **one**
entry point and **one** mechanism (the inline left-pane input).

### 2.8 `.btn.small` is a no-op here

`.btn.small` is only defined under `.aww-topbar .btn.small`. Every
`<button className="btn small">` in the navigator (`+ New Sign`, `Select`,
`+ Record "X"`) therefore renders as the full 15 px gradient pill (screenshot 1:
the oversized teal `+ New Sign`). Either promote `.btn.small` to a global rule or
stop using the class.

### 2.9 Screenshot-specific

- **learn-record-1** — The `MOCAP STUDIO` badge + toolbar (`z-index: 40`,
  `top: 16px`) sit **on top of** the left-pane navigator's own
  `Select Sign / 494 signs in 21 categories` header. Only the "S" descender and
  the subtitle escape from under the badge. Two headers, one buried. Also: the
  category grid is a wall of 21 tiles of **raw dataset category names** —
  `100-1 million`, `20-99`, `A-Z`, `Additional words` — which are corpus
  artefacts, not usable groupings, and singletons (`Conjunctions 1`,
  `Determiner 1`, `Interjection 1`) get equal billing with `Verbs 144`.
- **learn-record-2** — `New Vocabulary` (2.5 rem italic serif) **overlaps**
  `Creating a New Reference` (the broken-token title). Two headings, same
  meaning, physically colliding. The card renders *behind* the absolutely
  positioned pane header. Placeholder `E.G. MORNING, WATER, TEACHER` is clipped
  to `TEACHE`. The right pane shows `Turn on camera to begin recording…` +
  `Start camera` **while the bottom HUD also shows `Turn on Camera`** — two
  identical CTAs on one screen.
- **learn-record-3** — the `window.prompt()`. See 2.7.
- **learn-record-4** — telemetry reads **`7 FPS`** with no context, looking
  broken. The right pane is a bare dark webcam feed — no "You" label, no framing,
  no standing guidance (Practice has all three). Primary button clipped at the
  viewport edge again.
- **learn-record-5** — sign `NO` selected. The reference is **two disconnected
  skeleton-hand fragments floating tiny and off-centre in a black void** —
  illegible as something to copy. `BENCHMARK REFERENCE` (eyebrow) and
  `Dataset Reference` (pill) are near-synonyms stacked three lines apart. The
  playback controls (pause / `1x` / scrub) are a fourth control cluster in a
  fourth corner with a fourth style. Still no visible Record button.

---

## 3. The fix plan

Ordered so that stopping after any phase leaves Record better than it is now.
Effort in focused hours.

### Phase A — Make it work again (functional) · ~4 h — **DONE**

> Shipped 31 Aug 2026. One correction to §2.3 for the record: between this plan
> being written and Phase A landing, the Scenario critique branch merged a
> stopgap `.aww-hud*` rule set into `views.css` with the comment *"RecordView
> (author-only) still uses the older floating HUD."* So the "zero CSS" finding
> was true when measured and briefly untrue afterwards. Phase B deleted those
> rules — with Record migrated and Scenario already moved to `.aww-cam-*`,
> nothing referenced them.

**A1. Adopt Practice's control model; delete the `.aww-hud` path from Record.**
Files: `RecordView.tsx`.
Replace the bottom `.aww-hud*` block with the anchored controls that already
exist and are approved:
- `.aww-cam-action` bottom-left — one button: `Record take` (idle) /
  `Cancel` (countdown) / `Stop & review` (recording), with the `lucide-react`
  `Circle` / `X` / `Square` icons Practice uses.
- `.aww-cam-rec` top-right for the running timer.
- `.aww-cam-countdown` centred for 3-2-1.
No new CSS — reuse `views.css` lines ~2877-2965 verbatim.

**A2. One camera-start CTA.** Move the idle/permission state into
`.aww-camera-intro` *inside* `CameraStage` (Practice already passes `intro=`).
Remove the second "Turn on Camera" button. Copy: one line on what Record does,
one line on the on-device privacy promise — same voice as Practice's intro.

**A3. Fix the container.** Drop the `.aww-studio-env { top: 155px }` hack. The
author banner offset is a generic concern — handle it the way Practice's env
already does (or let Record inherit `.aww-practice-env` unchanged). Verify
nothing is clipped at any viewport height.

### Phase B — Collapse the redundancy (rules 3 & 4) · ~4 h — **DONE**

> Shipped 1 Sep 2026. Two additions found while building it, both rule-3
> duplications the plan had not spotted:
>
> - **`glossLabel()` already returns `GLOSS (meaning)`.** The old toolbar
>   rendered `glossLabel(activeGloss)` *and* `translationOf(activeGloss)` beside
>   it, so an active sign read `ADINAWA (pull) (pull)`. Only `glossLabel` is
>   rendered now.
> - **The custom-sign card carried its own `Creating a New Reference` heading**
>   60 px under the pane's `New sign` title. The card heading is gone
>   (which also removes the broken `var(--serif)` reference C1 was going to fix).
>
> `isModal` / `onClose` on `CategorySignNavigator` went with the modal — no
> caller passed them once the picker was deleted.

**B1. One picker, one route.** Delete `.aww-picker-modal` and its second
`<CategorySignNavigator>` from `RecordView.tsx`. The left pane *is* the picker
when nothing is selected or the user taps back — Practice's `browsing` model,
copied.

**B2. Delete the toolbar.** `MOCAP STUDIO` badge → gone (the author banner
already states the mode). `Active Sign` button, `Browse Categories` button,
`Custom Sign` button → replaced by the single `.aww-back-round` chevron in the
pane header (Practice parity). The signer field moves into the right-pane header
as a labelled input (it is the one genuinely Record-specific control — 3.D3).

**B3. One custom-sign entry, one mechanism.** Remove `window.prompt()`. Remove
the toolbar `+ Custom Sign`. Keep a single "Record a sign that isn't listed"
row at the foot of the navigator's category view, routing to the inline
left-pane input; wire the empty-search `+ Record "X"` to the same path. This
edits the **shared** `CategorySignNavigator` — keep every change behind
`mode === 'record'` (already the convention) and regression-check Practice.

**B4. `.btn.small`.** Promote the scoped rule to a global `.btn.small`
(check Practice/Progress/Library for existing expectations first), or switch
those three navigator buttons to `.btn.ghost` sizing.

### Phase C — Re-skin to `Hero.tsx` + tokens (rules 1 & 5) · ~5 h — **DONE**

> Shipped 1 Sep 2026. Three notes:
>
> - **C1 was already fixed elsewhere.** The Scenario branch defined
>   `--serif: var(--sans)` in `index.css`, so the token is no longer undefined
>   and the one Record use of it (`.studio-prompt-title`) had already gone with
>   Phase B. §2.4's "the token does not exist" is stale; 13 uses remain in
>   `views.css` but they now resolve correctly and are other views' business.
> - **`.aww-pane-title`'s `2.5rem` / `#fff` is deliberately untouched.** §2.4
>   listed it, but Record now uses the *shared* rule that Practice also renders,
>   so changing it here would restyle a learner surface. It is a shared-system
>   question, not a Record one.
> - **C6 deviates on one point.** The plan said show telemetry "only while
>   recording". It is shown whenever the camera runs instead: a low frame rate
>   has to be caught while framing the shot, not discovered after a take is
>   already spoiled. The actual complaint — a bare unexplained `7` — is fixed by
>   labelling it and adding a `--caution` state below 15 fps.

Files: `views.css` (`.studio-*`, `.aww-studio-*` blocks), `RecordView.tsx`.

- **C1.** `var(--serif)` → `var(--sans)` (3 sites); delete dead token refs.
- **C2.** Every off-scale font-size → `--fs-*`. Record's pane heading uses the
  shared `.aww-pane-label` (mono kicker, like `Hero`'s `.aww-step-n`) +
  `.aww-pane-title` — delete `.studio-prompt-title`.
- **C3.** Remove all `backdrop-filter: blur()` + `rgba(--surface-rgb, …)`
  surfaces. Flat `--surface` / `--surface-2` with `--border-subtle` and
  `--elev-1`, matching `.aww-step`.
- **C4.** `border-radius: 100px/999px` → `--r-full`; ad-hoc paddings → `--s-*`.
- **C5.** Collapse `BENCHMARK REFERENCE` + `Dataset Reference` to one
  `.aww-pane-label` kicker plus the provenance pill (`Dataset` /
  `Team provisional`) only — the pill already carries the distinction the
  `UIUX-PLAN` §3.3 disclosure rule protects, so keep it, drop the eyebrow.
- **C6.** Telemetry: keep it (frame rate genuinely affects reference quality)
  but as **one** unobtrusive `--mono` / `--fs-2xs` / `--text-dim` /
  `tabular-nums` readout in the pane header, shown only while recording. Never a
  bare `7`.

### Phase D — Legibility & content · ~3 h — **DONE**

> Shipped 1 Sep 2026. Notes:
>
> - **D1 split in two.** The `colorOverride` half is a Record-only change and
>   landed with D. The "fill its pane" half turned out to be a real shared
>   defect — `object-fit: cover` on a square reference canvas in a portrait
>   pane cut **49% of the reference width** off at a 768px viewport — and
>   shipped as its own commit, as this plan asked. The fit is now responsive:
>   `cover` above 1100px (1% trim, desktop unchanged), `contain` below it.
>   The camera keeps `cover` at all widths in its own rule, because the video
>   and its landmark overlay must share one fit or the skeleton stops lining
>   up with the hands.
> - **D2 is a new function, not a change to the old ones.** `categoriesIn()`
>   and `categoryOf()` are also used by ProgressView's coverage rows and the
>   session model, where the grouping and the lookup must agree on *unfolded*
>   categories; folding them there would have made the Progress filter
>   silently miss the folded signs. `groupForPicker()` is picker-only, with
>   nine tests. Practice shares the picker, so its grid folds and reorders too.
> - **D3 found a provenance bug.** The signer field defaulted to `"Dev Team"`,
>   and that string is written into every saved recording. A take recorded
>   without touching the field claimed an author nobody chose. It now starts
>   empty and persists on edit rather than only on save.
> - **Skeleton legibility is not solved and cannot be here.** Nothing is
>   cropped now, but a landmark skeleton is still a poor thing to imitate at
>   small sizes. Video reference clips are the real fix and are deferred to
>   kvn's own Deaf-teacher recordings.
> - Root `.gitignore` excluded `data/` for corpora, which also matched
>   `learn-ssl-module/web/src/data`. Tracked files there committed fine but any
>   **new** file was silently ignored. Re-included that one directory.

- **D1. Reference skeleton.** Apply Practice's `colorOverride="#e6eeec"` and make
  the player fill its pane the way Practice's does. If `SkeletonPlayer` cannot
  centre/scale a short clip, that is a shared-component fix — do it in its own
  commit and regression-check Practice.
- **D2. Category grid.** Sort tiles by count descending; fold the 1-2-sign
  categories into a single `Other` tile. Re-taxonomising the corpus is out of
  scope — flag it in the report as content, per `UIUX-PLAN` §7.
- **D3. Signer field.** Labelled, obviously editable, persistence made visible
  ("saved for this browser"). Make the default explicit rather than silently
  `"Dev Team"` → `"Kavindu"`.

### Phase E — Verify · ~2 h — **DONE**

> Shipped 1 Sep 2026. What was actually checked, at 1280 / 900 / 768 in
> author mode, after every shared-file touch:
>
> - Practice, Scenario, Progress, Library, Study and Record all render, none
>   overflows horizontally, no console errors.
> - Every class deleted across Phases A–D is gone from the DOM:
>   `aww-studio-toolbar`, `studio-badge`, `aww-picker-modal`, `aww-hud`,
>   `cs-nav-modal`, `cs-close-btn`, `studio-telemetry-row`, `telemetry-pill`,
>   `studio-prompt-title`, `studio-sign-sub`.
> - One navigator mounted (was two), one back affordance (was three).
> - Reference ink measured as a single `#e6eeec`; reference 1% cropped at
>   1280, 0% at 900 and 768; camera video and overlay fits identical.
> - Signer input labelled, empty by default, persisted on first keystroke.
> - Light-theme contrast: control borders 3.34:1 and 3.41:1 (WCAG 2.1
>   SC 1.4.11 wants 3:1), prompt copy 5.62:1.
> - `tsc`, `oxlint`, 138 tests and `vite build` pass.
>
> **`.aww-hud*` is fully retired.** The original §2.3 finding noted Scenario
> shared the defect; Scenario moved to the anchored `.aww-cam-*` controls in
> its own critique before Record did, so once Record migrated nothing
> referenced those rules and they were deleted. No follow-up needed.
>
> Not done, and deliberately: the reference pane's floating title can sit over
> a letterboxed skeleton at narrow widths, and re-taxonomising the corpus's
> dataset-derived category names remains a content question for the report.

- Regression-check **Practice and Scenario** after every shared-file touch
  (`CameraStage`, `CategorySignNavigator`, shared `views.css`, `index.css`).
- Confirm `.aww-hud*` is still referenced only by ScenarioView after Record is
  migrated; open a separate finding to bring Scenario onto the same
  `.aww-cam-*` controls (learner surface — own pass, own review).
- Take one author-mode screenshot at 1280 and one at 768 for the report.

---

## 4. If you only do two things

1. **Phase A** — the primary button is currently off-screen. Nothing else
   matters until Record can record.
2. **Phase B** — deleting the toolbar and the modal removes three redundant
   routes, one dead button, two of the three custom-sign paths, and the
   `window.prompt()` in one stroke, and it lands Record on the same shell as
   Practice.

That is about 8 hours and it turns Record from "visibly broken portfolio piece"
into "the quiet data-entry tool it was always meant to be."
