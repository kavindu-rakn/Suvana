# Assistant round 2: useful fallbacks and kvn's Sinhala overlay
Started 2026-10-18 by codex, Asia/Colombo.
Branch: agent/codex/assistant-useful-2 from origin/main 874196f (integration/2026-10-18d merged; assistant-useful 04d133c is an ancestor).
Status: ready for kvn's branch and rendered UI review; no adoption or deployment claimed.

Scope: shared assistant routing/help/fallbacks and D-A36's 13 exact-label Sinhala corrections across display, speech and generated knowledge. tools/sync/upstreams.json authorized. No homepage index.html, model, inference, original label files or R26 edits. No push, merge, deploy or messages.
r26_port: no.

Final base: `117539a416a40b94cafb9074b630ac17731bdb1f`. This fresh-checkout fix arrived during the task; the task branch was rebased onto it. Generator and generated-data conflicts were resolved by retaining its reference-index rebuild and LF handling, then regenerating the round-two data. No other branch was rebased or merged.

Changes
- Category and approved-unit requests resolve before teach/lookup targets. Exact unit titles take priority over broad categories: `teach me numbers` browses numbers, `teach me greetings` browses Greetings, and `teach me First numbers` keeps that unit's approved sign order.
- Missing meanings are omitted from replies. HELLO remains a real Learn gloss without an invented translation or the old missing-meaning warning.
- Unknown requests get a short, honest response, the assistant's available help, up to three real spelling suggestions under the existing >=.82/minimum-four-character rule, and actions for Starter, months, letters and numbers. Suggestions are not translations or inferred gloss mappings.
- New Learn practice, Recognize usage, phone usage and Starter help use only existing app controls and facts. Each route lists its supporting files/functions in `assistant-policy.json.sources`; those files are also hashed in generated provenance. Starter actions use the existing first gloss, BAG EKA, through the supported exact sign link; no invented unit URL.
- `what is the sinhala for ...` and `sign for ...` reverse-search only complete, case-insensitive verified English values from Learn's translations.ts, never substrings or English-looking names. `mother`, `water` and `amma` gain no invented meanings. Named-gloss requests can still open existing recordings such as THANK YOU. MOTHER may appear only as a real spelling suggestion when a reverse lookup has no verified meaning.
- All 65 original question strings remain, with expectations updated for the requested omission/fallback and D-A36. The original misspelled Sinhala query now gets the helpful fallback; the approved `අඬනවා` finds ANDANAWA. A separate `assistant-held-out.json` holds all 18 supplied questions and expected intents. Both engines compare complete payloads for all 83.
- Optional-model prompt and exact-approved-answer enforcement are unchanged; a regression compares the prompt with origin/main. Form descriptions, SSL translation and word order still refuse before browsing or lookup.

D-A36 display and speech
- `webapp/data/sinhala-corrections.json` records kvn, D-A36 and 18 Oct as provenance, plus exactly the 13 supplied label keys. Every override has only `sinhala` and `speakText`; nurse speaks `හෙදිය` while displaying `හෙදිය/නර්ස්`.
- The pure `suvana_labels.py` loader overlays copies in memory. The server uses that effective map for gestureSinhala, /api/labels and /api/speak; the offline TTS builder and background warm-up use the same loader/cache helper. The generator applies the same source values to both assistants and Shell's signs.json. Shell's speaker now reads speakText rather than the display spelling.
- Cache identity contains the exact label, language and spoken text under a full SHA-256 digest. Old label-only and old-spelling caches are never selected for corrected text. Old audio is not deleted. The changed cache namespace means existing warm-up/offline cache-building code fills new entries after deployment; no external TTS generation was run here.
- Docker packages the new source JSON. The overlay, loader, cache couplings and tests are declared Suvana-only with guards. The correction file was explicitly staged despite an existing broad data ignore; .gitignore was not edited.
- Neither original label file was edited. Origin/main Git blobs remain `4b093e00b96b679a736c5850e35b7343d1e8795d` (Sinhala JSON) and `6614558499640fc3c2e85eb9c68146ffe8178e4d` (labels.npy). The JSON's raw working-file SHA-256 before and after is `961d5bba393c6ab179a5d357cbf5caa41089c7118227ab2ff3e35614cc2e0362`.
- Byte checks preserve the pre-existing Windows CRLF JSON representation and verify its canonical Git bytes equal origin/main; labels.npy compares raw bytes directly. This avoids rewriting a protected file merely to change EOLs. Generated provenance uses canonical LF and retains 117539a's portable --check behavior.

