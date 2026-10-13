# Deploying Suvana

Five deployable units. Three are web apps on Vercel; two are Python services that
**cannot** run on Vercel; one is a mobile app.

| Unit | Where it goes | Why |
|---|---|---|
| `apps/shell` | Vercel — project **`suvana-shell`** | Static + Edge function; owns the domain root and proxies Learn and Communicate |
| `apps/learn` | Vercel — project **`suvana-learn`** | Static SPA served under `/learn/` |
| `apps/communicate` | Vercel — project **`suvana-communicate`** | Next.js 16 full-stack, served under `/communicate` |
| `services/recognition` | A container host (Railway Hobby recommended from 18 Oct, or Render/Fly) | ~3 GB image with TensorFlow + MediaPipe, and it needs a **WebSocket**. Vercel functions cap at 250 MB and do not proxy WebSocket upgrades |
| `services/speech` | Laptop-only by default (DN-03), or container host | ~3.5 GB of PyTorch/Whisper weights, slow on CPU |
| `apps/alerts` | EAS build → APK | Not a web deployment. Needs a dev build: the app has a custom native module, so Expo Go cannot run it |

## Order of steps

**Deploy order matters**:
1. Deploy `apps/learn` (`suvana-learn`) and `apps/communicate` (`suvana-communicate`) first.
2. Deploy `apps/shell` (`suvana-shell`) **last**: it rewrites `/learn/*` and `/communicate/*` to those two deployments. Until they exist, those subpaths return upstream errors.
3. Deploy Recognize on its container host, then set `VITE_RECOGNIZE_URL` on `suvana-shell` and redeploy the shell.

## The project names are not cosmetic

`apps/shell/vercel.json` rewrites `/learn/*` and `/communicate/*` to
`https://suvana-learn.vercel.app` and `https://suvana-communicate.vercel.app`.
Those are Vercel's automatic production URLs for projects with those exact
names. **Name the projects exactly as above**, or edit those two hostnames in
`apps/shell/vercel.json` to match whatever you used. Nothing else references
them.

## Vercel projects configuration

Team: `team_WVADC45JhBSU0pda5PJAy3Z6`, CLI scope `kavindu-rakns-projects`.
Git integration on `kavindu-rakn/Suvana`, production branch `main`.
Node.js: 24.x (matches `.nvmrc`).

On **every** project, set:
- **Ignored Build Step**: `git diff --quiet HEAD^ HEAD -- .` so a change in one module does not trigger rebuilds in others.

| Project | Root Directory | Build & Output | Env (Production + Preview) |
|---|---|---|---|
| `suvana-learn` | `apps/learn` | Vite; `outputDirectory: dist` (build writes `dist/learn`) | None by default. `suvana.config.json` sets base `/learn/` and `VITE_SUVANA`. Set `VITE_CONTENT=cc0` only for a CC0-only build (DN-04). |
| `suvana-communicate` | `apps/communicate` | Next.js 16 | `NEXT_PUBLIC_BASE_PATH=/communicate`<br>`MONGODB_URI` (Atlas M0)<br>`NEXTAUTH_SECRET` (`npx auth secret`)<br>`ADMIN_EMAILS` (admin email)<br>`CLOUDINARY_CLOUD_NAME`<br>`CLOUDINARY_API_KEY`<br>`CLOUDINARY_API_SECRET`<br>`NGROK_UPDATE_SECRET`<br>`STT_API_KEY` (optional)<br>**Leave `NEXTAUTH_URL` unset** at first. |
| `suvana-shell` | `apps/shell` | Vite + Edge function `api/assistant.ts` | `GEMINI_API_KEY` (optional, never `VITE_`-prefixed)<br>`VITE_RECOGNIZE_URL` (origin of deployed Recognize service; defaults to localhost fallback if unset) |

### Vercel Hobby caveat

Vercel Hobby is for **non-commercial and academic use only**. The site's pricing
and terms pages explicitly document that Suvana is non-commercial and academic.
Any commercial offering in the future requires migrating to Vercel Pro (as
detailed in `docs/commercialisation.md`).

### Previews, promotion, and rollback

- **Previews** are SSO-protected (redirects 302 to Vercel login). Open previews on mobile devices via the dashboard **Share** link.
- **Production** `*.vercel.app` aliases are public, enabling the shell rewrites to proxy them without auth barriers.
- **Promote:** `npx vercel promote <preview-url> --scope kavindu-rakns-projects`.
- **Rollback:** `npx vercel rollback` or promote the previous known-good deployment.

## Web deploy details

### 1. `suvana-learn` — Root Directory `apps/learn`

No environment variables. Vite builds with `base: '/learn/'` into `dist/learn`,
so the deployment serves `/learn/*` on its own domain too — which is what makes
the shell's rewrite a straight pass-through with no path rewriting.

`public/wasm` is copied during postinstall (`scripts/copy-wasm.mjs`). Cache headers
in `vercel.json` serve references and models with `max-age=86400, stale-while-revalidate=604800`
(never `immutable`, so reference updates apply cleanly).

### 2. `suvana-communicate` — Root Directory `apps/communicate`

