started 2026-10-18 (Asia/Colombo)

Task: read-only ROC AUC measurement for D-A35, directly assigned by kvn.
Branch: agent/codex/auc-remeasure, fresh origin/main d0e8165.
Scope: one opt-in console-only calibration test, this handoff, LOG append.
No product/scorer/report/corpus changes. Baseline must reproduce 74.6%
separation against 65.4% majority baseline and ROC AUC 0.744 to three decimals;
otherwise stop measurement without tuning. r26_port: yes (test only).
Status: review; historical reproduction gate passed and both measurements complete.

## Results — separation on one signer's recordings

Both rows use the same 557 takes / 33 signs, of which 32 signs have at least
two takes, and exactly **1,516 pairs: 524 same-sign and 992 different-sign**.
No pair was discarded as non-finite. The best cut is fitted on these same
pairs, exactly as in calibration.test.ts, not a held-out learner evaluation.

| Scorer revision | Separation | Majority baseline | ROC AUC | Pairs | Corpus SHA-256 before = after |
|---|---:|---:|---:|---:|---|
| Earlier: `39b69aba5a26fb90d68dd6a20148cd9ac5d556ef` (`8c98520^`) | 74.6042216358839% (**74.6%**) | 65.4353562005277% (**65.4%**) | 0.7438785089879341 (**0.744**) | 1,516 (524 / 992) | `bad16fe51e84c31852e4e78ca1230e3a18e8460b4813a2f3886bfb5de7f87265` |
| Current: `d0e81652f1926401076e071fba50c8308c25966f` snapshot | 75.65963060686016% (**75.7%**) | 65.4353562005277% (**65.4%**) | 0.7579394699581384 (**0.758**) | 1,516 (524 / 992) | `bad16fe51e84c31852e4e78ca1230e3a18e8460b4813a2f3886bfb5de7f87265` |

Earlier best cut: `0.36980067270391903`, 1,131 / 1,516 pairs separated.
Current best cut: `0.36905192585378854`, 1,147 / 1,516 pairs separated.
These are measurement cuts only; no anchor, match band or reward rule changed.

**Wording for the thesis:** On 1,516 same/different-sign pairs from one fluent
signer's recordings, the current scorer has 75.7% separation against a 65.4%
majority-class baseline, with ROC AUC 0.758. The draft's 74.6% separation
against the same 65.4% baseline and ROC AUC 0.744 came from the earlier scorer.
This is separation on one signer's recordings, **not learner accuracy**.
No improvement, significance, cross-signer generalization or expert-agreement
claim is made; no participants were measured. Shared takes and directed pairs
are not independent learner observations. D-A35 governs the wording; older
README/spec figures remain untouched by this task.

## Method and preservation

- New `apps/learn/src/scoring/auc.calibration.test.ts` is inert unless
  `AUC_CALIBRATE=1`. It does not access the corpus when disabled and contains
  no filesystem write API. It prints one `AUC_RESULT` JSON line per run.
- Reproduces calibration.test.ts without importing it (that test writes a
  report): same readdir order, same gloss grouping and >=2-take eligibility,
  same first take per sign, each later take against that sign's first take,
  and every ordered distinct-sign first-take pair, using
  `scoreAttempt(attempt, reference).normalizedDistance`. Same finite filtering
  and best-cut rule: same <= cut, different > cut, first maximizing cut.
- ROC AUC is Mann–Whitney: each different-sign distance greater than a
  same-sign distance contributes 1; exact equality contributes 0.5; divide by
  524 × 992. Embedded checks cover AUC 1, 0, all ties 0.5, partial ties 0.875,
  and empty-class rejection. No saturated match scores or threshold sweep
  approximation are used for AUC. No sampling, threshold or method tuning.
- The earlier scorer was run **first**, from a byte-for-byte ignored snapshot
  of score.ts and its original normalize/dtw/landmarks/hints dependencies from
  `8c98520^`, plus its type definitions. No relative import rewrite or product
  module substitution. Its assertions reproduce 74.6% and AUC 0.744 at the
  requested precision; only after that pass was the current scorer measured.
- Corpus read in place at
  `C:/Users/User/Documents/Suvana/apps/learn/calibration`. Filename-NUL-bytes
  hash follows L-30: sorted JSON filename, NUL byte, raw file bytes concatenated
  into SHA-256. This differs from L-33's hash convention. Hash checked before
  and after each run, also in finally on failure; no corpus copied/moved/written.
- Scorer source hashes are included in each JSON. Earlier score.ts SHA-256:
  `3b012610c85b3982222a85fc6784a490757100c512208b9f8adbe5380b5d31fe`.
  Current working-copy score.ts SHA-256:
  `a8a509ff6578e601a5adcb754d9bbfea810939b14f31dd28943b3666645eb222`.
  Snapshot is d0e8165; score.ts last changed in `87dcbbde5c890290203d5f00ce5a42982f10037c`
  (L-18), normalize.ts in `8c985202759cd18d135f687e66d052a3012217ac`
  (L-30). JSON hashes are raw on-disk bytes (including line endings), not Git
  blob IDs. Neither production file was edited.

## Reproduce (PowerShell)

From repo root, create the ignored original-source snapshot (no corpus copies):

