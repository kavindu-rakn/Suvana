# services/speech (planned)

Persistent FastAPI service replacing the Colab/ngrok notebook that currently serves `apps/communicate`: Whisper ASR (fine-tuned for Sinhala) + audio emotion classifier + Sinhala→gloss dictionary.

Source to extract from: `apps/communicate/notebook-integration/` (`build_notebook.py`, `build_emotion_notebook.py`, `_shared_features.py`) and `apps/communicate/lib/ipynb/WhishperBackend.ipynb`.

Once hosted, register its URL through the app's existing config endpoint (`POST /api/config/ngrok-url` with the shared secret) — the app reads the backend URL from MongoDB, so no code change is needed.

Before exposing publicly: add auth to `/translate` (currently wide open) and move the ngrok/hosting tokens out of the code — flagged in the source README.
