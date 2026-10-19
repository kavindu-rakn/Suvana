# Learn Path compact card content

- Started: 2026-10-19, Codex; revamp/learn-path in main worktree per session request.
- Plan correction: direct session follow-up overrides board/lane selection; preserve the preceding continuous scrolling route and desktop viewport density.
- r26_port: yes.
- Scope: shrink visible cards around fixed lesson centres without moving the route; centred titles/status icons; separate right-aligned sign count; yellow-star tally aligned with the lesson number at top right. Preserve all title text, notices, lesson IDs and reward/unlock rules.

## Completed
- Visible lesson cards are 24px narrower and 20px shorter (140px high), centred inside their existing 160px route slots. Slot positions, desktop row pitch, mobile alternation, and SVG curve logic remain unchanged.
- Lesson titles are centred horizontally and vertically in the card. Full text wraps as needed; no ellipsis, clipping or title edits.
- Existing star/lock milestone icon is vertically centred at the right. The separate sign count sits below the title and aligns right.
- Earned/available star tally moved to the top right, level with the lesson number, using a filled yellow Lucide Star instead of the visible word stars. An accessible label retains the full count meaning.
- Sentence challenge retains its complete experimental notice and no invented sign count or star reward total. Partial-reference Preview notices also remain visible.
- Existing scoring, star thresholds, unlocking, curriculum IDs/order and saved progress remain intact. Generated assistant assets refreshed only for the PathView source hash.

## Position and layout evidence
- Baseline: commit 952d965e125d256ee3949a7a9ae2c454fdac1405, captured before editing into .agent-local/screens/learn-path-card-content/baseline.json.
- Compared 18 combinations (nine viewport widths, light/dark): every SVG path string is identical, all 54 layout slots are identical, and every card centre is unchanged within .02px. Visible width decreased exactly 24px and height changed 160 -> 140px throughout.
- Real-browser suite: 37 passed. Eleven new cases cover full curriculum title text, ink bounds, exact title/icon centring, count alignment, yellow icon fill, metadata placement and fit, including a synthetic missing-reference fixture at 320px. Existing 26 route/viewport/keyboard/session/reward checks still pass.
- All lesson titles fit, including the longest names, at 320/360/390/900/1280px in both themes. Route geometry and nine-card desktop density remain covered across the prior broader width/height range.
- Missing-reference and progress fixtures are synthetic UI checks only, not learner results. Review screenshots use fresh local progress.

## Review
- .agent-local/screens/learn-path-card-content/index.html.
- Before: before-{desktop,phone}-{light,dark}.png (desktop 1280x800, phone 390x844).
- After: after-desktop-{light,dark}-{1..6}.png; after-phone-{light,dark}-{top,middle,end}.png and after-phone-{light,dark}-360.png.
- Inspected first views, final challenge cards, and desktop/phone contact sheets across both themes. Images remain ignored/uncommitted.

## Gates and limits
- Learn npm ci and lint passed. The default concurrent unit run had one timing-gate failure: longsequence.test.ts warmed median 52.843ms against its existing <50ms limit; 370 other tests passed / 13 skipped. Scoring code and the threshold were not edited.
- Reran the complete unchanged suite with npm test -- --maxWorkers=1: 371 passed / 13 skipped (57 files passed / 4 skipped). This passed the same timing assertion with less test contention; default-worker CI behavior remains unverified.
- Learn production build passed; main JS 155.22 kB gzip, under 160 kB.
- Shell: 157 tests, TypeScript and build passed; existing >500 kB chunk advisory remains.
- Recognize: required keypoint/Sinhala labels plus Suvana-label consistency: 42 passed using existing ignored task-local test dependencies.
- Knowledge generator --check, 265 sync guards and git diff --check passed. Existing dependency audit findings unchanged (2 moderate, 3 high); no dependency manifests/versions changed.
- Existing 320px app-header overflow baseline remains; the Path/card content itself fits. Full-page fit checks at 360px+ remain green.
- Restored Learn dev preview on localhost:5174/learn/ with --force after clean install and confirmed actual desktop/phone Path rendering; no white-screen validation based solely on HTTP status.

## Remaining
- kvn review/adoption of the screenshots. Merge/push/deploy and the next approved R26 port remain manual; r26_port: yes.
