# services/speech

Sinhala ASR + audio emotion recognition as a persistent FastAPI service — the
de-Colab'd replacement for the notebook that used to serve `apps/communicate`
through ngrok.

**Provenance**: faithful extraction (24 Aug 2026) of the pipeline in
`apps/communicate/notebook-integration/build_notebook.py` (WhishperBackend V2,
Lithira's component). Same models, same functions, same response contract.
`features.py` is verbatim `_shared_features.py` — the train/serve-skew
contract with `EmotionClassifier.ipynb`; never let the two diverge.

## What it runs

- **ASR**: `openai/whisper-medium` + LoRA adapter
  `SPEAK-ASR/whisper-si-exp-10-medium-all` (fine-tuned Sinhala), merged,
  greedy decode, 96-token cap.
- **Tokenization**: `sinling` SinhalaTokenizer (gloss mapping happens in the
  web app against MongoDB — not here).
- **Emotion**: the trained prosody classifier if `emotion_clf.joblib` is
  present (**ask Lithira for the artifact** — output of
  `EmotionClassifier.ipynb`), otherwise
  `r-f/wav2vec-english-speech-emotion-recognition`. The English fallback is
  not evidence of validated Sinhala emotion recognition.

## API

- `GET /` — health: `{status, device, dtype, emotion_model, auth}`
- `POST /translate` — multipart field `audio` (WAV/WebM), optional
  `?emotion=false`. Returns
  `{transcription, tokens, emotion: {emotion, confidence}, glosses: [],
  unknown_tokens: [], timings_ms}`.
  Sends `401` without the right `x-api-key` header when `TRANSLATE_API_KEY`
  is set. Set it before exposing the service through a tunnel; an unguessable
  URL does not replace authentication.

## Demo decision: laptop only (DN-03, 15 Oct)

The final-demo plan uses this service on kvn's laptop. Hosted deployment is
not part of I-09. A successful image build alone does not verify model
downloads, warm-up, transcription quality, emotion quality or demo latency.

Weights download at **first startup**, not during `docker build`: app.py loads
the Whisper base, LoRA adapter and optional emotion fallback at import time,
then warms inference before opening the HTTP listener. A network/cache/model
error can therefore prevent even `GET /` from becoming reachable. Keep the
model cache between rehearsals; measure cold and cached starts separately.
CPU inference and first-start duration must be measured on the demo laptop;
the previous size/speed estimates are not acceptance evidence.

Before rehearsal, confirm these exact values with Lithira:

| Item | Current source default | Confirmation needed |
|---|---|---|
| `WHISPER_BASE_MODEL` | `openai/whisper-medium` | Exact model and revision used in his working demo |
| `WHISPER_ADAPTER_ID` | `SPEAK-ASR/whisper-si-exp-10-medium-all` | Access, revision and compatibility with that base |
| Emotion artifact | `emotion_clf.joblib` via `EMO_CLF_PATH` | Supply the classifier bundle and matching scikit-learn/joblib versions |
| Emotion fallback | `r-f/wav2vec-english-speech-emotion-recognition` | Is this the intended fallback, and what limitations should the demo state? |

These IDs match the existing extracted pipeline/notebook; that is a static
consistency check, not confirmation from Lithira. Do not switch only the base
to Whisper-small: it needs a compatible adapter too. Keep weights and the
classifier artifact outside Git.

### Observed emotion blocker and proposed demo fallback

The I-09 startup check reported the checkpoint's
`classifier.dense.*` / `classifier.out_proj.*` weights as unexpected and the
loader's `projector.*` / `classifier.*` weights as missing and newly initialized.
The service still starts and reports health OK. That does **not** establish a
working trained emotion head; do not present this fallback's output as an
emotion result. The current check does not establish when the mismatch began.

Ask Lithira for the trained `emotion_clf.joblib` bundle and matching package
versions, or a confirmed compatible loader/checkpoint pair. If kvn chooses an
ASR-only demo meanwhile, the existing Communicate setting
`STT_ENDPOINT_PATH=/translate?emotion=false` disables per-request emotion
inference. That returns the existing neutral/null-confidence placeholder,
which must be described as **emotion disabled**, not a measured neutral mood.
This is a proposed choice for kvn, not a configuration change made by I-09.
It still loads/warms the emotion model at startup; it does not reduce the
current image size or cold-start downloads.

## Configuration for the laptop

- Set `TRANSLATE_API_KEY` on speech and the **same value** as `STT_API_KEY`
  on Communicate. The server-side `/communicate/api/stt` proxy sends it in
  `x-api-key`; callers still need a Communicate session. Keep values private.
- Set `WHISPER_BASE_MODEL` / `WHISPER_ADAPTER_ID` only after confirming the
  pair. `EMO_CLF_PATH` selects Lithira's existing classifier bundle when supplied.
- `HF_HOME` controls the Hugging Face cache; Docker defaults to
  `/home/user/.cache/huggingface`. Use a persistent local volume for rehearsal.
- Configure environment variables in the launching shell/container; app.py
  does not automatically load a copied `.env` file.
- Manual URL registration is enough. Leave `PUBLIC_URL`, `APP_CONFIG_URL` and
  `NGROK_UPDATE_SECRET` unset unless kvn explicitly chooses self-registration.
  That trio makes an authenticated configuration write to Communicate on startup.

## Pointing the communicate app at it

The app reads this service's URL from MongoDB, so no code change:

- paste the speech URL into **Dashboard → Settings** in the app, **or**
- set `PUBLIC_URL`, `APP_CONFIG_URL`
  (`https://<shell-domain>/communicate/api/config/ngrok-url`) and
  `NGROK_UPDATE_SECRET` here and the service registers itself on startup.

For locally running Communicate on the same laptop, use
`http://127.0.0.1:7861`. A deployed Vercel proxy cannot reach the laptop's
loopback address: kvn must start a reachable tunnel and register that HTTPS
URL instead. Re-register whenever the tunnel URL changes. Binding the laptop
service to loopback keeps it private until that deliberate tunnel step.

## Run locally

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 7861
```

Set the variables above before launching. Port 7861 avoids Recognize's 7860.
For browser WebM/Opus audio, local Python also needs `ffmpeg` available on
PATH; the Docker image installs it. Check that before rehearsing audio.
In Git Bash on Windows use `.venv/Scripts/python.exe`; on Linux use
`.venv/bin/python` for a Linux-created environment.
The existing `python app.py` entry point also supports `PORT` (default 7860),
but binds all interfaces; the explicit loopback command is preferable locally.

## Docker build/start check

From the monorepo root, with a context containing no private `.env` files,
model artifacts or local environments (the current Dockerfile uses `COPY . .`
and has no `.dockerignore`):

```powershell
docker build -t suvana-speech services/speech
docker volume create suvana-speech-model-cache
docker run --rm --user 0 --entrypoint sh --mount source=suvana-speech-model-cache,target=/cache suvana-speech -c 'chown -R 1000:1000 /cache'
docker run --rm --name suvana-speech -p 127.0.0.1:7861:7860 --mount source=suvana-speech-model-cache,target=/home/user/.cache/huggingface --env TRANSLATE_API_KEY suvana-speech
```

In Git Bash, prefix the Docker commands that use container paths with
`MSYS_NO_PATHCONV=1` to prevent Windows path conversion.

`--env TRANSLATE_API_KEY` copies the already-set shell value without placing
its value in command history. Add confirmed model variables the same way.
The one-time cache ownership step lets the image's UID 1000 write downloads
to a new named volume; subsequent runs reuse it.
The Docker CMD listens on fixed internal port 7860; changing `PORT` does not
change that CMD, so map host 7861 to container 7860 as shown.

After startup, `GET http://127.0.0.1:7861/` must report `status: "ok"` and
`auth: "required"`. Then test one real audio request through signed-in
Communicate. A listening port is not a transcription/emotion acceptance test.
Record the image ID/size, cold-start seconds to the first successful health
response, cached-start seconds and audio timings. Do not treat a failed start
or a build duration as first-start performance.

### Local result, 15 Oct 2026

The existing Dockerfile built successfully from an exact tracked-source
snapshot; `pip check` passed. Image `suvana-speech:i-09` reports
**10,645,268,903 bytes** via `docker image inspect` (model cache is separate).
Its unpinned requirements resolved Torch 2.14.1, Transformers 5.19.0,
PEFT 0.21.2, FastAPI 0.143.1 and Starlette 1.8.0, including CUDA/NVIDIA
dependencies. No runtime files or dependency versions were changed by I-09.

With a new empty model-cache volume, anonymous downloads and CPU float32,
first successful HTTP health was observed **760.4 seconds** after container
launch (2-second polling). Health reported `status: "ok"`, `device: "cpu"`,
`auth: "required"`; a multipart request without the key returned **401**.
The temporary test container/key were removed; the populated task cache is
retained for a retry/rehearsal. This verifies startup/authentication only.
Real-audio transcription, emotion quality, cached-start timing and the
signed-in Communicate flow remain separate rehearsal checks. The missing
emotion-head weights above remain a demo blocker until kvn chooses a fallback
or Lithira supplies the correct classifier.

Image identity, exact evidence paths, retained cache name and remaining
actions are in [the I-09 handoff](../../docs/plan/handoffs/I-09.md).
