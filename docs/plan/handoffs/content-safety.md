# Content safety: assistant refusals and measured homepage copy
started 2026-10-18 by codex (Asia/Colombo)

Branch: agent/codex/content-safety from origin/main 76a31f246ea4fb39a37800f3aae79f07c5af5870, which contains integration/2026-10-18b.
Status: review; implementation and local retests complete, rendered adoption pending kvn.

Authorization: kvn assigned this task in chat, including apps/shell/index.html, tools/sync/upstreams.json and DEMO.md updates. Testimonials stay untouched: real quotes collected by Lahiru, kept by kvn's 18 Oct decision; never study results.

Scope: assistants and their tests, homepage's two accuracy claims only, declared Suvana-only recognition coupling, DEMO.md corrections, this handoff and append-only LOG entry. No model, label-file, R26, push, merge, deploy or messaging operations.

r26_port: no.

## Handoff 2026-10-18 10:20 +05:30 - codex

### What changed

- Shell `kb.ts` and Recognize `assistant.py`: removed all category-specific signing tips. Every answer card now has the same four camera-only tips: distance/framing, front lighting, full recording window, plain background. No written sign form, location, orientation, motion or category-behaviour instruction remains in those tips.
- Shell `signingSafety.ts` / `engine.ts` and Python `signing_refusal` / `local_answer`: explicit deterministic refusal before fuzzy label lookup, greetings or other intents. English request patterns cover signing, description/demonstration of sign form and translation into SSL/sign language; Sinhala request patterns are also covered. Refusals contain no sign cards or teaching suggestions.
- Both refuse with: "Suvana does not describe how signs are made and does not translate into SSL. Use Learn to watch the reference recording instead." Both widgets render a clickable **Watch a recording in Learn** link.
- Links use exact case-sensitive membership in a generated list of Learn's existing single-sign glosses. Known `X`, `Y`, `Z`, `HELLO` and `BAG EKA` produce I-14 links; lowercase `hello`, unknown words, sentences and aliases use `https://suvana.help/learn/`. No English/Sinhala translation, uppercasing, underscore replacement, fuzzy mapping or inferred gloss order creates a link. I-14 still enforces the deployed edition at the destination.
- `apps/shell/scripts/build-learn-glosses.mjs` derives the shared `services/recognition/webapp/static/learn-glosses.json` from the tracked Learn manifest/reference metadata, read in place. It contains 490 distinct single-sign glosses plus generator/source/metadata-SHA256 provenance. No frames or new SSL content are copied. `--check` reproduces it exactly, covered by a Shell test. Both assistants share this one list; no runtime network lookup or new dependency is required. One TypeScript flag enables the JSON import. Docker already copies static assets, so its recipe is unchanged.
- Shell's widget bypasses cloud calls for a refused local reply; its `handler.ts` also returns the deterministic refusal when configured with a key. `api/assistant.ts` uses this handler and the shared `model.ts` system prompt. The prompt now explicitly forbids written signing, category-form advice and translation into SSL, including Sinhala, and its unsafe example is replaced by a refusal. Recognize has the same prompt rule and skips model resolution/calls on refusal even with a personal key.
- Capability/greeting text no longer promises signing/translation guidance. Existing label metadata retrieval and general camera advice remain available.
- `apps/shell/index.html`: changed only the three lines making up the two requested accuracy claims. The replacement tile says **171 / Recognize labels**; the spec strip says **171 Supported Recognize Signs**. Unit check compares both to the actual 171-entry Recognition label dictionary.
- `tools/sync/upstreams.json`: declares the assistant changes as a Suvana-only coupling, with guards for local refusal invocation, no category-tip table, model bypass, camera-only cards and Learn link rendering. Shared gloss metadata and safety tests are Suvana-only entries. No sync SHA was altered.
- DEMO section 7 now records the actual local retest rather than reproducing unsafe tips; one line states why the old tips were removed. Its introduction, testimonial note, timed homepage wording and hosted-retest checklist are consistent. Testimonials are real quotes collected by Lahiru, kept by kvn's decision; they are not study results.

### Gates and evidence

Node v24.12.0; Shell clean install used cached npm 10.9.9, offline. No package/lockfile or model/label changes.

| Check | Exact result |
| --- | --- |
| Shell npm 10 `ci --offline` | PASS; 57 packages; 0 audit vulnerabilities (existing Lenis deprecation notice) |
| Shell `npm test` | PASS; 79 tests, 6 files; includes 20 new safety/source checks |
| Shell `npm run typecheck` | PASS |
| Shell `npm run build` | PASS; main 180.55 kB gzip, assistant chunk 14.23 kB gzip; existing >500 kB main-chunk advisory remains |
| Required Recognition pytest + new safety file | PASS; 63 tests: original 35 plus 28 safety cases |
| Existing Recognition `node --test tests/suvana-platform.test.mjs` | PASS; 3 tests |
| `node tools/sync/sync.mjs guard` | PASS; 233 checks |
| `node tools/ci/check-brands.mjs` after staging new sources | PASS; 137 tracked source files |
| `node apps/shell/scripts/build-learn-glosses.mjs --check` | PASS; 490 exact glosses reproduced |
| Requested four prompts in both local browser widgets | PASS; 8/8 refusals with actual Learn anchors and no sign cards |
| Extra exact-gloss UI checks (HELLO, BAG EKA) on both | PASS; 4/4, including `%20` URL encoding |
| Configured-model safety unit checks | PASS; Shell fetch and Python model-resolution/call functions are forbidden by spies for refused requests |
| Removed-phrase grep, tracked sources outside LOG/handoffs | PASS; no matches (Git grep exit 1, expected for absence) |
| Same phrase search in built Shell + Recognition runtime source | PASS; no matches |
| `git diff --check` | PASS |

