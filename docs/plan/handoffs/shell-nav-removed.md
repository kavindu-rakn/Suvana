# Remove landing section links
started 2026-10-19 by Codex

## Handoff 2026-10-19 - Codex
Status: review
- Removed the four section links from the public landing header as requested. Removed the nav-specific responsive styling and JS click/scroll/current-section behavior. The logo, theme toggle and account controls remain.
- Browser check confirmed no `.nav-links` in the header and all remaining header controls render at 1280, 390 and 360 px, light and dark. Existing page-wide phone overflow flag remains unrelated.
- Screenshots: .agent-local/screens/shell-nav-removed/index.html (before/after, desktop/phone/360, both themes).
- `git diff --check` passed. No tests/build run.
- SSL content and figures touched: none. r26_port: no.
- Manual review/adoption and merge/push/deploy remain kvn's actions.

Commit message:
Remove landing page section navigation

- Remove the four section links from the landing header
- Delete their responsive styles and scroll tracking behavior
- Preserve brand and account controls across screen sizes
