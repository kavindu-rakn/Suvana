# Assistant verified index only (D-A37)
Started 2026-10-18 by codex, Asia/Colombo.
Branch: agent/codex/assistant-no-key from origin/main 7a769ce, after integration/2026-10-18e merged.
Status: review; rendered adoption and hosted retest remain with kvn.
Scope: remove assistant key controls and client model calls, clear legacy credentials, update privacy, fix three routing slips with parity. Sync manifest and privacy.html authorized by kvn. No index.html, endpoints, hosting configuration, inference/model or original label changes.
r26_port: no.

## What changed

- Homepage: removed the assistant gear, complete provider-settings view and styles, API-key link and Gemini badge. Replies call only localAnswer in the browser; the widget no longer imports the provider client, probes /api/assistant or sends chat requests there. Its bundle regression proves the provider/client modules and provider/API URLs are absent from the widget bundle.
- On widget load, remove exactly the retired homepage entries suvana.assistant.geminiKey, suvana.assistant.geminiModel and suvana.assistant.geminiResolved. Other local data is preserved; unavailable storage is tolerated.
- Recognize: removed the assistant gear, provider/key/model/Browse pane, related styles and verification/model-list calls. It deletes the old savana.assistant.v1 entry without reading or sending it. Chat sends only message and recent history. Clear conversation, pronunciation, recording links and the static Verified index status remain.
- Recognize's separate page-level settings gear opens its existing overlay controls and model information (sequence length, threshold and gesture count). It is independent of the assistant and was left unchanged; browser regression opens and checks it.
- Privacy page and shared privacy reply now explain browser-local homepage answers, Recognize questions/recent history going to its server, the same built-in verified index, and no AI-provider question traffic. Changed page date to 18 October. Shared generated provenance now hashes the page and both widgets; knowledge payloads regenerated without changing the sign records or counts.
- Both engines: case-insensitive exact Learn gloss names in sign for X / what is the sign for X resolve before meaning reverse lookup. MOTHER and EAT open their own recordings; an explicit Sinhala-meaning query for eat still finds KANAWA only through translations.ts. Bare help/help me return help. The exact phrase how do i learn sign language returns the Learn practice guide; named SIGN LANGUAGE and HELP queries still open those signs.
- Safety routes remain first. All sign-form, SSL translation and word-order refusals, the grounding rule and D-A36 spellings remain. Server endpoint implementations, provider policy prompt, Vercel/Railway configuration, index.html, inference/model and original label files are unchanged. Existing dormant provider modules remain outside the homepage bundle, as requested; no keys were read or configured.
- Suvana-only Recognize UI, router/policy and test couplings are declared in tools/sync/upstreams.json. Four additional guards protect key cleanup, missing settings UI, verified status and the routing/privacy rules. No R26 port.

## Validation

- Shell: npm ci, npm test **153 passed**, typecheck and build pass. The initial sandbox test run hit Windows temporary-file rename EPERM; host run passed. Clean install initially hit the running Vite esbuild lock; stopping our preview and retrying succeeded. No lockfile or dependency changes. Existing install audit reports one high-severity dependency issue; no audit fix was taken in this scoped task.
- Production build: widget **283.95 kB / 31.52 kB gzip** (previous task 293.23 / 34.76). Main remains **644.87 kB / 180.55 kB gzip**, with the existing >500 kB advisory.
- Recognize: **151 pytest passed** across test_keypoint_augmentation.py, test_sinhala_labels.py, test_assistant_safety.py, test_suvana_platform.py and test_suvana_labels.py. Existing platform JS checks: **3 passed**. Tests preserve original label bytes/Git representation and all 13 D-A36 corrections, other labels and text-aware TTS cache identity.
- Question set: original 65 plus **32 held-out = 97**. The original 18 held-out questions remain, with mother's expectation corrected; 14 further cases cover routing, case/space encoding, verified meaning fallback, no-match, named HELP/SIGN LANGUAGE and privacy. TypeScript and Python compare complete deterministic payloads across all 97.
- Actual local Recognize HTTP retest: **97/97** pass expected intent, content, links and forbidden-phrase checks. Full payloads match the pure local engine except the intentionally random sign choice. Raw evidence: .agent-local/assistant-no-key/local-retest.json.
- Browser regression: node tools/screens/assistant-no-key.mjs, **44 replies** across both widgets at 1280x800 and 390x844, passed against dev assets and again against the production Shell build. Checks synthetic retired credential removal, unrelated storage preservation, boot with storage disabled, removed gear/pane/fields, zero homepage /api/assistant requests, no provider/verify/models requests, Recognize's message/history-only payload, static Verified index status, clear conversation, Escape and independent page settings.
- Knowledge --check pass; sync guard **253 passed**; brand check pass; git diff --check clean. Protected-path diff is empty, including apps/shell/index.html, server endpoints, page-level Recognize controls, hosting config, original labels, inference and model files. No new dependency.
- Runtime evidence uses the existing local pinned Recognize Docker image with current webapp mounted read-only and lifespan disabled to avoid TTS warm-up/network calls. No new Docker image build, real camera/inference session, provider/TTS generation, hosted acceptance or deployment is claimed.

## Renders

- **12 reviewed PNGs**, before/after at desktop **1280x800** and phone **390x844**: homepage assistant open with header visible; Recognize assistant open with header visible; changed privacy section.
- Contact sheet: .agent-local/screens/assistant-no-key/index.html. Filenames: {before|after}-{desktop|phone}-{shell|recognize|privacy}.png. review.jpg is the overview; full-size images remain available.
- Before captured from clean task base 7a769ce before edits. Actual widgets and pages, no layout masks or synthetic replies. Shell launcher activated by keyboard in both phases because of its pre-existing phone loader/hero pointer interception. The privacy section is readable and fully visible in both sizes. All screenshots and raw local scripts/evidence remain uncommitted.

## Handoff / decisions

- Plan correction: task directly assigned by kvn, with privacy.html and sync-manifest authorization; no board/task/decision records edited. SSL content/meanings/figures added: none. No other hot-file proposals.
- kvn's next action: review these renders and the branch for adoption. After his merge/deploy, retest both hosted assistants and privacy; the existing Recognize Railway Deploy Latest Commit step remains manual. No push, merge, deploy or messages were performed.

Commit message:
Remove assistant key settings and fix verified-index routing

- Keep both widgets on the verified index and clear retired credentials
- Correct exact-gloss, help and Learn-guide routing with shared privacy text
- Verify engine parity, keyless browser behavior and desktop/phone renders
