# සුවණ Suvana

![Suvana Hero Banner](docs/assets/suvana-hero.png)

One platform for real-time two-way Deaf–hearing communication in Sri Lankan Sign Language (SSL). Integrated, single-brand build of the four components of SLIIT IT4010 research project **R26-SE-019** (Jan 2026 cohort). There are no sub-brands inside Suvana — the names the components were built under standalone (Sawana, SignSpeak, SoundGuard) live only in their source repos.

## Structure

| Path | Module | Stack |
|---|---|---|
| `apps/shell` | The Suvana landing and the **Alerts** page at `/alerts/`, plus the built-in **Suvana AI** tutor — owns the domain root and proxies the modules | Static HTML + TypeScript, Vite (dev proxy + build) |
| `apps/learn` | **Learn** — gamified SSL learning & practice, served at `/learn/` | React + Vite, MediaPipe Tasks Vision in-browser, DTW scoring |
| `apps/communicate` | **Communicate** — speech → 3D signing avatar, with audio emotion recognition | Next.js 16 full-stack (MongoDB + Auth.js, Cloudinary, Three.js); ASR/emotion served externally |
| `apps/alerts` | **Alerts** — sound awareness / SOS companion app | Expo / React Native, TF.js |
| `services/recognition` | **Recognize** — sign → speech: browser-side capture streamed over a WebSocket, plus its own Suvana-branded frontend | FastAPI + TensorFlow + MediaPipe |
| `services/sound-awareness` | Sound-classification backend utilities for the mobile app | Python |
| `services/speech` | Sinhala Whisper ASR + audio emotion service (extracted from the Colab notebook; deploys as a Docker container, e.g. a Hugging Face Space) | FastAPI + PyTorch |
| `tools/reference-converter` | Dataset video → landmark reference pipeline feeding `apps/learn` | Python + MediaPipe |
| `packages/branding` | Suvana palette tokens and logos | — |

## Provenance

Fresh-history monorepo bootstrapped **24 Aug 2026** from working-tree snapshots. Full histories remain in the source repos.

