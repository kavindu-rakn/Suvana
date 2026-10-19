# Alerts header cleanup

- Started 2026-10-20, Codex, main worktree on redesign/load-sequence after 342c475.
- Removed only the Modules and Install section-navigation links from the Alerts header, as requested. Brand, theme control, Back to Home and the page's install content remain.
- Plan correction: direct request authorizes this scoped Shell HTML increment on the current branch, overriding board/lane selection. r26_port: no. No push/merge/deploy.

## Validation

- Shell TypeScript and production build passed. Existing large-chunk warning remains; main JS unchanged at 180.94 kB gzip.
- Four desktop/phone light/dark browser checks passed: header links absent, Back to Home route intact, theme toggle functional, no horizontal overflow. Browser checks wait for the existing asynchronous theme transition before assertions.
- All 268 sync guards and git diff --check passed.
- Before/after renders: `.agent-local/screens/alerts-header-cleanup/{before,after}-{1280,390}-{light,dark}.png`, desktop 1280x800 and phone 390x844 (ignored, not committed).
- Existing user-run dev servers left running. No deployment performed; merge/push remains with the user.
