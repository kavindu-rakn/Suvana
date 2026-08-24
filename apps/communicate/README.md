# SignSpeak — Audio to 3D Sign Language

A Next.js app that records or uploads audio, transcribes it with detected
emotion via an external speech-to-text notebook, then matches the text to a
sequence of sign-language glosses and plays their animations on a 3D avatar
in the browser.

## Tech stack

- **Next.js 16** (App Router) + TypeScript
- **MongoDB** via Mongoose
- **Auth.js (next-auth v5)** — email/password (Credentials provider, JWT sessions, bcrypt)
- **GSAP** (+ ScrollTrigger) for the home page
- **Tailwind CSS v4** — black / white / light-purple theme, Geist Mono font
- **three.js + @react-three/fiber + @react-three/drei** for the 3D avatar
- **Cloudinary** — stores gloss animation JSON as raw resources
- **zod**, **lucide-react**, **fastest-levenshtein**

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then fill in the values below
npm run dev
```

### 1. Environment variables (`.env.local`)

| Variable | What it's for |
| --- | --- |
| `MONGODB_URI` | Your MongoDB connection string (Atlas free tier works fine). |
| `NEXTAUTH_SECRET` | Random secret for Auth.js. Generate with `npx auth secret` or `openssl rand -base64 32`. |
| `NEXTAUTH_URL` | Base URL of the app (e.g. `http://localhost:3000`). |
| `NGROK_UPDATE_SECRET` | Shared secret between this app and your notebook (see below). |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | From your Cloudinary dashboard. |
| `STT_ENDPOINT_PATH` | Path on your notebook's server that accepts audio (default `/transcribe`). |

### 2. The rigged 3D avatar

Drop your rigged glTF avatar at `public/models/avatar.glb`. See
[`public/models/README.md`](public/models/README.md) for details. Until it's
there, the 3D viewer shows a friendly "couldn't load the avatar" message
instead of crashing.

### 3. Seed some glosses

The gloss → animation pipeline needs MongoDB entries to match against. The
seed script mirrors the **exact 35 gloss tokens** the notebook's
`SINHALA_TO_GLOSS` dictionary can produce (`ME`, `YOU`, `HELLO`,
`THANK_YOU`, ... — see `lib/ipynb/WhishperBackend.ipynb` cell-2), since
`/api/gloss/predict` looks those up by exact name:

```bash
npx tsx scripts/seedGlosses.ts
```

This uploads a **placeholder** animation JSON file (same tiny keyframe) for
each gloss to Cloudinary — not real sign motions — just so the pipeline is
wired up end to end. Replace them with real exports via:

- `POST /api/animations` — inline JSON body `{ gloss, synonyms[], jsonData }`
- `POST /api/animations/upload` — multipart form with a `.json` file, or
- editing `scripts/seedGlosses.ts` directly and re-running it

Both endpoints currently just require being logged in — restrict them to
admins before shipping this for real (e.g. add a `role` field to `User`).

**Preferred way to add real signs**: Dashboard → **Animations**
(`app/dashboard/animations/`). Upload a Mixamo animation `.fbx` export
directly — it's parsed **in the browser** (`three`'s `FBXLoader`, via
`lib/animation/fbxToClipJson.ts`), validated against Mixamo's standard
~65-bone skeleton (`lib/animation/mixamoBones.ts` — rejects anything that
isn't a recognized Mixamo rig, with a clear reason why), converted to the
same native three.js `AnimationClip` JSON `mixamoJsonToClip.ts` already
plays back, and uploaded to Cloudinary through the existing `/api/animations`
endpoint. The FBX binary itself never touches the server. The same page also
has a plain JSON-file upload tab for when you already have a converted clip.
Both `/api/animations` and `/api/animations/upload` re-run the Mixamo
validation server-side too, so the check can't be bypassed by calling the
API directly.

### 4. Connecting your speech-to-text notebook

The STT/emotion/gloss pipeline runs in
[`lib/ipynb/WhishperBackend.ipynb`](lib/ipynb/WhishperBackend.ipynb) (Whisper,
fine-tuned for Sinhala, + a Sinhala→gloss dictionary + emotion classifier),
exposed through ngrok as a FastAPI server. Because ngrok's free-tier URL
changes every time the notebook restarts, this app never hardcodes it:

1. **Local dev**: run the notebook cell that prints
   `🌐 PUBLIC API URL`, copy it, and paste it into **Dashboard → Settings**
   in the app. That page calls `POST /api/admin/ngrok-url` (gated by your
   logged-in session) and every subsequent request uses it immediately.
2. **Deployed app** (e.g. Vercel, publicly reachable from Colab): set
   `APP_BASE_URL` near the bottom of the notebook's last cell instead, and it
   auto-POSTs its URL to `POST /api/config/ngrok-url` (header
   `x-api-key: NGROK_UPDATE_SECRET`) on every restart — no manual step at
   all. See [`notebook-integration/register_ngrok_url.py`](notebook-integration/register_ngrok_url.py).
3. Either way, `/api/stt` looks up the latest URL from MongoDB first
   (`lib/ngrok.ts`) before every request.
4. The notebook's `POST /translate` (path configurable via
   `STT_ENDPOINT_PATH`) accepts `multipart/form-data` with an `audio` file
   field and returns:

   ```json
   {
     "transcription": "...",
     "tokens": ["...", "..."],
     "pos_tags": [{ "word": "...", "tag": "..." }],
     "emotion": { "emotion": "happy", "confidence": 0.92 },
     "glosses": ["HELLO", "ME", "..."],
     "unknown_tokens": ["..."]
   }
   ```

   `app/api/stt/route.ts` normalizes this to
   `{ text, tokens, emotion, confidence, glosses, unknownTokens }`.

