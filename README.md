# සුවණ Suvana

One platform for real-time two-way Deaf–hearing communication in Sri Lankan Sign Language (SSL). Integrated, single-brand build of the four components of SLIIT IT4010 research project **R26-SE-019** (Jan 2026 cohort). There are no sub-brands inside Suvana — the names the components were built under standalone (Sawana, SignSpeak, SoundGuard) live only in their source repos.

## Structure

| Path | Module | Stack |
|---|---|---|
| `apps/web` | **Learn** — gamified SSL learning & practice; will also grow the Suvana shell/landing | React + Vite, MediaPipe Tasks Vision in-browser, DTW scoring |
| `apps/communicate` | **Communicate** — speech → 3D signing avatar, with audio emotion recognition | Next.js 16 full-stack (MongoDB + Auth.js, Cloudinary, Three.js); ASR/emotion served externally |
| `apps/mobile` | **Alerts** — sound awareness / SOS companion app | Expo / React Native, TF.js |
| `services/recognition` | Sign → speech recognition API | FastAPI + TensorFlow |
| `services/sound-awareness` | Sound-classification backend utilities for the mobile app | Python |
| `services/speech` | *(planned)* Whisper ASR + emotion service, to be extracted from `apps/communicate/notebook-integration` | FastAPI |
| `tools/reference-converter` | Dataset video → landmark reference pipeline feeding `apps/web` | Python + MediaPipe |
| `packages/branding` | Suvana palette tokens and logos | — |

## Provenance

Fresh-history monorepo bootstrapped **24 Aug 2026** from working-tree snapshots. Full histories remain in the source repos.

| Path | Source | Commit |
|---|---|---|
| `apps/web`, `tools/reference-converter` | `ChamaraIT22076816/R26-SE-019` → `learn-ssl-module/` | `7f6fc4f` |
| `services/recognition` | `ChamaraIT22076816/R26-SE-019` → `sinhala_sign_language_recognition/` | `7f6fc4f` |
| `apps/mobile`, `services/sound-awareness` | `ChamaraIT22076816/R26-SE-019` → `soundguard-karindra/` | `7f6fc4f` |
| `apps/communicate` | [`lithiraMalkith/Sign-Detector`](https://github.com/lithiraMalkith/Sign-Detector) | `6fdfd04` ("Update #2", 16 Aug 2026) |

Deliberately excluded from every snapshot: git histories, `node_modules`, Python venvs, build outputs, datasets, and ~293 MB of Mixamo test FBX files (`lib/models` in Sign-Detector — nothing in code references them). The team repo's `SSL-Transformer/` folder was a stale placeholder and was not copied; the PP1 Python demo stays in the team repo as historical reference.

## Running

- **`apps/web`** — `npm install`, then `npm run dev`. The `predev` hook regenerates `public/reference-index.json`; running `npx vite` directly skips it and the app loads with no references.
- **`apps/communicate`** — `npm install`, then `npm run dev`. Needs `.env.local` (MongoDB Atlas, Auth.js secret, Cloudinary keys, ngrok shared secret) — see its own README. All avatar models and gloss animations live in Cloudinary, not in this repo; the speech backend URL is read from MongoDB at runtime.
- **`apps/mobile`** — `npm install`, then `npx expo start`.
- **`services/recognition`** — `pip install -r requirements.txt`, then see its README. Before wiring into the web shell, verify the webcam is captured browser-side (frames/landmarks sent to the API), not server-side.

## Licences

Reference corpora in `apps/web`: `kaggle_*` files are CC0; `yohan_*` files are **CC BY-NC-SA 4.0 (non-commercial)**. Licence files ship alongside the data.

## Near-term work

1. Branding pass — palette tokens + logos into `packages/branding`, retheme every frontend, strip all sub-brand names from UI copy.
2. One-domain topology (rewrites or subdomains) tying `apps/web` and `apps/communicate` together.
3. Extract `services/speech` from the notebooks and point `apps/communicate` at a persistent URL (a DB config write — no code change).
4. Wire `services/recognition` into the shell; SoundGuard rebrand build.
5. Unified sign-on across modules is documented future work, not current scope.
