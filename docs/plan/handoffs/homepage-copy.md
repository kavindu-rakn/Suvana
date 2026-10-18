# Homepage copy follow-up
started 2026-10-18T11:26:00+05:30 by codex

Branch: agent/codex/homepage-copy from origin/main 68d12f0bf4386d461ef711982b6652001dee6a46.
Status: review; edits, inventory, gates and renders complete. Adoption pending kvn.

Scope: remove only the duplicate Recognize-label tile and replace the exact quoted overview Learn-card paragraph with kvn's supplied option B wording. Other claims are inventory-only; testimonials untouched. Necessary existing-test expectation adjustment only, no new test suite.

Authorization: kvn explicitly assigned this task and authorized apps/shell/index.html in chat. Plan correction: that assignment supersedes the dated hot-file schedule for this narrow follow-up. BOARD.md/tasks.json/DECISIONS.md remain untouched.

r26_port: no.

## Handoff 2026-10-18 11:31 +05:30 - codex

### Changes and exact boundary

- `apps/shell/index.html`: removed the duplicate **171 / Recognize labels** tile. The remaining **Signs recognised**, **Integrated modules**, **3D landmarks / frame** and **Feedback latency target** markup/text is unchanged. Existing auto-fit CSS fills the row with four tiles; no CSS change was needed.
- Replaced the exact quoted paragraph in the overview's **01 Learn** card with the full supplied option B text: "Practise against recordings of real signers. Get a score, tips on timing and hand movement, and a side-by-side replay. Some signs also show finger labels." It fits at both requested sizes; no shortening.
- There are two Learn descriptions on this homepage. The supplied exact old sentence uniquely identifies the overview card; the second description in the larger Modules section is inventory-only below, as requested by item 3. No other copy, links or testimonials changed.
- `apps/shell/src/assistant/signingSafety.test.ts`: removed the obsolete assertion that required the deleted duplicate tile and narrowed the existing test title. The test still checks the spec-strip count against the real Recognition label dictionary. No new tests, dependency, lockfile, runtime logic, assistant behavior, CSS, model or label edits.
- This handoff and one append-only LOG entry.

### Claim inventory — unchanged, for kvn

Searched all of `apps/shell/index.html`, `apps/shell/src` and `apps/shell/alerts`, including assistant source/tests and Alerts HTML. Positions below are one-based lines in this branch after the two HTML edits.

| File and line | Existing wording | Finding / action |
| --- | --- | --- |
| `apps/shell/index.html:257-259` | "Practice Sri Lankan Sign Language with your camera. Every attempt is scored against real-signer references, with corrective feedback down to individual fingers." | Second, larger Learn module card. Its unqualified per-finger claim remains unchanged pending kvn. Included in the extra module-card renders. |
| `apps/shell/index.html:335-337` | "Per-joint and per-frame deviation is what the comparison actually produces, so feedback can say which finger drifted and where in the movement it happened." | Pipeline/feature item **Corrections, not just a score**. Per-finger feedback claim lacks the limited-coverage wording; left unchanged pending kvn. This task does not independently validate that claim. |
| `apps/shell/index.html:438` | "The sign language AI web app is an innovative and user-friendly tool that accurately detects hand gestures and translates them into corresponding signs. It ensures reliable performance, making it an excellent resource for communication and education." | Nadeesha Perera's testimonial: qualitative accuracy/reliability wording in a person's quote, not an accuracy measurement. Untouched under kvn's explicit testimonial decision. All three quotes and their attribution remain unchanged. |

No additional positive per-finger or accuracy claim was found in `src` or `alerts`. Relevant lexical hits there are not product claims:

- `src/assistant/engine.ts:53-54`: patterns recognize questions containing accuracy/confidence words; they do not assert an accuracy result.
- `src/assistant/kb.ts:38`, `src/assistant/engine.ts:37,81`: fingerspelling category/lookup metadata, not per-finger feedback.
- `src/assistant/signingSafety.ts:10-12,22` and `signingSafety.test.ts:50`: refusal-detection/negative test patterns mentioning signing or fingers; these prohibit instructions rather than promise feedback.
- Percent values in `src/main.ts` and HTML/CSS are scroll/animation/layout parameters, not accuracy percentages. Code comments about correctly matching strings are not recognition-performance claims.
- `apps/shell/alerts`: no matches for accuracy/accurate, finger/joint, precision, reliability or recognition-rate claims.

The newly qualified **Some signs also show finger labels** is the owner-supplied correction, not an additional claim to change. No numerical accuracy claim was added. The L-33 coverage of 22 signs comes from kvn's task/current records; no calibration or learner study was rerun here.

### Verification

| Check | Result |
| --- | --- |
| Shell `npm test` | PASS; 79 tests in 6 files |
| Shell `npm run build` (includes TypeScript check) | PASS; main JS 180.55 kB gzip, assistant chunk 14.23 kB gzip; existing >500 kB main-chunk advisory unchanged |
| `node tools/ci/check-brands.mjs` | PASS; 137 tracked source files |
| `node tools/sync/sync.mjs guard` | PASS; 233 checks |
| `git diff --check` | PASS |
| Actual browser content assertions | PASS at 1280x800 and 390x844: five tiles before/four after, live sourced first tile 171, exact full option B paragraph visible after |
| Exact HTML scope/preservation check | PASS; applying only the two authorized textual transformations to base produces the entire current HTML byte-for-byte after line-ending normalization |

Used the existing unchanged dependencies (Node v24.12.0); no install or dependency changes in this task. No runtime code changed, so the required Shell tests/build and focused real renders were sufficient; no unrelated module suites were rerun.

Local reproduction: `node .agent-local/homepage-copy/check.mjs`. Evidence `.agent-local/homepage-copy/preservation.json` proves the other stat markup and all other HTML copy unchanged. Testimonial-region SHA256 remains `d51fab24b7bc13fddfc2eea4f66c5b36b39404a579d708a69d796113c173c989`.

### Render review

Contact sheet: `.agent-local/screens/homepage-copy/index.html`.

Twelve screenshots, all opened and inspected, using the actual built homepage on localhost:5193:

- `before|after-desktop|phone-cards.png`: the three overview cards on desktop, with the full changed Learn card visible on phone.
- `before|after-desktop|phone-stats.png`: the stats row before and after duplicate removal.
- `before|after-desktop|phone-module-learn.png`: additional evidence of the second, unchanged Learn description for the inventory/review boundary.

Desktop 1280x800; phone 390x844. Before comes from a fresh production build of clean origin/main before the first HTML edit. After uses the final production build. Normal page scrolling/fonts/animations; no CSS overrides, fixture scores, fake signs or injected message content. The full new paragraph, card link and four stats remain readable. Phone is Chromium emulation, not a physical-phone test. Screenshots and local scripts are excluded from commits.

### Owner / plan boundary

kvn: review the rendered change for adoption, then normal branch review/merge/push/deploy. The two other first-party finger claims and testimonial quote above are reported only, with no proposed adoption or silent copy edits. A further copy task requires kvn's instruction. No manual code repair is required to review this branch.

Origin re-fetched before commit and still `68d12f0bf4386d461ef711982b6652001dee6a46`, this branch's exact base; no rebase needed. Plan correction is the directly assigned hot-file exception recorded above. Planner records, other handoffs, R26 and upstream code are untouched. No push, merge, deploy or messages performed. `r26_port: no`.

Commit message (as committed; final SHA in git log):

```text
Trim duplicate homepage stat and qualify Learn finger feedback

- Remove the duplicate Recognize labels tile and use full option B copy
- Adjust the obsolete tile assertion and inventory remaining claims
- Record passing Shell gates and desktop and phone comparisons
```
