# Shell module header links

- Started 2026-10-20, Codex, main worktree on redesign/load-sequence; following the user's Shell increment after 29fe97d.
- Scope: Shell homepage header, existing module navigation behavior, gradient hover/focus underline. No module internals or shared account header changes.
- Plan correction: direct user request authorizes this scoped increment in the current main-worktree branch, overriding board/lane selection.
- No push, merge or deployment. r26_port: no (Shell only).

## Completed

- Added Recognize, Communicate, Learn and Alerts in that order to the homepage header. Recognize shares the card's asynchronous canonical/fallback destination and new-tab behavior. Other links match their card routes and same-tab behavior.
- Added a teal-to-gold underline drawing from left to right on hover and keyboard focus. Reduced-motion users get an immediate underline.
- Kept desktop links centered. Tablet/phone links use a second header row; all four remain visible with 44px-high targets. Styles are scoped to the new homepage classes, leaving shared account/module headers unaffected.

## Validation and review

- Shell: 161 tests passed; TypeScript and production build passed. Main bundle 180.94 kB gzip. Existing large-chunk warning remains.
- Browser: 15 checks passed: layout, hover/focus and destination parity at 1280/1024/768/390/360 in both themes; configured Recognize fallback/new-tab navigation; the three same-tab module destinations; reduced-motion styling.
- All 268 sync guards, knowledge metadata freshness and git diff --check passed.
- Before/after desktop 1280x800, phone 390x844 and narrow phone 360x844 in light/dark: `.agent-local/screens/shell-header-links/index.html` (ignored, not committed). After captures show Communicate hovered. Render review confirmed readable links and no horizontal overflow.
- Navigation checks use destination fixtures. No production module availability, account changes, push, merge or deployment claimed. User merges/pushes for hosted adoption.
