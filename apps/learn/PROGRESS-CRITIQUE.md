# Progress view — critique and rebuild plan

Written 31 Aug 2026. Branch: `fix/learn-progress-critique`.

Grounded in the six screenshots in `suvana-screenshots/learn-progress/` and a read of
`ProgressView.tsx`, `views.css` (`.aww-progress-*`, `.aww-bento-*`, `.aww-command-*`,
`.aww-accordion*`, `.aww-sign-*`), `learner/mastery.ts`, `learner/activity.ts`,
`data/categories.ts` and `Hero.tsx`.

Design authority for every visual decision below is `src/components/Hero.tsx` plus its
CSS (`.aww-hero-*`, `.aww-step-*`, `.lhero-stats-*`, `.aww-topbar`).

---

## 1. Brutal critique

### 1.1 The page is a monument to what the learner has *not* done

Screenshots 2–6 are one long accordion of categories — `100-1 million`, `20-99`, `A-Z`,
`Adverb`, `Determiner`, `Interjection`, `People`, `Places`, `Preposition`, `Vehicles`,
`Verbs 5 / 144`… ~20 rows, and when one opens (screenshots 4–6) it spills a grid of
cards that are almost entirely `NEW · 0% · Not started`. `100-1 million` alone lists
`2000`, `200000`, `300000`, `400`, `4000`, `500`, … as flashcards to master.

A learner who has done 91 attempts across ~15 signs is shown **494 rows of failure
state**. This is the single worst thing about the screen. A progress page should open on
evidence of momentum — what you practised, how it is trending, what to do next — and
should take real effort to go find the 480 things you have not touched yet. This one
leads with them.

It is also a Hick's-law problem: `ProgressView.tsx:239` renders every non-empty category
as an accordion, and each expanded accordion renders every gloss as a card. Nothing is
collapsed by relevance. The `expandedCategory` state only allows one open at a time,
which is the one restraint on the page, and search force-opens all of them anyway
(`ProgressView.tsx:243`).

### 1.2 It is not built in the Hero's design language

`Hero.tsx` establishes the module's visual grammar: a calm near-black field, one serif
display headline, a single teal pill CTA, a horizontal `.lhero-stats-strip` of three
numbers separated by hairline rules, editorial numbered steps, generous whitespace, and
motion that is `transform`-only and honours `prefers-reduced-motion`.

The Progress view throws almost all of that away:

- **Card hover choreography borrowed from a pricing page.** `.aww-bento-card:hover`
  and `.aww-sign-card:hover` lift `translateY(-4px)` with a growing drop shadow
  (`views.css:3231`, `3544`). The Hero's cards do not do this. A data dashboard where
  every tile levitates on hover feels like a marketing landing page, not a place to
  read your numbers.
- **`box-shadow: 0 8px 32px` on every card.** The Hero and the rest of the app layer
  by surface luminance and a hairline top border (see `UIUX-PLAN.md` §1.3). These big
  soft shadows are foreign to it and read as a different product.
- **Three different heading fonts by accident.** `.aww-progress-title`,
  `.aww-command-header h2` and `.cat-info h3` variously call `var(--serif)` (which is
  **not defined anywhere** — `grep '\-\-serif:' src/index.css` returns nothing) or
  `var(--sans)`. They only look right because they inherit Noto Serif from `body`. The
  Hero sets `font-family: 'Noto Serif', serif` explicitly. Rule 5 says keep typography
  identical; right now it is identical only by luck of inheritance.
- **`--danger` red used for a neutral number.** `.avg-val` is hard-coded
  `color: var(--danger)` (`views.css:3348`), so "Recent average 56 / 100" renders in
  alarm red (screenshot 1) whether the number is 56 or 96. Nothing else on the page is
  coloured, so the eye is dragged to the one stat that is styled as an error.
- **An emoji.** `ProgressView.tsx:175` renders `🔥` for the streak. Rule 2 forbids
  emojis, and this is the only one in the entire module.

### 1.3 Things that are simply broken

