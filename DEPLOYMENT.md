# Deploying Suvana

Five deployable units. Three are web apps on Vercel; two are Python services that
**cannot** run on Vercel; one is a mobile app.

| Unit | Where it goes | Why |
|---|---|---|
| `apps/shell` | Vercel — project **`suvana-shell`** | Static; owns the domain root and proxies the other two |
| `apps/learn` | Vercel — project **`suvana-learn`** | Static SPA served under `/learn/` |
| `apps/communicate` | Vercel — project **`suvana-communicate`** | Next.js full-stack, served under `/communicate` |
| `services/recognition` | A container host (Hugging Face Docker Space, Render, Fly, Railway) | ~3 GB image with TensorFlow + MediaPipe, and it needs a **WebSocket**. Vercel functions cap at 250 MB and do not proxy WebSocket upgrades |
| `services/speech` | A container host | ~3.5 GB of PyTorch/Whisper weights, same limits |
| `apps/alerts` | EAS build → APK | Not a web deployment. Needs a dev build: the app has a custom native module, so Expo Go cannot run it |

## The project names are not cosmetic

`apps/shell/vercel.json` rewrites `/learn/*` and `/communicate/*` to
`https://suvana-learn.vercel.app` and `https://suvana-communicate.vercel.app`.
Those are Vercel's automatic production URLs for projects with those exact
names. **Name the projects exactly as above**, or edit those two hostnames in
`apps/shell/vercel.json` to match whatever you used. Nothing else references
them.

## Web deploy

All three projects come from this one repository. In each, set **Root
Directory** to the app's folder and leave the rest on Vercel's defaults.

### 1. `suvana-learn` — Root Directory `apps/learn`

No environment variables. Vite builds with `base: '/learn/'` into `dist/learn`,
so the deployment serves `/learn/*` on its own domain too — which is what makes
the shell's rewrite a straight pass-through with no path rewriting.

### 2. `suvana-communicate` — Root Directory `apps/communicate`

Environment variables (Production):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_BASE_PATH` | `/communicate` |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `NEXTAUTH_SECRET` | `npx auth secret`, or any 32-byte random string |
| `NEXTAUTH_URL` | **Leave unset.** A path in it becomes Auth.js's basePath and 400s every auth request; unset, Auth.js v5 trusts the forwarded host |
| `ADMIN_EMAILS` | Your email. **Without this nobody can administer the platform** |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | From Cloudinary |
| `NGROK_UPDATE_SECRET` | Shared secret the speech service uses to register its URL |

### 3. `suvana-shell` — Root Directory `apps/shell`

No environment variables. Deploy this **last**: it proxies the other two, so
until they exist `/learn` and `/communicate` return errors. Nothing breaks
permanently — redeploying the shell is not required once they come up, because
the rewrite targets are fixed hostnames rather than per-deployment URLs.

### Custom domain

Attach the domain to **`suvana-shell` only**. The other two stay on their
`.vercel.app` hostnames and are reached through the shell's rewrites, which is
what keeps every surface same-origin — and that is what makes one session
cookie and one theme preference work across all three.

## Services

```bash
docker build -t suvana-recognition services/recognition
docker run -p 7860:7860 suvana-recognition
```

```bash
docker build -t suvana-speech services/speech
docker run -p 7860:7860 suvana-speech
```

Both target port 7860 and a uid-1000 user, so either drops onto a Hugging Face
Docker Space unchanged. See each service's `DEPLOY-SUVANA.md` / `README.md`.

**Recognition runs on its own origin** (e.g. `recognize.<domain>`), not behind
the shell, because Vercel cannot proxy its WebSocket. It serves its own page,
so it needs no CORS. After deploying, point the shell's Recognize card at that
URL — see the marked comment in `apps/shell/index.html`.

**Speech**: once hosted, write its URL into the Communicate app (Dashboard →
Settings, or the notebook's auto-registration). That is a config write; no code
changes.

## Blockers that are not yours to fix

| Blocker | Effect until resolved | Owner |
|---|---|---|
| `data/processed/labels.npy` | Recognition reports `Gesture_0…170` instead of sign names | Lahiru |
| `emotion_clf.joblib` | Speech falls back to an English wav2vec2 model | Lithira |
| Atlas + Cloudinary credentials, gloss-animation export | Communicate has no accounts and no sign animations | Lithira |

## Verify after deploying

1. `https://<domain>/` — landing renders, theme toggle works.
2. `https://<domain>/learn/` — hero, then the practice tool; check the browser console for 404s on `/learn/references/*`, `/learn/wasm/*` and `/learn/models/*`.
3. `https://<domain>/communicate` — hero renders and **is interactive** (a Next page that renders but never hydrates means the proxy is mangling the RSC stream).
4. Register an account, then confirm you are signed in on `/` and `/learn/` too — that is the same-origin session working.
5. Sign in with the `ADMIN_EMAILS` address and open `/communicate/admin`.
