started 2026-10-18 (Asia/Colombo)

Direct assignment by kvn: T-03 CHECKs 1–3 and L-28 findings 1–2.
Branch: agent/codex/eval-refresh from origin/main 724feedd8bcaa952b9e5d7da7161d5aa3c617151.
Scope: measurement/export tests, generated reports, one Learn README sentence,
this handoff and append-only LOG. No scorer, anchors, cut-offs or product edits.
Historical reproduction is a stop gate before measuring the current scorer.
Corpus read in place; filename-NUL-bytes SHA-256 checked before and after.
Raw exports stay ignored under .agent-local/eval-refresh; never commit per-take data.
r26_port: yes (tests and reports; README sentence).
Status: review; historical reproduction and current D-A35 gates passed.

Plan correction: directly assigned unscheduled evaluation refresh on 18 Oct;
planner-owned records remain untouched. No thesis files edited.


## Result and limits

Same 557 recordings / 33 signs on disk; 32 signs have >=2 takes. Exactly 524
same-sign and 992 directed different-sign pairs, no non-finite calibration
pairs. First take per gloss is the reference; remaining same-sign takes and
ordered distinct-sign first takes follow the existing export/calibration
method unchanged. Export sorts filenames; calibration uses readdir order;
both produce identical measured values on this Windows corpus.

Earlier snapshot: 39b69aba5a26fb90d68dd6a20148cd9ac5d556ef (8c98520^).
Current snapshot: 724feedd8bcaa952b9e5d7da7161d5aa3c617151 (fresh origin/main).
Current score.ts last changed in 87dcbbde5c890290203d5f00ce5a42982f10037c;
normalize.ts in 8c985202759cd18d135f687e66d052a3012217ac (L-30).
Scorer source files and corpus were never edited, moved or copied. Only
historical source code was snapshotted, byte-for-byte with its original imports.

Historical stop gate: Tables 6.1, 6.5, 6.6 and all six per-sign values explicitly
quoted in final-source/06-results.md reproduce at their displayed precision;
74.6% / 65.4% and AUC 0.744 also reproduce. Full 32-sign lists are below.
Current stop gate: 75.7% / 65.4% on the same D-A35 pairs passes; AUC 0.758.
THANK_YOU in the thesis is corpus THANK YOU (29% earlier); this is a display
spelling difference, not a measurement mismatch. No sampling or method tuning.

These are separation and match-score distributions on **one fluent signer's
recordings**, never learner accuracy, learning gain or expert agreement.
The same takes are reused across pairs, and best cuts are fitted on the same
pairs measured. No held-out, independence or improvement claim is made.
No scoring parameter, anchor, cut-off, band, capture behavior or product changed.
No thesis source or uploaded draft was edited.

## Preservation evidence

External corpus read in place:
C:/Users/User/Documents/Suvana/apps/learn/calibration

SHA-256 before = after every measurement, after report generation and at final
verification: bad16fe51e84c31852e4e78ca1230e3a18e8460b4813a2f3886bfb5de7f87265.
Convention: sorted JSON filename + NUL + raw file bytes, concatenated into
SHA-256 (L-30/auc-remeasure convention). Full bundled-reference JSON directory
hash before = after both runs:
264ad100f72e7ed9e8c335274e5910559610f7ce1c503072cfe1a08814bad56e.
All 60 sampled reference IDs are identical between exports.

Earlier/current raw-byte score.ts hashes respectively:
3b012610c85b3982222a85fc6784a490757100c512208b9f8adbe5380b5d31fe
a8a509ff6578e601a5adcb754d9bbfea810939b14f31dd28943b3666645eb222.
All five scorer dependency hashes are retained in each local provenance.json;
the six-file baseline snapshot was checked byte-for-byte against git show.
Current source hashes match their before snapshots.

## Earlier versus current measurements

All earlier values below were reproduced in this run before current measurement.
Percentiles use sorted index round(p/100 × (n−1)), as the existing tests do.
Displayed values are rounded from retained full-precision JSON; no method was tuned.

### Table 6.1 — DTW distance by pair type

