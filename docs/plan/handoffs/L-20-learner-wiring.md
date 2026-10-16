# L-20 follow-up: learner notice and Path coverage
started 2026-10-16 by codex (Asia/Colombo)

Branch: codex/L-20-learner-notice-preview
Base: origin/main 33e0dd5ad39bd7e6d83bc5a9cdc4821ea7ebbd97
Status: review
r26_port: yes

kvn explicitly requested the Hero/App learner notice proposal and Path integration
contract from L-20.md, after the Learn chain and L-20 merged. This authorizes
these specific Hero.tsx, App.tsx and PathView.tsx edits in this worktree.
L-25 remains conditional on L-22b landing; kvn is doing K-07.

## Handoff 2026-10-16 - codex

### What changed
- Applied the exact Hero/App proposal from L-20.md: ContentNotice after the
  existing Hero subline, and ContentNotice plus expandable "Corpus credits and
  licences" / Attribution at the start of the app footer. Ordinary learners
  now see the NC academic notice without entering author-only Library.
- Path uses the edition-filtered loadReferenceIndex() and contentCoverage().
  Incomplete cards and unit details say `Preview: X of Y signs available`.
  All approved units, labels, signs and their order are retained.
- Coverage takes precedence over saved full-edition stars: an incomplete unit
  stays Preview, cannot start a unit session, and cannot unlock a later unit.
  Available signs in a Preview remain individually watchable/practisable;
  missing signs are disabled. Complete units still follow the existing rewards.
- Path local recordings cannot fill excluded curriculum coverage. Unit session
  summaries (including due reviews) use only glosses in the filtered index.
- Added five unit regressions and three browser tests for notice/credits,
  missing references, old full-edition progress and available-only queues.

### Gates
- Node v24.12.0; npm 11.19.0. `npm ci --offline` passed in Learn and tools/screens
  using the existing lockfiles; no package/lockfile edits.
  Initial Learn install hit a stale local preview's native-library lock; stopped
  that confirmed worktree preview and reran successfully. Screens install used
  the normal user cache because the sandbox cache lacked playwright-core.
- Learn lint: 0 warnings/errors. Vitest: 320 passed, 13 skipped (44 passed files,
  5 skipped). Initial sandbox run failed temporary module renames before loading
  tests; the authorized normal-user run passed. No generated report changes.
- Full production build: passed, main JS 150.17 kB gzip (<160 kB).
- Actual VITE_CONTENT=cc0 production build: passed, main JS 150.20 kB gzip;
  separate ignored output `.agent-local/L-20-after-cc0`.
- Full Playwright suite: 46 passed, including the three new tests. The tests
  check footer expansion by keyboard and fit at 1280/390/360 pixels. Browser
  test progress is synthetic and isolated; screenshots use no seeded progress.
- Sync guard: 175 passed. `git diff --check` clean.
- Final fetch advanced main from 72cd406 to 33e0dd5 (approval records only in
  BOARD.md/tasks.json/LOG.md, no Learn or tooling changes). Rebased cleanly;
  application code and the tested/rendered source are unchanged by this rebase.

### Renders
Contact sheet: `.agent-local/screens/L-20-learner-wiring/index.html`.
- Before = built merged main 72cd406 (identical Learn source on 33e0dd5).
- Before/after at desktop 1280x800 and phone 390x844, both full and actual CC0
  builds: Hero, Path, Greetings detail and collapsed footer. Expanded credits
  have supplementary after renders, since that surface did not exist before.
- Additional before/after Months 1 card/detail in CC0: real 6/8 coverage, with
  available individual signs enabled and the full unit session disabled.
- Visually inspected changed Hero, credits, zero-coverage and partial-coverage
  cards/details. New notice and counts fit; the footer licence link is visible
  above the phone navigation. Render evidence JSON records no page errors and
  document widths equal to the requested viewports in all four combinations.
- Screenshots/contact sheet/builds remain ignored and are never committed.

### Scope and remaining work
- SSL content touched: none. Figures touched: none. Hero decorative cards and
  the existing Hero copy stay unchanged. No shared CSS/package/config edits.
- Plan correction: this is the explicitly requested follow-up to L-20's
  deferred UI wiring, so it has its own branch/handoff instead of changing the
  historical L-20 handoff. No board/decision edits are needed from this agent.
- kvn must review the renders and merge the branch; no push/merge/deploy done.
  R26 port remains a separate milestone from merged main (`r26_port: yes`).
- The served default remains full/non-commercial/academic. CC0 remains L-20's
  selection preview; restricted assets are still physically copied by Vite.
- L-25 is authorized after L-22b lands; neither sentence task is started here.

Commit message (as committed):
Wire learner licence notices and edition-aware Path previews

- Show the academic content notice on Hero and in learner footer credits
- Keep incomplete units Preview and block unlocks from stale full-corpus stars
- Verify available-only queues and record desktop and phone comparisons
