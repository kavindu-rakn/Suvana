"""
Emits notebook-integration/WhishperBackend.ipynb.

Kept as a generator rather than a hand-edited .ipynb so the cell sources stay
reviewable in diffs — notebook JSON is painful to read in a pull request.

Run:  python notebook-integration/build_notebook.py
"""

import json
import pathlib

from _shared_features import FEATURE_SOURCE

CELLS = [
# ─────────────────────────────────────────────────────────────────────────
r'''!pip install -q transformers peft librosa soundfile sinling torch fastapi uvicorn pyngrok python-multipart nest-asyncio joblib scikit-learn "torchao>=0.16.0"''',
# ─────────────────────────────────────────────────────────────────────────
r'''import torch, librosa, numpy as np, time, os
from transformers import (
    WhisperForConditionalGeneration, WhisperProcessor,
    Wav2Vec2FeatureExtractor, Wav2Vec2ForSequenceClassification,
)
from peft import PeftModel
from sinling import SinhalaTokenizer

device = "cuda" if torch.cuda.is_available() else "cpu"
# fp16 roughly halves Whisper's inference time on a GPU and costs no accuracy
# that matters here. CPU stays fp32 — half precision is slower on CPU.
dtype = torch.float16 if device == "cuda" else torch.float32
print(f"Device: {device}  dtype: {dtype}")
if device == "cpu":
    print("WARNING: no GPU. Whisper-medium on CPU is ~10-20x slower.")
    print("         In Colab: Runtime -> Change runtime type -> T4 GPU.")

# ── Whisper ASR ──
BASE_MODEL = "openai/whisper-medium"
ADAPTER_ID = "SPEAK-ASR/whisper-si-exp-10-medium-all"

whisper_processor = WhisperProcessor.from_pretrained(BASE_MODEL)
whisper_model = WhisperForConditionalGeneration.from_pretrained(BASE_MODEL)
whisper_model = PeftModel.from_pretrained(whisper_model, ADAPTER_ID)
whisper_model = whisper_model.merge_and_unload().to(device=device, dtype=dtype).eval()
print("Whisper ready")

# ── Sinhala tokenizer ──
# POS tagging was removed: it ran on every request and the web app never
# received the result (app/api/stt/route.ts drops pos_tags), so it was pure
# latency. Only the tokenizer is needed.
sinhala_tokenizer = SinhalaTokenizer()
print("Tokenizer ready")

# ── Feature extraction ──
# Injected verbatim from notebook-integration/_shared_features.py, the same
# source EmotionClassifier.ipynb is built from. Sharing one definition is what
# prevents train/serve skew: if the two computed features even slightly
# differently, the classifier would receive vectors that mean something other
# than what it learned on, and accuracy would degrade with nothing in the logs.
# @@FEATURES@@

# ── Emotion ──
# Two paths, decided by whether the trained classifier is present.
#
#   emotion_clf.joblib  -> the prosody model from EmotionClassifier.ipynb.
#                          Trained on the four emotions the avatar performs,
#                          and ~20x faster than the transformer below.
#   otherwise           -> the off-the-shelf English wav2vec2 model, so the
#                          notebook still runs before the classifier exists.
#
# Automatic rather than a flag: forgetting to flip a switch after uploading
# the artifact would silently keep serving the worse model.
EMO_CLF_PATH = "/content/emotion_clf.joblib"
USE_TRAINED_EMOTION = os.path.exists(EMO_CLF_PATH)

if USE_TRAINED_EMOTION:
    import joblib
    _emo_bundle = joblib.load(EMO_CLF_PATH)
    emo_model = _emo_bundle["model"]
    EMO_LABELS = _emo_bundle["labels"]
    _m = _emo_bundle["metrics"]
    print(f"Emotion classifier ready — {_m['algorithm']} trained on {_m.get('trained_on','?')}, "
          f"macro-F1 {_m['macro_f1']*100:.1f}% ({_m['cv']})")
else:
    EMO_ID = "r-f/wav2vec-english-speech-emotion-recognition"
    emo_extractor = Wav2Vec2FeatureExtractor.from_pretrained(EMO_ID)
    emo_model = Wav2Vec2ForSequenceClassification.from_pretrained(EMO_ID).to(device).eval()
    print("Emotion classifier ready — off-the-shelf English wav2vec2 (fallback)")
    print(f"  Upload {EMO_CLF_PATH} and re-run this cell to use the trained model.")

# ── Warm-up ──
# The first inference pays CUDA kernel compilation and lazy weight init, which
# can be 5-10s. Doing it here means the first *real* request doesn't.
_silence = np.zeros(16000, dtype=np.float32)
with torch.inference_mode():
    _f = whisper_processor(_silence, sampling_rate=16000, return_tensors="pt")
    whisper_model.generate(
        _f.input_features.to(device=device, dtype=dtype),
        language="sinhala", task="transcribe", max_new_tokens=8, num_beams=1,
    )
    if not USE_TRAINED_EMOTION:
        emo_model(**emo_extractor(_silence, sampling_rate=16000, return_tensors="pt").to(device))
# librosa and numba compile on first call too — a few hundred ms that would
# otherwise land on the first real request.
if USE_TRAINED_EMOTION:
    _v, _ = extract_features(np.random.randn(16000).astype(np.float32) * 0.01)
    emo_model.predict_proba([_v])
print("Warm-up done — models are hot\n")''',
# ─────────────────────────────────────────────────────────────────────────
r'''# Cap on generated tokens. Whisper defaults to 448, and without a limit a
# short or silent clip can ramble until it hits that ceiling — the single
# biggest source of unpredictable latency. A sign-language utterance is short.
MAX_NEW_TOKENS = 96

def load_audio(path):
    """Decode once, reuse for both models. The old code loaded the file twice."""
    waveform, _ = librosa.load(path, sr=16000, mono=True)
    return waveform.astype(np.float32)

def transcribe(waveform):
    inputs = whisper_processor(waveform, sampling_rate=16000, return_tensors="pt")
    features = inputs.input_features.to(device=device, dtype=dtype)
    with torch.inference_mode():
        ids = whisper_model.generate(
            features,
            language="sinhala",
            task="transcribe",
            max_new_tokens=MAX_NEW_TOKENS,
            # Greedy. Beam search multiplies decoder passes for accuracy we
            # don't need on short utterances.
            num_beams=1,
        )
    return whisper_processor.batch_decode(ids, skip_special_tokens=True)[0].strip()

def detect_emotion(waveform):
    """
    Returns {"emotion": str, "confidence": float|None}.

    This shape is the contract with the web app — app/api/stt/route.ts reads
    `emotion.emotion` and `emotion.confidence`, and lib/emotion/styles.ts maps
    the label onto an avatar posture. Both branches below honour it, so
    swapping the model changes nothing on the web side.
    """
    if USE_TRAINED_EMOTION:
        # Trim first: the model was trained on trimmed audio, and leading
        # silence would skew duration and pause features away from anything
        # it has seen.
        trimmed, _ = librosa.effects.trim(waveform, top_db=30)
        if trimmed.size < 0.4 * 16000:
            return {"emotion": "neutral", "confidence": None}
        vec, _ = extract_features(trimmed)
        probs = emo_model.predict_proba([vec])[0]
        i = int(np.argmax(probs))
        return {"emotion": EMO_LABELS[i], "confidence": round(float(probs[i]), 3)}

    inputs = emo_extractor(waveform, sampling_rate=16000, return_tensors="pt", padding=True)
    with torch.inference_mode():
        logits = emo_model(**inputs.to(device)).logits
    scores = torch.nn.functional.softmax(logits, dim=1)[0]
    idx = int(torch.argmax(scores))
    return {"emotion": emo_model.config.id2label[idx], "confidence": round(float(scores[idx]), 3)}

def full_pipeline(audio_path, want_emotion=True):
    """
    Audio -> transcript + Sinhala word tokens.

    Note what is NOT here any more: the Sinhala->gloss lookup. It used to be a
    dict here doing exact matches, so any inflected or misspelled word
    ("කොහෙදද" for "කොහෙද") was silently dropped and the sign was lost.

    Mapping now happens in the web app (lib/nlp/matchers/sinhalaMatcher.ts),
    which handles suffix stripping and sound-alike spellings, and reads one
    dictionary from MongoDB that is editable from Dashboard -> Animations.
    Two dictionaries that could drift apart is now one.
    """
    t0 = time.perf_counter()
    waveform = load_audio(audio_path)
    t_load = time.perf_counter()

    text = transcribe(waveform)
    t_asr = time.perf_counter()

    tokens = sinhala_tokenizer.tokenize(text) if text else []
    t_tok = time.perf_counter()

    emotion = detect_emotion(waveform) if want_emotion else {"emotion": "neutral", "confidence": None}
    t_emo = time.perf_counter()

    return {
        "transcription": text,
        "tokens": tokens,
        "emotion": emotion,
        # Kept for older clients; the app prefers `tokens`.
        "glosses": [],
        "unknown_tokens": [],
        "timings_ms": {
            "audio": round((t_load - t0) * 1000),
            "asr": round((t_asr - t_load) * 1000),
            "tokenize": round((t_tok - t_asr) * 1000),
            "emotion": round((t_emo - t_tok) * 1000),
            "total": round((t_emo - t0) * 1000),
        },
    }

print("Pipeline ready")''',
# ─────────────────────────────────────────────────────────────────────────
r'''from fastapi import FastAPI, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn, tempfile, os, threading, getpass
from pyngrok import ngrok

app = FastAPI(title="SSL Pipeline API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/")
def health():
    return {"status": "ok", "device": device, "dtype": str(dtype)}

@app.post("/translate")
async def translate(audio: UploadFile = File(...), emotion: bool = Query(True)):
    """
    WAV/WebM in, transcript + Sinhala tokens out.

    `?emotion=false` skips the second model pass when the caller doesn't need
    the emotion badge — worth a few hundred ms on CPU.
    """
    suffix = os.path.splitext(audio.filename or "")[1] or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(await audio.read())
        tmp_path = tmp.name
    try:
        result = full_pipeline(tmp_path, want_emotion=emotion)
        print("timings:", result["timings_ms"])
        return JSONResponse(content=result)
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
    finally:
        os.unlink(tmp_path)

# ── ngrok ──
# Read the token instead of hardcoding it. A token committed to a notebook is
# a live credential anyone with the file can use.
ngrok.kill()
token = os.environ.get("NGROK_AUTHTOKEN") or getpass.getpass("ngrok authtoken: ")
ngrok.set_auth_token(token)

public_url = ngrok.connect(8000)
print(f"\n{'='*60}\nPUBLIC API URL: {public_url}\n{'='*60}")
print("Paste this into Dashboard -> Settings.\n")

def run_server():
    import asyncio
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(uvicorn.Server(uvicorn.Config(app, host="0.0.0.0", port=8000)).serve())

threading.Thread(target=run_server, daemon=True).start()
print("Server running.")''',
# ─────────────────────────────────────────────────────────────────────────
r'''# Optional: measure where the time actually goes, on a real clip.
# Upload a short wav to the Colab file browser and set the path.
TEST_AUDIO = "/content/sample.wav"

import os
if os.path.exists(TEST_AUDIO):
    for i in range(3):
        r = full_pipeline(TEST_AUDIO)
        print(f"run {i+1}: {r['timings_ms']}  ->  {r['transcription'][:60]}")
    print("\nFirst run may be slower; after that it is steady state.")
else:
    print(f"No file at {TEST_AUDIO} — upload one to benchmark.")''',
]

def main() -> None:
    notebook = {
        "cells": [
            {
                "cell_type": "code",
                "execution_count": None,
                "metadata": {},
                "outputs": [],
                "source": src.replace("# @@FEATURES@@", FEATURE_SOURCE).splitlines(keepends=True),
            }
            for src in CELLS
        ],
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"name": "python", "version": "3.11"},
            "accelerator": "GPU",
            "colab": {"provenance": []},
        },
        "nbformat": 4,
        "nbformat_minor": 5,
    }

    out = pathlib.Path(__file__).with_name("WhishperBackend.ipynb")
    out.write_text(json.dumps(notebook, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {out}  ({len(CELLS)} cells)")


if __name__ == "__main__":
    main()