| Pair / statistic | Earlier scorer | Current scorer |
| --- | ---: | ---: |
| Same sign n | 524 | 524 |
| Same sign mean | 0.483 | 0.462 |
| Same sign p10 | 0.222 | 0.221 |
| Same sign median | 0.459 | 0.424 |
| Same sign p90 | 0.767 | 0.739 |
| Different sign n | 992 | 992 |
| Different sign mean | 0.669 | 0.654 |
| Different sign p10 | 0.405 | 0.396 |
| Different sign median | 0.662 | 0.637 |
| Different sign p90 | 0.954 | 0.943 |

### D-A35 full evaluation and Table 6.5 — match scores

| Statistic | Earlier scorer | Current scorer |
| --- | ---: | ---: |
| Best analysis cut | 0.36980067270391903 | 0.36905192585378854 |
| Separation | 74.6% | 75.7% |
| Majority-class baseline | 65.4% | 65.4% |
| Correctly separated pairs | 1131 / 1516 | 1147 / 1516 |
| ROC AUC | 0.7438785089879341 | 0.7579394699581384 |
| Correct rendition mean score | 56.7 | 57.9 |
| Correct rendition median score | 60 | 62 |
| Correct rendition share scoring ≥50 | 60.5% | 62.4% |
| Different sign mean score | 28.0 | 28.4 |
| Different sign median score | 24 | 24 |
| Different sign share scoring ≥50 | 20.7% | 21.1% |
| Mean-score gap (descriptive) | 28.7 | 29.5 |

### Table 6.6 and Figure 6.6 — distinct bundled references

The first three rows reproduce the thesis table. Remaining rows are the union of
both exports’ closest 15 pairs, ordered by current distance. The same 60 reference
IDs were used, but finite pairs are **1,766 earlier / 1,770 current**: the existing
finite-distance filter excludes four earlier results that are finite now. No pairs
were removed to force the earlier count. A current caption must say 1,770.

| Pair | Earlier distance | Current distance |
| --- | ---: | ---: |
| `30` / `40` | 0.135 | 0.135 |
| `BALANAWA` / `C` | 0.140 | 0.140 |
| `200000` / `300000` | 0.157 | 0.157 |
| `1000` / `DAKINAWA` | 0.162 | 0.162 |
| `2000` / `3000` | 0.207 | 0.167 |
| `1000` / `2000` | 0.176 | 0.181 |
| `3000` / `4000` | 0.232 | 0.187 |
| `D` / `DECEMBER` | 0.187 | 0.187 |
| `8000` / `9000` | 0.190 | 0.190 |
| `B` / `C` | 0.190 | 0.190 |
| `200000` / `30` | 0.192 | 0.192 |
| `30` / `50 METERS` | 0.193 | 0.193 |
| `C` / `D` | 0.193 | 0.193 |
| `200000` / `40` | 0.465 | 0.196 |
| `300000` / `40` | 0.440 | 0.197 |
| `100000` / `200000` | 0.198 | 0.198 |
| `ASNIIPAI` / `C` | 0.200 | 0.200 |
| `C` / `DECEMBER` | 0.201 | 0.201 |
| `100 METERS` / `30` | 0.201 | 0.201 |

Four newly finite pairs (earlier excluded as non-finite):

| Pair | Earlier | Current distance |
| --- | ---: | ---: |
| `7000` / `DAKUNATA` | non-finite | 0.7759631564444897 |
| `9000` / `DAKUNATA` | non-finite | 0.7953717138865815 |
| `BAG EKA` / `DAKUNATA` | non-finite | 0.9078730103018579 |
| `30` / `BAG EKA` | non-finite | 1.0222775138299152 |

### Figure 6.7 — complete per-sign list

Each column uses its scorer’s own single global best analysis cut (above).
The thesis quotes six extremes; all six reproduce at integer-percent precision.
`THANK_YOU` in the thesis is the display spelling of corpus `THANK YOU`; raw glosses
are preserved. No per-sign threshold or baseline has been fitted.

