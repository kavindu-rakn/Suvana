# Recognize card refinement
started 2026-10-19 by Codex

User feedback: remove artwork text and oversized scanning frame; use a compact animation expressing the module idea like the other cards.
Branch: codex/recognize-card-animation; follows dbba5ee.
Scope: Shell card HTML and module CSS, this handoff and append-only LOG.
Status: in progress.

## Handoff 2026-10-19 - Codex
Status: review
- Removed the SIGN -> SPEECH artwork label, glass panel, broad scanning frame and scan sweep.
- Replaced them with a centred 112px generic hand outline and five gold fingertip points pulsing in sequence, similar in scale to the other module symbols.
- Retained the teal palette, explicit dark-theme background and reduced-motion still state. The hand is a decorative recognition icon, not SSL teaching content.
- Browser checks: desktop 1280x800 and phone 390x844, both themes; five point animations running, point transforms change over 400ms, zero animations under reduced motion. Visually inspected light desktop card and dark phone captures. Existing phone page overflow flag unchanged.
- Screenshots: .agent-local/screens/recognize-card-refinement/index.html. Before captures show dbba5ee artwork; after captures show the smaller hand symbol. PNGs and capture helper are uncommitted.
- Gates: 157 Shell tests, typecheck and build passed; 255 sync guards passed; diff check passed. Clean-install gates repeated before commit; existing build chunk advisory remains.
- SSL content and figures touched: none. r26_port: no.
- Plan correction: continuing the direct user-assigned Shell follow-up on codex/recognize-card-animation, after dbba5ee.
- Needs kvn: review rendered artwork for adoption; merge/push/deploy remain manual.

Commit message:
Simplify Recognize artwork to a tracked hand

- Replace the oversized scan panel and text with a compact hand outline
- Pulse fingertip tracking points and retain theme and reduced-motion support
- Record desktop and phone screenshots and Shell validation
- Clean-install repeat limitation: npm ci hit Windows EPERM on the Rollup native binary (another preview may hold it). Dependencies restored with npm install --package-lock=false --prefer-offline --no-audit --no-fund; no lockfile change. Tests/build repeated after restoration. No other preview was stopped.
- Dependency recovery detail: npm's optional-dependency failure required explicitly restoring @rollup/rollup-win32-x64-msvc@4.63.0 (exact lockfile version) with --no-save --package-lock=false. Then 157 tests and typecheck/build passed again. Package manifests and lockfile remain unchanged; clean npm ci is still limited by the running-preview file lock.
