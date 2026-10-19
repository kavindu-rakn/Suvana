# Learn lesson detail redesign

- Started: 2026-10-19, Codex; revamp/learn-path in main worktree per session request.
- Plan correction: direct session redesign overrides board/lane selection for PathView and its local styles; existing lesson content and game rules remain authoritative.
- r26_port: yes.
- Scope: Shell-inspired editorial lesson header and calm sign list; remove the requested eight-sign sentence; preserve actions, coverage notices and progress. Make the reference preview fit the redesigned detail view.
- Before screenshots: .agent-local/screens/learn-lesson-detail/before-{1280,390}-{light,dark}.png and corresponding Watch views.

## Implementation
- Replaced the plain title/button stack with a Shell-inspired rounded lesson header: editorial title, monospace lesson number, actual sign/star totals and one primary practice action. Back navigation is a quiet arrow/text control.
- Rebuilt signs as a single rounded surface with numbered rows, full verified gloss labels, accessible three-star indicators and quieter Watch/Try buttons. Earned stars use the existing yellow star treatment.
- Removed the requested eight-sign/review sentence entirely. Existing locked and partial-reference notices remain visible with unchanged restrictions.
- The reference panel now appears above the sign list and scrolls below the sticky header when opened. Playback framing captions and controls sit in normal flow to fit phones. The close button returns focus to the originating Watch button; request cancellation remains intact.
- No curriculum/order/meaning, scoring, saved progress, unlocking or practice-session policy changes. Shared SkeletonPlayer and PracticeView code were not edited; playback styling is scoped to the lesson reference panel.
- Generated assistant JSON refreshed only for the PathView source hash; deep comparisons confirm no knowledge-content changes.

## Review and browser evidence
- .agent-local/screens/learn-lesson-detail/index.html: before/after lesson and Watch views, desktop 1280x800 / phone 390x844 in both themes. Inspected the canonical renders, including the phone preview with controls visible above the navigation dock.
- Eight new Playwright cases passed: 360/390/1280px, both themes, full label fit, non-overlapping 44px actions, keyboard Watch, reachable playback controls, speed/frame controls, preview close/focus return, Try handoff and long approved labels with Back-to-path focus restoration.
- Thirteen existing Path/content-notice cases passed, including actual filtered-index preview restrictions and saved-star gating. Screenshots use fresh local progress; synthetic progress/reference fixtures are UI-only evidence, not learner or recognition results.

## Gates and completion
- Learn npm ci and lint passed. Complete single-worker unit suite: 371 passed / 13 skipped (same scoring and timing thresholds). Production build passed; main JS 152.05 kB gzip, below the 160 kB limit. Build's plugin-timing advisory is informational.
- Browser checks: 21 passed (eight new detail cases plus 13 existing Path/content-notice cases).
- Shell: 157 tests, TypeScript and production build passed; existing >500 kB chunk advisory remains. Recognize keypoint/Sinhala-label plus Suvana-label consistency checks: 42 passed using the existing ignored task-local dependencies.
- Knowledge freshness, 266 sync guards and git diff --check passed. Both generated knowledge files differ only in the PathView provenance hash; no knowledge answers/content changed.
- Existing dependency audit findings remain (2 moderate / 3 high); no dependency manifests/versions changed.
- Restored Learn preview with forced dependency optimization at http://localhost:5174/learn/. Rechecked actual lesson and Watch rendering at 1280x800 and 390x844 in both themes after clean install; no runtime or Learn asset failures.
- Refresh Learn and open a lesson to review. Screenshot adoption, merge/push/deploy and the next approved R26 mirror remain manual; r26_port: yes.