| Corpus gloss | Takes | Same / different pairs | Earlier separation | Current separation |
| --- | ---: | ---: | ---: | ---: |
| `AFTER` | 7 | 6 / 31 | 83.78% | 83.78% |
| `AGAIN` | 16 | 15 / 31 | 67.39% | 67.39% |
| `ALLOW` | 8 | 7 / 31 | 81.58% | 81.58% |
| `ALSO` | 8 | 7 / 31 | 78.95% | 78.95% |
| `AROUND` | 4 | 3 / 31 | 94.12% | 94.12% |
| `ARTICLE` | 4 | 3 / 31 | 91.18% | 91.18% |
| `BEAUTIFUL` | 21 | 20 / 31 | 60.78% | 60.78% |
| `BED` | 4 | 3 / 31 | 91.18% | 91.18% |
| `BLACK` | 6 | 5 / 31 | 80.56% | 75.00% |
| `CHANGE` | 12 | 11 / 31 | 76.19% | 76.19% |
| `CHILD` | 10 | 9 / 31 | 72.50% | 72.50% |
| `CHOOSE` | 8 | 7 / 31 | 97.37% | 97.37% |
| `COLD` | 12 | 11 / 31 | 83.33% | 78.57% |
| `DAY` | 18 | 17 / 31 | 64.58% | 64.58% |
| `DEAF` | 11 | 10 / 31 | 87.80% | 92.68% |
| `DOCTOR` | 16 | 15 / 31 | 69.57% | 69.57% |
| `ELDER BRO` | 15 | 14 / 31 | 68.89% | 68.89% |
| `EQUAL` | 8 | 7 / 31 | 81.58% | 76.32% |
| `GREEN` | 24 | 23 / 31 | 74.07% | 88.89% |
| `HELLO` | 71 | 70 / 31 | 64.36% | 75.25% |
| `HERE` | 7 | 6 / 31 | 83.78% | 83.78% |
| `HOUR` | 21 | 20 / 31 | 60.78% | 60.78% |
| `HOUSE` | 60 | 59 / 31 | 83.33% | 81.11% |
| `IN` | 8 | 7 / 31 | 81.58% | 81.58% |
| `JANUARY` | 22 | 21 / 31 | 69.23% | 67.31% |
| `MONDAY` | 19 | 18 / 31 | 93.88% | 93.88% |
| `MOTORCYCLE` | 7 | 6 / 31 | 83.78% | 83.78% |
| `OR` | 4 | 3 / 31 | 91.18% | 91.18% |
| `PLANE` | 9 | 8 / 31 | 82.05% | 82.05% |
| `PURPLE` | 27 | 26 / 31 | 82.46% | 82.46% |
| `THANK YOU` | 82 | 81 / 31 | 28.57% | 32.14% |
| `VEHICLE` | 7 | 6 / 31 | 86.49% | 86.49% |

### Weight sweep — earlier and current (24-sign fitting subset)

Same first 24 signs with ≥4 takes; 355 same-sign / 552 different-sign = 907 pairs.
Subset majority baseline is **60.9%**; full D-A35 baseline remains **65.4%**.
This table is descriptive and does not authorize a weighting change.

| Shape / trajectory weight | Earlier separation | Current separation | Earlier analysis cut | Current analysis cut |
| --- | ---: | ---: | ---: | ---: |
| 0.0 / 1.0 | 66.2% | 66.6% | 0.24985015754993323 | 0.27681720297918927 |
| 0.1 / 0.9 | 67.7% | 67.9% | 0.23019896571478776 | 0.2715297534104475 |
| 0.2 / 0.8 | 69.3% | 68.9% | 0.25654119590172253 | 0.2617258673120154 |
| 0.3 / 0.7 | 70.3% | 70.1% | 0.2862108563170067 | 0.286194082952693 |
| 0.4 / 0.6 | 71.1% | 71.4% | 0.33893182783981535 | 0.3283069505461865 |
| 0.5 / 0.5 | 71.7% | 72.1% | 0.34265714771216227 | 0.34265714771216227 |
| 0.6 / 0.4 | 72.3% | 73.0% | 0.34364861992971446 | 0.36626409464060294 |
| 0.7 / 0.3 | 73.5% | 74.4% | 0.37241135818151117 | 0.3733002587029217 |
| 0.8 / 0.2 | 74.2% | 75.1% | 0.3794107209934351 | 0.3739144598238731 |
| 0.9 / 0.1 | 76.2% | 76.7% | 0.4297933911500943 | 0.4297933911500943 |
| 1.0 / 0.0 | 78.6% | 78.7% | 0.4385095986425411 | 0.42655476992699287 |

