@AGENTS.md

# Claude Code notes

`AGENTS.md` (imported above) is the single source of truth for Claude Code,
Codex and Antigravity: the rules, the owners, the plan, the gates and the
conventions. Do not duplicate any of it here; edit `AGENTS.md` instead. The
current plan is in `docs/plan/` (start with `docs/plan/README.md`).

Claude-only notes:

- **Memory.** Your auto-memory for this repo is shared across worktrees. Check
  it against `docs/plan/` before acting on it; the plan wins when they differ.
- **Worktrees.** One long-lived worktree per lane (`Suvana-wt/claude`, or
  `Suvana-wt/claude-thesis` for the thesis lane), a fresh branch per task 
  (`docs/plan/08-agent-protocol.md` section 3).
  `.claude/` is gitignored except `.claude/rules/` and `.claude/launch.json`,
  so shared launch configs travel between worktrees; local settings do not.
- **Git Bash.** Prefix commands that pass `/communicate` with
  `MSYS_NO_PATHCONV=1`.
- **Questions to kvn.** Before asking him anything, explain the status of the
  thing you are asking about, with pros and cons, in plain English.
