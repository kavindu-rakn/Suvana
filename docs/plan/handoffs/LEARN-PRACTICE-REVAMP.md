# Practice UI and flow overhaul

Started 2026-10-20. Tool: Codex. Branch: `revamp/learn-practice`.

## Authorization and scope

kvn explicitly requested a complete desktop/mobile Practice UI and user-flow overhaul on this branch in chat. The branch was already checked out at `2029f3a` with a clean worktree.

Plan correction: this directly assigned revamp supersedes the older lane/hot-file schedule for Practice. Work stays in PracticeView, new Practice-specific components/styles and focused UI checks. No board/decision edits. No scoring, reference data, translations, or game-rule changes.

## What changed

- Replaced the fixed split-screen Practice surface with a normal scrolling workspace in Suvana's existing light/gold and dark/teal tokens. No shared global stylesheet edits.
- Added PracticeBrowser with an editorial introduction, an actual recommendation, category cards, scoped/global search, verified meanings and explicit Preview/Watch actions. Record's existing navigator is unchanged.
- One native preview dialog works on desktop, keyboard and touch, restores focus, and recovers from failed reference loads.
- Rebuilt Watch/Try/Recall navigation, lesson identity and real earned-star display. Watch's primary action fits above the phone dock at 360/390 widths. Try prioritizes the camera on phones, with an expandable reference; desktop retains simultaneous reference/camera views.
- Replaced the result overlay with an in-page review: synchronized replay, existing measured feedback, tips and clear next actions. Narrow phones retain side-by-side comparison.
- Preserved camera readiness, cancellation, tracking lifecycle, scoring algorithms, thresholds, Recall rules, stored progress, data and translations. Recovered camera retries return to the ready screen; an explicitly repeated completed-session sign stays in practice until the learner exits to its summary.
- Updated the affected browser selectors/assertions and added responsive, preview-failure and result-camera-recovery regressions. The real-camera latency test changes are selectors only; no real-camera latency run or claim was made.

## Gates and evidence

- Node 24.12.0; npm 10.9.9 clean installs passed for Learn and tools/screens. The first sandbox install hit a Windows native-module lock; temporarily stopped only this workspace's Learn Vite process, completed npm 10 ci, and restored Learn on its original port 5174. Existing dependency audit: 5 advisories (2 moderate, 3 high); lockfiles unchanged.
- Final Learn lint: passed, no warnings.
- Final Learn unit suite: **383 passed / 13 skipped**, 59 test files passed / 4 skipped.
- TypeScript + production build: passed; main JS **154.33 kB gzip**, below 160 kB.
- **65 affected browser cases passed**, covering Practice, Path entry, lesson links, keyboard ownership, camera release/recovery/cancellation, Watch framing and playback, Recall, replay, result focus, phone layouts and selected text contrast. Two additional recovery cases passed; three relevant session/Recall cases were repeated after the final completion-flow fix. Eight additional camera-loader, permission-error and startup-cancellation cases also passed. **75 distinct affected cases passed in total.**
- Viewports: 360, 375, 390, 767, 768, 1280 (plus author header widths in the existing polish check). Both actual light/dark themes checked; reduced-motion and touch contexts included.
- Sync guard: **268 passed**. `git diff --check`: passed.

### Broader-suite limitation (confirmed against baseline)

The attempted 163-case full browser run stopped at 8 failures: obsolete content-notice navigation to the removed learner Scenario tab and fragile switcher animation assertions requiring an intermediate position after 35 ms. It produced 14 passed / 8 failed / 1 interrupted / 1 skipped / 139 not run. Two representative failures were reproduced against the original `2029f3a` Practice source on a temporary baseline preview: content-notice 1280 light and switcher 1280 light. These unrelated tests/products were not changed. The three legacy polish journeys that require the removed Scenario tab were excluded from the affected run. This is not a claim that the repository-wide browser suite is green.

### Visual review

- Review page: `.agent-local/screens/LEARN-PRACTICE-REVAMP/index.html`, served locally at `http://localhost:5198/index.html`.
- 80 uncommitted PNGs: before/after × browse/Watch/Try/Recall/result × desktop 1280×800 / phone 390×844 × light/dark × exact viewport/full page. All 80 comparison image slots loaded in the review-page check.
- Baseline renders use original `2029f3a` Practice source through a read-only local Vite loader; the working checkout was never rolled back.
- Recall/result images use **synthetic history and synthetic detector output replaying an existing corpus landmark sequence**. They demonstrate UI layout only. They are not learner, recognition-accuracy, or real-camera performance evidence. The disclosure is visible on the review page. Browse/Watch/Try renders use shipped corpus metadata/reference data without seeded learner history.
- Full-page screenshots place the fixed phone dock at its captured viewport position. Exact-viewport captures are available separately in the review selector.

## Remaining manual action

kvn: review the before/after screenshots and decide adoption; test the actual camera flow on a physical phone before demo use. Automated camera tests use fake media and synthetic hand output. Physical iOS/Android validation is not claimed.

Implementation is committed on the requested branch. No push, merge, deployment, R26 edit or external message. Learn preview remains on 5174; local comparison page on 5198. UI adoption remains kvn's decision.

r26_port: yes (portable Learn source; port only after merge/adoption).
