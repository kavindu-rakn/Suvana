# Recognize card animation
started 2026-10-19 by Codex

## Handoff 2026-10-19 - Codex
Branch: codex/recognize-card-animation (based on uifixes/suvana.help @ 77811bd).
Status: review
Changed files: apps/shell/index.html, apps/shell/src/styles/modules.css, this handoff, append-only LOG.

- Added a CSS camera-scan sweep with gently contracting tracking frame and pulsing gold points around the existing SIGN -> SPEECH label. Abstract decoration only; no invented sign gesture, result or confidence figure.
- Matched the existing CSS art palette and repeating animation style. Added an explicit dark teal background so the dark theme's pale slate token cannot wash out the art.
- Scoped styles to Recognize, hid redundant decoration from assistive technology, and supplied a static reduced-motion state. No JavaScript or dependencies added.

Gates:
- npm ci: passed after stopping preview servers and retrying outside sandbox (initial esbuild executable locked; sandbox install subsequently stalled).
- npm test: 157 passed, 9 files.
- npm run build: typecheck + Vite build passed; existing >500 kB chunk advisory remains (main 180.88 kB gzip).
- node tools/sync/sync.mjs guard: 255 passed.
- git diff --check: passed.
- Playwright: actual homepage captures at desktop 1280x800 and phone 390x844, light and dark, before and after. All four after states have six active CSS animations; scan transforms change across 400 ms; reduced-motion leaves zero active Recognize animations.
- Visually inspected desktop and phone captures plus static reduced-motion state. Existing page-wide phone overflow flag occurs both before and after; visible Recognize card and controls fit. Local Communicate auth proxy was unavailable; screenshots are signed-out homepage UI only.

Screenshots: .agent-local/screens/recognize-card-animation/index.html (uncommitted contact sheet). before/after-{desktop,phone}-{light,dark}.png; matching card crops and after reduced-motion crops. capture.mjs is a local verification helper, not a product file.
SSL content touched: none.
Figures touched: none.
Decisions needed from kvn: visual adoption, then merge/push/deploy if desired.
Proposed diffs for hot files I did not own: none.
Plan correction: direct user request assigns this Shell follow-up to Codex; reuse the supplied clean checkout and current UI-fix baseline rather than older origin/main. Planner-owned files untouched.
r26_port: no.

Commit message:
Animate the Shell Recognize card

- Add a camera scan and pulsing tracking points matching the module artwork
- Tune dark-mode contrast and provide a reduced-motion still state
- Record desktop and phone theme captures and passing Shell gates
