# Demo runbook

Running the whole product locally, from this repo. Paths assume the repo is at
`C:/Users/User/Documents/Suvana` — adjust if it moves.

Everything is reachable from the shell landing at **http://localhost:5173**.
Start there and navigate; you should never need to type another URL.

## Start — three terminals

**1. Shell.** Owns the root and proxies the other web modules, so this is the
one you open in a browser.

```
npm --prefix apps/shell run dev
```

**2. Learn.** Must be on port **5174** — the shell proxies `/learn/` there.
`npm run dev` regenerates the reference index first; `npx vite` skips that hook
and the app loads with no signs.

```
npm --prefix apps/learn run dev
```

**3. Communicate.** Must be on port **3000**. Needs `apps/communicate/.env.local`
(copy `.env.local.example`). Its first request compiles for ~30 s.

```
npm --prefix apps/communicate run dev
```

Then open **http://localhost:5173**.

### Fourth terminal — Recognize, if you are demoing it

Recognition cannot be proxied (the browser streams camera frames over a
WebSocket and Vercel rewrites do not carry the upgrade), so it runs on its own
origin. The landing card links to port 8000 and confirms by probe.

There is no venv in this repo — it would be ~3 GB of TensorFlow duplicated from
the team repo — so borrow that one. It runs this repo's copy of the app via
`--app-dir`:

```
../R26-SE-019/sinhala_sign_language_recognition/.venv/Scripts/python.exe -m uvicorn --app-dir services/recognition webapp.server:app --host 127.0.0.1 --port 8000
```

Wait for `Application startup complete`, and check the lines above it read
**`Loaded 171 gesture labels`** and **`Loaded 171 Sinhala label translations`**.
If either says `0`, see Troubleshooting.

> Nothing else may be listening on 8000. An older server from the team repo
> answers the probe just as happily and you will demo the unbranded page
> without noticing.

### Fifth terminal — Alerts, only with a phone

Alerts is a phone app; `/alerts/` explains the build and pairs a device. Only
needed if you are actually scanning the code:

```
npx expo start --dev-client --prefix apps/alerts
```

Paste the `exp://…` address it prints into the field on `/alerts/`.

## What to show

| Where | What | Notes |
|---|---|---|
| Landing → **Ask Suvana AI** | Q&A over all 171 signs | Works with nothing else running; a free Gemini key makes it conversational |
| Landing → **Open Learn** | Practice, scored against real signers | Use the **Restaurant** scenario |
| Landing → **Open Communicate** | Speech → 3D signing avatar | See status below |
| Landing → **Open Recognize** | Sign → speech, live camera | Speaks the sign aloud in Sinhala |
| Landing → **Open Alerts** | What the phone app does, and pairing | Honest about the dev-build requirement |
| `/learn/?mode=author` | Record / Library / Study tabs | Reference recorder + latency figures |

Scenario coverage: **Restaurant 5/5** references, **Introductions 3/7**. Demo
Restaurant.

## Status — what works today

| Module | State |
|---|---|
| Shell + assistant | **Working.** The assistant carries its own sign index and needs no service |
| Learn | **Working.** 490 signs, 501 reference recordings |
| Recognize | **Working.** 171 signs, Sinhala labels, speech output — with the two data files below |
| Communicate | **UI works.** Transcription needs the speech backend, which is a Colab/ngrok URL read from MongoDB |
| Alerts | **Not demoable without a dev build.** Expo Go cannot load its native modules; `/alerts/` says so rather than offering a dead button |

Say this up front rather than discovering it on the projector.

## Two data files Recognize needs that are not in this repo

Both are gitignored derived data and must come from the team repo (or from
Lahiru). Do not regenerate `labels.npy` from the Kaggle corpus: the label order
has to match the trained model's output indices exactly, or every prediction is
silently mislabelled.

| File | Effect when missing |
|---|---|
| `services/recognition/data/processed/labels.npy` | Every result reads `Gesture_0`…`Gesture_170` |
| `services/recognition/webapp/data/sinhala_labels.json` | No Sinhala script, and the assistant *on that page* answers "0 signs" |

```
cp ../R26-SE-019/sinhala_sign_language_recognition/data/processed/labels.npy services/recognition/data/processed/
cp ../R26-SE-019/sinhala_sign_language_recognition/webapp/data/sinhala_labels.json services/recognition/webapp/data/
```

The shell's own assistant is unaffected — its knowledge base is committed at
`apps/shell/public/data/signs.json`. Rebuild it after a retrain with:

```
python -X utf8 apps/shell/scripts/build-sign-index.py
```

## Troubleshooting

**The Recognize card says "Local · not running"** — nothing answered on 8000 or
7860. The link still points at 8000, so start the service and reload.

**The Recognize page is not Suvana-branded** — something else is on 8000,
almost certainly the team repo's copy from another terminal. Stop it.

**`Loaded 0 gesture labels`** — `labels.npy` is missing; see above.

**Communicate 500s in the shell** — it is not running on 3000. The landing
degrades to "Sign in / Create account" and everything else still works.

**Learn loads with no signs** — `npm run dev` regenerates the reference index
via a `predev` hook. Running `npx vite` directly skips it.

**`UnicodeEncodeError` from a Python script** — the Windows console is cp1252
and the labels are not. Run it as `python -X utf8 …`.
