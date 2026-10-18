"""Suvana content boundary; imports the assistant only, never inference/model code."""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "webapp"))
import assistant


@pytest.mark.parametrize("message", [
    "how do I sign X", "translate Y to SSL", "describe the handshape for Z", "how do I sign hello",
    "How can I sign HELLO?", "please demonstrate the sign for HELLO",
    "explain the movement for HELLO", "describe the position for HELLO",
    "show me how to sign HELLO", "sign HELLO", "translate HELLO into sign language",
    "HELLO සංඥා භාෂාවෙන් කොහොමද කරන්නේ?",
    "සංඥා භාෂාවට පරිවර්තනය කරන්න", "අතේ පිහිටීම විස්තර කරන්න",
])
def test_requests_refuse_with_a_learn_link(message):
    answer = assistant.local_answer(message)
    assert answer["text"] == assistant.SIGNING_REFUSAL
    assert answer["refused"] is True
    assert answer["cards"] == []
    assert answer["learnUrl"].startswith("https://suvana.help/learn/")


@pytest.mark.parametrize("message, url", [
    ("how do I sign HELLO", "?sign=HELLO"),
    ("how do I sign BAG EKA", "?sign=BAG%20EKA"),
    ("translate HELLO to sign language", "?sign=HELLO"),
    ("how do I sign hello", ""),
    ("how do I sign unknown", ""),
    ("how do I sign THANK_YOU", ""),
    ("how do I sign MAGE NAMA", ""),
])
def test_exact_glosses_only(message, url):
    assert assistant.signing_refusal(message)["learnUrl"] == assistant.LEARN_URL + url


def test_missing_gloss_list_fails_closed(monkeypatch):
    monkeypatch.setattr(assistant, "LEARN_GLOSSES", frozenset())
    assert assistant.signing_refusal("how do I sign HELLO")["learnUrl"] == assistant.LEARN_URL


def test_every_card_has_camera_advice_only():
    for category in ["letter", "number", "month", "phrase"]:
        tips = assistant.KB.card({"label": "fixture", "sinhala": "", "english": "", "category": category})["tips"]
        assert tips == assistant.GENERAL_TIPS
        assert not assistant.re.search(r"handshape|finger|palm|chest|pose|fingerspell|initialis|held|moved|neutral|motion|variant|letter|month|number", " ".join(tips), assistant.re.I)


def test_refusal_precedes_any_cloud_call(monkeypatch):
    def forbidden(*args, **kwargs):
        raise AssertionError("A refused signing request must never call a model")
    monkeypatch.setattr(assistant, "_resolve_model", forbidden)
    monkeypatch.setattr(assistant, "_call_llm", forbidden)
    answer = assistant.assistant_chat(assistant.ChatRequest(message="how do I sign HELLO", provider="gemini", apiKey="synthetic-test-key"))
    assert answer["engine"] == "local"
    assert answer["refused"] is True
    assert "does not translate into SSL" in assistant.SYSTEM_PROMPT


@pytest.mark.parametrize("message", ["hello", "show me the letters", "practice tips", "how do I improve camera lighting?"])
def test_browsing_and_camera_advice_remain_available(message):
    assert assistant.signing_refusal(message) is None
