# Account welcome branding and compact footer
started 2026-10-19 by Codex

Direct user follow-up on uifixes/suvana/main worktree: mobile header wordmark, centered mobile welcome without duplicate mark, larger desktop mark behind copy with animated colors only, and smaller account footer without title. Preserve mode/action alignment and separate accountCopy.ts edits.
Plan correction: unscheduled direct assignment overrides board/lane workflow; planner files untouched.

## Handoff 2026-10-19 - Codex
Branch: uifixes/suvana/main worktree; follows f37fc59.
Status: review

Changes:
- Shared mobile header retains the full SUVANA wordmark with responsive font/letter spacing. Small widths compact the mark/action padding so Shell's signup and theme controls still fit.
- Mobile account welcome and replacement paragraph are centered; removed the duplicate mark from this welcome block.
- Desktop account mark is a large, translucent backdrop behind the welcome heading and paragraph. CSS masks the existing transparent Suvana PNG, preserving the real logo silhouette. Its background gradient shifts through gold/teal like the footer start? action. Position/size remain static; floating/rotation removed. Reduced motion stops the color animation.
- Account footer no longer renders the SUVANA title. Desktop copyright is vertically centered against the unchanged link row; footer height is 57px. Mobile copyright is 12px and measures 235.13px against the four-link row's 236.27px; footer height about 66.59px. Privacy/Terms/Contact/Roadmap links keep their existing targets/styles. Shell's own footer is unchanged.
- Existing card, mode switch, submit and alternate-account alignment preserved. No auth behavior changes; passkey remains disabled/UI-only.

Validation:
- Shell: 157 tests/9 files, typecheck and production build pass. Existing >500 kB main chunk advisory remains (644.95 kB).
- Communicate: lint, TypeScript and /communicate production build pass.
- 263 sync guards and git diff --check pass.
- Browser: wordmark visible, controls do not overlap at Shell widths 280/320/360/390; account brand/footer checks at 1280x800, 903x532, 390x844, 320x568. Mobile welcome is centered and mark hidden; footer title absent. Desktop mark background position changes over time while its bounding box stays exactly unchanged; reduced motion has no animation. Desktop copyright/link-row vertical centers match exactly.
- 14 viewport/theme mode-alignment/color/inert/passkey checks passed; 22 Login/Register viewport-fit checks passed with no document scrolling or header/footer overlap. Actual desktop/phone renders visually inspected.
- No clean npm ci rerun against the running preview (prior locked-install limitation); no package/lockfile changes.

Screenshots: .agent-local/screens/account-brand/index.html (before/after desktop 1280x800, review 903x532, phone 390x844, small phone 360x640, light/dark). Images stay uncommitted.
Separate accountCopy.ts subtitle edits were preserved outside this increment; renders/builds include the working-copy text. No SSL content or research figures touched. r26_port: no.
Plan correction: direct user follow-up overrides usual lane/branch setup; planner files untouched.
Needs kvn: visual adoption; merge/push/deploy remain manual.

Commit message:
Refine account branding and compact footer

- Restore mobile header wordmark and center the mobile welcome
- Place a static gradient-animated logo behind desktop welcome text
- Remove account footer title and balance copyright/link spacing
- Preserve mode alignment and record responsive validation
