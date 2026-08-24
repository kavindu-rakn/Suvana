import base64
import json
import os
import re
import sys
import threading
from contextlib import asynccontextmanager
from pathlib import Path

import cv2
import numpy as np
import yaml
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.concurrency import run_in_threadpool

ROOT_DIR = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT_DIR / "src"
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

try:
    from data_preprocessing.frame_extractor import FrameExtractor  # noqa: E402
    from recognition.web_stream_recognizer import StreamRecognizer  # noqa: E402
except ImportError:
    from src.data_preprocessing.frame_extractor import FrameExtractor  # noqa: E402
    from src.recognition.web_stream_recognizer import StreamRecognizer  # noqa: E402

STATIC_DIR = Path(__file__).resolve().parent / "static"
TTS_CACHE_DIR = Path(__file__).resolve().parent / "tts_cache"
TTS_CACHE_DIR.mkdir(exist_ok=True)

with open(ROOT_DIR / "config" / "config.yaml", "r") as f:
    config = yaml.safe_load(f)

os.chdir(ROOT_DIR)  # model/data paths in config.yaml are relative to the project root

import tensorflow as tf  # noqa: E402

print(f"Loading model from {config['model']['model_path']}")
model = tf.keras.models.load_model(config['model']['model_path'])
feature_extractor = FrameExtractor(config)

labels_path = Path(config['dataset']['processed_path']) / "labels.npy"
if labels_path.exists():
    unique_labels = sorted(set(np.load(labels_path, allow_pickle=True).tolist()))
else:
    unique_labels = []
label_map = {i: str(label) for i, label in enumerate(unique_labels)}
print(f"Loaded {len(label_map)} gesture labels")

SINHALA_LABELS_PATH = Path(__file__).resolve().parent / "data" / "sinhala_labels.json"
if SINHALA_LABELS_PATH.exists():
    sinhala_labels = json.loads(SINHALA_LABELS_PATH.read_text(encoding="utf-8"))
else:
    sinhala_labels = {}
print(f"Loaded {len(sinhala_labels)} Sinhala label translations")


def _safe_cache_name(text):
    slug = re.sub(r"[^A-Za-z0-9]+", "_", text).strip("_").lower()
    return slug[:120] or "audio"


def _warm_tts_cache():
    """Pre-generate any missing label audio in the background so /api/speak
    never has to hit gTTS live mid-session -- a live gTTS call (network
    round-trip) was making spoken audio lag noticeably behind real-time
    detections, especially for labels never spoken before in that session.
    """
    import time
    from gtts import gTTS

    for label, entry in sinhala_labels.items():
        speak_text = entry.get("speakText") or label
        speak_lang = entry.get("speakLang") or config['speech']['language']
        cache_path = TTS_CACHE_DIR / f"{_safe_cache_name(label)}_{speak_lang}.mp3"
        if cache_path.exists():
            continue
        try:
            gTTS(text=speak_text, lang=speak_lang).save(str(cache_path))
        except Exception as e:
            print(f"TTS warm-up failed for {label!r}: {e}")
        time.sleep(0.15)


@asynccontextmanager
async def lifespan(app: FastAPI):
    threading.Thread(target=_warm_tts_cache, daemon=True).start()
    yield


app = FastAPI(title="Sinhala Sign Language Recognition", lifespan=lifespan)

# --- සවන AI assistant -------------------------------------------------------
# Additive only: mounts the assistant's own /api/assistant/* routes. It shares
# no state with the recognition pipeline, and if the module is missing or fails
# to import the rest of the app carries on exactly as before.
_WEBAPP_DIR = Path(__file__).resolve().parent
if str(_WEBAPP_DIR) not in sys.path:
    sys.path.insert(0, str(_WEBAPP_DIR))
try:
    from assistant import router as assistant_router  # noqa: E402

    app.include_router(assistant_router)
    print("AI assistant mounted at /api/assistant")
