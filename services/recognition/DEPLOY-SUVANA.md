# Deploying the recognition module (Suvana)

Suvana-specific notes. `README.md` in this folder is Lahiru's original and
still describes local development accurately.

## Why this one is not behind the shell's `/api/*` rewrite

The browser streams camera frames to `/ws/recognize` over a **WebSocket**.
Vercel's rewrites do not proxy WebSocket upgrades, so — unlike
`apps/communicate` — this module cannot be mounted on a path of the shell
domain. It runs on **its own origin** (a subdomain such as
`recognize.<suvana-domain>`, or the container host's URL).

That is also why it needs no CORS configuration: the page and the WebSocket
are served by this same service, so every request is same-origin.

The capture itself is browser-side (`getUserMedia` → JPEG data URL → WebSocket),
so unlike the old Flask/OpenCV version this works off localhost.

## Two data files it needs, which are not in this repo

Both are derived from Lahiru's processed dataset and must come from him — do
not regenerate them from the Kaggle corpus, because the label order has to
match the trained model's output indices exactly or every prediction is
silently mislabelled.

| File | Effect when missing |
|---|---|
| `data/processed/labels.npy` | 171 label strings. Without it every result reads `Gesture_0`…`Gesture_170`. |
| `webapp/data/sinhala_labels.json` | Sinhala script per label. Without it `gestureSinhala` falls back to the English gloss. Regenerate with `python webapp/build_sinhala_labels.py` once `labels.npy` is present. |

Neither blocks startup — the server logs `Loaded 0 gesture labels` and keeps
running — so check that line after deploying.

## Deploy

```bash
docker build -t suvana-recognition .
docker run -p 7860:7860 suvana-recognition
```

On a Hugging Face Docker Space, the defaults (port 7860, uid 1000) already
match. The image is ~3 GB and the 52 MB model is baked in, so the first build
is slow; inference is CPU-only unless the host provides a GPU.

## After deploying

Point the shell's Recognize card at the service URL: put the origin in the
`data-service-url` attribute on the `Recognize` card in
`apps/shell/index.html` (there is a marked comment above it). The card turns
itself from "Ready to deploy" into a link and flips its own badge to "Live
Service" — there is nothing else to change.

Locally the shell already falls back to `http://localhost:7860`, so a container
started with the command above is reachable from the landing page with no edit.
