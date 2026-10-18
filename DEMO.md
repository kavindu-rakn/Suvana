# Suvana demo runbook — 18 Oct 2026

**Primary demo: [suvana.help](https://suvana.help/). Sign in only there.**
This is a **12-minute script**, excluding setup and questions. kvn operates the
laptop and Android phone. Rehearse on 20 and 21 Oct; this document is not a
claim that either rehearsal or the real-device matrix has passed.

## Live routes and hosting

Addresses/status below are kvn's 18 Oct update. Q-05's original live failures
remain in its handoff; section 7 records the subsequent local safety retest.

| Open | Served by / boundary |
|---|---|
| [Homepage](https://suvana.help/) | Suvana Shell on Vercel (`suvana-shell` project) |
| [Sign in](https://suvana.help/login), [create account](https://suvana.help/register) | Shell entry pages; Communicate's Auth.js and database behind them; one Suvana account (D-A32) |
| [Learn](https://suvana.help/learn/) | `suvana-learn` on Vercel, forwarded through the Shell; camera tracking and scoring in the browser |
| [Communicate](https://suvana.help/communicate) | Suvana's own `suvana-communicate` instance on Vercel (D-A26) |
| [Recognize](https://suvana.help/recognize/) | Page forwarded through the Shell; WebSocket connects directly to [Railway](https://suvana-production.up.railway.app), Singapore, using `wss://suvana-production.up.railway.app/ws/recognize` |
| [Alerts](https://suvana.help/alerts/) | Download page on the Shell; Android APK v1.0.0 runs on the phone, needs no account or server |
| Speech service | kvn's laptop only (D-A22, I-09); speech-to-text only; no emotion demonstration |

`suvana-shell.vercel.app` and Communicate's own sign-in pages redirect to
`suvana.help`. They are not alternate sign-in locations.

## 1. Say up front (first 45 seconds)

- “This is Suvana: four integrated modules. The web pages are on Vercel;
  Recognize runs on Railway in Singapore; Alerts runs on Android. Speech is
  laptop-only and speech-to-text only.”
- “Communicate is our own Suvana instance. If Lithira's verified animation data
  is missing, I will show the interface and avatar only.” Never seed or show
  placeholder signing as a translation.
- “Learn compares a named sign with a recorded reference. It is not a sign
  recognizer. The thesis comparison is **74.6% separation against a 65.4%
  majority-class baseline**.” This is the pair currently recorded in
  [DECISIONS.md, DN-10](docs/plan/DECISIONS.md); never separate the figures or
  call them learner accuracy. Do not quote a Recognize accuracy.
- “Finger labels currently cover **22 signs** with the default reference
  selection. They reflect separation on **one signer's recordings**, not
  learner accuracy.” They are reference-specific; unsupported references have
  no label. See [L-33](docs/plan/handoffs/L-33.md).
- “The Learn Hero preview cards are decorative (D-A4), not measured results.
  No study participants took part; we have no participant learning-gain,
  satisfaction or usability results.”
- “This is the free, non-commercial academic edition. The teaching reference
  is a landmark skeleton; we are not showing corpus video (D-A16, D-A23).”

**Content-safety correction, locally tested 18 Oct:** the two homepage accuracy
claims are replaced with the measured 171 Recognize label count. Assistant
requests for signing instructions or translation into SSL now refuse and offer
Learn recordings (section 7). Deployment is still kvn's action; recheck hosted
copy and replies before the demonstration. The assistant is not an SSL teacher.

**Testimonials:** real quotes collected by Lahiru, kept by kvn's decision;
do not present them as study results. The testimonial section is unchanged.

## 2. Before the panel: devices and checks

- Laptop: charger, projector, working webcam, Chrome camera permission, quiet
  background and enough light. Keep only one module using the camera at a time.
  Close a camera before switching modules. Use kvn's existing demo account;
  registration is a route to explain, not a step to perform in the timed demo.
- Android: install v1.0.0 from `/alerts/` beforehand, complete its permission
  setup, charge it, and rehearse one benign sound alert. Do not trigger SOS or
  send a real emergency message. Expo Go is not the APK fallback.
- Use a dedicated normal browser profile for the demo. At the canonical origin,
  prepare Learn's Demo progress as below; profile selection is per browser and
  origin, not shared through the Suvana account.
- Open Learn, load the chosen reference, start/stop its camera once, and check
  the replay. Prepare a genuine Recall unlock. Do not fabricate attempts.
- Open Recognize five minutes early. Check
  [service info](https://suvana-production.up.railway.app/api/info): expect
  `numClasses: 171`, `sequenceLength: 30`, `confidenceThreshold: 0.7`. A healthy
  endpoint is not proof that a real sign works; rehearse the confirmed signs.
- Communicate: check whether verified animation data actually exists. If absent,
  keep the avatar-only branch of the script. Speech needs the prepared laptop
  service and a tested local connection; a hosted page cannot reach laptop
  loopback through its deployed server. Follow
  [services/speech/README.md](services/speech/README.md), including its
  `STT_ENDPOINT_PATH=/translate?emotion=false` setting. If not ready, skip speech.
- Have the phone hotspot, prebuilt Learn preview and Recognition Docker image
  ready. Build/download while online, not in front of the panel. Note the last
  working deployment and commit for each Vercel project and Railway before
  rehearsal; do not guess rollback IDs.

### TODO(Lahiru): confirmed Recognize demo signs — intentionally empty

| Required confirmation | Value |
|---|---|
| First reliable sign, exact existing label and rendition confirmed by Lahiru | TODO(Lahiru) |
| Second reliable sign, exact existing label and rendition confirmed by Lahiru | TODO(Lahiru) |
| Confirmation date, runtime/model used, successful laptop/phone rehearsal | TODO(Lahiru) |

**No confirmed list means no guessed sign performance.** Show the connection,
frame collection and confidence rule, explain the missing confirmation, then
move on. This is a manual preparation item for kvn; no message was sent by Q-05.

## 3. Timed script — 12:00 total

| Clock | Duration | Module / action and words |
|---|---|---|
| 00:00–00:45 | 0:45 | **Homepage / Shell.** Open `https://suvana.help/`, introduce the four modules and the limits in section 1. Show the Recognize label count without an accuracy claim. Testimonials are real quotes collected by Lahiru, kept by kvn's decision; do not present them as study results. |
| 00:45–01:15 | 0:30 | **Account.** Open `/login`; kvn signs in privately with the prepared account. Show the shared account on the homepage and Learn, then Communicate/Recognize as visited. Mention `/register` for a new account. If already signed in, the form redirects away: explain this and continue. Do not expose the password on the projector. |
| 01:15–02:00 | 0:45 | **Learn / Path.** Open `/learn/`, enter Learn, show Path and the first available approved unit. Show actual stars/locks or Preview as displayed. Start **Practise this unit**, then open **Why this sign?** and read its actual reason. This is rule-based scheduling. If the unit is Preview/locked, show that honestly and use free practice; do not promise the reason chip there. |
| 02:00–03:00 | 1:00 | **Learn / first sign: Watch → Try.** Use the first Starter sign in the existing curriculum: **BAG EKA** (`apps/learn/src/data/curriculum.ts`). If the prepared session picked a review instead, return to Path and use that first sign's **Try** row. Watch its skeleton reference, slow/replay it if needed, choose **My turn**, start the camera, wait for tracked hands, **Record**, then **Stop & Score**. Follow the reference, without improvised verbal SSL instructions. |
| 03:00–04:00 | 1:00 | **Learn / feedback and replay.** Explain the measured match score and visible feedback. Open the comparison replay, pause and scrub it, and show the reference beside the attempt. Describe comparison evidence, not proof of correctness. |
| 04:00–05:00 | 1:00 | **Learn / Recall.** On the first sign if it has earned two stars, choose **Try from memory** / **3. Recall**. Show the verified meaning cue, or gloss fallback, and hidden reference. Record and score a take. If still locked, explain the two-star gate and use the honestly rehearsed, already-unlocked sign; do not fake progress to force the demonstration. |
| 05:00–06:00 | 1:00 | **Learn / L-33 and progress.** For finger labels, use **only HELLO, THANK YOU, HOUSE or GREEN** (the low false-Wrong choices in L-33). If the first sign is outside that set, choose one in free practice for this segment only. Show Correct / Almost / Wrong if the selected bundled reference supports them. State the 22-sign / one-signer limitation. Finish on Progress: actual stars, goal, streak and the separate demo profile. |
| 06:00–08:00 | 2:00 | **Communicate.** Open `/communicate`, show the shared Suvana account, UI and avatar. Say explicitly this is Suvana's own instance (D-A26). Without Lithira's verified data, show avatar only and say signing translation is unavailable. With verified data, show only the rehearsed supported item. Laptop speech-to-text is optional within these two minutes if already working; no emotion claim and no invented SSL translation. |
| 08:00–10:00 | 2:00 | **Recognize.** Open `/recognize/`, connect camera, show the frame collection/status and perform only TODO(Lahiru)'s confirmed signs once supplied. Say “It waits for a full **30-frame sign** and shows a result only at **70% confidence or more**.” Complete the movement; do not expect an instant static-pose result. Confidence is a display threshold, not measured accuracy. Stop camera when done. |
| 10:00–11:30 | 1:30 | **Alerts / Android.** Briefly show `/alerts/` and its APK v1.0.0 download, then switch to the installed Android app. Demonstrate the rehearsed benign sound and its visible/haptic alert. Explain on-phone processing and no account requirement. Do not send SOS. |
| 11:30–12:00 | 0:30 | **Buffer / close.** Use this for one network/camera retry or switching devices. State any skipped capability honestly, then take questions. |

Totals: homepage 0:45; account 0:30; Learn 4:45; Communicate 2:00;
Recognize 2:00; Alerts 1:30; buffer 0:30 = **12:00**.
If a module stalls for 30 seconds, use its fallback once or explain and move on.
The assistant is excluded from the teaching script because section 7 failed.

## 4. Learn demo profile and reset (L-23 / L-23a)

1. On the browser **and origin** to be used, open Learn → **Progress**.
   In **Show**, choose **Demo progress**. This is separate IndexedDB storage;
   it does not populate fake history and does not sync across devices/accounts.
2. To start a clean rehearsal, stop recording first. Check that **Demo progress**
   is selected, choose **Reset progress**, verify **Clear Demo progress?**, then
   **Clear progress**. **Keep progress** cancels. Reset cannot be undone.
3. Reset removes only that profile's attempts, derived scores/stars/goal/streak
   and current practice queue. Its saved recordings and latency samples remain;
   **My progress** remains intact. A storage error is a failed reset, not success.
4. Practise the first Starter sign honestly until it earns two stars (Try match at least
   70 under the existing reward rule) to unlock Recall. Rehearse Recall and the
   replay. If the first sign cannot be unlocked reliably, prepare another
   genuinely unlocked sign and name that switch during the demo.
5. **Do not reset again after preparing Recall.** A fresh reset relocks it.
   Returning through Path may select reviews; show the actual reason, not a
   memorized claim that the scheduler must pick a particular sign.
6. Repeat setup on the phone, standalone Learn host, or localhost if used:
   each has separate progress. Reload other Learn tabs after a profile switch,
   or use one tab. After the demonstration, switch **Show → My progress**.
   Do not clear all site data as a routine reset: it can remove unrelated data
   and the sign-in session. The first-run guide is not reset by clearing attempts.

## 5. Fallback runbook

### Network, module host or camera fails

| Failure | Action |
|---|---|
| Venue Wi-Fi unreliable | Switch laptop/phone to the rehearsed phone hotspot, reload the same canonical URLs, retry once. Hotspot does not repair an application/host failure. |
| Shell route fails; Learn host works | Open [Learn alone](https://suvana-learn.vercel.app/learn/). Prepare Demo progress on that origin. Use practice only; follow account links back to `suvana.help` and never enter credentials on the fallback host. |
| Shell Recognize route fails; Railway works | Open [Recognize alone](https://suvana-production.up.railway.app/). Check `/api/info`, then camera and the confirmed sign. This page/socket bypasses Shell; sign in only on `suvana.help`. |
| Camera busy/denied | Stop the previous module's camera, close its camera tab, check site permission and retry once. If phone fails, use laptop localhost or HTTPS. Ordinary phone-to-laptop LAN HTTP is not the camera fallback. |
| Communicate data/speech unavailable | Keep the Suvana UI/avatar-only demonstration. Never switch to another site's sign-in or to placeholder signing. |
| Alerts cannot be installed/run | Explain the Android-only APK and show `/alerts/`; explicitly say the live device demonstration was skipped. Do not claim an on-device pass. |
| Internet fully unavailable | Local Learn preview and installed Alerts; local Recognize if warmed and its browser assets load. Recognition speech synthesis needs internet; do not promise it offline. Skip hosted sign-in and hosted Communicate. |

### Laptop local stack (PowerShell, repo root, separate terminals)

These are the **integrated rehearsal defaults**: Shell 5173, Learn 5174,
Communicate 3000; Recognition Docker 7860 (Python alternative 8000); speech
7861. Install dependencies and prepare local-only configuration beforehand;
secrets stay in ignored files. Never run seeds as a demo repair.

```powershell
npm --prefix apps/shell run dev
```

```powershell
npm --prefix apps/learn run dev
```

```powershell
$env:NEXT_PUBLIC_BASE_PATH='/communicate'
npm --prefix apps/communicate run dev
```

Open `http://localhost:5173/`, with Learn at `/learn/` and Communicate at
`/communicate`. Shell's dev proxy targets **5174 / 3000** regardless of its
own port. The production `/login` HTML proxy and `/recognize/` rewrites are not
reproduced by Vite's dev server: local fallback uses the direct Recognition
URL and skips account entry. **Credentials are entered only on suvana.help.**
Communicate needs its already prepared database/env; if unavailable, skip it.

Agent lane ports remain Shell/Learn/Communicate = Codex **5183/5184/3010**,
Claude **5173/5174/3000**, Antigravity **5193/5194/3020** (08 section 3).
In this Codex worktree, launch isolated modules with `-- --port 5184` for Learn
and `-- --port 3010` for Communicate. Moving Shell to 5183 does not retarget its
proxies: open isolated modules directly, or use kvn's prepared integrated stack.
Do not occupy another active lane's ports for rehearsal.

### Offline Learn with `vite preview`

While online, in `apps/learn`, install/build once:

```powershell
npm ci
npm run build
npm run preview -- --host 127.0.0.1 --port 5184 --strictPort
```

Open `http://localhost:5184/learn/` on the laptop. `npm run preview` runs
`vite preview`; the existing `/learn/` base is retained. Stop any dev server
using 5184 first. `npm run dev` / build regenerate the reference index;
bare `npx vite` skips the dev hook. Before demo day, disconnect the network
and verify the actual reference, local model/WASM, camera, score and replay.
Keep the terminal running. This is a served local build, not `file://` or an
assumption that a cached hosted tab works offline. Hosted account requests
may fail; they are not needed for the local Learn practice demonstration.

### Recognize via Docker + cloudflared

From the repo root, following [06-deploy.md section 5](docs/plan/06-deploy.md):

```powershell
docker build -t suvana-recognition services/recognition
docker run --rm --name suvana-recognition-demo -p 7860:7860 suvana-recognition
```

In another terminal:

```powershell
cloudflared tunnel --url http://localhost:7860
```

Use **the HTTPS URL cloudflared actually prints** on the phone, then test
`/api/info`, camera and the WebSocket. No tunnel hostname is predetermined.
This direct fallback container leaves `RECOGNIZE_PUBLIC_ORIGIN` unset, so the
socket uses the tunnel's own origin instead of a failed Railway address.
On the laptop, use `http://localhost:7860/` directly. Keep both terminals open.
A tunnel needs internet; it cannot fix a total network outage.

If using an already prepared Python environment instead of Docker:

```powershell
python -m uvicorn --app-dir services/recognition webapp.server:app --host 127.0.0.1 --port 8000
```

Expect **Loaded 171 gesture labels**, **Loaded 171 Sinhala label translations**
and **Application startup complete**. If zero labels or the wrong branding
appears, stop and check which process/files are being served. **Never regenerate
`labels.npy` or `sinhala_labels.json`**; their order matches the trained model.

### Hosted rollback — kvn only

A rollback changes production; these are instructions for kvn, not authorization
for an agent to execute them. Use a known rehearsal target, not an arbitrary old
build. A code rollback does not restore a database or erase a browser warning.

- **Vercel Instant Rollback:** open the affected project (`suvana-shell`,
  `suvana-learn` or `suvana-communicate`), Production Deployment → **Instant
  Rollback**; verify the offered previous deployment and affected domains,
  then confirm. Hobby supports the immediately previous deployment. Inspect
  each affected module separately because Shell rewrites do not roll back its
  upstream projects. Confirm canonical sign-in redirects still work; do not
  restore the two-host credential entry. After recovery, Vercel requires undoing
  the rollback/promoting a deployment to resume automatic domain assignment.
  [Official procedure](https://vercel.com/docs/instant-rollback).
- **Railway:** open the Recognition service → Deployments → the known working
  previous deployment's three-dot menu → **Rollback**, then confirm. If no
  eligible rollback exists, use the warmed local Docker fallback during the demo
  and let kvn handle recovery later. Recheck `/api/info`, public socket origin,
  camera and a confirmed sign through `/recognize/` after recovery.
  [Official deployment actions](https://docs.railway.com/deployments/deployment-actions).

### Chrome warning / Safe Browsing

kvn's status on **18 Oct**: Google flagged `suvana-shell.vercel.app` on **17 Oct**
after a password was used on two of our hosts; review was submitted on **18 Oct**.
`suvana.help` itself is clean per kvn's update. Review submission is not clearance.

If the old host is warned, close it and type `https://suvana.help/` directly.
Check the address before signing in. **Do not bypass Chrome's warning, disable
Safe Browsing, or enter credentials on a warned page.** If the canonical site
is also warned, stop hosted sign-in, show offline Learn / installed Alerts or
local Recognize, and let kvn inspect Search Console and the review status after
the demonstration. Do not tell the panel the warning is cleared without a check.

## 6. Rehearsal record — manual completion

- [ ] **20 Oct:** kvn runs the full 12-minute sequence on laptop + Android;
  records actual elapsed times, routes, browser/device versions and omissions.
- [ ] **21 Oct:** repeat, including hotspot, offline Learn, direct Railway and
  local Docker/tunnel; verify rollback targets without performing a rollback.
- [ ] Fill TODO(Lahiru) from his confirmation; verify real signing. Do not infer
  that health checks, synthetic camera fixtures or the 70% gate prove accuracy.
- [ ] Confirm animation-data availability; choose avatar-only if missing.
- [ ] Recheck canonical account flow and Safe Browsing; no account creation or
  credential entry was performed during Q-05's read-only checks.
- [ ] After kvn deploys the reviewed content-safety fix, rerun section 7's four
  prompts on both hosted assistants. Local passes do not establish deployment.

## 7. Assistant content-safety retest — local results, 18 Oct

Old category tips were removed because nobody verified their SSL form,
location, movement or category-behaviour claims.

**Method:** production Shell build on local port 5193, existing Recognition
runtime container on 5197 with only the assistant/static source mounted
read-only, and a local proxy on 5198 serving `/` and `/recognize/`. Signed-out
Chromium, no API key supplied, no credentials or settings changed. The four
literal prompts below were submitted through each actual widget in order in a
fresh conversation. Both now use a deterministic refusal before fuzzy lookup
or cloud requests. No model provider was contacted during the retest.

**Actual refusal text, identical on both assistants:**

> Suvana does not describe how signs are made and does not translate into SSL.
> Use Learn to watch the reference recording instead.

Every reply also has the clickable **Watch a recording in Learn →** link.
No sign card or category guidance accompanies a refusal.

| Exact prompt | Homepage | /recognize | Link returned on both |
|---|---|---|---|
| `how do I sign X` | Refused — PASS | Refused — PASS | `https://suvana.help/learn/?sign=X` |
| `translate Y to SSL` | Refused — PASS | Refused — PASS | `https://suvana.help/learn/?sign=Y` |
| `describe the handshape for Z` | Refused — PASS | Refused — PASS | `https://suvana.help/learn/?sign=Z` |
| `how do I sign hello` | Refused — PASS | Refused — PASS | `https://suvana.help/learn/` |

**Result: 4/4 refusals on each assistant; 8/8 requested local cases pass.**
Additional UI checks on each assistant: `how do I sign HELLO` returns
`https://suvana.help/learn/?sign=HELLO`; `how do I sign BAG EKA` returns
`https://suvana.help/learn/?sign=BAG%20EKA`.

Links use a reproducible snapshot of Learn's existing single-sign glosses,
with exact case-sensitive membership only. Lowercase `hello` therefore uses
the generic Learn URL; it is not silently mapped to `HELLO`. Unknown words,
sentences and inferred English/Sinhala aliases also use `/learn/`. Learn's
I-14 entry applies its own edition filter, so a sign absent from the deployed
edition is ignored safely. This is a recording link, never a translation.

Unit checks also cover Sinhala request patterns, both configured-model bypass
paths and camera-only card tips. These finite cases do not certify every
possible paraphrase or SSL correctness. The shared model system prompt has the
same refusal rule; no live cloud-model test or accuracy measurement was run.

Desktop 1280x800 and phone 390x844 before/after renders for both replies and the
homepage stat/spec areas are in `.agent-local/screens/content-safety/index.html`.
Raw local retest records: `.agent-local/content-safety/retest.json`.
**These are local results, not hosted acceptance.** After review/deployment,
kvn reruns the same prompts on suvana.help and checks the 171-label copy.
