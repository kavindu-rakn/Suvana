# PR #10: Shell CI safety baseline
started 2026-10-19 by codex

Branch: codex/pr-10-shell-ci, based on PR #10 head
165f9467fed96db346e4a8c89372754779a338ac.
Authorization: direct user assignment to fix the failed Shell check.
Boundary: Shell regression test and fixture, this handoff, LOG append.
Status: review (local checks passed; hosted rerun pending kvn's push).

Plan correction: this is an explicitly requested CI blocker fix outside the
scheduled board tasks. It continues the PR's code on a separate local branch
rather than starting from origin/main, so the actual failing tree is verified.
Planner files and shared hot files are untouched.

## Cause and change

- Failed job: https://github.com/kavindu-rakn/Suvana/actions/runs/39223350679/job/117963610228
- npm test: 156 passed, one failed. useful.test.ts invokes git show origin/main,
  but that ref is absent from the shallow Actions checkout. Build was not run.
- Replace the moving Git comparison with a checked-in fixture containing the
  exact model prompt and ordered 65 original questions from main commit
  7a74cc4fce5a85e74b719beace425e4e838617a0. Both fields were verified identical
  on PR head before writing the fixture. The fixture records that source SHA.
- Keep exact equality, question counts, held-out cases and model-grounding
  assertions. No runtime, prompt, signing content, figures or UI changes.

## Verification

- Node 24.12.0, npm 10.9.9: locked npm ci passed; lockfile unchanged.
- npm test: 9 files, 157 passed, no skipped tests.
- npm run build: TypeScript check and Vite build passed. Existing >500 kB
  chunk warning remains; no runtime assets changed by this patch.
- Shallow local clone at PR head: is-shallow-repository = true, only the
  task branch refs present, no origin/main. Original targeted test failed
  with the identical invalid object name error. Copied the test fix and fixture
  into that clone: full 157 tests, typecheck and build passed.
- node tools/sync/sync.mjs guard: 255 passed. git diff --check passed.
- Environment retries: sandbox npm ci stalled; reran with npm 10 outside the
  sandbox. Vitest sandbox temp-file rename EPERM prevented test discovery;
  unchanged checks passed with normal filesystem access. Local clone Git
  transport also needed normal access. No checks were weakened.
- Install audit reports one high vulnerability; dependency changes are outside
  this test-only fix. No npm audit fix was run.

Screenshots: n/a (test-only change).
r26_port: no. No push, merge, deployment or external messages.

## Owner action

Apply this branch's fix commit to codex/pipeline-card-stairs and push that PR
branch, then confirm the Shell check on the resulting head. The fix is isolated
on codex/pr-10-shell-ci; it has not updated the remote PR.

Commit message:
Fix Shell safety test in shallow CI checkouts

- Pin the existing model prompt and original questions in a provenance fixture
- Preserve exact safety assertions without depending on origin/main
- Verify Shell gates and reproduce the failure in a shallow clone