Gates and local evidence
- Shell `npm test`: **138 passed**. `npm run build`: typecheck/build pass; main stays 644.87 kB / 180.55 kB gzip with its existing >500 kB advisory. Assistant bundle: 293.23 kB / 34.76 kB gzip.
- Recognize pytest: **137 passed** across `test_keypoint_augmentation.py`, `test_sinhala_labels.py`, `test_assistant_safety.py`, `test_suvana_platform.py`, and new `test_suvana_labels.py`. Tests cover all 13 exact corrections, unchanged other fields/labels/order, original label immutability, generated data, recognition display, request/warm/offline cache agreement and rejection of old audio. Host runner uses ignored Python 3.11 dependencies (FastAPI .103.2, Pydantic 2.14.1, NumPy 1.26.4).
- Existing `node tests/suvana-platform.test.mjs`: **3 passed**, including root operation without account requests/UI. No account code added.
- Knowledge `--check`: pass. Sync guard: **249 passed**. Brand check: pass. Git diff whitespace check: clean. Tracked diffs for Shell index.html, Learn source, inference/model code and original labels: empty.
- Actual local pinned Recognize service: **83/83 question replies**, **171/171 label display rows**, and **13/13 corrected cache routes** pass. /api/info remains 171 labels, 30 frames and .7 threshold. Evidence: `.agent-local/assistant-useful-2/local-retest.json`.
- Audio-route checks use clearly marked synthetic local bytes to verify cache identity/selection, not pronunciation or learner evidence. TTS warm-up was disabled for local renders; no real TTS/provider calls, real camera session or model-accuracy claim. The existing runtime image mounted the changed source/data read-only; no new image build or hosted acceptance is claimed.

Renders
- `.agent-local/screens/assistant-useful-2/index.html`: **64 reviewed PNGs**, before/after, desktop **1280x800**, phone **390x844**, on both homepage and `/recognize/`.
- Six reported dead ends: `teach me numbers`, `how do I practise`, `how do I use recognize`, `can I use this on my phone`, `which signs are easiest`, `what is the sinhala for water`. Two additional card states: ANDANAWA and WAADI WENAWA, with kvn's corrected Sinhala visible.
- Filenames: `{before|after}-{desktop|phone}-{shell|recognize}-{numbers|practice|recognize|phone|starter|water|andanawa|waadi}.png`; eight `review-*.jpg` overview sheets. Screens, snapshots, scripts and raw retests remain uncommitted.
- Actual widgets, no CSS mask or layout edits. Long lists remain scrollable. Existing Shell phone loader/hero pointer interception required keyboard launcher activation in both phases.

Plan correction / next step
- Directly assigned by kvn, with sync-manifest authorization; BOARD/tasks/DECISIONS and homepage copy untouched. Original model/inference/label files and R26 remain untouched. No new dependency.
- Needs kvn: review the branch/renders and decide adoption, then merge/deploy through the existing process and retest both hosted assistants. Flag the existing manual Railway Deploy Latest Commit step after merge. Nothing was pushed, merged, deployed or messaged.

Commit message
Remove assistant dead ends and apply kvn's Sinhala spellings
- Add source-backed help, unit/category priority and actionable fallbacks with engine parity
- Apply D-A36 through a Suvana-only overlay and spoken-text TTS cache identities
- Verify original labels, all 83 questions, local routes, renders and sync boundaries
