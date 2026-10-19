# Hide Scenario in Learn navigation

- Started: 2026-10-19, Codex, `revamp/learn-path`, main worktree.
- Plan correction: direct session request authorizes this navigation change on the requested branch/worktree, overriding board/lane selection.
- r26_port: yes.
- Removed Scenario from the shared visible tab list. Desktop and mobile now show Path, Practice, Progress; Progress uses shortcut 3. Author navigation inherits the same first three tabs. Scenario implementation retained.
- Verification: clean install/lint; Learn 375 tests passed, 13 skipped; TypeScript/build passed (main JS 153.09 kB gzip); metadata freshness, 267 sync guards and diff check passed. Existing npm dependency advisories remain unchanged.
- Desktop 1280x800 and phone 390x844, both themes: verified exact three-tab order, Progress click and shortcut 3 before/after the clean install. Screenshots: `.agent-local/screens/learn-hide-scenario/index.html` (ignored, not committed).
- Learn preview restored at http://localhost:5174/learn/ and actual rendering rechecked. No push, merge, deployment or upstream mirroring performed.
