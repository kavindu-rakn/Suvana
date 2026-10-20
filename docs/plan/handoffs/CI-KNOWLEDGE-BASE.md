# Fix the stale knowledge base that failed CI on main

Started and finished 2026-10-20. Claude on `agent/claude/fix-knowledge-base`, base `origin/main` `cfc721b`.

## Cause

CI on `main` (run 39347124945, after the PR 17 merge) failed in **Shell — tests and build**. One test failed: `src/assistant/useful.test.ts` > *keeps all generated data current*. It runs `apps/shell/scripts/build-knowledge-base.mjs --check`, which fails when the generated files record an outdated fingerprint (SHA-256) of a source file. PR 17 changed `apps/learn/src/components/PracticeView.tsx` without regenerating them.

## Change

- Re-ran `node apps/shell/scripts/build-knowledge-base.mjs`. It rewrote:
  - `services/recognition/webapp/static/suvana-knowledge.json`
  - `apps/shell/public/data/signs.json`
- Against `main`, the only difference in each file is the `PracticeView.tsx` fingerprint under `sources`. Signs, units and facts are unchanged (530 records; Learn 490; Recognize 171; 22 finger labels). No labels, references or curriculum were edited.

## Gates

- Shell: `npm test`: 10 files, 161 tests passed. `npm run build` passed (the existing chunk-size warning only).
- Sync guards: 270 checks passed.
- No UI change, so no screenshots.

## Railway

- The live Railway deployment of `services/recognition` is commit `964d870` (18 Oct, 11:08 UTC). There have been no deployments since then, although later `main` commits changed this folder.
- Against that deployment, the live knowledge base differs in more than fingerprints. Two unit titles are old: "Everyday words and directions 1/2" are now "Everyday terms 1/2" (commit `1f855b0`). They show in the Recognize-side assistant's unit lists for 20 signs, and that assistant matches unit names by title.
- This CI fix does not need a redeploy. A redeploy would only bring in those two titles. It is kvn's call, under the D-A38 backend freeze.

## Left

- kvn: review, merge and push. Decide on the optional Railway redeploy.
