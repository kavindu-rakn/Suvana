# Learn navigation and information cleanup

- Started: 2026-10-19, Codex; revamp/learn-path in main worktree per session instruction.
- Plan correction: direct user follow-up authorizes App/Hero/header/footer and local card styles, overriding board/lane/hot-file selection for this scoped increment.
- r26_port: yes.
- Scope: remove stray Starter accent; Path on normal entry/reload; simplify header; hide author entry controls; replace inline edition/licence/privacy text with an accessible info modal. Preserve explicit sign deep links and bookmarked author access.
- Before renders saved in .agent-local/screens/learn-info-cleanup/ at desktop 1280x800 / phone 390x844 in both themes.

## Implementation
- Removed the short ::before gradient ornament from open cards; Starter now has a clean continuous rounded border.
- Hero's Start learning button and lower start link open Path. Normal app initialization/reload also selects Path. Landing no longer queues or saves an automatic practice session.
- Verified sign deep links explicitly select Practice after exact index matching, preserving direct Watch behavior on entry/reload. Invalid links fall back to normal Hero/Path behavior.
- Removed On-Device AI, author entry/exit controls and the research/authoring footer link. Theme/account remain. Existing author bookmarks (?mode=author) and stored author preference remain supported.
- Replaced inline edition, corpus credits/licences and privacy text with a small Info icon on both Hero and app footer. Native dialog displays existing edition-aware Attribution content without dropping source/licence links or privacy wording.
- Modal has a large rounded layout, licence source cards, sticky X close control, scrollable phone content and a blurred/dimmed backdrop. Native modality keeps background controls inert and restores focus; Escape closes it. Global app shortcuts now pause whenever any native dialog is open.
- Updated affected practice regression navigation to explicitly choose Practice or start a Path lesson. Real-camera latency entry follows the same real first-lesson route; the benchmark itself is not run or claimed here.

## Rendered evidence
- .agent-local/screens/learn-info-cleanup/index.html: desktop 1280x800 and phone 390x844 before/after in light/dark, header/Path/footer and modal top/bottom; landing after views included.
- All screenshots use fresh local progress. Synthetic attempts/reference filters/camera fixtures in browser tests are UI regression evidence only, never learner or real-camera performance results.
- Inspected desktop/phone modal layouts and full privacy content at the bottom of the phone modal. Required information remains accessible and the X stays visible while content scrolls.

## Validation and limits
- Learn npm ci and lint passed. Full unit suite with --maxWorkers=1: 371 passed / 13 skipped (57 files passed / 4 skipped), using the same scoring/timing assertions. One worker follows the prior increment's observed contention sensitivity; default-worker execution was not repeated.
- Production build passed; main JS 154.86 kB gzip, below the 160 kB limit.
- Browser checks: 95 passed across the focused runs (72 navigation/practice/modal/progress cases, 22 continuous-path geometry/density cases, one additional Hero smooth-scroll/modal wheel regression). Tests exercise valid/invalid deep links, blocked storage, author bookmarks, X/Escape/focus return, licence links/text, modal fit, existing Practice/Recall/camera controls and progress exports.
- The landing modal opts out of Hero's Lenis wheel interception with data-lenis-prevent; actual native wheel scrolling was verified while the background stayed still.
- Existing test setup needed to wait for lazy Path storage initialization before seeding completed-session fixtures; author export fixtures retain their selected profile without a reinitializing navigation. Initial native-dialog focus assertions were corrected to allow browser chrome while forbidding background page controls. The resulting focused runs passed.
- Knowledge metadata freshness, 265 sync guards and git diff --check passed. No generated knowledge JSON, dependencies, lockfiles, curriculum, scoring or saved-progress schema changes.
- Existing dependency audit findings remain (2 moderate / 3 high); no dependency update was attempted.
- Restored Learn on http://localhost:5174/learn/ with forced dependency optimization. Verified actual automatic Path rendering (54 cards) and modal open/Escape close at 1280x800 and 390x844 in both themes, with no runtime or Learn asset failures. The standalone dev account-session backend remains outside this change.
- The opt-in real-camera latency benchmark was not executed; fixture-driven camera checks do not establish camera latency or learner results.

## Remaining
- Refresh the Learn preview to review. Screenshot adoption, merge/push/deploy and the next approved R26 mirror remain manual; r26_port: yes.