### Other exported distinct-pair percentiles

| Percentile | Earlier | Current |
| --- | ---: | ---: |
| p1 | 0.20685802182894297 | 0.19963056891086683 |
| p5 | 0.29924081053174106 | 0.27761419644374996 |
| p50 | 0.5820906884311408 | 0.5535928396677122 |

## Shipped-window benchmark — scoring stage only

The benchmark and export stand-in now use max(2 × duration, duration + 3000 ms),
sampled at 30 fps, recycling reference frames only for timing. Same 40-reference
spread, warm-up of 3 references, median of 3 runs per reference; the percentile
convention above is unchanged. No real learner take or camera was timed.

| Path / statistic | Historical report, shorter pre-L-07 take | This run, shipped window |
|---|---:|---:|
| Practice n | 40 | 40 |
| Practice median | 1.8 ms | 4.3 ms |
| Practice p90 | not reported | 16.1 ms |
| Practice p95 | 12.6 ms | 18.1 ms |
| Practice maximum | 21.5 ms | 53.3 ms |
| Scenario n (5-sign vocabulary) | 5 | 5 |
| Scenario median | 11.1 ms | 17.0 ms |
| Scenario p90 | not reported | 70.7 ms |
| Scenario p95 | 40.6 ms | 70.7 ms |
| Scenario maximum | 40.6 ms | 70.7 ms |
| References on disk | 362 | 520 |
| Two-handed references in 40-sign timing sample | 33 | 31 |
| Stand-in attempt frames, median / max | 114 / 218 | 186 / 506 |
| Reference frames, median / max | 32 / 145 | 32 / 212 |

Machine from this run's generated report: AMD Ryzen 5 5500U with Radeon Graphics,
12 logical CPUs, 15.4 GiB RAM, Windows win32 10.0.26300 x64, Node v24.12.0,
Vitest 4.1.10. Measured 18 Oct 2026, one local development machine. The historical
column is read from origin/main 724feedd's latency-report.md, not re-measured;
its machine details and p90 were not recorded. The capture window, reference
library and sample differ, so this is not a controlled before/after speed test.
No improvement or end-to-end latency claim. Inference and browser paint remain
unmeasured (Q-09). The 300 ms end-to-end objective is not established here.

The isolated BENCH_WRITE run was repeated once after removing a legacy,
unmeasured cold-run multiplier from the report wording. The final run above is
reported as produced, without selecting a faster result. The first current run
was practice 4.3 / 16.0 / 19.3 / 50.9 ms (median/p90/p95/max) and scenario
20.6 / 74.6 / 74.6 / 74.6 ms. No benchmark overlapped this lane's build or test
jobs. Export timing samples are incidental and are not substituted for the
isolated latency-report figures.

## Files and output artifacts

- calibration.test.ts / weights.fit.test.ts: generator wording now says separation,
  with majority baseline and one-signer limits; CALIBRATE=1 / WEIGHTS_FIT=1 are
  required, and CALIBRATION_DIR supports reading an external corpus in place.
  They perform no corpus access when disabled. No fitting method was changed.
- calibration.test.ts and evaluation.export.test.ts can load an explicitly selected
  historical score.ts with its original relative dependencies. Calibration output
  can be redirected with CALIBRATION_OUT_DIR so historical reports stay ignored.
- scoring.bench.test.ts and the export's timing stand-in match the shipped window.
  latency-report.md now includes p90, machine/revision details, and the shorter
  pre-L-07 1.8 ms figure explicitly as historical.
