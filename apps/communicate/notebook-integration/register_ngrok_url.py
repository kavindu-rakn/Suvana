# Reference copy of the auto-registration snippet that now lives inline in
# lib/ipynb/WhishperBackend.ipynb (cell-4, right after `ngrok.connect(...)`).
# Kept here as a standalone reference / for pasting into a different notebook.
#
# POSTs the current ngrok public URL to the Next.js app so it always knows
# the live address, even though ngrok hands out a new one every restart.
#
# Colab can only reach a *publicly reachable* app — it cannot reach
# "http://localhost:3000" on your own laptop:
#   - Developing locally?  Leave this unused and instead paste the URL into
#     the app's Dashboard -> Settings tab (POST /api/admin/ngrok-url, gated
#     by your logged-in session — see app/api/admin/ngrok-url/route.ts).
#   - App deployed somewhere public (e.g. Vercel)?  Use this snippet so it
#     stays in sync automatically on every notebook restart.
#
# Requires: pip install requests pyngrok

import requests

# --- fill these in ---
APP_BASE_URL = "https://your-deployed-app.example.com"
NGROK_UPDATE_SECRET = "replace-with-the-same-value-as-NGROK_UPDATE_SECRET-in-.env.local"
# ----------------------

def register_ngrok_url(public_url: str) -> None:
    """Call this once you have the tunnel's public URL, e.g.:

        tunnel = ngrok.connect(8000)
        register_ngrok_url(tunnel.public_url)
    """
    resp = requests.post(
        f"{APP_BASE_URL}/api/config/ngrok-url",
        json={"url": public_url},
        headers={"x-api-key": NGROK_UPDATE_SECRET},
        timeout=10,
    )
    resp.raise_for_status()
    print(f"[registered] {public_url} -> {APP_BASE_URL}/api/config/ngrok-url")


# WhishperBackend.ipynb's FastAPI server (cell-4) exposes:
#
#   GET  /            -> { "status": "ok", "glosses_available": <int> }
#   GET  /glosses      -> { "dictionary": {...}, "total": <int> }
#   POST /translate     accepts multipart/form-data with an "audio" file field,
#                        returns:
#
#   {
#     "transcription": "...",             # Sinhala text
#     "tokens": ["...", "..."],           # Sinhala tokens
#     "pos_tags": [{"word": "...", "tag": "..."}],
#     "emotion": {"emotion": "happy", "confidence": 0.92},
#     "glosses": ["HELLO", "ME", ...],    # already resolved via SINHALA_TO_GLOSS
#     "unknown_tokens": ["..."]           # Sinhala words with no gloss mapping yet
#   }
#
# app/api/stt/route.ts normalizes this to
# { text, tokens, emotion, confidence, glosses, unknownTokens } for the frontend.
