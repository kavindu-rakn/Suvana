# Shell footer start CTA
started 2026-10-19 by Codex

Direct user assignment: match Learn's footer heading, make start? the link, preserve the marquee and bottom footer. Work on uifixes/suvana in the main worktree as explicitly requested.

Plan correction: unscheduled user-assigned UI task; branch/worktree instruction overrides the usual lane setup. BOARD.md, tasks.json and DECISIONS.md remain unchanged.

## Handoff 2026-10-19 - Codex
Branch: uifixes/suvana (main worktree)
Status: review
Changed: apps/shell/index.html and src/styles/base.css. Replaced separate Start Now button with inline start? registration link, matching Learn's white heading, spacing, serif type and animated gold/teal treatment. Phone font minimum is 3rem so Ready to stays within narrow screens. Visible keyboard focus and reduced-motion support included.
Preserved: BRIDGE THE GAP marquee and footer-bottom markup/styles; registration destination /register?callbackUrl=%2F.
Gates: 157 Shell tests passed (9 files); typecheck and production build passed; existing >500 kB bundle advisory; 255 sync guards passed; git diff --check passed. npm ci failed twice with Windows EPERM on locked dependency binaries; npm install --no-package-lock restored dependencies (no package/lockfile changes). This is not a successful clean-install gate.
Screenshots: .agent-local/screens/shell-start-cta/index.html, before/after desktop 1280x800, phone 390x844 and 360x800, light/dark. Before source served from this branch's pre-change HEAD, as requested for this session. Initial loading-screen captures were replaced after waiting for preloader completion.
Browser: no document overflow; start? has correct destination; focus outline visible; Enter reaches intercepted registration destination (routing check, not live auth verification); reduced-motion animation disabled.
SSL content touched: none. Figures touched: none. r26_port: no.
Needs kvn: visual review; merge/push/deploy remain manual.
Commit message:
Match shell footer start link to Learn

- Make start? the registration link within the footer heading
- Match Learn typography and gradient with keyboard and motion support
- Preserve marquee and bottom footer and record validation