| Path | Source | Commit |
|---|---|---|
| `apps/shell`, `tools/reference-converter` | `ChamaraIT22076816/R26-SE-019` → `learn-ssl-module/` | `7f6fc4f` |
| `apps/learn` | `ChamaraIT22076816/R26-SE-019` → `learn-ssl-module/web/` | `2d85c78` (re-sync, 30 Aug 2026 — see below) |
| `services/recognition` | `ChamaraIT22076816/R26-SE-019` → `sinhala_sign_language_recognition/` | `8a2ff2f` (partial re-sync, 26 Aug 2026 — see below) |
| `apps/alerts`, `services/sound-awareness` | `ChamaraIT22076816/R26-SE-019` → `soundguard-karindra/` | `7f6fc4f` |
| `apps/communicate` | [`lithiraMalkith/Sign-Detector`](https://github.com/lithiraMalkith/Sign-Detector) | `6fdfd04` ("Update #2", 16 Aug 2026) |

### Re-sync log

**30 Aug 2026 — `apps/learn`, `7f6fc4f` → `2d85c78` (merge, not copy).**

The team repo carried three days of newer Learn work: the Practice redesign
(one card system, iconified controls, mobile tab-bar fixes, capture-failure vs
low-score results), `CategorySignNavigator`, a fourth hero step, reduced-motion
handling, and Lenis scoped to the hero instead of running globally and
hijacking every scroll container in the app.

That copy is deployed **standalone** from the team repo, so its commit
`3e38643` deliberately stripped four Suvana couplings. All four are re-applied
here and must survive every future re-sync:

| Coupling | Where |
|---|---|
| `base: '/learn/'`, `outDir: dist/learn`, port 5174 | `vite.config.ts` (kept, not taken) |
| `/learn/`-prefixed cache headers | `vercel.json` (kept, not taken) |
| `src/app/session.ts` + the account link in the app bar | `src/App.tsx`, `src/index.css` |
| Brand links home, "Back to Home" button | `src/components/Hero.tsx` |

129 tests pass; typecheck and production build clean.

**30 Aug 2026 — `services/recognition` backend, checked, nothing to take.**

Verified against the team repo at `2d85c78` (fetched; `origin/main` had nothing
newer). `server.py`, `assistant.py`, `soundguard.py`, `sinhala_labels.py`, both
build scripts, all of `src/`, all of `tests/` and both config files are
**identical**. The only commits touching that folder since the last sync
(`5f945db`, `2f826ad`, `327274a`) all edit `webapp/static/index.html` — the team
repo's own landing page, which embeds the other modules as panels. Suvana
integrates at the domain level instead, so those keep being skipped, exactly as
the 26 Aug entry below says. The Suvana copy's only intentional divergence is
its rebranded frontend, plus the UI strings noted next.

**30 Aug 2026 — `services/recognition/webapp/assistant.py`, UI copy only.**

Five user-visible strings still carried the module's standalone sub-brand name,
which Suvana UI copy does not use. Rebranded, plus a system-prompt rule so the
model does not reintroduce them. The engine is untouched: future re-syncs
should take upstream logic and re-apply those strings. See the module docstring.

**26 Aug 2026 — `services/recognition`, `7f6fc4f` → `8a2ff2f` (selective).**

Taken: `tests/test_keypoint_augmentation.py` and `tests/test_sinhala_labels.py` (35 tests, numpy + a mocked `requests`, no TensorFlow or MediaPipe needed — all 35 verified passing against this copy), the pytest line in the component README, and `model_accuracy_graph.png`.

**Not taken, and not an oversight:** the same range added `webapp/static/learnssl.css`, `webapp/static/signspeak.css` and matching `index.html` sections. That is Lahiru's own integration approach in the team repo — embedding the other modules as panels inside the recognition page. Suvana integrates at the domain level instead (the shell owns routing and cross-module navigation), so importing those would duplicate the shell's job, re-introduce the sub-brand names "SignSpeak" and "Learn SSL" into Suvana UI copy, and collide with this copy's rebrand of the same file. Future re-syncs of this component should keep skipping them and take backend, model and test changes only.

~~`data/processed/labels.npy` is still absent upstream, so the label-map gap in `services/recognition/DEPLOY-SUVANA.md` remains open.~~ **Closed 30 Aug 2026**: `labels.npy`, `metadata.json` and `webapp/data/sinhala_labels.json` are committed here (~380 KB). They were caught by a bare `data/` ignore rule, so a clone got a service that started and logged `Loaded 0 gesture labels`. Do not regenerate them from the Kaggle corpus — the label order has to match the trained model's output indices exactly.

Deliberately excluded from every snapshot: git histories, `node_modules`, Python venvs, build outputs, datasets, and ~293 MB of Mixamo test FBX files (`lib/models` in Sign-Detector — nothing in code references them). The team repo's `SSL-Transformer/` folder was a stale placeholder and was not copied; the PP1 Python demo stays in the team repo as historical reference.

## One-domain topology

One domain serves the whole web product. The shell (`apps/shell`) owns the root; `apps/learn` builds with Vite `base: '/learn/'` and `apps/communicate` runs with Next `basePath` `/communicate` (set via `NEXT_PUBLIC_BASE_PATH`), which namespaces its pages, assets and API routes under that prefix, and the shell proxies it:

- **Production**: the `rewrites` in `apps/shell/vercel.json` forward `/learn/*` and `/communicate/*` to their own deployments. **Deploy order matters**: deploy `apps/learn` and `apps/communicate` first (each its own Vercel project; Communicate needs the env vars from `.env.local.example`), paste their production URLs over the `REPLACE-WITH-LEARN-DEPLOYMENT` / `REPLACE-WITH-COMMUNICATE-DEPLOYMENT` placeholders, then deploy `apps/shell`.
- **Dev**: the shell's Vite proxy maps `/learn` → `localhost:5174` and `/communicate` → `localhost:3000`, so `localhost:5173` mirrors production. Start all three dev servers.
- **`services/recognition` is the exception**: it streams camera frames over a WebSocket, and Vercel rewrites do not proxy WebSocket upgrades. It runs on its own origin (a `recognize.` subdomain or the container host) and serves its own Suvana-branded frontend, so it needs no CORS. See `services/recognition/DEPLOY-SUVANA.md`.
- Client code must never call `fetch("/api/...")` with a bare absolute path — route it through `apiPath()` from `lib/basePath.ts` (basePath does not rewrite raw fetches). Unset `NEXT_PUBLIC_BASE_PATH` and everything collapses to standalone behaviour, matching Lithira's original deployment.

## Running

- **`apps/shell`** — `npm install`, then `npm run dev` (port 5173). Serves the landing, the Alerts page at `/alerts/`, and proxies the other modules. `npm run build` typechecks first. See `DEMO.md` for running all four together.
- **`apps/learn`** — `npm install`, then `npm run dev` (port 5174, served under `/learn/`). The `predev` hook regenerates `public/reference-index.json`; running `npx vite` directly skips it and the app loads with no references. Runtime asset paths must use `import.meta.env.BASE_URL` — a bare `/references/...` breaks under the prefix.
- **`apps/communicate`** — `npm install`, copy `.env.local.example` → `.env.local` and fill it, then `npm run dev`. Needs MongoDB Atlas, an Auth.js secret, Cloudinary keys and the ngrok shared secret — all avatar models and gloss animations live in Cloudinary, not in this repo; the speech backend URL is read from MongoDB at runtime.
- **`apps/alerts`** — `npm install`, then `npx expo run:android` (a dev build is required: the app has a custom native module, so Expo Go will not run it).
- **`services/recognition`** — `pip install -r requirements.txt`, then see its README and `DEPLOY-SUVANA.md`. Capture is browser-side (`getUserMedia` → WebSocket), so it works off localhost. Locally it is simplest to borrow the team repo's venv rather than build a second 3 GB one — `DEMO.md` has the command. It needs two gitignored data files that never arrive with a clone; `DEMO.md` lists them and what breaks without them.

### Lockfiles — regenerate with npm 10, not 11

CI pins Node 22, which ships **npm 10**. A lockfile written by **npm 11**
(Node 24, what this repo is developed on) omits some transitive `@emnapi/*`
packages that `@napi-rs/wasm-runtime` pulls in for its wasm fallbacks, and
npm 10 refuses the install:

```
npm ci can only install packages when your package.json and package-lock.json are in sync.
Missing: @emnapi/runtime@1.11.3 from lock file
```

npm 11 accepts its own lockfile, so this never appears locally — it only ever
fails in CI. Note that `npm ci --dry-run --os=linux --cpu=x64` does **not**
catch it either: the missing entries are not platform-specific, and the
platform flags only change which optional packages get installed.

A lock written by npm 10 is accepted by both, so use npm 10 whenever a
dependency changes:

```
npx -y npm@10 install --package-lock-only --prefix apps/<app>
```

Only `apps/learn` and `apps/communicate` are affected — they are the two that
reach `@napi-rs/wasm-runtime`, via rolldown and Tailwind's oxide binding
respectively. `apps/shell` and `apps/alerts` produce identical locks either way.

## The built-in assistant

The shell ships **Suvana AI**, a tutor over the 171 signs the recognition model
was trained on. It runs entirely in the browser:

- **Knowledge base** — `apps/shell/public/data/signs.json`, committed, built by
  `apps/shell/scripts/build-sign-index.py` from the recognition module's label
  data and its English gloss map. Rebuild it after a retrain.
- **Retrieval and intents** — `apps/shell/src/assistant/`, a port of the engine
  in `services/recognition/webapp/assistant.py`, scoring kept numerically
  identical (including a faithful `difflib.SequenceMatcher` ratio) so answers do
  not drift between the two surfaces.
- **Optional model** — a free Gemini key, entered through the widget's gear.
  The key is held in that browser's `localStorage` and sent only to Google; the
  local engine still retrieves first and its hits are injected as grounded
  context, and every failure falls back to the local answer.

The point of the port is that it depends on **no Suvana service**. The Python
original reads a gitignored file next to a 3 GB TensorFlow container, so it
answered "0 signs" on a fresh checkout and went down whenever recognition did.
The copy on the Recognize page is unchanged and still needs that file — see
`DEMO.md`.

## Licences

Reference corpora in `apps/learn`: `kaggle_*` files are CC0; `yohan_*` files are **CC BY-NC-SA 4.0 (non-commercial)**. Licence files ship alongside the data.

## Near-term work

1. ~~Branding pass~~ and ~~one-domain topology~~ — done. All four modules are
   reachable from the landing, and no sub-brand name remains in UI copy.
2. Extract `services/speech` from the notebooks and point `apps/communicate` at a persistent URL (a DB config write — no code change). Until then Communicate transcription is UI-only.
3. Get `data/processed/labels.npy` committed somewhere durable, or accept that Recognize needs a manual file drop on every fresh clone.
4. Build the Alerts dev client and put an APK somewhere `/alerts/` can link to, so the page can offer a download rather than a build command.
5. Unified sign-on across modules is documented future work, not current scope.
