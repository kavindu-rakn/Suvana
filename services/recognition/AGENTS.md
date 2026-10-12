# Recognize (`services/recognition`): instructions for every coding agent

Read the root `AGENTS.md` first; everything there applies here. This file adds
only what is specific to Recognize. The plan for it is in
`docs/plan/05-integration.md` (Recognize section and contracts).

## What Recognize is

- **Lahiru's code**, synced from R26-SE-019
  `sinhala_sign_language_recognition/` with `tools/sync/` (entry `recognition`
  in `tools/sync/upstreams.json`). kvn hosts it under Suvana.
- FastAPI + TensorFlow + MediaPipe: the browser captures landmarks and streams
  them over the WebSocket `/ws/recognize`; `webapp/static/` is its own
  Suvana-branded frontend.

## Rules

- **Integrate at the contract level.** Keep Lahiru's WebSocket protocol
  unchanged and existing `/api/info` fields as they are (planned additions,
  such as I-08's, are additive only); do not rewrite his model, preprocessing
  or server logic. Suvana-specific changes are declared in
  `tools/sync/upstreams.json` with a reason and, where a merge could undo
  them, a guard.
- **Never regenerate the label files** (`data/processed/labels.npy`,
  `webapp/data/sinhala_labels.json`; do not run `webapp/build_sinhala_labels.py`).
  Their order must match the trained model's outputs.
- **From upstream take code and tests only** (DN-18): never add `.h5` models
  beyond the two already tracked in `models/saved_models/`, training PNGs,
  notebooks, training scripts, `demo_sentences.py` or `model_comparison.json`. `config.yaml` keeps the model
  path `models/saved_models/best_model.h5`.
- **Never quote a recognition accuracy** (including 98.78%) as a Suvana result
  unless Lahiru confirms a split by source video.
- **One brand.** No SoundGuard, Sawana or SignSpeak in user-visible copy.
  Internal file names such as `soundguard.js` are known (bug X1, Q-03).
- Datasets, videos and secrets never enter the repo.

## Gates (Git Bash, from `services/recognition`)

```bash
python -m pytest tests/test_keypoint_augmentation.py tests/test_sinhala_labels.py -q
```

Also run `MSYS_NO_PATHCONV=1 node tools/sync/sync.mjs guard` from the
worktree root.

## Running

See `README.md` here (venv, `uvicorn webapp.server:app --port 8000`) and
`DEPLOY-SUVANA.md` (Docker). A healthy start logs
"Loaded 171 gesture labels".