- **The activity heatmap barely works.** `views.css:3386` targets
  `.aww-heatmap-day[style*="--intensity: 0"]` to grey out empty days — but that is a
  substring match, and `--intensity: 0.857` *contains* the string `--intensity: 0`. So
  every tile except one at exactly `intensity: 1` matches the "empty" rule, gets
  `background: var(--surface-2)` and `opacity: 1 !important`, and the `!important`
  kills the real intensity. Screenshot 1 shows the result exactly: 13 dead squares and
  one teal one. The feature does not function.
- **Three different totals for the vocabulary on one screen.** The mastery ring says
  `/ 494` (screenshot 1), the search box says `Search 490 signs...`
  (`ProgressView.tsx:230`, hard-coded), and `public/references/` actually contains
  **502** files. `Hero.tsx` says `490+`. `CategorySignNavigator.tsx:171` does it
  correctly with `references.length` — Progress should too.
- **"Overall mastery 29 / 494" then "0 signs fully mastered".** The big number is
  `practised` (signs with ≥1 attempt), not mastery, but the card is titled MASTERY and
  the ring is a mastery ring. The sub-line then reports the actual mastery count (0)
  and flatly contradicts the headline figure. A learner cannot tell what 29 means.
- **Mini rings that look like render failures.** Screenshot 6: `ALRIGHT` shows a `1%`
  ring — a hairline arc that reads as a broken SVG, not "1% mastered". `WHAT` shows
  `0%` with 17 attempts logged, which is its own problem (17 attempts, no measured
  progress, no explanation).
- **Sparklines you cannot see or read.** `.spark-wrap` is `opacity: 0.6` and 60px wide
  with no axis, no label, no endpoint values (`views.css:3624`). For any sign with
  fewer than two attempts `Sparkline` returns `null` (`ProgressView.tsx:30`), leaving a
  ragged empty slot in the card. Most cards have it empty.
- **"Streak 1 Days".** `views.css` hard-codes the label `Days` (`ProgressView.tsx:177`)
  regardless of value.

### 1.4 Redundancy and dead ends

- **"Sign Library" is the third sign browser in the module.** Practice already has
  `CategorySignNavigator` (categories → search → sign cards). Author mode has a tab
  literally called **Library** (`LibraryView`, "Reference library"). Progress now adds
  a *second* "Sign Library" with its *own* search box and its *own* category accordions.
  Three browsers, two of them named "Library", none of them the same component. This
  violates rule 3 in spirit — three controls doing one job.
- **The sign cards go nowhere.** `.aww-sign-card` (`ProgressView.tsx:265`) is a `div`
  with no `onClick`, no link, no "practise this" affordance. The learner reads "ME —
  Improving — 73%" and then… nothing. The one thing they would want to do from a
  progress card — drill that sign — is impossible. Per rule 4 the inverse also holds:
  a card that presents itself as the unit of interaction and then does nothing is dead
  weight.
- **Two search inputs, one module.** Progress's search and Practice's search filter the
  same 502 glosses with different code paths and different placeholder bugs.
- **`Research & authoring tools` link in the footer** (screenshot 3) is correct to
  exist but sits directly under an unrelated privacy sentence with no separation, so it
  reads as part of the disclosure.

### 1.5 Layout and craft

- **The bento grid is lopsided.** `grid-template-columns: 1.2fr 1fr 1.5fr`
  (`views.css:3206`) with `grid-auto-rows: minmax(240px, auto)`. The streak/average
  column is a cramped stack, the heatmap column is mostly empty black space
  (screenshot 1), and the mastery ring floats in a 240px-tall card with a tiny 6%
  arc.
- **"ACTIVITY HEATMAP" wraps to two lines** next to a `91 attempts` pill that is itself
  wrapping (screenshot 1). The `.activity-header-flex` `space-between` gives the h3 no
  room.
- **`NEW` / `LEARNING` / `IMPROVING` chips as dashed-outline pills** are visual noise
  at card scale, and `LEARNING` (amber) vs `IMPROVING` (teal) are not distinguishable
  by shape — a colour-blind learner sees two identical pills.
