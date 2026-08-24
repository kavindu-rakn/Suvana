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