Environment variables (Production):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_BASE_PATH` | `/communicate` |
| `MONGODB_URI` | MongoDB Atlas connection string (M0 free tier works) |
| `NEXTAUTH_SECRET` | `npx auth secret`, or any 32-byte random string |
| `NEXTAUTH_URL` | **Leave unset.** A path in it becomes Auth.js's basePath and 400s every auth request; unset, Auth.js v5 trusts the forwarded host |
| `ADMIN_EMAILS` | Comma-separated admin emails (e.g. `admin@suvana.help,kvn@suvana.help`). **Without this nobody can administer the platform** |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | From Cloudinary (stores gloss animations and models) |
| `NGROK_UPDATE_SECRET` | Shared secret the speech service uses to register its URL |
| `STT_API_KEY` | Optional: key for speech notebook/service integration |

### 3. `suvana-shell` — Root Directory `apps/shell`

Deploy this **last**: it proxies the other two.

Environment variables:

| Variable | Value |
|---|---|
| `GEMINI_API_KEY` | Optional Google AI Studio key. Set it in Vercel project environment variables. Read only by the `api/assistant` Edge function; never reaches the browser and must never be `VITE_`-prefixed. |
| `VITE_RECOGNIZE_URL` | Optional origin for the deployed Recognize service (e.g. `https://recognize.suvana.help`), injected by Vite at build time. When unset, falls back to `http://localhost:8000` / `7860`. |

Leave `GEMINI_API_KEY` unset and the assistant still works: it falls back to its local
retrieval engine over the committed sign index.

**Keep billing disabled on the Google project.** The endpoint is public, so
anyone who finds it can spend the quota. It is rate limited per client, but
serverless instances are ephemeral so that cap is per-instance rather than
global — the real backstop is Google's own per-project limit, which with
billing off means a burned daily quota rather than an invoice.

## Custom domain (`suvana.help`)

1. Attach the domain to **`suvana-shell` only**:
   - In Vercel → `suvana-shell` → Settings → Domains: add `suvana.help` and `www.suvana.help` (redirect `www` to apex).
   - The other two projects (`suvana-learn`, `suvana-communicate`) stay on their `.vercel.app` hostnames and are accessed exclusively through the shell's rewrites. This maintains single-origin topology, allowing session cookies and theme preferences to work seamlessly across all modules.
2. If the Recognize host supports custom domains, configure `recognize.suvana.help` (CNAME).
3. Update `VITE_RECOGNIZE_URL` on `suvana-shell` and redeploy.
4. If Auth.js requires an explicit URL behind the domain (I-11), set `AUTH_URL=https://suvana.help/communicate` on `suvana-communicate` and redeploy.
5. The `.vercel.app` URLs remain functional as fallback origins.

## Services hosting (Recognize & Speech)

### Recognize (`services/recognition`)
- **Hosting**: Railway Hobby ($5/mo, always-on) recommended from 18 Oct (DN-02).
- **Requirements**: Python 3.10-slim, TensorFlow 2.13, MediaPipe 0.10.7, port 7860, WebSocket at `/ws/recognize`.
- **Uptime ping**: Configure ping to `/api/info` every 10 minutes from 20 Oct to keep the container warm.
- Runs on its own origin (`recognize.suvana.help` or container domain), not behind the shell rewrite, because Vercel does not proxy WebSocket upgrades.

```bash
docker build -t suvana-recognition services/recognition
docker run -p 7860:7860 suvana-recognition
```

Rehearsed laptop fallback (Git Bash):
```bash
docker build -t suvana-recognition services/recognition
docker run -p 7860:7860 suvana-recognition
cloudflared tunnel --url http://localhost:7860     # free trycloudflare URL; carries WebSocket
```

### Speech (`services/speech`)
- **Hosting**: Laptop-only by default (DN-03).
- 3.5 GB of PyTorch/Whisper weights, slow on CPU.
- Once running, write its ngrok/cloudflared URL into Communicate Settings (Dashboard → Settings) or notebook auto-registration.

```bash
docker build -t suvana-speech services/speech
docker run -p 7860:7860 suvana-speech
```

## Post-deployment verification (Smoke tests)

Run the automated smoke checker against the deployed domain:

```bash
# Verify against production shell:
node tools/smoke/smoke.mjs https://suvana-shell.vercel.app

# Verify against custom domain with Recognize service:
node tools/smoke/smoke.mjs https://suvana.help --recognize-url https://recognize.suvana.help

# Verify standalone Learn redirect:
node tools/smoke/smoke.mjs https://suvana-shell.vercel.app --standalone-learn-url https://suvana-learn.vercel.app
```

The smoke suite verifies all criteria from `docs/plan/06-deploy.md` section 4:
1. `GET /`: returns 200 with "Suvana" brand title.
2. `GET /learn/`: returns 200, checks asset paths are properly prefixed under `/learn/assets/`.
3. Learn assets: `/learn/reference-index.json`, `/learn/references/kaggle_100.json`, `/learn/wasm/vision_wasm_internal.wasm`, `/learn/models/hand_landmarker.task` return 200 and do **not** have `immutable` in `Cache-Control`.
4. Communicate: `GET /communicate` returns 200; `/communicate/api/auth/session` returns 200 with valid JSON.
5. Alerts & Legal: `GET /alerts/` returns 200; checks `/privacy`, `/terms`, `/contact`, `/pricing`.
6. Standalone redirect: checks that `https://suvana-learn.vercel.app/` redirects to `/learn/`.
7. Recognize: checks `GET <recognize>/api/info` returns 200 with `numClasses: 171`.

### Manual checks on real devices (kvn):
1. Mobile camera starts properly on `/learn/`.
2. Sign in at `/communicate/login` and verify session carries across to `/` and `/learn/`.
3. Dark/light theme toggles carry across all pages.
4. Verify responsive layout without horizontal scrolling on 360px and 390px phone screens.
