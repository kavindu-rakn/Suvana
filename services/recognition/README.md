# Real-Time Sinhala Sign Language Recognition System

## Project Overview
This system provides real-time recognition of Sinhala Sign Language (SSL) gestures using deep learning, converting recognized gestures into speech output. It ships two front ends: a desktop OpenCV window (`main.py`) and a browser-based web app (`webapp/`).

## Web App

A browser UI with live camera capture, an animated caption showing the recognized gesture, a landmark skeleton overlay, and spoken audio (via gTTS) for each recognized sign.

Start it with:
```bash
.venv\Scripts\python.exe -m uvicorn webapp.server:app --host 127.0.0.1 --port 8000
```
Then open http://127.0.0.1:8000 in a browser and click **Start Camera**. Frames are streamed to the local server over a WebSocket (`/ws/recognize`) for recognition; nothing leaves your machine. Recognized-sign audio is generated with gTTS on first use and cached under `webapp/tts_cache/`.

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/sinhala_sign_language_recognition.git
cd sinhala_sign_language_recognition
===============================================================================
.venv\Scripts\python.exe -m uvicorn webapp.server:app --host 127.0.0.1 --port 8000
.venv\Scripts\python.exe main.py --mode recognize
# Unit testing
.venv\Scripts\python.exe -m pytest tests -v
```

## Suvana container (I-08)

From the monorepo root:

```bash
docker build -t suvana-recognition services/recognition
docker run --rm --name suvana-recognition -p 7860:7860 suvana-recognition
```

The image installs `requirements-runtime.txt` on Python 3.10, using
TensorFlow's [CPU package](https://www.tensorflow.org/install/pip) at the same
2.13.0 model-runtime version. The full upstream `requirements.txt` stays
unchanged for desktop/training use. Only the serving code, static UI, config,
existing `best_model.h5` and the two existing label maps are copied into the
image. No dataset, second model, cached audio or local environment is copied.
Do not regenerate either label map.

Startup must log `Loaded 171 gesture labels`. The container health check
requires `/api/info` to report 171 classes. Hosts can set `PORT` (default 7860);
publish that same container port. Keep one Uvicorn worker: each worker loads
its own TensorFlow model and MediaPipe instance.

`GET /api/info` preserves `sequenceLength`, `confidenceThreshold` and
`numClasses`, and adds `labels` (the existing label list), `backend` and
`model` (filename only). The JPEG WebSocket protocol at `/ws/recognize` is
unchanged. The page and socket must share this service's origin; the shell's
Vercel rewrite does not carry WebSockets.

The page accepts `?theme=light` or `?theme=dark`; absent/invalid values retain
the existing dark appearance. “Back to Suvana” returns to
`https://suvana-shell.vercel.app/`, which can be used before the custom domain
is attached. UI adoption still needs kvn's desktop/phone screenshot review.

Hosted recognition sends camera JPEGs to this service for inference. The
browser does not run the TensorFlow model. gTTS label audio and optional
assistant providers have separate network dependencies; core recognition
does not depend on those providers being available.

### Reproduce the backend comparison

Run inside the service folder, using its installed Python environment:

```bash
python tools/benchmark_websocket.py --out ../../.agent-local/evidence/I-08-websocket.json
```

The script runs a temporary localhost server with background gTTS warm-up
disabled. It sends blank synthetic JPEGs through the actual decode,
MediaPipe, sliding-window inference and WebSocket response path, fills the
30-frame buffer, warms five predictions, then measures 50 full windows per
backend. It asserts matching rounded response confidences and the additive
`/api/info` contract, and reports median/p90 round-trip milliseconds.
No signer, sign content, accuracy, public-host latency or real-device result
is implied by this synthetic comparison. The backend overrides exist only
inside the benchmark process; production retains the upstream engine.

On 15 Oct, the Linux image comparison gave `tf_function` median 146.09 ms /
p90 163.56 ms, versus `keras_predict` median 287.24 ms / p90 461.51 ms over
50 windows each, with identical rounded response confidences. The existing
`tf_function` preference is retained. These are this laptop's Docker results,
not measurements of the future D-04 host; raw evidence is recorded in the
I-08 handoff.
