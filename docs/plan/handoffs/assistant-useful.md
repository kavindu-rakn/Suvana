# Useful, source-backed Suvana assistant
started 2026-10-19 by codex (task direction date; Asia/Colombo)
Branch: agent/codex/assistant-useful from origin/main 68d12f0bf4386d461ef711982b6652001dee6a46.
Status: ready for kvn's branch and rendered UI review; no adoption or deployment claimed.

Scope: shared generated knowledge, intent-first local engines on Shell/Recognize, safe optional model grounding, tests and renders. tools/sync/upstreams.json explicitly authorized. R26/model/labels untouched. No push, merge, deploy or messages.

Source limitation: Recognition's Sinhala-label JSON has no English fields. Missing meanings stay missing; assistant.py's old authored ENGLISH_GLOSS is not an authorized source. Merge records only by exact name ignoring case, never by inferred translation or spelling variants.
r26_port: no.

What changed
- Both assistants use the same generated 530-record union: 490 Learn single-sign glosses and 171 Recognize labels, with 131 equal names ignoring case. Equal names indicate index membership only, not interchangeable recordings or recognition correctness.
- The generator imports Learn's existing reference selector, curriculum, translations and reward constants. It hashes its sources, keeps per-record provenance, preserves exact spellings and curriculum order, and derives 22 default references with finger labels. No meanings are inferred from English-looking names. Missing English in Lahiru's JSON stays missing.
- `node apps/shell/scripts/build-knowledge-base.mjs [--check]` writes/checks the shared data and the existing 171-label Shell compatibility asset. The old Python generator delegates to it; the old assistant-authored English map is removed. The homepage stat still reads 171; its markup and module copy are unchanged.
- Intent routing handles recording/practice guidance, meanings and exact existence, conservative suggestions (SequenceMatcher >= .82; minimum four characters), random real Learn recordings, paged category browsing, approved unit browsing, camera/recognition/score troubleshooting, module/account/Alerts/privacy help, stages, rewards, mastery and Path rules. Explicit requests for a sign named WATCH resolve the sign before the app's Watch-stage explainer.
- `how do I sign hello` links `/learn/?sign=HELLO`, explains 0.5x / Zoom to hands / My turn and replay, and accurately says that exact name is absent from Recognize. `what does andanawa mean` uses Learn's verified `cry`, keeps Lahiru's actual Sinhala spelling, and shows both modules' membership. No translation or alternate spelling is invented to bridge datasets.
- Requests for sign form, SSL translation or SSL word order receive a short refusal and a useful Learn action. Teaching requests receive app controls and existing recordings. Cards no longer repeat camera advice; troubleshooting supplies it once. Medical/legal and other unsupported requests do not retrieve unrelated signs.
- The local engine remains the default. Optional model routes get only source facts, selected records and the approved answer, ignore unverified client context/history, and accept only that exact wording. Any other model text falls back locally. This deliberately trades model paraphrasing for a strict grounding boundary; it cannot expand the assistant's knowledge. Refusals and random choices bypass models. No real key/provider was used.
- Recognize's Python router delegates to the isolated, stdlib-only `suvana_assistant.py`; rendering uses accurate membership and exact Learn actions. These files, generated assets, policy and tests are declared Suvana-only with guards in the authorized sync manifest. No new production dependency.

Verification
- Shell `npm test`: **116 passed**, including **65 fixed questions**, full-payload parity with the independent Python engine, source reproduction, curriculum order, random samples, no sign-form phrases/tips, and configured-model rejection of invented output/injected context. Existing rate-limit/key-redaction tests remain.
- Shell `npm run build`: typecheck and build pass. Main stays 644.87 kB / 180.55 kB gzip with the existing >500 kB advisory. The lazy assistant bundle is 276.00 kB / 32.91 kB gzip, including its offline shared index.
- Recognition `python -m pytest tests/test_keypoint_augmentation.py tests/test_sinhala_labels.py tests/test_assistant_safety.py tests/test_suvana_platform.py -q`: **111 passed**. Host test runner: Python 3.11, FastAPI .103.2, Pydantic 2.14.1, NumPy 1.26.4 in ignored local dependencies. Actual service verification below uses the existing pinned runtime container.
- Existing `node tests/suvana-platform.test.mjs`: **3 passed**, including root operation with no account request/UI. No account code added.
- Generated knowledge `--check` and the legacy generator's `--check`: pass. Sync guard: **240 passed**. Brand check: pass. Git diff whitespace check: clean.
- **65/65 actual local Recognize HTTP replies** pass the same expected intents, contents, membership and phrase checks. Except for randomized choices, the entire local payload equals the Python engine output. `/api/info` confirms **171 labels / 30 frames / 0.7 threshold**. Evidence: `.agent-local/assistant-useful/local-retest.json`.
- Tracked diffs for Learn, Communicate, inference code, trained models, `labels.npy` and `sinhala_labels.json`: empty. No R26 checkout was modified. No capture or recognition-accuracy claim.

Rendered evidence (uncommitted)
- Contact sheet: `.agent-local/screens/assistant-useful/index.html`.
- **48 PNGs**: before/after, desktop **1280x800**, phone **390x844**, homepage and `/recognize/`, six replies on each: `how do I sign hello`; `what does andanawa mean`; `why is my sign not recognised`; `show me the months`; `how do I download Alerts`; `translate my name is Daham to SSL`.
- Naming: `{before|after}-{desktop|phone}-{shell|recognize}-{hello|meaning|trouble|months|alerts|translate}.png`. Eight `review-*.jpg` overview sheets support inspection; full-resolution PNGs remain the review evidence.
- Real local widgets and HTTP routes; no mocked camera, invented signing material, credentials or production changes. Long replies/card lists use their existing scrollable panels. The existing Shell phone loader/hero intercepts pointer clicks, so launcher activation used keyboard focus/Enter in both phases; no CSS mask or layout change.

Plan correction / limits
- Directly assigned by kvn, including authorization for `tools/sync/upstreams.json`; planner records untouched. The latest direction supersedes the earlier blanket refusal for ordinary teaching requests. The sign-form/translation prohibition remains.
- English fields requested from Lahiru's JSON do not exist in this revision. Those values remain unknown rather than importing the old unverified assistant map.
- Finite local regression and render checks do not prove all natural-language intents or live deployment. The deterministic source-backed router cannot answer outside its corpus; typo matches are suggestions only. Source changes require regeneration and review of the product guidance.
- Needs kvn: review the renders and branch, decide UI adoption, then merge/deploy through the existing process and repeat representative prompts on both hosted surfaces. The existing LOG records kvn's manual Railway deploy choice; flag that click after merge. This task performs none of those actions.

Commit message
Make both Suvana assistants useful within verified knowledge
- Generate a provenance-backed Learn and Recognize union without inferred meanings or mappings
- Share intent rules, useful recording guidance and strict optional-model grounding
- Verify both engines, local HTTP replies, renders and Suvana-only sync boundaries
