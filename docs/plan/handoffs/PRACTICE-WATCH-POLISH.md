# Practice Watch refinements

Started 2026-10-20. Codex on `revamp/learn-practice`, base `bbbbdd3`.

kvn's seven browser comments directly authorize category-aware Back navigation, removal of the Watch title/sidebar kickers, a taller reference stage, the Try action label, and moving How it works into the Watch side panel (point Y).

Plan correction: this direct assignment supersedes older board/lane/hot-file scheduling for this increment. Scope: PracticeView, PracticeBrowser, their own styles, matching onboarding copy and affected tests; this handoff and append-only LOG. No corpus, scoring, board or decision changes.

## Changes against the comments

1. Back and Esc return to the displayed category containing the selected reference, with keyboard focus and scroll restored to its card. ADINAWA (pull) returns to **Verbs**. Search, previews and direct sign entry share this behavior. Small categories folded into **Other** return there; local recordings return to **My recordings**. Missing references fall back to the category root rather than guessing. Explicit category return also works after a completed session; opening another lesson resets that return target so the normal session summary remains available.
2. Removed **Let’s take a closer look** from Watch. Other stages keep their relevant context labels.
3. Removed **Watch, then give it a go** from the side panel.
4. Watch reference stage now uses **340–440px** on desktop (352px at 1280×800), and **240–290px** on phones (253px at 390×844). Tightened Watch-only header/title/stepper spacing; default browser entry retains visible playback controls at 1280×800. Short/tablet screens and sessions with an extra recommendation row can require normal page scrolling to reach those controls. Try’s camera-first reference sizing is unchanged.
5. Primary action now says **Try**. Its accessible name is **Try this sign**, distinguishing it from the stepper. Updated the guide’s copy and affected test selectors; Sentence’s separate action is outside this increment.
6–7. Moved **How it works** from the Watch header to the requested action panel (point Y), below the privacy note. It remains accessible in the header in Try/Recall, where that panel is absent. Native modal focus restoration and Esc dismissal are checked.

No content, scoring, thresholds, stars, capture duration or reference motion/framing changes. The navigation helper has five adjacent Vitest cases for actual displayed grouping and fallback behavior.

## Gates

- npm **10.9.9** clean install passed. Stopped only this workspace’s verified Learn Vite process to release its native Windows binding, then restored **5174**. Shell retained on **5173**. No dependency/lockfile changes; existing advisories remain 2 moderate / 3 high.
- Learn lint: passed, no warnings.
- Unit suite: **394 passed / 13 skipped**, 61 files passed / 4 skipped.
- TypeScript and production build: passed; main JS **155.35 kB gzip**, below 160 kB.
- **81 distinct affected browser cases passed overall**: category Back/Esc/focus, cross-category search, direct links, completed-session return, Watch layout/help, camera lifecycle/readiness/permission/recovery, Watch/Try/Recall, preview/player controls, replay, onboarding, keyboard ownership, responsive layout and selected contrast. Nine focused cases were repeated within this run after final spacing changes, including playback-control viewport assertions for default browser entry.
- The 81-case run had **78 passed / 3 failed**: the older hand-framing spec assumed playback controls were inside the first viewport at 767/768/1280px even when a session recommendation adds a row. Updated that check to bring the taller player's controls into view with a normal page scroll before using them. All **5 hand-framing cases passed** on rerun, including the three failures; framing and actual ink enlargement remain checked. Original reports are retained under `affected-final/`, and the corrected run under `framing-scroll-recheck/`. No source/style changes followed the production build.
- Initial focused test attempts stopped on three migration assumptions: the guide’s accessible dialog name is **Frame yourself**, the category header must be distinguished from a card heading, and BAG EKA’s card label includes its verified meaning. Corrected the test locators/helper; original reports remain under `test-results/`, `watch-checks/`, and `watch-final/`.
- Sync guard: **270 passed**. Whitespace check passed.
- The opt-in real-camera latency selector was updated for the renamed action; that benchmark was **not run**. No latency measurement is claimed.

## Visual review and limits

- **48 before/after PNGs** at **1280×800**, annotated **903×532**, **390×844**, and **360×844**, in light and dark. Entry, player detail and full page, baseline `bbbbdd3`.
- `.agent-local/screens/PRACTICE-WATCH-POLISH/index.html`, locally served at **http://localhost:5201/index.html**. Screenshots/scripts remain ignored and uncommitted.
- Renders use the actual bundled ADINAWA (pull) metadata and recorded reference landmarks, paused at the start; no learner history or camera fixtures are seeded in them.
- Camera/Recall/replay browser regressions use existing disclosed synthetic hand detection/history and fake media. The search keyboard-height check mocks visualViewport. These are UI checks, not learner, recognition-accuracy, physical-camera or native-phone/keyboard evidence.
- The broader repository suite is not claimed green: parent handoffs document unrelated legacy Scenario navigation and switcher timing failures. The affected run excludes three Scenario-dependent polish journeys and unrelated Shell loader/signup checks.

## Handoff

Implementation and validation are complete on the requested branch, ready for kvn’s rendered review. Visual adoption and a physical phone/keyboard check remain kvn’s review actions. No push, merge, deployment, external message or R26 edit.

r26_port: yes
