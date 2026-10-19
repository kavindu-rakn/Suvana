started 2026-10-19 by Codex

# Shell pipeline cards: intentional staircase

Status: review.

Scope: Make the four Pipeline cards read as an intentional staircase on wide desktop, keep every card the same size, and retain an even responsive grid at phone and tablet widths. This follow-up was directly assigned by kvn in chat; no matching task row exists in BOARD.md/tasks.json. Planner-owned files were left unchanged.

Changes:
- Equalized implicit grid rows so all four cards share the same dimensions when stacked or wrapped.
- On widths where four cards fit (1172px and above), keep them in four equal columns with a 29rem minimum height and step the cards down one 28px grid gap at a time.
- Added trailing grid space matching the final step so the next pipeline panel stays clear.

Validation:
- Shell `npm run build`: typecheck and production build passed. The existing bundle-size advisory remains (`main` 644.91 kB minified).
- `node tools/sync/sync.mjs guard`: all 255 checks passed; `git diff --check` passed.
- Browser geometry in both themes at phone (390), tablet (768), desktop (1280), and wide desktop (1600): all four card dimensions matched at each viewport; page width matched viewport width.
- Responsive boundary and layout checks at 320, 390, 540, 768, 900, 1024, 1171, 1172, 1280, 1600, and 1920px: equal dimensions at each width and no page overflow. At 1280px, cards are each 279x464px with 28px vertical steps; at 390px they stack evenly.

Screenshots: `.agent-local/screens/pipeline-card-stairs/index.html` (before/after, both themes) and `.agent-local/screens/pipeline-card-stairs/`.

Needs kvn: review the renders, then merge/push/deploy if accepted. No SSL content, model data, or figures changed.