Python tests used Python 3.11.9 with isolated dependencies in ignored `.agent-local/content-safety/pydeps`; no system or R26 environment was changed. Reproduce from the repo root in PowerShell:

```powershell
$env:PYTHONPATH="$PWD/.agent-local/content-safety/pydeps"
python -m pytest services/recognition/tests/test_keypoint_augmentation.py services/recognition/tests/test_sinhala_labels.py services/recognition/tests/test_assistant_safety.py -q
```

Content-removal proof command (exit 1 with no output is the expected result):

```powershell
git grep -n -i -E 'single static handshape|chest height|palm toward the camera|held rather than moved|usually fingerspelled|movement sign|pose and face|large numbers are compound|other hand out of the frame|neutral rest position|Sequence test accuracy|98% Sequence Accuracy' -- ':!docs/plan/LOG.md' ':!docs/plan/handoffs/**'
```

This checks the removed instructional/complete headline phrases, not every occurrence of a number. The isolated `98.8%` in `paper/README.md:36` remains an existing attributed research-planning discussion, outside the requested homepage changes; it is not used as Suvana UI or a result here. Ignored baseline screenshots/text intentionally retain before evidence.

### Actual local prompt retest

Shell: production build on 5193. Recognize: existing local runtime image `suvana-recognize-path:after` (`5328f519d8f9`), port 5197, with only assistant.py and static UI mounted read-only. A local HTTP proxy on 5198 serves `/` and `/recognize/` with the real prefix hint/API transport. No production route, setting or deployment changed. No model provider was contacted. Browser is signed-out Chromium; no credentials, keys, settings writes, camera capture or synthetic signing data.

Both widgets returned the refusal above and these exact links:

| Prompt | Homepage | Recognize | URL suffix |
| --- | --- | --- | --- |
| `how do I sign X` | PASS | PASS | `/learn/?sign=X` |
| `translate Y to SSL` | PASS | PASS | `/learn/?sign=Y` |
| `describe the handshape for Z` | PASS | PASS | `/learn/?sign=Z` |
| `how do I sign hello` | PASS | PASS | `/learn/` |
| `how do I sign HELLO` | PASS | PASS | `/learn/?sign=HELLO` |
| `how do I sign BAG EKA` | PASS | PASS | `/learn/?sign=BAG%20EKA` |

All URLs use `https://suvana.help`. Records: `.agent-local/content-safety/retest.json`; reproduction: `node .agent-local/content-safety/retest.mjs` while the local servers are running. These are finite local checks, not universal paraphrase coverage, an SSL correctness claim or hosted acceptance. No live cloud-model generation test was performed; known refusal requests are intercepted before that path.

### Renders and preservation

Contact sheet: `.agent-local/screens/content-safety/index.html`.

All 16 final before/after images were opened and inspected: `before|after-desktop|phone-stats|spec|shell-reply|recognize-reply.png`. Desktop 1280x800 and phone 390x844. Stats/spec states show the two replacements; reply states use the exact prompt `how do I sign hello` and show the actual local reply. No CSS, references or message contents were injected to stage the result. Existing homepage animations were allowed to settle; real keyboard activation was used for both captures because the phone hero/loader intercepted the launcher's pointer click in the baseline. Shell's existing mobile panel placement remains unchanged; the final refusal and recording link are visible.

Before: clean origin/main Shell production build and a copy of its unchanged assistant.py mounted over the existing Recognition image. After: the final production Shell build and current assistant/static source on the same local Recognition runtime. Raw baseline reply text is ignored local evidence only. Screenshots/generated test output stay uncommitted.

`node .agent-local/content-safety/preservation.mjs` verified that the testimonial markup through the start of the spec strip is identical to origin/main (normalized line endings); SHA256 `d51fab24b7bc13fddfc2eea4f66c5b36b39404a579d708a69d796113c173c989`. It also verified exact Git blob equality for the trained model and both protected label files:

- `labels.npy`: `6614558499640fc3c2e85eb9c68146ffe8178e4d`.
- `sinhala_labels.json`: `4b093e00b96b679a736c5850e35b7343d1e8795d`.
- `best_model.h5`: `bacc5f679d5929aa0b4a95d773c66a413cb6682c`.

No R26 working tree writes, model/label regeneration, upstream sync, preprocessing, WebSocket or inference change. Existing retrieval translations are untouched; added Sinhala strings identify request intent only, not SSL translations. Figures are the verified label count, reproducible metadata count and local gate results; no new accuracy or study claim.

### Review / owner action

kvn: adopt or reject from the renders, review/merge the branch, then deploy **both Shell and Recognition**. Repeat DEMO section 7's four prompts on both hosted assistants and check the two 171-label displays. Local success does not claim suvana.help has changed. The supplied GEMINI_API_KEY-unset status was not independently inspected; no secrets were read.

Plan correction: kvn directly assigned this content-safety follow-up and authorized index.html/upstreams.json plus DEMO edits in chat; the dated hot-file schedule is superseded for this scope. The requested integration prerequisite is already in origin/main. BOARD.md/tasks.json/DECISIONS.md and other handoffs are untouched. Origin re-fetched before commit and still at `76a31f246ea4fb39a37800f3aae79f07c5af5870`; no rebase needed.

No push, merge, deploy or messages performed. Local previews/test container are stopped after verification. `r26_port: no`.

Commit message (as committed; final SHA in git log):

```text
Refuse unverified signing advice and remove accuracy headlines

- Use camera-only tips and exact Learn recording links in both assistants
- Enforce refusal before model calls and guard the Suvana-only coupling
- Replace homepage claims with label counts and record retests and renders
```
