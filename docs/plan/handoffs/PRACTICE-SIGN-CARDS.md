# Practice sign cards

Started 2026-10-20. Codex on `revamp/learn-practice`, base `9ee7681`.

kvn directly requested removal of the duplicate category search and a distinct sign-card design with more Suvana colours within each category. Global Spotlight search and the category-card design remain available.

Plan correction: this direct assignment supersedes older board/lane scheduling for this increment. Scope: PracticeBrowser and its stylesheet, affected browser checks, this handoff and append-only LOG. No corpus, translation, scoring, board or decision changes.

## Changes

- Removed the category search field, its query state and its styles. The centred **Find a sign** trigger and `/` Spotlight remain the single search entry across every category.
- Sign cards now use a vertical colour spine, a larger title area and a separate Preview/Watch action shelf. Removed the repeated category name from each sign. Category cards keep their existing icon/name/count design.
- Teal, gold, coral and lavender rotate **within** each category, instead of inheriting one colour for every sign in it. These colours are decoration, not learning progress or scoring states. Theme-specific ink shades remain scoped to the practice browser.
- Phone cards keep two columns, wrapped labels and real 44px minimum action targets. Preview stays text-labelled when its decorative eye icon is hidden at phone widths. Keyboard focus, reduced motion, original glosses and missing-meaning disclosure remain supported.
- Updated preview/player test navigation to open the actual category and choose BAG EKA explicitly, without relying on the removed filter.

## Gates

- npm **10.9.9** clean install passed. Temporarily stopped only this workspace's Learn Vite process to release its Windows native binding; restored Learn on **5174**, retaining Shell on **5173**. No dependency/lockfile changes. Existing audit advisories remain 2 moderate / 3 high.
- Learn lint: passed, no warnings.
- Unit suite: **389 passed / 13 skipped**, 60 files passed / 4 skipped.
- TypeScript and production build: passed; main JS **155.09 kB gzip**, below 160 kB.
- **38 distinct affected browser cases passed**: eight new card checks at 360/390/903/1280px in both themes, plus thirty Spotlight, preview/player, keyboard, responsive practice and selected contrast journeys. The new checks inspect all 144 Verbs cards for title fit and 44px actions; contrast uses actual native browser resolution of every decorative tone.
- The thirty-case run initially had **29 passed / 1 failed**: the older light-theme contrast helper parsed CSS `color(srgb ...)` channels as 0–255 bytes. Replaced its regex with native canvas colour resolution. Both affected theme cases then passed on rerun (**2 passed**); the original failure report remains under `test-results/`, and the corrected run under `contrast-recheck/`.
- Sync guard: **270 passed**. Whitespace check passed.
- This increment ran affected browser journeys, not the repository-wide suite. Parent handoffs document the existing unrelated Scenario navigation / animation timing test failures. No repository-wide green claim.
- Browser camera/Recall journeys use the existing disclosed synthetic detection/fake-media fixtures; the keyboard viewport test mocks visualViewport. These checks do not establish learner accuracy, physical camera performance or native phone keyboard behavior.

## Visual review

- **32 before/after PNGs**, showing category entry and the annotated **SELL** card with nearby signs, at **1280×800**, **903×532**, **390×844**, and **360×844**, light and dark.
- Baseline: `9ee7681`. All labels/counts come from bundled reference metadata; no learner history or scores are seeded in these renders.
- `.agent-local/screens/PRACTICE-SIGN-CARDS/index.html`, served locally at **http://localhost:5200/index.html**. Screenshots/scripts remain ignored and uncommitted.

## Handoff

Ready for kvn's rendered visual review on the requested branch. Physical phone/keyboard validation remains manual. No push, merge, deployment, external message or R26 edit.

r26_port: yes