- **No loading or empty state design.** `loading` renders the literal string `Loading…`
  (`ProgressView.tsx:143`); the zero-vocab case is one line of text. The Hero sets a
  bar for how a first impression should look and this is nowhere near it.
- **`Your Progress` at `3rem`** while the Hero display type is `clamp(3.5rem, 10vw,
  8rem)` and Scenario's hub title is `3.5rem`. Progress is the quiet sibling for no
  reason.

---

## 2. Rebuild plan

Five phases. Phase 1 is safe bug-fixing that could ship on its own. Phases 2–3 are the
real work. Phase 4 needs a small App-level change. Phase 5 is finish.

Effort is in focused hours, ~5 h/day realistic. Total ≈ 17 h.

**Status.** Phase 1 shipped (`648e430`). Phase 2 shipped — the "Sign Library" block is
gone, replaced by "Practise next" (the `buildSession` ranking, so it matches what
Practice queues) and "Coverage by category"; a `onOpenPractice` prop on `ProgressView`
switches to the Practice tab (the per-sign deep-link is still Phase 4). Phase 3
shipped — the bento grid is gone; the three (now four) numbers are one flat stat band
in the hero's `.lstat-*` shape, the heatmap is its own full-width section, the header
matches the Scenario hub, and the focus rows settle in with a transform-only stagger
gated on `prefers-reduced-motion`. Also fixed a heatmap transition introduced in
Phase 1 that left Chrome interpolating a `color-mix()` forever. Phase 4 shipped — App
holds a one-shot `practiceIntent`; `ProgressView`'s `onPractise(gloss)` sets it and
switches tabs, and `PracticeView` selects that sign on mount and clears the intent, so
a row's "Practise" button lands straight on the sign instead of the browser. Phase 5
shipped — loading is a three-bar skeleton, the no-data and first-run states each get a
plain serif treatment (first run drops the all-zero band and empty coverage, keeping
"Practise next"), the heatmap carries a visually-hidden table for screen readers, and
the "Mastered" chip is filled so it reads without colour. Also fixed a latent bug the
lean Phase 3 layout exposed: `.aww-progress-view` sat inside a flex column with
`margin: auto`, which opted it out of stretch and shrank it to ~480px — an explicit
`width: 100%` restores the fill.

### Phase 1 — Fix what is broken (3 h) · shippable alone

**1.1 — Heatmap intensity (0.5 h).** `views.css`, `ProgressView.tsx`.
Delete the `[style*="--intensity: 0"]` rule. Give empty days their own class
(`.aww-heatmap-day.is-empty`) set in the `.map()` instead of relying on a string match,
or drop the class and render empty days as `background: var(--surface-2)` with the
active days as `background: color-mix(in srgb, var(--accent) calc(var(--intensity) *
100%), var(--surface-2))`. No `!important`.

**1.2 — Single source for the vocabulary count (0.5 h).** `ProgressView.tsx`.
Replace the `494` ring denominator and the `Search 490 signs...` literal with
`summaries.length` / `allRefs.length`. This is the same fix `CategorySignNavigator`
already has. While here, align `Hero.tsx`'s `490+` copy check against
`hero-copy-must-match-build` memory — the corpus is 502, so `490+` is still true but
the internal numbers must not disagree with each other.

**1.3 — Remove the emoji (0.25 h).** `ProgressView.tsx:175`.
Replace `🔥` with the same inline stroke-SVG idiom the tabs and cards already use
(`ICONS` in `app/tabs.ts`, the search glyph in `ProgressView.tsx:227`). A small flame
or calendar-tick path, `stroke="currentColor"`, `aria-hidden`.

**1.4 — Neutralise the average colour (0.25 h).** `views.css:3348`.
`.avg-val` → `color: var(--text)`. If a value judgement is wanted later, drive it from
the number (`< 50` → `--danger`), do not hard-code it.