**Known notebook caveats** (documented inline in the `.ipynb` too):
- The emotion classifier must be loaded via `pipeline("audio-classification", ...)`,
  not a raw `Wav2Vec2ForSequenceClassification.from_pretrained(...)` — the
  latter silently leaves the classification head randomly initialized (the
  original load report showed `classifier`/`projector` weights as
  `MISSING`), so predictions were noise. Already fixed in cell-1/cell-3.
- `/translate` and CORS are currently wide open with no auth, and the ngrok
  authtoken is hardcoded in the notebook — left as-is intentionally for now
  since this is research-only. Lock both down (a shared-secret header on
  `/translate`, and moving the ngrok token to a Colab secret) before this is
  ever exposed beyond your own testing.

## How the audio → gloss → 3D pipeline works

1. **ASR + gloss resolution happens in the notebook** — Whisper (fine-tuned
   for Sinhala) transcribes the audio, `sinling` tokenizes the Sinhala text,
   and a curated `SINHALA_TO_GLOSS` dictionary maps tokens straight to gloss
   names. `POST /translate` returns `{ transcription, tokens, emotion,
   glosses, unknown_tokens }` already resolved — see
   `lib/ipynb/WhishperBackend.ipynb`.
2. **`/api/stt`** (`app/api/stt/route.ts`) proxies to the notebook and
   normalizes that response for the frontend.
3. **`/api/gloss/predict`** (`app/api/gloss/predict/route.ts`) takes the
   notebook's `glosses` array as its **primary** input and looks each token
   up directly in MongoDB for its Cloudinary animation URL — no NLP guessing
   needed since the notebook already did it. Anything the notebook resolved
   that isn't registered in Mongo/Cloudinary yet comes back as
   `unmatchedGlosses` so you know what to add next.
4. **Fallback path** — if no `glosses` were returned (e.g. testing with
   typed English text instead of audio), the route instead runs
   `lib/nlp/matchers/dictionaryMatcher.ts`: greedy longest-phrase matching
   against each gloss's synonyms, falling back to Levenshtein-based fuzzy
   matching for near-misses/typos. `lib/nlp/matchers/mlMatcher.stub.ts`
   documents the same `GlossMatcher` interface as a future drop-in for a
   trained model.
5. **Playback** (`components/three/Avatar.tsx`) — each matched gloss's JSON is
   fetched (via the same-origin `/api/animations/fetch` proxy to avoid CORS
   issues), converted to a `THREE.AnimationClip` by
   `lib/animation/mixamoJsonToClip.ts` (supports both native three.js
   AnimationClip JSON and a simpler per-bone keyframe schema — adjust to
   match your actual export format), and played back-to-back on an
   `AnimationMixer`.

## Project structure

```
app/              Pages + API routes (App Router)
components/       UI, home, audio, stt, gloss, three, dashboard, auth
lib/              db, auth, cloudinary, ngrok, nlp/, animation/, gsap, history
lib/ipynb/        WhishperBackend.ipynb — the actual STT/emotion/gloss notebook
models/           Mongoose schemas (User, Config, Gloss, SessionHistory)
scripts/          seedGlosses.ts
notebook-integration/  Reference copy of the ngrok auto-registration snippet
public/models/    Drop avatar.glb here
```

Dashboard → **Settings** (`app/dashboard/settings/`, `app/api/admin/ngrok-url/`)
is where you paste the notebook's ngrok URL during local dev. It's also
where the avatar itself lives now — there's no more hardcoded
`public/models/avatar.glb`. Upload one or more Mixamo character `.fbx`
exports (mesh + skeleton) under **Avatar models**; whichever is marked
active is what `AvatarViewer` loads (`app/api/models/`, `lib/activeModel.ts`,
stored in Cloudinary like everything else — flagged 15MB upload ceiling,
since Cloudinary's free tier caps raw uploads well under what a full
character FBX can weigh). The **Test animation JSON** section on the same
page lets you preview any local animation JSON on a saved model without
touching the notebook or `/api/gloss/predict` at all — useful for sanity
checking new exports. Gloss animation JSON can come in three shapes,
auto-detected by `lib/animation/mixamoJsonToClip.ts`: native three.js
`AnimationClip` JSON (what the FBX-animation-upload flow produces), a
simplified per-bone schema, or a baked per-frame export (`{ fps, duration,
frames: [{ time, bones: { "mixamorig:Name": { rotationEuler, position? } } }] }`
in degrees/centimeters) — the real-world format confirmed from an actual
sample export.

## Scripts

```bash
npm run dev      # start dev server
npm run build    # production build (also type-checks)
npm run lint     # eslint
npx tsx scripts/seedGlosses.ts   # seed sample glosses
```

## Known limitations / next steps

- Gloss matching is dictionary + fuzzy only — accuracy depends entirely on
  how many synonyms you register per gloss.
- `/api/animations*` endpoints only check "is logged in", not "is admin".
- The seeded glosses use placeholder animation data, not real signs.
- `lib/animation/mixamoJsonToClip.ts` supports two JSON shapes as a best
  guess — you may need to adjust it once you confirm your actual export
  format and bone names.
