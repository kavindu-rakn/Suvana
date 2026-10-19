# Conservative hand playback fix

- Started: 2026-10-19, Codex, main worktree, `fix/hand-playback` branched from `revamp/learn-path` at `0bb6943`.
- Plan correction: user explicitly approved the previously proposed fix and requested this separate branch, superseding the session's default branch for this increment and board/lane selection.
- r26_port: yes.
- Scope: display-only interpolation rejects duplicate/ambiguous hand matches and missing detections. Draw the actual recorded frame for those transitions; retain interpolation for unambiguous matches. No reference, scoring, saved progress, clock or camera changes.

## Result and verification

`interpolateHands` now requires a complete, unique handedness match with compatible landmark counts across both frames. Duplicate labels, changed labels, missing detections and incompatible landmark counts return the actual recorded frame unchanged. Unique hands still blend correctly when the detection array order changes. The player advances to the next actual frame at its recorded timestamp; no hand is synthesized across an ambiguous transition.

- Added six targeted regression cases, including the actual untouched `kaggle_Q.json` frames at 1040/1080ms. Before the fix, five of the new cases failed; after it, all 15 drawing tests passed.
- Clean install/lint, full Learn unit suite: **381 passed / 13 skipped**. TypeScript/build passed; main JS **153.13 kB gzip**, below the 160 kB budget. Existing npm dependency advisories remain outside this scoped change.
- Six browser regressions passed for playback, seeking, speed choices, fresh-reference resets, fullscreen and touch browser previews at 360/390/1280px.
- Before/after real-reference render diagnostics at desktop 1280x800 and phone 390x844: `.agent-local/screens/learn-hand-playback/index.html` (ignored, not committed). The artificial collapse is absent. These are renderer diagnostics using actual reference data, not learner/accuracy evidence or a redesign of the app layout.
- Numeric reproduction: the second Q wrist previously drifted to x=0.616361 at 90% interpolation; it now remains at its recorded x=0.28157 until the next recorded frame. Saved locally as `after-reproduction.json`.
- Metadata freshness, **267 sync guards** and diff check passed. No generated help metadata changed. The only runtime caller of interpolation is the reference player; live tracking/scoring/reference data are unchanged.
- Preview restored on port 5174 with forced dependency optimization and actual renderer/player checks after clean install. Main worktree remains on `fix/hand-playback` as requested. No merge, push, deployment or upstream mirror performed.

Limit: this removes the artificial matching collapse; existing missing/noisy detections in the source may still cause visible discontinuities. This change deliberately does not guess hand identities or reconstruct missing movement.