**1.5 — Honest labels (0.5 h).** `ProgressView.tsx`.
- Rename the ring card to **"Signs practised"**, keep `29 / 502`, drop the word
  mastery from it. Move "fully mastered" to its own stat.
- `Days` → `day` when `streak === 1`.
- The mini ring: below ~5% render the track only with the number beside it, not a
  1px arc that looks broken.

**1.6 — Define `--serif` (0.5 h).** `src/index.css`, one line:
`--serif: 'Noto Serif', Georgia, 'Times New Roman', serif;` next to `--sans`.
This makes the 10 existing `var(--serif)` call-sites (Progress, Scenario hub, mission
briefing) resolve explicitly instead of by inheritance. Visually identical today;
removes the latent break. Verify Scenario screenshots are unchanged after.

### Phase 2 — Re-scope: Progress shows progress, not a catalog (5 h)

The page becomes two zones and stops at that: **"Where you are"** (the analytics) and
**"What to do next"** (a short, ranked, actionable list). The full 502-sign catalog is
Practice's job — it already does it well.

**2.1 — Delete the "Sign Library" block entirely (1 h).** `ProgressView.tsx`,
`views.css`.
Remove `.aww-command-center`, `.aww-search-bar` (the Progress copy), `.aww-accordions`,
`.aww-accordion*`, `.aww-sign-grid`, `.aww-sign-card*`, `.aww-no-results`, the
`searchQuery` / `expandedCategory` state, `summariesByCategory`, `filteredSummaries`,
and the `categoriesIn` / `categoryOf` imports if nothing else needs them. This is a net
deletion of ~120 lines of TSX and ~250 lines of CSS. Rule 3: the browser that stays is
the one in Practice.

**2.2 — "Focus list" replaces it (2.5 h).** New, small.
Under the analytics, one section titled **"Practise next"**. It renders the top **6**
glosses by `practiceNeed(summary, now)` — the exact ranking `suggestNext` and
`buildSession` already use, so it is provably the same policy the Practice session
follows. Each row:

```
NAME            "name"              ·  Improving 51%  ·  6 attempts, 49 days ago   [ Practise ]
```

- gloss + English meaning from `translationOf` (blank, not guessed, when missing —
  see `UIUX-PLAN.md` §7.1)
- one level chip, one mastery figure, last-practised relative date
- a single trailing **Practise** action (Phase 4 wires it; until then it deep-links to
  the Practice tab)

No search, no accordions, no 494 rows. If the learner wants the whole list they go to
Practice. A quiet "See all signs in Practice" text link at the end of the section is
the only nav affordance, styled like `Hero.tsx`'s `.aww-start-cta-link`.

**2.3 — Category progress as a compact strip, not accordions (1.5 h).**
If per-category progress is worth keeping at all (it is, for a sense of breadth), render
it as a read-only horizontal list of thin bars — category name, `5 / 23`, a hairline
progress track — sorted by *most practised first*, collapsed to the top 6 with a
"+14 more" disclosure. No expansion into card grids. Reuse `.lhero-stats`-style
hairline separators from the Hero.

### Phase 3 — Re-skin to the Hero's language (4 h)

**3.1 — Kill the marketing-card treatment (1 h).** `views.css`.
- Remove `:hover { transform: translateY(...) }` and the growing shadow from
  `.aww-bento-card`. Static cards. A subtle `border-color` shift on hover only if the
  card is interactive.
- Replace `box-shadow: 0 8px 32px rgba(0,0,0,.04)` with the app's elevation idiom:
  `background: var(--surface)`, `border: 1px solid var(--border-subtle)`, and a
  1px lighter top border (`border-top-color: var(--border-interactive)`) if lift is
  needed. Match `.aww-preview-card` in the Hero.
- `border-radius: 24px` → the app scale (the Hero cards and `--r-*` steps; 16px).

