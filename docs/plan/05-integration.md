# 05 Integration: one Suvana, every teammate's component, at the contract level

## 0. Rules

- Integrate over HTTP, links and contracts only. Never rewrite a teammate's stack. Never regenerate `labels.npy` or `sinhala_labels.json`.
- Datasets and large binaries stay out of the repo.
- No sub-brands (Sawana, SignSpeak, SoundGuard) on any user-visible Suvana surface.
- A teammate change that alters product behaviour goes to kvn before it is taken. Every Suvana-specific change to a teammate's module is declared in `tools/sync/upstreams.json` with its reason (codex lane applies declarations; other lanes propose them in their handoff).
- Syncing follows `tools/sync/README.md`: `status`, `apply`, resolve, gates, `guard`, `record`, then a line in `README.md`'s sync log (README's owner of the day writes it).

## 1. Target topology (demo)

```
suvana-shell.vercel.app  (later suvana.help)        Vercel project "suvana-shell" (root apps/shell)
  /                 landing + Suvana AI (Edge api/assistant, GEMINI_API_KEY optional)
  /privacy /terms /contact /pricing   (I-06)
  /alerts/          Alerts page + APK link (GitHub Release asset)
  /learn/*          rewrite -> suvana-learn.vercel.app/learn/*        (root apps/learn, static)
  /communicate/*    rewrite -> suvana-communicate.vercel.app/communicate/*  (root apps/communicate, Next.js)
                      MongoDB Atlas M0 (kvn), Cloudinary (kvn), api/stt -> speech URL (laptop on demo day by default)
Recognize:   own origin on the DN-02 host (WebSocket /ws/recognize), linked from the landing card
             optional recognize.suvana.help CNAME if the host supports custom domains
R26 standalone Learn: learn-ssl-module.vercel.app (redeployed per Learn milestone)
Laptop fallback: localhost stack + cloudflared tunnel (DEMO.md)
```

The rewrite hostnames are fixed in `apps/shell/vercel.json`, so Vercel project names must be exactly `suvana-learn`, `suvana-communicate`, `suvana-shell`.

## 2. Hosted-vs-own decisions

| Option | Evidence | Decision |
|---|---|---|
| Lithira's hosted Communicate (sign-detector-tawny.vercel.app) | SignSpeak-branded title; registration closed; own origin, no basePath; `/api/auth/session` null; speech on Colab/ngrok | **Do not integrate.** Breaks single brand; nobody can register; cannot sit under `/communicate` |
| Suvana's own Communicate on kvn's Atlas + Cloudinary | All code present; `.env.local.example` | **Do this** (DN-13). Without Lithira's data: accounts, UI, avatar only, said up front |
| Lahiru's hosted recognition | None exists (R26 grep) | n/a |
| Suvana's own Recognize on a paid always-on host | Dockerfile; model and labels tracked | **Do this** (DN-02, recommended Railway Hobby) |
| Speech hosted | 3.5 GB weights, slow on CPU, costs money | **Laptop only by default** (DN-03) |
| Alerts | On-device; needs APK | Karindra builds from Suvana's tree, or kvn rebuilds under his EAS (DN-14) |

## 3. Per-component plan

### Shell `apps/shell` (kvn's own)
- **I-01 (13 Oct):** `index.html:404` "SoundGuard Ecosystem" -> descriptive tag ("Alerts"); Recognize card `data-service-url` from `VITE_RECOGNIZE_URL` at build time, localhost fallback kept; replace the `recognize.suvana.lk` example (`:211`). Home-page preview cards untouched.
- **I-06 (18 Oct):** `privacy.html`, `terms.html` ("draft, not legal advice"), `contact.html`, `pricing.html` (open-core model; "Roadmap: no paid offering; this deployment is non-commercial and academic"; Vercel Hobby caveat; no prices unless kvn supplies them). Privacy text must match reality (Learn on-device, no video uploaded; Communicate stores email and hashed password in MongoDB; assistant questions go to Gemini when enabled; any corpus video from Cloudinary).
- **I-10 (19 Oct):** production Recognize URL; Alerts download link when I-12 delivers; phone pass at 360/390.

### Learn `apps/learn`
See 02, 03, 04. Integrated through the shell rewrite, the shared `suvana.theme` localStorage key, and the session read (`src/app/session.ts`, Suvana-only via `VITE_SUVANA` after R-01). Learn progress stays per browser (DN-11).

