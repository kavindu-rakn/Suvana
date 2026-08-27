"""Unit tests for webapp/sinhala_labels.py.

This module maps Romanized-Sinhala dataset labels to a speakable form for gTTS.
The classification logic (number / month / fingerspelling letter / phrase) is
pure and offline, so it is tested directly. The one function that reaches the
network -- ``transliterate`` -- is exercised with ``requests.get`` monkeypatched,
so the whole file runs without any network access.

No production source is modified.
"""

import sys
from pathlib import Path

# sinhala_labels only depends on the stdlib + requests, so importing the module
# directly from the webapp/ folder avoids pulling in the heavier webapp package.
sys.path.append(str(Path(__file__).resolve().parents[1] / "webapp"))

import sinhala_labels  # noqa: E402
from sinhala_labels import (  # noqa: E402
    build_label_entry,
    classify_label,
    phrase_for_transliteration,
    transliterate,
)


# ---------------------------------------------------------------------------
# classify_label
# ---------------------------------------------------------------------------

def test_classify_label_numbers():
    category, speak_text, lang = classify_label("100")
    assert category == "number"
    assert speak_text == sinhala_labels.NUMBER_WORDS["100"]
    assert lang == "si"


def test_classify_label_number_ignores_surrounding_whitespace():
    assert classify_label("  5000 ") == ("number", sinhala_labels.NUMBER_WORDS["5000"], "si")


def test_classify_label_month_is_case_insensitive():
    assert classify_label("August") == ("month", sinhala_labels.MONTH_WORDS["august"], "si")
    assert classify_label("august") == ("month", sinhala_labels.MONTH_WORDS["august"], "si")


def test_classify_label_single_letter_is_uppercased_and_spoken_in_english():
    assert classify_label("a") == ("letter", "A", "en")
    assert classify_label("B") == ("letter", "B", "en")


def test_classify_label_fingerspelling_letter_with_parenthetical():
    # "B(first way)" is a fingerspelling annotation -> letter B.
    assert classify_label("B(first way)") == ("letter", "B", "en")


def test_classify_label_phrase_defers_transliteration_to_caller():
    category, speak_text, lang = classify_label("mama oyata usaaviyedi nadu pawaranawa")
    assert category == "phrase"
    assert speak_text is None
    assert lang == "si"


def test_classify_label_multichar_word_is_not_a_letter():
    # Guards against the fingerspelling regex over-matching ordinary words.
    category, _, _ = classify_label("gannawa")
    assert category == "phrase"


# ---------------------------------------------------------------------------
# phrase_for_transliteration
# ---------------------------------------------------------------------------

def test_phrase_strips_english_parenthetical():
    assert phrase_for_transliteration("hinawenawa (1st way)") == "hinawenawa"


def test_phrase_collapses_internal_parenthetical_and_trims():
    assert phrase_for_transliteration("andinawa (draw)") == "andinawa"


def test_phrase_falls_back_to_original_when_stripping_empties_it():
    # If removing the parenthetical would leave nothing, keep the original text.
    assert phrase_for_transliteration("(ex- kunu)") == "(ex- kunu)"


# ---------------------------------------------------------------------------
# build_label_entry
# ---------------------------------------------------------------------------

def test_build_entry_uses_manual_override_without_network(monkeypatch):
    # Manual overrides must short-circuit before any transliteration call.
    def _boom(*args, **kwargs):
        raise AssertionError("transliterate must not be called for a manual override")

    monkeypatch.setattr(sinhala_labels, "transliterate", _boom)

    entry = build_label_entry("asniipai")
    expected_sinhala = sinhala_labels.MANUAL_OVERRIDES["asniipai"]
    assert entry == {
        "category": "phrase",
        "sinhala": expected_sinhala,
        "speakText": expected_sinhala,
        "speakLang": "si",
    }


def test_build_entry_number_does_not_hit_network(monkeypatch):
    monkeypatch.setattr(
        sinhala_labels,
        "transliterate",
        lambda *a, **k: (_ for _ in ()).throw(AssertionError("no network for numbers")),
    )
    entry = build_label_entry("100")
    assert entry == {
        "category": "number",
        "sinhala": sinhala_labels.NUMBER_WORDS["100"],
        "speakText": sinhala_labels.NUMBER_WORDS["100"],
        "speakLang": "si",
    }


def test_build_entry_letter():
    entry = build_label_entry("A")
    assert entry == {
        "category": "letter",
        "sinhala": "A",
        "speakText": "A",
        "speakLang": "en",
    }


def test_build_entry_phrase_calls_transliterator_with_cleaned_text(monkeypatch):
    calls = {}

    def fake_transliterate(text, *args, **kwargs):
        calls["text"] = text
        return "SINHALA_RESULT"

    monkeypatch.setattr(sinhala_labels, "transliterate", fake_transliterate)

    entry = build_label_entry("hinawenawa (1st way)")

    # The parenthetical is stripped before transliteration.
    assert calls["text"] == "hinawenawa"
    assert entry == {
        "category": "phrase",
        "sinhala": "SINHALA_RESULT",
        "speakText": "SINHALA_RESULT",
        "speakLang": "si",
    }


# ---------------------------------------------------------------------------
# transliterate (network mocked)
# ---------------------------------------------------------------------------

class _FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def json(self):
        return self._payload


def test_transliterate_returns_parsed_result_on_success(monkeypatch):
    # Shape mirrors Google Input Tools: ["SUCCESS", [[input, [candidate, ...]]]]
    payload = ["SUCCESS", [["gannawa", ["ගන්නවා"]]]]
    monkeypatch.setattr(sinhala_labels.requests, "get", lambda *a, **k: _FakeResponse(payload))

    result = transliterate("gannawa", retries=1)
    assert result == "ගන්නවා"


def test_transliterate_falls_back_to_original_on_failure_status(monkeypatch):
    payload = ["FAILED", []]
    monkeypatch.setattr(sinhala_labels.requests, "get", lambda *a, **k: _FakeResponse(payload))

    # pause=0 keeps the retry loop instant.
    assert transliterate("gannawa", retries=2, pause=0) == "gannawa"


def test_transliterate_falls_back_to_original_on_exception(monkeypatch):
    def _raise(*args, **kwargs):
        raise RuntimeError("network down")

    monkeypatch.setattr(sinhala_labels.requests, "get", _raise)

    assert transliterate("gannawa", retries=2, pause=0) == "gannawa"