- Regenerated calibration-report.md and weight-fit-report.md for current scorer;
  removed the sweep's old adoption suggestion and gain wording. The weight report
  distinguishes the full 65.4% baseline from its measured 24-sign 60.9% baseline.
- Learn README: report-status sentence agrees with the regenerated reports;
  historical anchor-fit numbers and earlier-scorer labels stay intact. Narrow
  related edits clarify the table's link now leads to current measurements and
  replace the two stale benchmark-window notes. No other README section changed.
- evaluation.export.test.ts retains its existing JSON schema for plotting scripts;
  legacy keys named accuracy / accuracyAtGlobalCut denote **separation**, not
  learner accuracy. Added full finite distinct-reference pairs and selected IDs,
  revision/window metadata, and three full-precision companion CSVs. Default
  output moved from PP2-presentation/data to ignored .agent-local/eval-refresh/current.

Ignored local outputs in `.agent-local/eval-refresh/{earlier,current}/`:

| File | Use |
|---|---|
| raw-metrics.json | Existing full export, weights, per-sign measurements and finite distinct-reference pairs |
| calibration-pairs.csv | 1,516 distance/score rows for Figures 6.1 and 6.5 |
| distinct-reference-pairs.csv | 1,766 earlier / 1,770 current finite pairs for Figure 6.6 |
| per-sign.csv | Complete 32-sign list and denominators for Figure 6.7 |
| figure-data.json | Figure-number-labelled arrays, closest 15 pairs, same-sign median, global cut and provenance; also ROC pairs |
| provenance.json | Scorer dependency hashes, snapshot commit and before/after corpus/reference hashes |
| calibration-report.md | Historical/current reports retained alongside raw output |
| measurement.log, summary.json, verification.txt | Opt-in console results and thesis reproduction checks |

Earlier CSVs and figure-data.json are lossless projections of the retained export
via ignored derive.cjs; current CSVs come directly from the updated export test.
CSV row counts and full-precision values were checked against JSON. No corpus
coordinates or per-take export files are staged. Snapshots, scripts and all raw
artifacts stay ignored. No screenshots: measurement/report-only task, no UI change.

## Commands used (PowerShell)

From the worktree root:

```powershell
git fetch origin
git switch -c agent/codex/eval-refresh origin/main
```

Six-file historical source snapshot under `.agent-local/eval-refresh/baseline/`:
`git show 8c98520^:apps/learn/src/<file>` written as raw bytes using Node
execFileSync, for scoring/{score,normalize,dtw,landmarks,hints}.ts and vision/types.ts.
This is the auc-remeasure.md snapshot procedure with only the output directory
changed; byte equality to each Git blob was checked again at the end.

The retained read-only driver hashes the corpus/references before and in finally
after each invocation, sets the following flags, saves measurement.log/provenance,
and rejects a failed process. Earlier ran first and summarize.cjs checked the
exact thesis values (including all six quoted per-sign percentages) before the
current run was allowed. The driver and checks remain available locally:

```powershell
node .agent-local/eval-refresh/run.cjs earlier
node .agent-local/eval-refresh/summarize.cjs earlier
# STOP on any mismatch; otherwise:
node .agent-local/eval-refresh/run.cjs current
node .agent-local/eval-refresh/summarize.cjs current
node .agent-local/eval-refresh/derive.cjs
```

