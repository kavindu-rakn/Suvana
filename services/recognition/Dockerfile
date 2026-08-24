# Suvana recognition service (Lahiru's component) — sign to speech.
#
# Python 3.10 because TensorFlow 2.13 and MediaPipe 0.10.7 do not publish
# wheels for 3.12+. Port 7860 and the uid-1000 user match services/speech so
# either can go to a Hugging Face Docker Space unchanged; any Docker host works.
#
# The image is large (~3 GB): requirements.txt is the full project list,
# including training-only libraries (matplotlib, seaborn, moviepy, pandas).
# It is installed verbatim rather than trimmed because `src/` is imported as a
# package and a missing transitive import would only surface at runtime.
# Trimming to a serve-only set is a safe later optimisation, not a rebrand-day
# risk.

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

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

COPY --chown=user . .

# webapp/server.py chdirs to the project root itself, because the model and
# data paths in config/config.yaml are relative to it.
EXPOSE 7860
CMD ["sh", "-c", "uvicorn webapp.server:app --host 0.0.0.0 --port ${PORT:-7860}"]
