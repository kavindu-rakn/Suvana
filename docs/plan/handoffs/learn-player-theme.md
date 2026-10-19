# Learn player light theme and hand-glitch investigation

- Started: 2026-10-19, Codex, `revamp/learn-path`, main worktree.
- Plan correction: direct session request authorizes this scoped player styling change and read-only hand-playback investigation on the requested branch/worktree, overriding board/lane selection.
- r26_port: yes.
- Approval boundary: fix the player light theme now; investigate/explain hand glitches and request approval before any hand-playback fix. No renderer, interpolation, clock, scoring or reference data changes authorized in this increment.

## Read-only hand-glitch findings (fix pending approval)

Confirmed cause: `interpolateHands` in `src/vision/drawing.ts` matches each hand with `b.find(h => h.handedness === hand.handedness)`. It does not ensure one-to-one matching or unique labels. Saved references sometimes have two hands with the same handedness label. Both source hands are then blended toward the first matching destination, producing an artificial collapse and a snap when the renderer advances to the next actual frame. This matching code predates the Video.js player.

Reproduction using the actual exported function and untouched `public/references/kaggle_Q.json`: frames 26/27 at 1040/1080ms both contain two Right hands. The second wrist moves in the raw frames from x=0.28157 to x=0.28360. At 90% interpolation the existing function incorrectly draws it at x=0.616361, toward the other hand; on the next recorded frame it snaps back. Saved numeric evidence: `.agent-local/screens/learn-player-theme/glitch-reproduction.json`. Visual evidence: `glitch-Q-current.png`. These are reference/render diagnostics, not learner-performance or accuracy measurements.

A read-only scan of 520 reference files found 294 with at least one duplicate-handedness frame, 318 with at least one change in the handedness-label multiset while detection count stays equal, and 198 with at least one empty detection frame. These overlap and do not mean every such clip is unusable or visibly glitches. No non-finite coordinates, non-increasing timestamps or timestamp gaps above 200ms were found in this scan. Empty detection frames and changing labels are source-data properties; without original signer/video review, do not infer why the detector missed a hand or synthesize a missing movement.

Proposed conservative fix for approval: interpolate only when the hand labels uniquely identify corresponding hands in both frames. For duplicate, missing or ambiguous matches, draw the recorded frame without blending across that transition. Add targeted regressions for duplicate labels, label changes, reordered unique hands and missing detections. Keep reference files, hand labels, scoring, stored attempts and the timing adapter untouched. This removes the artificial blending bug; it cannot repair missing or noisy detections in the source recording.

No hand rendering/clock/interpolation/reference/scoring files were edited. Only the theme correction is implemented in this increment.

## Theme implementation and validation

Replaced fixed teal/dark player chrome in light mode with Learn's semantic cream surfaces, gold accent, dark text, theme-aware borders, focus rings and menu colours. The drawing stage remains dark for the existing landmark colours. The dark palette and geometry are preserved. The CSS also replaces an undefined border token with the existing subtle-border token.

- `npm ci`, lint, full unit suite: **375 passed / 13 skipped**; TypeScript/build passed, main JS **153.09 kB gzip**. Existing five npm advisory findings remain outside this scoped fix.
- Desktop 1280x800 / phone 390x844 in both themes: computed-style checks confirm light controls/framing are cream (`rgb(250,248,245)`), accent follows Learn gold, stage stays dark, settings speed selection and pause remain functional, and no browser errors occur. Repeated after clean install.
- Existing lesson-detail Playwright regressions: **8 passed**, including 360px controls, focus restoration and Watch/Try actions.
- Metadata freshness, **267 sync guards** and diff check passed. No generated metadata changed.
- Before/after and diagnosis review: `.agent-local/screens/learn-player-theme/index.html` (ignored, not committed). Actual local reference frames were used; no invented SSL content or learner results.
- Preview restored at `http://localhost:5174/learn/` and real rendering rechecked. Theme fix committed for review; hand-glitch fix awaits the user's explicit approval. No push, merge, deployment or upstream mirror performed.
