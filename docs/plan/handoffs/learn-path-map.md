# Learn Path serpentine layout

- Started: 2026-10-19, Codex; revamp/learn-path, main worktree, per session instruction.
- Plan correction: directly requested task overrides board/lane selection; planning records remain untouched except this handoff and append-only LOG.
- r26_port: yes.
- Scope: nine equal-size desktop lesson cards per page in a mirrored-S route; continuous odd-left/even-right mobile route; Suvana gradient connectors. Preserve lesson IDs/order, progress, stars, locks, edition notices and entry actions.

## Completed
- Desktop (900px+): nine equal-size lesson cards per page, arranged 1-2-3 / 6-5-4 / 7-8-9. Previous/Next controls expose all 54 entries across six pages; page is retained when returning from a lesson and across responsive resize.
- Mobile/tablet (below 900px): all lessons in original order, odd entries left and even entries right, along a continuous curved route. No mobile pagination.
- Cards have the same width/height within each viewport, including Sentence challenge. The experimental whole-sentence notice stays visible; its longer prerequisite/explanatory sentence remains accessible to screen readers.
- Decorative SVG connector uses Suvana teal/gold gradient, measured from rendered node centres. Desktop turns extend outside the row-end cards; mobile uses smooth alternating curves. ResizeObserver updates the route on viewport/page changes. SVG ignores pointer/focus input; ordered-list/keyboard lesson order stays sequential.
- Preserved curriculum IDs/order, title changes from the earlier increment, stars/locks, coverage notices, watched signs and practice entry. Styling is local to Path/PathMap; no shared hot CSS file edits.
- Refreshed generated assistant metadata only for the PathView source hash using the existing knowledge generator; no knowledge records changed.

## Gates
- Learn: npm ci, lint, 371 tests passed / 13 skipped, build passed. Main JS 155.22 kB gzip, under the 160 kB budget.
- Shell: 157 tests passed, TypeScript/build passed. Existing >500 kB chunk advisory remains.
- Recognize: required keypoint/Sinhala labels and Suvana labels checks: 42 passed using the ignored task-local Python dependencies from the previous increment.
- Knowledge generator --check and 264 sync guards passed; git diff --check passed.
- Focused Playwright suite: 23 passed. Includes all six desktop pages in both themes at 900/1024/1280/1440px, mobile 320/360/390/768/899px, equal card bounds/content fit, connector bounds, reachability/order, keyboard pagination, lesson return/resize, pointer hit tests, original Watch/session entry, star-based unlocking and unit badges.
- Initial expanded browser run found a pre-existing 12px app-bar overflow at 320px (account action extends to x332). Path itself fits 320px; tests explicitly separate that unchanged header baseline. Full-page no-overflow checks pass at 360px and above. Header was not changed.
- Browser entry/progress tests use synthetic local attempts only as UI fixtures. Review screenshots use fresh local progress, not seeded rewards; neither is learner/accuracy evidence.

## Render review
- Gallery: .agent-local/screens/learn-path-map/index.html.
- Before: before-desktop.png (1280x800), before-phone.png (390x844).
- After: after-desktop-{light,dark}-{1..6}.png; after-phone-{light,dark}-{top,middle,end}.png (390x844); after-phone-{light,dark}-360.png (360x800).
- Inspected desktop-contact.png (all twelve page/theme states) and phone-contact.png (top/middle/end in both themes), plus individual desktop/phone renders. All card contents fit, including the experimental notice at the final entry. Images are ignored and uncommitted.
- Restarted Learn on localhost:5174/learn/ with --force after clean install; rendered-page checks repeated to avoid the stale-optimizer white screen.

## Remaining
- kvn visual review/adoption from the gallery. No merge/push/deploy or R26 port performed; r26_port: yes for the next approved milestone.
