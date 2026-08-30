#!/usr/bin/env python
"""Bake the assistant's knowledge base into a committed shell asset.

The shell's AI assistant answers from the recognition model's own label set.
Both halves of that data live in files the shell cannot read at runtime:

- ``services/recognition/webapp/data/sinhala_labels.json`` — Sinhala script and
  category per label. It is **gitignored** (it is derived data, rebuilt by
  ``webapp/build_sinhala_labels.py``, which needs network access and several
  minutes), so it never arrives with a clone. An assistant reading it directly
  is an assistant that answers "0 signs" on every fresh checkout — which is
  exactly what it did before this script existed.
- ``services/recognition/webapp/assistant.py`` — the hand-written ENGLISH_GLOSS
  map, the only English meaning this dataset has.

This script joins the two and writes ``public/data/signs.json``, which **is**
committed. The shell then ships its own knowledge base: no Python service has
to be running for the assistant to work, locally or on a static deployment.

Re-run it whenever the model is retrained or glosses are added:

    python -X utf8 apps/shell/scripts/build-sign-index.py

``-X utf8`` matters on Windows: the console is cp1252 and the labels are not.
"""

from __future__ import annotations

import ast
import json
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[3]
RECOGNITION = REPO / "services" / "recognition" / "webapp"
LABELS = RECOGNITION / "data" / "sinhala_labels.json"
ASSISTANT = RECOGNITION / "assistant.py"
OUT = REPO / "apps" / "shell" / "public" / "data" / "signs.json"


def read_python_dicts(path: Path, names: set[str]) -> dict[str, dict]:
    """Pull module-level dict literals out of a source file without importing it.

    assistant.py imports fastapi and pydantic at module scope; parsing the AST
    instead means this script needs nothing but the standard library.
    """
    tree = ast.parse(path.read_text(encoding="utf-8"))
    found: dict[str, dict] = {}
    for node in tree.body:
        # ENGLISH_GLOSS carries a type annotation, so it parses as AnnAssign
        # rather than Assign — both forms have to be recognised here.
        if isinstance(node, ast.AnnAssign):
            targets, value = [node.target], node.value
        elif isinstance(node, ast.Assign):
            targets, value = node.targets, node.value
        else:
            continue
        if value is None:
            continue
        for target in targets:
            if isinstance(target, ast.Name) and target.id in names:
                found[target.id] = ast.literal_eval(value)
    missing = names - found.keys()
    if missing:
        raise SystemExit(f"{path.name}: could not find {', '.join(sorted(missing))}")
    return found


def number_gloss(label: str, units: dict, tens: dict) -> str:
    """English words for the numeric labels — a port of assistant.py's rule."""
    s = label.strip()
    if not s.isdigit():
        return ""
    if s in tens:
        return tens[s]
    for zeros, word in ((5, "lakh"), (3, "thousand"), (2, "hundred")):
        tail = "0" * zeros
        if s.endswith(tail) and len(s) > zeros:
            head = s[:-zeros]
            if head in units:
                unit = units[head]
                base = f"{unit} {word}"
                return f"{base} / {unit} hundred thousand" if zeros == 5 else base
            if head == "10" and zeros == 3:
                return "ten thousand"
    return ""


def main() -> int:
    if not LABELS.exists():
        print(f"error: {LABELS} is missing.", file=sys.stderr)
        print(
            "It is gitignored derived data. Regenerate it with\n"
            "  python -X utf8 services/recognition/webapp/build_sinhala_labels.py\n"
            "(needs data/processed/labels.npy from Lahiru first), or copy it from a\n"
            "checkout that has it. The committed public/data/signs.json is unchanged.",
            file=sys.stderr,
        )
        return 1

    maps = read_python_dicts(ASSISTANT, {"ENGLISH_GLOSS", "_UNITS", "_TENS"})
    gloss, units, tens = maps["ENGLISH_GLOSS"], maps["_UNITS"], maps["_TENS"]

    raw = json.loads(LABELS.read_text(encoding="utf-8"))
    signs = []
    for label, meta in raw.items():
        meta = meta or {}
        signs.append(
            {
                "label": label,
                "sinhala": meta.get("sinhala", label),
                "category": meta.get("category", "phrase"),
                "english": gloss.get(label) or number_gloss(label, units, tens),
            }
        )

    payload = {
        "_source": "services/recognition/webapp/data/sinhala_labels.json + ENGLISH_GLOSS in assistant.py",
        "_generator": "apps/shell/scripts/build-sign-index.py",
        "signs": signs,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )

    glossed = sum(1 for s in signs if s["english"])
    print(f"{len(signs)} signs ({glossed} with an English gloss) -> {OUT.relative_to(REPO)}")
    print(f"{OUT.stat().st_size / 1024:.1f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
