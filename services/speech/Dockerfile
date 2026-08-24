# Suvana speech service — built for a Hugging Face Docker Space (free CPU
# tier: 2 vCPU / 16 GB RAM, which fits whisper-medium), works anywhere Docker
# runs. HF Spaces expects the app on port 7860 and runs the container as
# uid 1000 with a read-only root — hence the non-root user and HOME caches.

FROM python:3.11-slim

# ffmpeg: browser recordings arrive as WebM/Opus, which soundfile cannot
# decode — librosa falls back to audioread+ffmpeg for those.
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg libsndfile1 && \
    rm -rf /var/lib/apt/lists/*

RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    HF_HOME=/home/user/.cache/huggingface \
    PATH=/home/user/.local/bin:$PATH

WORKDIR /home/user/app

COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

COPY --chown=user . .

EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
