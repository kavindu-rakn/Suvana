# Learn centered desktop and sliding mobile switcher

- Started 2026-10-20, Codex, redesign/load-sequence in the main worktree after 4ea24d4.
- Scope: AppNavBar and its own stylesheet; desktop centering and shared mobile selection visuals/transitions. Navigation routes and tab order stay the same.
- Plan correction: direct request authorizes this scoped Learn increment on the current branch, overriding board/lane selection. r26_port: yes. No push/merge/deploy.

## Implemented

- Desktop header uses equal-width side columns, centering the segmented control on the viewport regardless of the brand/theme button widths.
- Mobile now renders the same gradient sliding selection indicator as desktop. Removed the mobile selected-button fill/shadow so a single continuous highlight moves between tabs. Existing dock position, labels, order and minimum mobile targets remain.
- Both indicators remeasure their active segment after tab changes, resizing, font loading and button/container size changes. Measurements account for the container border. Numeric shortcuts focus the visible navigation instead of the hidden desktop copy on phones.
- Component styles live in AppNavBar.css; global hot stylesheets and App.tsx were not edited.
- Refreshed generated help metadata: parsed before/after comparison confirms only the Alerts header source hash changed, following the preceding header cleanup. Help facts, sign labels and meanings are identical.

## Render evidence

- Review: `.agent-local/screens/learn-switcher/index.html` (ignored, not committed).
- Before/after desktop 1280x800 and phone 390x844 in light/dark. Automated browser checks additionally cover 1920, 861, 860 and 360 widths, intermediate animation positions, responsive changes, reduced motion, author layout and keyboard focus.

## Gates and handoff

- Learn clean install, lint, 377 tests passed / 13 skipped, TypeScript and production build passed. Main JS 153.32 kB gzip (under 160 kB). Existing npm advisories remain: 2 moderate, 3 high.
- Browser: 16 distinct cases passed, including actual intermediate animation positions, viewport-centered control at 1920/1280/861 and mobile 860/390/360 in both themes, breakpoint resizing, numeric shortcut focus, reduced motion and six-tab author layouts. Four desktop/phone theme cases passed again after reinstall/restart.
- Shell TypeScript/build passed for generated metadata refresh (existing chunk warning, 180.94 kB main JS gzip). All 268 sync guards, knowledge metadata freshness and git diff --check passed.
- Windows initially prevented npm ci from unlinking the running Vite native binding. Stopped only this workspace's Learn Vite process, reran the complete clean-install gates successfully, and restored Learn at 5174 with forced dependency optimization. Shell was left running.
- No push/merge/deploy. Screenshots are local render evidence; merge and hosted adoption remain with the user.
