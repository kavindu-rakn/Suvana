"""Pre-generate TTS audio for every known label so /api/speak never has to
call gTTS live during real-time use. Uses the exact same cache naming and
lookup logic as webapp/server.py's /api/speak route -- run this whenever
sinhala_labels.json changes.
"""
import json
import re
import sys
import time
from pathlib import Path

from gtts import gTTS

ROOT_DIR = Path(__file__).resolve().parent.parent
WEBAPP_DIR = Path(__file__).resolve().parent
LABELS_PATH = WEBAPP_DIR / "data" / "sinhala_labels.json"
TTS_CACHE_DIR = WEBAPP_DIR / "tts_cache"
TTS_CACHE_DIR.mkdir(exist_ok=True)

DEFAULT_LANG = "en"


def _safe_cache_name(text):
    slug = re.sub(r"[^A-Za-z0-9]+", "_", text).strip("_").lower()
    return slug[:120] or "audio"


def main():
    sinhala_labels = json.loads(LABELS_PATH.read_text(encoding="utf-8"))
    labels = list(sinhala_labels.keys())
    print(f"{len(labels)} labels total")

    generated = 0
    skipped = 0
    failed = []

    for i, label in enumerate(labels):
        entry = sinhala_labels[label]
        speak_text = entry.get("speakText") or label
        speak_lang = entry.get("speakLang") or DEFAULT_LANG

        cache_path = TTS_CACHE_DIR / f"{_safe_cache_name(label)}_{speak_lang}.mp3"
        if cache_path.exists():
            skipped += 1
            continue

        for attempt in range(3):
            try:
                tts = gTTS(text=speak_text, lang=speak_lang)
                tts.save(str(cache_path))
                generated += 1
                print(f"[{i+1}/{len(labels)}] OK  {label!r} -> {cache_path.name}")
                break
            except Exception as e:
                if attempt == 2:
                    failed.append((label, str(e)))
                    print(f"[{i+1}/{len(labels)}] FAIL {label!r}: {e}")
                else:
                    time.sleep(1.5)

        time.sleep(0.15)  # be polite to the TTS endpoint

    print(f"\nGenerated: {generated}  Skipped (already cached): {skipped}  Failed: {len(failed)}")
    if failed:
        print("Failed labels:")
        for label, err in failed:
            print(f"  - {label}: {err}")
        sys.exit(1)


if __name__ == "__main__":
    main()