**3.2 — Header matches the module (0.5 h).**
`.aww-progress-title` → `var(--serif)`, `clamp(2.5rem, 6vw, 3.5rem)`, `font-weight:
700`, `letter-spacing: -0.02em` — same construction as `.aww-suvana-en` and
`.aww-hub-title`. Add a one-line `--text-dim` subtitle the way Scenario's hub does
("Every attempt is logged on this device.").

**3.3 — Stat strip echoes `.lhero-stats-strip` (1 h).**
The three top-level numbers (signs practised, current streak, recent average) should
read as *one* horizontal band with `.lstat-sep` hairlines between them — the exact
component the Hero uses under its CTA — not three levitating bento tiles. The heatmap
and the focus list stack below it full-width. This also fixes the lopsided
`1.2fr 1fr 1.5fr` grid by removing it.

**3.4 — Motion, `transform`-only, reduced-motion safe (1.5 h).**
The rings and bars currently animate on mount but `ProgressView` mounts once, so they
fire once — acceptable. Add: the focus-list rows enter with a `translateY(8px) → 0`
stagger on first paint, `opacity` staying at 1 for the text (per `UIUX-PLAN.md` §3.1
rule — information-bearing elements animate transform only). Wrap all of it in
`window.matchMedia('(prefers-reduced-motion: reduce)')` exactly as `Hero.tsx:40` does.

### Phase 4 — Make "Practise" actually work (2 h) · App-level

Right now there is no way to open Practice *on a specific sign*. `PracticeView`
auto-builds a session on mount and has no `initialGloss` prop.

**4.1 — A practice intent (1.5 h).** `App.tsx`, `PracticeView.tsx`.
Lift a tiny `practiceIntent: string | null` into `App`, set by `ProgressView` via a
callback prop (`onPractise(gloss)`) alongside the existing tab switch, consumed once by
`PracticeView` (select that reference, clear the intent). Mirror the
`sessionStorage`-handoff pattern App already uses for `entered`. ~15 lines each side.

**4.2 — The "Practise" row action (0.5 h).**
Wire the Phase 2.2 button to `onPractise(gloss)`. One button per row, primary style
(`.btn.small` from the Hero topbar), no secondary "view" affordance — rule 4.

### Phase 5 — Finish (3 h)

**5.1 — Empty and loading states (1 h).**
A designed zero-state: serif line + one `.btn.massive`-style link to Practice, matching
the Hero's `.aww-footer-mega` "Ready to start?" construction. A loading skeleton (three
grey bars) instead of the word `Loading…`.

**5.2 — Accessibility (1 h).**
- Level chips get a text-or-shape difference, not colour alone (`UIUX-PLAN.md` §5.3).
- The heatmap keeps its `role="img"` + `aria-label`; add a visually-hidden table
  summary of the 14 days for screen readers.
- Focus-list rows are real `<button>` or `<a>`, focus-visible ring from the app token.

**5.3 — Verify against the screenshots and budgets (1 h).**
Re-shoot all six frames. Confirm: no horizontal scroll at 375px, no card lift, one
vocabulary number everywhere, no emoji in the DOM, `prefers-reduced-motion` kills the
stagger, Scenario hub visually unchanged by the `--serif` addition. Check
`hero-copy-must-match-build` memory items still hold.

---

## 3. What this removes

- The entire second sign browser (search + 20 accordions + up to 502 cards).
- ~370 lines of TSX/CSS net.
- Three inconsistent vocabulary counts, collapsed to one.
- Every hover-lift and heavy shadow that made a dashboard feel like a pricing page.
- The emoji.

## 4. What a learner sees after

A calm page in the module's own type and colour: a headline, a one-line strip of three
numbers, a heatmap that actually renders, and six signs to go practise right now — each
one button away from the camera. Everything else is one text link to Practice.

## 5. If you only do three things

1. **Phase 1** — the heatmap bug, the emoji, the three counts. All visible in the
   screenshots, all cheap.
2. **Phase 2.1 + 2.2** — delete the catalog, add the focus list. This is the whole
   point.
3. **Phase 4** — make the row button open Practice on that sign. Without it Phase 2 is
   still a dead end, just a shorter one.