### Communicate `apps/communicate` (Lithira's code, Suvana's own instance)
- Gate status: lint and build pass with `MSYS_NO_PATHCONV=1` (01-state section 2).
- **I-03 (14 Oct):** fix stale docs (DEMO.md "two data files" and Status table; DEPLOYMENT.md labels.npy blocker row, "shell has no env vars" (it has `GEMINI_API_KEY`), HF "free" assumption; TODO-PP2.md:109).
- **I-07 (16 Oct):** `scripts/seedGlosses.ts` refuses without `--placeholder-dev-only`; new `scripts/importGlosses.ts` (dry-run default) imports Lithira's exported `glosses` JSON and can remap `animationUrl` to kvn's Cloudinary; `.env.local.example` already lists `ADMIN_EMAILS` (verified 12 Oct; keep it). The internal key `signspeak.contribute.speakerKey` stays (renaming loses data; not user-visible).
- **D-03 (17 Oct):** deploy; **I-11 (19 Oct):** verify the Auth.js session behind the shell's external rewrite (sign in at `suvana-shell.vercel.app/communicate/login`; session visible on `/`, `/learn/`; cookies on the shell host). If broken: `AUTH_URL`/`NEXTAUTH_URL` to the shell origin and `trustHost`; if still broken, kvn decides (fallback: Communicate on its own URL without the shared session).
- **I-13 (20 Oct, blocked on Lithira):** import glosses and animations. Until then, never demo placeholder animations.

### Recognize `services/recognition` (Lahiru's code)
- **I-04 (14 Oct, DN-18):** take `src/model/inference_engine.py`, `webapp/server.py`, the two recognizer files, `src/model/*`, `tests/`. Also in `sync.mjs status`'s 33-file take list but not named here: `main.py`, `src/utils/file_utils.py`, `src/utils/visualization.py` (not imported by the server or the new engine; take or declare). Skip and declare: 4 new `.h5` (bilstm x2, transformer x2; unused at runtime), confusion-matrix/history PNGs, `demo_sentences.py` (reads a dataset), `model_comparison.json`, `train_and_evaluate_all.py`, notebooks. `config.yaml` model path stays `models/saved_models/best_model.h5`; labels untouched; pytest `tests/test_keypoint_augmentation.py tests/test_sinhala_labels.py -q`.
- **I-08 (17 Oct):** `docker build -t suvana-recognition services/recognition`; container logs "Loaded 171 gesture labels"; measure `/ws/recognize` round trip over 50 windows for `tf_function` vs `predict` (median, p90); keep the faster; add `/api/info` `{labels, backend, model}`; "Back to Suvana" link and `?theme=light|dark` in `webapp/static/index.html`.
- **D-04 (18 Oct):** host; uptime ping 20-22 Oct.
- Never quote 98.78% or any recognition accuracy unless Lahiru confirms a split by source video.

### Speech `services/speech` (Lithira's code)
- **I-09 (19 Oct):** build check, image size, first-start time, laptop run command. `STT_API_KEY` in Communicate; `TRANSLATE_API_KEY` on the service. Register the URL in Communicate Settings (`SettingsClient.tsx:88`) on demo day.

### Alerts `apps/alerts`, `services/sound-awareness` (Karindra's code)
- **I-02 (13 Oct):** user-visible strings say Suvana: `components/Onboarding.tsx:204`, `plugins/withSoundGuardBackground.js:171` (notification), `:249` (channel description). Declared Suvana-specific.
- **I-12a / I-12 (DN-14):** a Karindra-built APK from **his** tree would still say SoundGuard and carry `com.karindragimhan69.soundguard`. Path A: Karindra builds a signed `preview` APK **from Suvana's `apps/alerts`** (with I-02) by 16 Oct. Path B (no reply by 15 Oct): I-12a sets slug/scheme `suvana-alerts`, package `help.suvana.alerts`, kvn's EAS projectId; kvn runs `eas build -p android --profile preview`. The APK is a GitHub Release asset, never committed. Alerts needs no server.

### Shared session and theme
- One Auth.js JWT cookie shared same-origin by shell, Learn and Communicate, **only behind the shell origin**.
- Theme key `suvana.theme` (shell, `/alerts/`, Learn, Communicate). Recognize reads `?theme=` instead (I-08).

## 4. Contracts