```powershell
@'
const fs = require('node:fs');
const cp = require('node:child_process');
const path = require('node:path');
const rev = cp.execFileSync('git', ['rev-parse', '8c98520^'], { encoding: 'utf8' }).trim();
const root = '.agent-local/auc-remeasure/baseline';
for (const file of ['scoring/score.ts', 'scoring/normalize.ts', 'scoring/dtw.ts',
  'scoring/landmarks.ts', 'scoring/hints.ts', 'vision/types.ts']) {
  const dest = path.join(root, file);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, cp.execFileSync('git', ['show', `${rev}:apps/learn/src/${file}`]));
}
'@ | node
```

Then from apps/learn, run earlier first:

```powershell
$env:AUC_CALIBRATE='1'
$env:CALIBRATION_DIR='C:/Users/User/Documents/Suvana/apps/learn/calibration'
$env:AUC_SCORER_COMMIT='39b69aba5a26fb90d68dd6a20148cd9ac5d556ef'
$env:AUC_BASELINE_MODULE='C:/Users/User/Documents/Suvana-wt/codex/.agent-local/auc-remeasure/baseline/scoring/score.ts'
node node_modules/vitest/vitest.mjs run src/scoring/auc.calibration.test.ts --disableConsoleIntercept --reporter=verbose
```

**Stop if that fails; do not change the method to make it pass.** If it passes:

```powershell
Remove-Item Env:AUC_BASELINE_MODULE
$env:AUC_SCORER_COMMIT='d0e81652f1926401076e071fba50c8308c25966f'
node node_modules/vitest/vitest.mjs run src/scoring/auc.calibration.test.ts --disableConsoleIntercept --reporter=verbose
Remove-Item Env:AUC_CALIBRATE,Env:CALIBRATION_DIR,Env:AUC_SCORER_COMMIT
```

For a later revision, identify its actual scorer commit rather than reuse the
current snapshot label. Ignored snapshots are not ported or committed.

## Gates and unchanged files

- Node 24.12.0; required locked install with npm 10.9.9:
  `npx --yes --package npm@10.9.9 npm ci --no-audit --no-fund` passed;
  60 packages, no package/lockfile changes. Audit was not run.
- `npm run lint`: passed, no warnings.
- Routine test command (all measurement/export flags unset):
  `npm test -- --testNamePattern '^(?!.*(?:writes the calibration report|searches the weighting and writes the result)).*$'`
  **360 passed / 10 skipped**, 56 files passed / 3 skipped (59 files total).
  New AUC test skipped as required. Two pre-existing report-writing tests were
  deliberately skipped because this lane already has a local 557-file corpus:
  calibration.test.ts's report writer and weights.fit.test.ts's sole fit/writer.
  Remaining calibration assertions ran. This is not an unfiltered `npm test`;
  omission preserves the explicit no-report-writes boundary, not a weakened
  failed assertion. Existing opt-in report/export/benchmark flags stayed unset.
- Separate AUC measurement runs: earlier **1/1 passed**, current **1/1 passed**.
  First sandboxed baseline launch failed on Vitest's compiled-module temporary
  rename EPERM before any test ran; authorized unsandboxed rerun passed. Gates
  retained unchanged. Measurements print to console only; no result JSON file.
- `npm run build`: passed, main JS **155.21 kB gzip**, below 160 kB;
  existing build plugin-timing advisory only, no new runtime dependency.
- `node tools/sync/sync.mjs guard`: **233/233 passed**.
- Before/after raw-byte SHA-256 matches for all three tracked reports:
  calibration-report.md `0d9f2b23a61a1de629f93a56e0be8b55fa3ad7fe4b5620a1484d6cc764dfa055`;
  weight-fit-report.md `e2aaeebb4bef6dd0a91a94a21db08bbe82f2e1831af8e524c1443dcddc1c6b2e`;
  latency-report.md `3a8f60860a4fcec58e1d124c0a5f9a1097d0baf35008579d1a52a09cd6654845`.
  None was regenerated, restored or edited.
- Screenshots: n/a, no UI changes. SSL content touched: none. Research figures
  recorded only in this handoff/LOG and console; no product, thesis, README,
  evaluation report, scorer, normalization or other test change.
- Final verification includes whitespace, exact three-path scope, append-only
  LOG, unchanged reports and corpus, historical snapshot equality to Git, and
  fetched-origin check. Final commit SHA is in the branch log.

## Ownership and remaining action

Plan correction: directly assigned unscheduled measurement by kvn. Branch
starts fresh from d0e8165, including D-A35; no restart of Q-05 edits and no
Q-05/content-safety changes on this branch. D-A35's recorded date says 19 Oct;
this work uses the client-supplied 18 Oct date and does not edit the decision.
BOARD.md/tasks.json/DECISIONS.md and other handoffs untouched.

kvn: review/merge/push through the normal owner flow, then have the thesis lane
use AUC **0.758** with the stated 75.7% / 65.4% pair and one-signer limitation.
No thesis/report edit or messages were performed by this task. r26_port: yes,
the one new test only, inert without explicit opt-in; no R26 files touched.
No UI adoption, participant, deployment or generalization evidence claimed.
No push, merge, deploy, purchase or external messages.

Commit message (as committed):
Measure Learn ROC AUC with read-only historical reproduction

- Add opt-in console-only same-pair AUC and corpus preservation checks
- Reproduce earlier scorer and record both one-signer separation rows
- Keep product, corpus and reports unchanged through scoped gates
