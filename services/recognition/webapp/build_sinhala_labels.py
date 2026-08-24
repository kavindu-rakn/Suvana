"""One-time build step: resolve every dataset label to Sinhala script and
cache the result to webapp/data/sinhala_labels.json, so the server never has
to hit the transliteration API at request time.

Run again after re-training on a different dataset (i.e. when
data/processed/labels.npy changes).
"""

import json
import sys
import time
from pathlib import Path

import numpy as np

ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))

from sinhala_labels import build_label_entry  # noqa: E402

OUTPUT_PATH = Path(__file__).resolve().parent / "data" / "sinhala_labels.json"


def main():
    labels_path = ROOT_DIR / "data" / "processed" / "labels.npy"
    labels = sorted(set(np.load(labels_path, allow_pickle=True).tolist()))
    print(f"Resolving Sinhala text for {len(labels)} labels...")

    OUTPUT_PATH.parent.mkdir(exist_ok=True)
    result = {}
    if OUTPUT_PATH.exists():
        result = json.loads(OUTPUT_PATH.read_text(encoding="utf-8"))

    for i, label in enumerate(labels, 1):
        if label in result:
            continue
        entry = build_label_entry(label)
        result[label] = entry
        print(f"[{i}/{len(labels)}] {label!r} -> {entry['sinhala']} ({entry['category']})")
        if entry["category"] == "phrase":
            time.sleep(0.15)  # be polite to the transliteration endpoint

        if i % 20 == 0:
            OUTPUT_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")

    OUTPUT_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved {len(result)} entries to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
