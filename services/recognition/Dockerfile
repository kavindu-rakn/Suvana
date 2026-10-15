# Suvana recognition service (Lahiru's component) — sign to speech.
#
# Python 3.10 because TensorFlow 2.13 and MediaPipe 0.10.7 do not publish
# wheels for 3.12+. Port 7860 and the uid-1000 user match services/speech so
# either can go to a Hugging Face Docker Space unchanged; any Docker host works.
#
# Install the CPU serving dependencies only. The full requirements.txt remains
# the upstream training/desktop environment; the HTTP service does not need
# its desktop audio players, video editors or training scripts.

FROM python:3.10-slim

# OpenCV and MediaPipe need these; the base image is headless.
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libgl1 libglib2.0-0 libsm6 libxext6 libxrender1 ffmpeg && \
    rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1

WORKDIR /home/user/app

COPY --chown=user requirements-runtime.txt .
RUN pip install --no-cache-dir --user -r requirements-runtime.txt && pip check

# Explicit runtime copies keep datasets, unused models, local environments,
# cached audio and secrets out of the image regardless of local checkout state.
COPY --chown=user config/config.yaml config/config.yaml
COPY --chown=user src/ src/
COPY --chown=user webapp/*.py webapp/
COPY --chown=user webapp/static/ webapp/static/
COPY --chown=user webapp/data/sinhala_labels.json webapp/data/sinhala_labels.json
COPY --chown=user data/processed/labels.npy data/processed/labels.npy
COPY --chown=user models/saved_models/best_model.h5 models/saved_models/best_model.h5

# webapp/server.py chdirs to the project root itself, because the model and
# data paths in config/config.yaml are relative to it.
EXPOSE 7860
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
    CMD python -c "import json, urllib.request; info=json.load(urllib.request.urlopen('http://127.0.0.1:' + __import__('os').environ.get('PORT', '7860') + '/api/info', timeout=4)); assert info['numClasses'] == 171"
CMD ["sh", "-c", "uvicorn webapp.server:app --host 0.0.0.0 --port ${PORT:-7860}"]