except Exception as _assistant_error:  # pragma: no cover - never block startup
    print(f"AI assistant unavailable ({_assistant_error}); core app unaffected")
# ---------------------------------------------------------------------------

# --- SoundGuard Mobile integration -----------------------------------------
# Additive only: mounts /api/soundguard/* for mobile Expo/QR connection info.
try:
    from soundguard import router as soundguard_router  # noqa: E402

    app.include_router(soundguard_router)
    print("SoundGuard integration mounted at /api/soundguard")
except Exception as _soundguard_error:  # pragma: no cover - never block startup
    print(f"SoundGuard integration unavailable ({_soundguard_error}); core app unaffected")
# ---------------------------------------------------------------------------


def _decode_data_url(data_url):
    _, b64data = data_url.split(",", 1)
    img_bytes = base64.b64decode(b64data)
    np_arr = np.frombuffer(img_bytes, np.uint8)
    return cv2.imdecode(np_arr, cv2.IMREAD_COLOR)


def _landmarks_to_points(landmark_list):
    if not landmark_list:
        return []
    return [
        [round(float(lm.x), 4), round(float(lm.y), 4), round(float(lm.z), 4)]
        for lm in landmark_list.landmark
    ]


@app.get("/")
def index():
    return FileResponse(str(STATIC_DIR / "index.html"))


@app.get("/api/info")
def get_info():
    return JSONResponse({
        "sequenceLength": config['video']['frames_per_sequence'],
        "confidenceThreshold": config['recognition']['confidence_threshold'],
        "numClasses": len(unique_labels),
    })


@app.get("/api/labels")
def get_labels():
    items = [
        {"label": label, "sinhala": sinhala_labels.get(label, {}).get("sinhala", label)}
        for label in unique_labels
    ]
    return JSONResponse({"labels": items, "count": len(items)})


@app.get("/api/speak")
def speak(text: str):
    from gtts import gTTS

    entry = sinhala_labels.get(text)
    speak_text = entry["speakText"] if entry else text
    speak_lang = entry["speakLang"] if entry else config['speech']['language']

    cache_path = TTS_CACHE_DIR / f"{_safe_cache_name(text)}_{speak_lang}.mp3"
    if not cache_path.exists():
        tts = gTTS(text=speak_text, lang=speak_lang)
        tts.save(str(cache_path))
    return FileResponse(str(cache_path), media_type="audio/mpeg")


@app.websocket("/ws/recognize")
async def ws_recognize(websocket: WebSocket):
    await websocket.accept()
    recognizer = StreamRecognizer(config, model, feature_extractor)

    try:
        while True:
            message = await websocket.receive_text()

            if message == "__reset__":
                recognizer.reset()
                await websocket.send_json({"type": "reset_ack"})
                continue

            frame = await run_in_threadpool(_decode_data_url, message)
            if frame is None:
                await websocket.send_json({"type": "error", "message": "Could not decode frame"})
                continue

            gesture_idx, confidence, detection_results, buffer_progress = await run_in_threadpool(
                recognizer.push_frame, frame
            )

            payload = {
                "type": "frame_result",
                "confidence": round(confidence, 4),
                "bufferProgress": round(buffer_progress, 4),
            }
            if gesture_idx is not None:
                gesture_label = label_map.get(gesture_idx, f"Gesture_{gesture_idx}")
                payload["gesture"] = gesture_label
                payload["gestureSinhala"] = sinhala_labels.get(gesture_label, {}).get("sinhala", gesture_label)

            if detection_results is not None:
                payload["landmarks"] = {
                    "face": _landmarks_to_points(detection_results.face_landmarks),
                    "pose": _landmarks_to_points(detection_results.pose_landmarks),
                    "leftHand": _landmarks_to_points(detection_results.left_hand_landmarks),
                    "rightHand": _landmarks_to_points(detection_results.right_hand_landmarks),
                }

            await websocket.send_json(payload)
    except WebSocketDisconnect:
        pass


app.mount("/", StaticFiles(directory=str(STATIC_DIR)), name="static")