| Contract | Producer | Consumer | Shape |
|---|---|---|---|
| `/communicate/api/auth/session` | Communicate | Shell, Learn | Auth.js session JSON or `null` |
| `wss://<recognize>/ws/recognize` | Recognize | Recognize page | Lahiru's protocol, unchanged |
| `GET <recognize>/api/info` | Recognize | Shell card, uptime ping | `{sequenceLength, confidenceThreshold, numClasses: 171}` (server.py:147-153) |
| `POST <speech>/...` with `x-api-key` | Speech | Communicate `app/api/stt/route.ts` | Lithira's protocol |
| `/learn/?sign=GLOSS` | Learn | Communicate (I-14) | exact gloss id; ignored if unknown |
| `public/references/video-manifest.json` | kvn (Cloudinary) | Learn | `{refId:{mp4,webm,poster,licence,source}}`; only if DN-05 |

## 5. Teammate asks (K-03; kvn sends on 13 Oct)

**To Lithira (reply by 16 Oct)**
1. A JSON export of your MongoDB `glosses` collection (name, Sinhala forms, `animationUrl`, `public_id`), or a seed script.
2. The gloss animation JSON files, or their public Cloudinary URLs (public URLs are enough; no API secret).
3. `emotion_clf.joblib` (output of `EmotionClassifier.ipynb`).
4. The exact Whisper base and adapter model IDs your speech service uses.
5. Written OK to show your avatar and animations under the Suvana name (suvana.help and .vercel.app).
6. Will sign-detector-tawny.vercel.app stay up until 22 Oct?
7. Your gloss-order mapper: may Learn use its output, read-only and credited, to order 2-3-sign sequences? If yes, please run it on the Kaggle sentence labels kvn sends (from L-22a) and send the raw output.

**To Lahiru (reply by 16 Oct)**
1. Is `models/saved_models/best_model.h5` the model you demo, and do the `labels.npy` and `sinhala_labels.json` that Suvana tracks (R26 origin/main does not track them) match its output order?
2. Please send `best_model.tflite`, or the exact conversion command.
3. How was the test split made: by source video, or across augmentations? Until you confirm, nobody quotes 0.9878.
4. Your venv's fastapi, uvicorn and websockets versions; does `FastInferenceEngine` need extra packages?
5. Confirm you host recognition nowhere, and give OK to host it under Suvana.

**To Karindra (reply by 15 Oct)**
1. Either build a signed `preview` APK from Suvana's `apps/alerts` (it has the Suvana strings), or add kvn to EAS project `80d799af-0e87-41d7-8a12-60fb02e661d1`, or OK a rebuild under kvn's EAS with package `help.suvana.alerts`.
2. OK to rename the onboarding and notification strings to Suvana.
3. Confirm Alerts needs no server.

**To the supervisor (K-09):** ethics approval was never applied for. Is any informal usability check allowed before 22 Oct? If there is no answer by 18 Oct, the answer is treated as no: nobody else tries Learn for the project, and the thesis states that no participants took part.

## 6. Demo readiness checklist (target 21 Oct)

**Laptop (localhost fallback; works offline except gTTS, Gemini, hosts)**
- [ ] Local MongoDB on 27017; `ADMIN_EMAILS` set in `apps/communicate/.env.local`.
- [ ] Shell 5173, Learn 5174 (`npm run dev`, not `npx vite`), Communicate 3000 (warm up about 30 s), all from Git Bash with `MSYS_NO_PATHCONV=1` where `/communicate` is passed.
- [ ] Recognize: `uvicorn --app-dir services/recognition webapp.server:app --port 8000` (or `docker run -p 7860:7860 suvana-recognition`); log shows "Loaded 171 gesture labels"; port free.
- [ ] Speech container running locally and registered in Communicate Settings (if demoed).
- [ ] Offline Learn: `npm run build && npx vite preview` ready.
- [ ] Learn demo profile selected and reset; U1 sign rehearsed; Restaurant scenario rehearsed.
- [ ] Communicate: register, sign in, session on `/` and `/learn/`; no placeholder animations.

**Phone (HTTPS deployment only)**
- [ ] `https://suvana-shell.vercel.app/` (or suvana.help) loads; theme toggles; no horizontal scroll at 360/390.
- [ ] `/learn/` camera starts; no 404s on `/learn/references|wasm|models`; Watch/Try/Recall on a U1 sign.
- [ ] `/communicate` hydrates; sign in; session carries to `/`.
- [ ] Recognize card opens the hosted page; camera, WebSocket, spoken Sinhala; host warm (uptime ping on).
- [ ] Alerts APK installed in advance; sound detection tried once offline.
- [ ] Hotspot ready; laptop fallback rehearsed.

**Say up front:** what is deployed vs local; Communicate is avatar-only unless Lithira's data arrived; no recognition accuracy is quoted; Learn's scores are match scores (74.6% vs 65.4% baseline if asked); the Hero cards are decorative; no participants were tested.
