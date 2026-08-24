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
  `EmotionClassifier.ipynb`), otherwise an off-the-shelf English wav2vec2
  fallback so the service works without it.

## API

- `GET /` — health: `{status, device, dtype, emotion_model, auth}`
- `POST /translate` — multipart field `audio` (WAV/WebM), optional
  `?emotion=false`. Returns
  `{transcription, tokens, emotion: {emotion, confidence}, glosses: [],
  unknown_tokens: [], timings_ms}`.
  Sends `401` without the right `x-api-key` header when `TRANSLATE_API_KEY`
  is set — set it in any real deployment (the notebook could run open only
  because ngrok URLs are unguessable).

## Deploying (Hugging Face Docker Space — free CPU tier fits)

1. Create a Space → Docker → blank; upload this folder's files (or point the
   Space at the repo subfolder via CI later).
2. In Space settings → Variables/Secrets set `TRANSLATE_API_KEY` (and
   optionally the self-registration trio from `.env.example`).
3. First build downloads ~3.5 GB of weights; later starts reuse the cache.
   CPU inference with whisper-medium is slow (~10–20× GPU) — fine for demos;
   a GPU Space or `WHISPER_BASE_MODEL=openai/whisper-small` (quality tradeoff,
   needs a matching adapter) if it isn't.

## Pointing the communicate app at it

The app reads this service's URL from MongoDB, so no code change:

- paste the Space URL into **Dashboard → Settings** in the app, **or**
- set `PUBLIC_URL`, `APP_CONFIG_URL`
  (`https://<shell-domain>/communicate/api/config/ngrok-url`) and
  `NGROK_UPDATE_SECRET` here and the service registers itself on startup.

Give the app `STT_API_KEY` = this service's `TRANSLATE_API_KEY` so its
`/api/stt` proxy authenticates.

## Run locally

```bash
pip install -r requirements.txt
python app.py           # http://localhost:7860 — first run downloads models
```
