# Always zoom reference playback to hands

- Started: 2026-10-19, Codex, `revamp/learn-path`, main worktree, as explicitly requested.
- Plan correction: direct request authorizes this shared player/framing change and required Practice wiring, overriding board/lane/hot-file selection for this scoped increment.
- r26_port: yes.
- Scope: always use the existing whole-clip hand fit in every shared player; remove the complete framing/mirror/zoom-control row. Comparison replay also retains hand zoom without a zoom-out control. Update stale onboarding copy. Preserve reference/scoring data, mirroring, normal-speed default and Video.js controls.
- The separate `fix/hand-playback` branch is not merged or cherry-picked into this branch.

## Implementation and verification

The shared Video.js landmark player now always uses the existing whole-clip `fitFor(frames, 0.85)` hand fit. Removed the framing caption, mirror caption and Zoom button as one complete row, including their CSS. Removed the obsolete `fitToFrame` prop and viewport-dependent overrides. Comparison replay also keeps its existing hand fit permanently, without a raw-frame toggle/caption; transport spacing remains. Onboarding now describes the enlarged reference. Hand-fit limits/algorithm, mirroring, reference files, playback clock, speed choices and scoring are unchanged.

- Learn clean install/lint: passed. Full suite **375 passed / 13 skipped**; TypeScript/production build passed, main JS **152.95 kB gzip**.
- **22 distinct browser regressions passed**: lesson preview/actions (8), player controls/touch previews (6), comparison replay (3), always-zoomed Watch/Try across 360/390/767/768/1280px (5). Updated framing checks also measure actual canvas ink against the recorded unzoomed coordinate span, confirming enlargement rather than only a removed CSS class. Focused framing/comparison checks repeated after clean install/final styling.
- Shell: **157 tests passed**, typecheck/build passed. Recognize: **42 tests passed**. Generated help JSON changes were verified as only the changed SkeletonPlayer/PracticeView source hashes; no help facts/labels changed.
- Metadata freshness, **267 sync guards** and `git diff --check`: passed.
- Before/after desktop 1280x800 and phone 390x844 in light/dark: `.agent-local/screens/learn-hand-zoom/index.html` (ignored, not committed). Actual reference landmarks used. Existing camera/history mocks in browser regressions are UI-only evidence, not learner results.
- Existing advisories: five npm dependency findings and Shell's large-chunk warning; no broad remediation attempted.
- Learn preview restored at `http://localhost:5174/learn/` with fresh dependency optimization; actual lesson/reference rendering checked after clean install. No push, merge, deployment or upstream mirroring performed. The separate hand-playback fix remains on `fix/hand-playback`.