Expanded test command used by the driver, from apps/learn (absolute output paths
point inside this worktree's ignored .agent-local/eval-refresh/<mode>):

```powershell
$env:CALIBRATION_DIR='C:/Users/User/Documents/Suvana/apps/learn/calibration'
$env:EVAL_EXPORT='1'
$env:CALIBRATE='1'
$env:AUC_CALIBRATE='1'
$env:EVAL_OUT_DIR='<absolute ignored output directory>'
$env:CALIBRATION_OUT_DIR=$env:EVAL_OUT_DIR
$env:AUC_SCORER_COMMIT='<measured snapshot commit above>'
$env:MEASUREMENT_SCORER_COMMIT=$env:AUC_SCORER_COMMIT
# Earlier only: set all three to the absolute historical scoring/score.ts path.
$env:EVAL_BASELINE_MODULE='<absolute historical scoring/score.ts>'
$env:CALIBRATION_BASELINE_MODULE=$env:EVAL_BASELINE_MODULE
$env:AUC_BASELINE_MODULE=$env:EVAL_BASELINE_MODULE
node node_modules/vitest/vitest.mjs run src/scoring/evaluation.export.test.ts src/scoring/calibration.test.ts src/scoring/auc.calibration.test.ts --disableConsoleIntercept --reporter=verbose --maxWorkers=1
# Current: unset all three *_BASELINE_MODULE variables; update snapshot/output.
```

To regenerate tracked reports, a fresh PowerShell child had only these flags:

```powershell
$env:CALIBRATE='1'
$env:WEIGHTS_FIT='1'
$env:CALIBRATION_DIR='C:/Users/User/Documents/Suvana/apps/learn/calibration'
$env:MEASUREMENT_SCORER_COMMIT='724feedd8bcaa952b9e5d7da7161d5aa3c617151'
node node_modules/vitest/vitest.mjs run src/scoring/calibration.test.ts src/scoring/weights.fit.test.ts --disableConsoleIntercept --reporter=verbose --maxWorkers=1
```

Separate isolated timing run (fresh child; report/export flags unset):

```powershell
$env:BENCH_WRITE='1'
$env:MEASUREMENT_SCORER_COMMIT='724feedd8bcaa952b9e5d7da7161d5aa3c617151'
node node_modules/vitest/vitest.mjs run src/metrics/scoring.bench.test.ts --reporter=verbose --maxWorkers=1
```

## Gates, execution issues and remaining action

- Locked install: cached npm 10.9.9, Node 24.12.0; `node C:/Users/User/AppData/Local/npm-cache/_npx/7c24e36c048e2b23/node_modules/npm/bin/npm-cli.js ci --offline --no-audit --no-fund`: 60 packages; package and lockfile unchanged. Audit not run.
- `npm run lint`: pass, no warnings.
- Routine `npm test` with every opt-in flag unset: **357 passed / 13 skipped**, 55 files passed / 4 skipped (59 total). No test-name exclusion; calibration and weight writer tests skip by explicit opt-in. Benchmark assertions still run and BENCH_WRITE stays off.
- Historical opt-in export/calibration/AUC: **6 passed**; current: **6 passed**; report regeneration: **5 passed**; isolated benchmark: **1 passed**.
- `npm run build`: pass, main JS **155.21 kB gzip <=160 kB**. Existing plugin-timing advisory only; no new dependency.
- `node tools/sync/sync.mjs guard`: **255 passed**.
- Whitespace/scope checks, source-snapshot byte equality, raw source hashes, same reference IDs and before/after corpus/reference hashes pass.
- The initial sandboxed Vitest launch failed on temporary-module rename EPERM before tests ran. It was rerun with normal filesystem access and unchanged gates. npx's initial registry lookup failed/stalled; cached npm 10 completed the offline locked install. CIM inventory was unavailable in the sandbox; machine fields came directly from Node's os module in the generated report.
- A test-only identifier rename briefly shadowed its own helper in weights.fit; fixed by naming the helper measureSeparation. Failed run produced no weight report; subsequent complete report run passed. No numerical method or parameter changed.
- A local summarizer initially expected the thesis display spelling THANK_YOU, then used the actual exported THANK YOU; and initially assumed 1,766 current finite reference pairs. The unchanged exports exposed 1,770 current finite pairs, now documented rather than filtered away.

kvn action: review the branch, then use the current columns and ignored figure files
for the final thesis/T-05 redraw (especially the **1,770** current distinct-pair
caption), replacing earlier-scorer table/figure labels only for data actually
refreshed here. Keep the anchor-fit values historical, and keep Q-09 end-to-end
latency marked unmeasured. Merge/push and the later R26 port remain kvn's owner
flow; r26_port: yes (tests, generated reports and scoped README wording). No R26
working files edited. No push, merge, deployment, purchase or external messages.
