# I-12a follow-up: preserve Alerts identity during sync
started 2026-10-15 by codex (first window)

Branch: agent/codex/I-12a-sync-guard, fresh origin/main d527398.
Authorization: kvn requested the exact upstreams.json proposal in the merged
docs/plan/handoffs/I-12a.md; no push.
Status: review.

Changed files: tools/sync/upstreams.json, this handoff, append-only LOG.md entry.
Scope: replace only alerts.couplings["app.json"] and append its proposed
app.json identifier/EAS guard, retaining the existing Suvana name guard.
No application configuration, screen files or other component declarations changed.

Screenshots: n/a (sync manifest only).
SSL content touched: none.
Figures touched: none.
Decisions needed from kvn: none.
Proposed diffs for hot files I did not own: none.
Plan corrections: none; explicitly authorized follow-up to merged I-12a.
r26_port: no.

Gates:
- `node tools/sync/sync.mjs guard`: 171 checks passed.
- Parsed manifest comparison against HEAD plus the two JSON blocks from
  I-12a.md passed: exact proposal applied; every other manifest field unchanged.
- `git diff --check`: passed.
- No app/runtime code changed; module build/test gates are not applicable.

Manual next step: kvn reviews and merges this branch; no push by codex.
Existing I-12 EAS initialization/build steps remain separate.

Commit message (as committed):
Guard Alerts identity and EAS binding during upstream sync

- Apply I-12a's exact app.json coupling and identifier guard
- Retain the existing Suvana name guard and record passing checks
