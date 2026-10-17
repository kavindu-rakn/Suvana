# Recognize at /recognize (D-A33; D-04)
started 2026-10-18 by codex

Branch: agent/codex/recognize-path, stacked on
agent/codex/suvana-account @ e3492deab91ebf200db2706af253e798cba2be56.
Status: review (owner render adoption and hosted checks remain separate).
Authorization: kvn explicitly authorizes this stack while the account task is
unmerged, plus apps/shell/vercel.json and tools/sync/upstreams.json.
Plan correction: explicit chat overrides the usual UI leaf-branch rule for
this dependency. Review/merge the account branch first; review this task's diff
against e3492de. Board/tasks/decisions remain owner-managed.
R26 repository is off-limits; r26_port: no.

## Handoff 2026-10-18 03:53 - codex

Final fetch: origin/main remains 83a5200; account e3492de is still unmerged.
Review this task against e3492de, not origin/main, to exclude the account task.

## Changes

- apps/shell/vercel.json adds exact /recognize, exact /recognize/ and nested
  /recognize/:path* HTTP rewrites to kvn's Railway origin, ahead of all other
  wildcard rewrites. Exact slash avoids the known bare-slash matching gap.
- The rewrites add the non-secret suvana_mount=recognize rendering hint. The
  service entry sets a static /recognize/ base in its HTML before browser
  preloading; the normal root still serves its ordinary FileResponse with base
  /. /index.html shares that entry handling, so the prefixed index alias works.
  Other API/static endpoints ignore the extra query parameter.
- services/recognition/webapp/server.py changes only entry rendering and
  additive public-origin metadata in /api/info. webapp/suvana_platform.py reads
  optional RECOGNIZE_PUBLIC_ORIGIN and rejects non-origin values. Unset/empty
  returns {}, preserving the complete prior /api/info response shape.
- webapp/static/suvana-platform.js centralizes prefixed HTTP URLs, reads that
  existing info request and builds the direct ws/wss URL. It never hard-codes
  Railway. app.js uses it for info, labels, speech audio and socket connection;
  assistant.js and soundguard.js use it for their HTTP endpoints. No frame,
  inference, model, label or speech protocol is changed.
- index.html uses relative local assets plus the server-selected base. Its
  original standalone home link stays intact; when mounted, the adapter changes
  Back to Suvana to / and shows the account slot. Account-row layout applies
  only in mounted mode, preserving the root layout.
- Mounted pages read /communicate/api/auth/session and show Signed in as
  <name> using textContent, or Log in linking to
  /login?callbackUrl=%2Frecognize%2F. Missing/unavailable session data keeps
  recognition usable. Root pages make no account request and show no controls.
- apps/shell/src/main.ts defaults the card to /recognize/. recognizeLink.ts
  first probes the same-origin info API. VITE_RECOGNIZE_URL/data-service-url
  is used only if that fails; the known localhost ports remain last local
  fallbacks. The badge says On Suvana or identifies a fallback location; it
  does not assert a successful recognition. Existing Shell HTML/CSS untouched.
- DEPLOY-SUVANA.md corrects the old own-origin-only deployment explanation.
  tools/sync/upstreams.json declares every changed Recognition file with its
  Suvana-only reason, new helper/tests as suvanaOnly, and guards for rendering,
  paths, direct sockets, optional accounts and compatibility tests. No upstream
  revision was recorded and no sync/port/apply operation was run.

The initial browser integration found speculative asset 404s with a JavaScript
base setter at bare /recognize. That approach was replaced with server-rendered
base HTML. Final bare/slash runs have no failed local resource requests.

## WebSocket and default-root proof

Vercel carries only the page/static/API HTTP requests. The configured socket
origin is delivered by /api/info, converted https -> wss by the adapter and
connected directly at /ws/recognize. There is no WebSocket rewrite/tunnel.
The existing FastAPI WebSocket.accept() already accepts cross-origin browser
connections. A real local-container handshake with Origin https://suvana.help
sent __reset__ and received exactly {"type":"reset_ack"}. No CORS or
origin-filter changes were necessary.

Default-root regression evidence:

- Python test confirms no extra config fields when the setting is unset/empty.
- Browser-helper test confirms /api/*, ws://localhost:8000/ws/recognize, the
  existing home link, no session request and no visible account controls.
- Actual before/after Docker root servers returned deeply identical complete
  /api/info and /api/labels JSON, including 171 classes. No publicOrigin field
  appeared on the new unset server.
- Both root browser sizes loaded all local resources without failures or page
  errors. A synthetic camera produced a live frame_result using the root
  server's own ws://127.0.0.1:8014/ws/recognize, as before.
- Prefix runs used ws://127.0.0.1:8015/ws/recognize directly from the page at
  localhost:5186. The local HTTP gateway explicitly rejects WebSocket upgrades.

## Gates

- Required recognition command: python -m pytest
  tests/test_keypoint_augmentation.py tests/test_sinhala_labels.py -q:
  35 passed. New env tests: 7 passed. Three Node browser-helper tests passed.
  System Python lacked pytest; tests ran in ignored
  .agent-local/recognize-path-venv (Python 3.11, NumPy 2.4.6, pytest 9.1.1,
  requests 2.34.2). No runtime dependency files changed.
- docker build -t suvana-recognize-path:after services/recognition passed.
  Final image: sha256:5328f519d8f99456cfa3850927248d09242289a0849a2de1f4a8692b21dbcf05.
  Both final local containers were healthy with 171 classes. These use the
  existing pinned Python 3.10/TensorFlow/NumPy runtime, not the host test venv.
- Shell npm 10.9.9 ci, npm test: 57 passed in five files; npm run build,
  including typecheck: passed. Main 644.87 kB / 180.55 kB gzip. Existing
  >500 kB bundle warning, deprecated Lenis package and one high audit finding
  remain. No package or lockfile changes.
- Local integration: root, bare /recognize and /recognize/, each at 1280x800
  and 390x844: 200, settings show 171, correct home/account behavior, zero page
  errors, no failed local API/static requests and no horizontal overflow on
  Recognize. Two actual local camera/socket flows returned frame_result.
- Synthetic signed-in and unavailable-session fixtures both retained an
  enabled camera control. Shell card resolved to /recognize/ through the real
  local info endpoint. Account data is mocked; no actual sign-in was performed.
- Brand check: 134 tracked source files passed. Sync guard: 228 passed.
  git diff --check passed. Model, labels.npy and sinhala_labels.json diff against
  e3492de is empty. No source under the R26 repository was accessed or edited.
- Read-only Railway check: GET /api/info returned 200, numClasses 171,
  backend tf_function, model best_model.h5; publicOrigin was absent. This is
  current service metadata, not validation of the un-deployed new path.

Local helpers/evidence, all ignored: .agent-local/recognize-integration.mjs,
recognize-gateway.mjs, recognize-capture.mjs, recognize-ws-origin.py and
.agent-local/screens/recognize-path/integration.json. The camera fixture was
Chromium color bars in local containers. It demonstrates HTTP/WebSocket
transport, not real signing, learner accuracy or participant results.

## Renders

Review: C:/Users/User/Documents/Suvana-wt/codex/.agent-local/screens/recognize-path/index.html

Twelve ignored screenshots: actual parent-root Recognize before and mounted
Recognize after at 1280x800 and 390x844; Shell card before/after at both sizes;
new unset-root page at both sizes; signed-in and unavailable-session phone
fixtures. Desktop/phone before/after Recognize and Shell samples were visually
inspected. Changed navigation and camera controls are visible and unclipped.
Shell's overflow signal was present in both before and after phone captures;
its CSS/layout is outside this task and was not changed.

## Railway setting and rollout order (kvn)

Set this non-secret variable on the Suvana Railway recognition service:

```text
RECOGNIZE_PUBLIC_ORIGIN=https://suvana-production.up.railway.app
```

Review/adopt and merge the account branch first, then this branch. Deploy the
Recognition backend with this code/setting before exposing the new Shell
rewrites. Confirm direct /api/info includes that publicOrigin, then deploy the
Shell. Old backend HTML cannot handle the prefix render hint. Setting the env
var and deploying are owner actions; neither was performed by this agent.

After merge/deployment, kvn checks:

1. https://suvana.help/recognize and /recognize/ both load. The card normally
   points to /recognize/ even when VITE_RECOGNIZE_URL is set. Check
   /recognize/index.html too, actual JS/CSS/images and the guide/assistant.
2. https://suvana.help/recognize/api/info and
   https://suvana-production.up.railway.app/api/info show numClasses 171 and
   publicOrigin https://suvana-production.up.railway.app.
3. On a phone, allow camera and perform one real live recognition. Confirm
   the socket is wss://suvana-production.up.railway.app/ws/recognize, while
   info, labels and speech HTTP requests stay under suvana.help/recognize/.
4. Signed out, Log in goes to /login with callback /recognize/. Signing in
   returns to Recognize and shows the account name. Check signed-in entry,
   optional signed-out recognition and an account-service outage fallback.
5. Back to Suvana reaches /. Check the existing Learn/Communicate routes and
   account URLs still work. The new direct Railway root remains usable too.

No real signer/phone recognition, hosted rewritten assets or production account
cookie integration is claimed by these local checks.

## Unowned hot-file proposal and plan correction

apps/shell/index.html was not authorized as a hot file for this task. Its old
comment still says the whole module cannot be proxied; its no-JS markup still
starts with the previous deployment placeholder. Runtime navigation is fixed
in main.ts as requested. Optional owner follow-up replaces only that comment
and the initial card block with:

```html
<!-- Recognize HTTP stays at /recognize/; its browser socket connects directly
     to the origin published by the service. data-service-url is fallback only. -->
<div class="module-foot" data-recognize-foot data-service-url="">
  <a class="btn ghost" href="/recognize/">Open Recognize</a>
  <span class="badge live" data-recognize-badge>On Suvana</span>
</div>
```

This proposal is not applied or required for the JS application's path routing.
Plan correction: D-A33 supersedes the old own-origin-only topology; HTTP can
be prefixed while the socket goes directly to Railway. Owner-managed plan
files remain untouched. No SSL content or research figures changed.

Needs kvn: adopt/reject the renders, merge the stack in order, set the Railway
variable and deploy, then run the production checks. No push, merge, deploy,
purchase, external messages or R26 operations by this agent.

Commit message (as committed):
Serve Recognize on Suvana with a direct configured WebSocket

- Prefix recognition HTTP assets and APIs while preserving root defaults
- Publish the optional socket origin and show the shared account status
- Prefer the Shell Recognize path and retain explicit origin fallbacks
- Declare couplings and record tests, Docker evidence and rollout checks
