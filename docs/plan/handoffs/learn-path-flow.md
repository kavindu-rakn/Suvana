# Learn Path continuous flow and centred connectors

- Started: 2026-10-19, Codex, revamp/learn-path in main worktree.
- Plan correction: direct session follow-up supersedes the earlier nine-per-page requirement. Both layouts now need one scrolling route with all lessons; board/lane selection remains overridden by the session request.
- r26_port: yes.
- Scope: round cards further, inset mobile cards, remove pagination, and connect side midpoints so lines leave/enter each card at half its height. Preserve progress, IDs, stars, locks and order.

## Completed
- Latest clarification: one continuous scrolling page with all 54 lessons connected. No pagination, page-state controls or nine-lesson page breaks.
- Desktop stays three columns; uniform row pitch adapts to viewport height to give three rows/nine cards in aligned desktop views. The serpent continues across all 18 rows without resetting after lesson nine.
- Increased all card corners from 12px to 24px. Mobile retains equal card widths but reserves 24px outside gutters, bringing odd/even lessons inward.
- Connectors now cross each card centre horizontally. Turns explicitly begin/end at side-edge midpoints with horizontal tangents and rounded outside rails. This avoids the old corner/upper-edge cuts, including at wide tablet sizes.
- Returning from a lesson restores focus and scrolls that same lesson into view, replacing the earlier desktop page-state preservation.
- No changes to curriculum IDs, membership/order, saved progress, star/lock rules, descriptions, or edition/experimental notices. Generated assistant metadata refreshed only for the updated PathView source hash.

## Validation
- Learn: npm ci, lint, 371 tests passed / 13 skipped, production build passed, main JS 155.21 kB gzip (under 160 kB).
- Browser: 23 focused cases passed, plus 3 additional viewport-height cases = 26 total. Widths 900/1024/1280/1440 desktop and 320/360/390/768/899 mobile/tablet, both themes; additional desktop heights 720/900/1080.
- Browser checks count all 54 entries in the page, confirm nine cards in each aligned desktop view reached by ordinary scrolling, enforce uniform row spacing/no page breaks, check equal dimensions/radius/content fit, mobile gutters, keyboard navigation/return focus, resize, Watch/session entry, stars and unlocking.
- Actual SVG geometry was sampled against every rendered card: side crossings stay within 3px of mid-height; intermediate cards have exactly two crossings, first/last one, and the route stays in the canvas. An initial cubic cut tablet card edges at 768/899px; replaced by outside rails and rerun passed.
- Shell: 157 tests, TypeScript and build passed; existing >500 kB chunk advisory remains.
- Recognize: keypoint/Sinhala labels/Suvana labels checks 42 passed using existing ignored task-local Python dependencies.
- Knowledge generator --check passed; sync guard 265 passed; git diff --check passed. Existing npm audit reports five findings (2 moderate, 3 high); dependency versions/manifests unchanged.
- Existing 320px app-header overflow baseline remains separate from the Path; Path fits 320px, full-page fit checks pass at 360px+.

## Render evidence
- Review gallery: .agent-local/screens/learn-path-flow/index.html.
- Before: before-desktop.png (1280x800, prior pagination) and before-phone.png (390x844).
- After: after-desktop-{light,dark}-{1..6}.png records scroll positions along the same continuous page; after-phone-{light,dark}-{top,middle,end}.png and after-phone-{light,dark}-360.png cover the mobile route.
- Inspected desktop/phone contact sheets and individual first-view images. Desktop scroll captures wait for a nine-card view instead of capturing the middle of a smooth scroll.
- Screenshots use fresh local progress. Browser reward regressions use synthetic attempts only for UI testing, not learner results. Screenshots stay ignored/uncommitted.
- Learn preview restarted with --force on localhost:5174/learn/ after clean install; actual desktop and phone Path rendering rechecked to prevent stale-optimizer white screens.

## Remaining
- kvn visual review/adoption from the gallery. Merge/push/deploy and the next approved R26 milestone port remain manual; r26_port: yes.
