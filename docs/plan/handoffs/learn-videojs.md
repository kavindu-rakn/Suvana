# Learn Video.js reference playback

- Started/completed: 2026-10-19, Codex; `revamp/learn-path` in the main worktree, as requested for this session.
- Plan correction: the direct request authorizes the shared reference-player replacement, package/lockfile and Practice wiring/copy changes, overriding board/lane/hot-file selection for this scoped task. No board or decision files changed.
- r26_port: yes.

## Result

Every newly opened reference starts at 1x. Removed the automatic half-speed start and two-loop speed change. Updated onboarding and aligned comparison replay to normal speed; capture durations, scoring, recommendations, saved progress and reference data are unchanged.

Installed exact `@videojs/react` 10.1.0 using npm 10.9.4. The stock Video.js Neutral skin supplies playback, seeking, speed menu and fullscreen. Its controls sit below the animation in normal flow, with 44px button targets. The speed menu retains 0.25x, 0.5x, 0.75x and 1x. Mirroring, raw-frame positioning and manual hand zoom remain available.

References are timestamped landmarks, not encoded video. `LandmarkMedia` adapts their animation clock/events to Video.js; no corpus video, encoder, remote stream or telemetry is added. Drawing retains the existing interpolation limit and never bridges tracking gaps above 200ms. The shared component covers lesson Watch, Practice Watch/Try, browser previews, sentences and author recording/library replays. The player and CSS load lazily.

Sources: official Video.js React installation, architecture and media-capability documentation at https://videojs.org/docs/framework/react/. No external quickstart/skill instructions were adopted as authorization. The media attachment hook is marked internal upstream; it is isolated in one bridge and the package is pinned. Revalidate this bridge when upgrading Video.js.

## Verification

- Learn: `npm ci`, lint, full unit suite with one worker: **375 passed, 13 skipped**; TypeScript/production build passed. Main JS **153.09 kB gzip** (under 160); lazy player JS **72.00 kB gzip**, player/skin CSS **10.35 kB gzip**.
- Browser: **35 distinct Playwright cases passed** across lesson-detail (8), shared player (6), Watch framing (5), Watch stage (1), sentence (12) and comparison replay (3). Includes 360/390px phones, desktop, light/dark, touch previews, pause/play, keyboard seek, speed changes, fresh-reference reset, loops, fullscreen, zoom, reference focus and existing capture flows. Repeated checks after clean install and final touch-target styling also passed.
- Standalone `/`: same source with `VITE_SUVANA` disabled; actual desktop 1280x800 / phone 390x844 rendering and play/pause at 1x passed without browser errors. Temporary 5175 test server stopped afterward.
- Shell: **157 tests passed**, typecheck/build passed. Recognize: **42 tests passed**. Generated knowledge JSON changes were verified to contain only the two changed Learn source hashes.
- Metadata freshness, **266 sync guards** and `git diff --check` passed.
- Existing advisories: npm reports 5 dependency findings (2 moderate, 3 high); Shell emits its existing large-chunk advisory. No broad dependency remediation attempted.
- UI/camera fixtures are interface-regression evidence, not learner performance or real-camera latency evidence. Browser checks used Chrome; no claim of physical iOS/Safari testing.

## Screenshots and local preview

Review: `.agent-local/screens/learn-videojs/index.html` (ignored, not committed). Lesson reference before/after at 1280x800 and 390x844 in light/dark; Practice Watch and desktop sign-browser before/after in both themes. Phone sign-browser has after images only; phone Practice before dark is also absent because the initial capture stopped on a touch-preview selector. The review labels these gaps explicitly. The shared old player is visible in all phone lesson before images. Additional standalone desktop/phone renders are saved beside the review.

Learn preview restored with forced dependency optimization at `http://localhost:5174/learn/`; actual reference rendering and controls rechecked after the clean install. Screenshot adoption, upstream mirroring, merge, push and deployment remain the owner's steps; none performed.
