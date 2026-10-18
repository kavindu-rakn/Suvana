"""D-A36: Suvana display/speech corrections, separate from model label order."""
import hashlib
import json
import re
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent / "data"


def load_sinhala_labels(labels_path=DATA_DIR / "sinhala_labels.json",
                       corrections_path=DATA_DIR / "sinhala-corrections.json"):
    labels = json.loads(Path(labels_path).read_text(encoding="utf-8"))
    corrections = json.loads(Path(corrections_path).read_text(encoding="utf-8"))
    for label, fields in corrections.items():
        if label == "_source":
            continue
        if label not in labels or set(fields) != {"sinhala", "speakText"}:
            raise ValueError(f"Invalid Suvana correction key/fields: {label}")
        labels[label] = {**labels[label], **fields}
    return labels


def tts_cache_name(label, speak_text, speak_lang):
    """Never reuse label-only audio after a spelling or language changes."""
    identity = json.dumps([label, speak_lang, speak_text], ensure_ascii=False,
                          separators=(",", ":")).encode("utf-8")
    digest = hashlib.sha256(identity).hexdigest()
    slug = re.sub(r"[^A-Za-z0-9]+", "_", label).strip("_").lower()[:48] or "audio"
    return f"{slug}_{digest}.mp3"
