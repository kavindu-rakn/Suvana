# Learn: lazy-load secondary views
started 2026-10-14T20:06:00+05:30 by codex

Branch agent/codex/learn-lazy-views from origin/main 64dd3db. Direct follow-up assigned by kvn in chat: defer Progress, Scenario and author views until selected, retain a brief loading fallback, measure the same-build before/after gzip size, and preserve existing UI behavior. No push or merge.

## Handoff 2026-10-14 20:12 - codex

Branch: agent/codex/learn-lazy-views @ task HEAD (final SHA in branch log), fresh from main 64dd3db; no stack.
Status: review
Changed files: apps/learn/src/App.tsx, this handoff, append-only LOG.md.
r26_port: yes (after merge through the milestone port).

- Progress and Scenario now use React.lazy with their existing named exports/props. Record, Library and Study were already lazy and remain so. Hero and Practice stay eager. All five secondary views share the existing short `Loading…` fallback, now announced with role=status; navigation/footer stay outside the boundary.
- Fresh builds with the same locked dependencies/Node: **158.55 kB gzip before; 140.46 kB gzip after**, as reported by Vite. Reduction **18.09 kB**; headroom against 160 kB is now **19.54 kB**. Entry raw bytes: 479,425 -> 418,756. Progress (9.03 kB gzip) and Scenario (7.92 kB gzip) are separate on-demand chunks, with their specific CSS split automatically. Total feature code still loads when used; this is an initial-bundle reduction, not removal of features.
- Before entry: index-B9oW9G7i.js; after entry: index-By34jRHt.js. Ignored measurements: .agent-local/evidence/learn-lazy-views/{before,after}.json; canonical budget comparison uses Vite's reported gzip sizes, not the additional Node zlib measurement.
- Gates: npm 10 ci (Learn/screens), audit 0 vulnerabilities; lint 0 warnings; **287 passed / 4 skipped**; build passed at **140.46 kB gzip**; sync guard **170 passed**; existing browser suite **10 passed** on Codex port 5184. Generated tracked calibration/weight-fit reports were restored; corpus untouched. Four skips are the two existing EVAL tests and optional L-17/L-30 measurements.
- Additional production-browser check: Hero and first Practice paint request **zero secondary view chunks**; all five views mount and each is fetched once when selected. Held a Progress chunk to verify the brief status fallback and usable navigation; Progress-to-Practice sign handoff still works. No browser errors. Script/evidence: .agent-local/learn-lazy-check.mjs and .agent-local/evidence/learn-lazy-views/browser-checks.json.
- Screenshots: .agent-local/screens/learn-lazy-views/index.html. **10 images** at desktop 1280x800 and phone 390x844: main before/after Progress and Scenario, plus held-chunk loading after. Real production pages, no synthetic progress or SSL content added. Representative ready/loading renders visually inspected; ready Progress remains visually unchanged.
- Origin fetched before starting and before commit; main remained 64dd3db. Required rebase is clean. No push, merge, deployment, port or hosted CI claim.

SSL content touched: none. Figures touched: measured build sizes only. Decisions needed from kvn: review/merge this independent branch; no new product decision. Proposed hot-file diffs: none (App.tsx change explicitly requested). Plan corrections: author views were already lazy; only Progress/Scenario needed new lazy imports. Task directly assigned in chat; BOARD/tasks/DECISIONS unchanged.

Commit message (as committed):
```text
Load secondary Learn views only when selected

- Lazy-load Progress and Scenario alongside the existing author views
- Keep Hero and Practice eager with a short accessible loading fallback
- Record bundle reduction and verify all view navigation paths
```
