# Readiness-based loading sequence

- Started: 2026-10-20, Codex, main worktree, `redesign/load-sequence` from `main` at `e3d7991`, as requested.
- Plan correction: direct request authorizes Shell loading/navigation and compact Learn camera-start feedback, overriding board/lane/hot-file selection for this scoped increment.
- Scope: eliminate forced Shell arrival/reload and outbound waits; show the branded counter during genuine sign-up navigation; compact feedback in Learn camera views only, per the user's clarification. Recognize and Communicate UI are outside scope.
- Counter values are decorative activity animation, not byte-download percentages or measured readiness figures. Actual ready/error/cancel/navigation events determine visibility; no artificial minimum wait.
- Preserve authentication, permission requirements, reference/scoring data and Recognize's inference/WebSocket contract. No push/merge/deploy/message.
- r26_port: yes for portable Learn UI changes.

## Completed

- Shell content now appears immediately on arrival and reload, including without JavaScript. Removed the forced initial counter and outbound animation delays; normal links keep native navigation.
- The branded fullscreen counter appears only for ordinary same-origin sign-up navigation. Modified clicks/new tabs/download links are preserved. Cancel/Escape and Back restore the page, focus, scrolling and prior inert states. The counter stops at 95 during a wait and completes only on navigation; there is no artificial delay.
- Learn's shared CameraStage displays the mini counter only during camera startup, with a cancel action. Running, denied, interrupted and cancelled states remove it through the existing camera lifecycle. No camera hook, permission, tracking, capture or scoring behavior changed.
- Counter helpers remain local to each independently built app so Learn stays portable to R26 without a Shell runtime dependency.

## Validation

- Shell: 161 tests passed; TypeScript and production build passed. Main bundle 180.91 kB gzip; existing chunk-size warning remains.
- Learn: clean npm install, lint, 377 tests passed / 13 skipped, TypeScript and production build passed. Main JS 153.20 kB gzip. Existing npm advisories remain unchanged (2 moderate, 3 high).
- Browser: 23 passed (16 loading cases plus 7 existing camera lifecycle cases). Includes 1280, 390 and 360 px, light/dark, immediate arrival/reload, no-JS HTML visibility, delayed sign-up navigation, cancellation/Back, granted-camera readiness, permission error and startup cancellation.
- Shell knowledge metadata freshness check passed; all 267 sync guards passed; git diff --check passed.

## Render review and limits

- Review gallery: `.agent-local/screens/load-sequence/index.html` (ignored, not committed).
- Before/after Shell arrival and Learn camera startup at desktop 1280x800 and phone 390x844 in both themes, plus sign-up waiting renders. Browser suite adds 360 px checks and captures.
- Camera renders use a fake camera with permission granted and playback deliberately held to expose startup. Sign-up uses a delayed destination fixture. These verify UI/lifecycle behavior, not production account creation, real-device camera performance or learner/accuracy results.
- Local previews restored: Shell 5173 and Learn 5174. No push, merge or deployment performed. User reviews renders and merges/pushes the branch for production adoption.
