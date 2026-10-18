"""Suvana-only assistant routes; inference and label data remain unchanged.

The default local router uses a generated, provenance-backed union of Learn
references and Recognize labels. Optional models receive the approved local
answer and may return only that wording; other output falls back locally.
Keys are never written by this server. Keep the declared sync couplings.
"""

from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


# Suvana-only union and intent policy; no inference or label mutations.
try:
    from .suvana_assistant import KNOWLEDGE, POLICY, SIGNS, local_answer, build_context
except ImportError:  # direct module import used by local checks
    from suvana_assistant import KNOWLEDGE, POLICY, SIGNS, local_answer, build_context

PROVIDERS = {
    "gemini": {
        "name": "Google Gemini",
        "default_model": "gemini-2.5-flash",
        "keys_url": "https://aistudio.google.com/app/apikey",
    },
    "groq": {
        "name": "Groq",
        "default_model": "llama-3.3-70b-versatile",
        "keys_url": "https://console.groq.com/keys",
    },
    "openrouter": {
        "name": "OpenRouter",
        "default_model": "meta-llama/llama-3.3-70b-instruct:free",
        "keys_url": "https://openrouter.ai/keys",
    },
}

SYSTEM_PROMPT = POLICY["modelPrompt"]

def _build_context(message: str) -> str:
    return build_context(message)


def _raise_for_api_error(resp, provider_name: str) -> None:
    """Surface the provider's own explanation instead of swallowing it.

    ``requests``' ``raise_for_status()`` throws "400 Client Error: Bad Request
    for url: ..." and discards the response body -- but the body is where every
    one of these providers puts the actual reason ("not a valid model id",
    "insufficient credits", "context length exceeded"). Losing it turns a
    two-second fix into a guessing game.
    """
    if resp.ok:
        return
    detail = ""
    try:
        data = resp.json()
        err = data.get("error") if isinstance(data, dict) else None
        if isinstance(err, dict):
            detail = err.get("message") or err.get("code") or ""
        elif isinstance(err, str):
            detail = err
        if not detail and isinstance(data, dict):
            detail = json.dumps(data)[:300]
    except Exception:
        detail = (resp.text or "").strip()[:300]
    raise RuntimeError(f"HTTP {resp.status_code} from {provider_name}: {detail or 'no detail returned'}")


# A provider model id: slug-ish, optional org prefix, optional ":free" suffix.
# Display names ("LiquidAI: LFM2.5-2.6B (free)") contain spaces and parentheses
# and therefore never match.
_MODEL_ID_RE = re.compile(r"^[A-Za-z0-9._\-]+(?:/[A-Za-z0-9._\-]+)*(?::[A-Za-z0-9._\-]+)?$")


def _looks_like_model_id(text: str) -> bool:
    return bool(_MODEL_ID_RE.match((text or "").strip()))


def _norm_model(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (text or "").lower())


def _list_models(provider: str, api_key: str = "", timeout: int = 20) -> List[Dict[str, Any]]:
    """Fetch the provider's catalogue of callable models."""
    import requests

    if provider == "openrouter":
        # OpenRouter's catalogue is public -- no key needed to browse it.
        resp = requests.get("https://openrouter.ai/api/v1/models", timeout=timeout)
        _raise_for_api_error(resp, "OpenRouter")
        out = []
        for m in resp.json().get("data", []) or []:
            mid = m.get("id")
            if not mid:
                continue
            pricing = m.get("pricing") or {}
            def _zero(v):
                try:
                    return float(v) == 0.0
                except (TypeError, ValueError):
                    return False
            free = mid.endswith(":free") or (_zero(pricing.get("prompt")) and _zero(pricing.get("completion")))
            out.append({"id": mid, "name": m.get("name") or mid, "free": bool(free)})
        return out

    if provider == "groq":
        resp = requests.get(
            "https://api.groq.com/openai/v1/models",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=timeout,
        )
        _raise_for_api_error(resp, "Groq")
        return [
            {"id": m["id"], "name": m["id"], "free": True}
            for m in (resp.json().get("data") or [])
            if m.get("id")
        ]

    if provider == "gemini":
        resp = requests.get(
            "https://generativelanguage.googleapis.com/v1beta/models",
            params={"key": api_key, "pageSize": 200},
            timeout=timeout,
        )
        _raise_for_api_error(resp, "Gemini")
        out = []
        for m in resp.json().get("models", []) or []:
            if "generateContent" not in (m.get("supportedGenerationMethods") or []):
                continue
            mid = (m.get("name") or "").replace("models/", "", 1)
            if mid:
                out.append({"id": mid, "name": m.get("displayName") or mid, "free": True})
        return out

    raise RuntimeError("Unknown provider.")


def _resolve_model(provider: str, api_key: str, model: str):
    """Translate a pasted display name into the provider's real model id.

    Provider websites list models by human-readable name -- OpenRouter shows
    "LiquidAI: LFM2.5-2.6B (free)" while its API expects
    "liquid/lfm-2.5-2.6b:free". Pasting what you see on the page is the single
    most common setup mistake, and it fails as an opaque HTTP 400. Rather than
    let that happen, look the name up in the catalogue first.

    Returns ``(model_id, note_or_None)``.
    """
    model = (model or "").strip()
    if not model:
        return model, None
    # Every OpenRouter id is "org/model", so one without a slash is wrong even
    # though it is otherwise slug-shaped -- worth resolving rather than sending.
    needs_lookup = not _looks_like_model_id(model) or (provider == "openrouter" and "/" not in model)
    if not needs_lookup:
        return model, None
    try:
        catalog = _list_models(provider, api_key)
    except Exception:
        return model, None

    want = _norm_model(model)
    if not want:
        return model, None
    for m in catalog:  # exact match on display name or id
        if _norm_model(m["name"]) == want or _norm_model(m["id"]) == want:
            return m["id"], f'Read "{model}" as the model id {m["id"]}.'
    for m in catalog:  # then a contains match
        if want in _norm_model(m["name"]):
            return m["id"], f'Read "{model}" as the model id {m["id"]}.'
    return model, None


def _call_llm(provider: str, api_key: str, model: str, system: str,
              history: List[Dict[str, str]], message: str, timeout: int = 25) -> str:
    import requests

    if provider == "gemini":
        contents = []
        for turn in history[-8:]:
            role = "user" if turn.get("role") == "user" else "model"
            contents.append({"role": role, "parts": [{"text": turn.get("content", "")}]})
        contents.append({"role": "user", "parts": [{"text": message}]})
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{model}:generateContent"
        )
        resp = requests.post(
            url,
            params={"key": api_key},
            json={
                "systemInstruction": {"parts": [{"text": system}]},
                "contents": contents,
                "generationConfig": {"temperature": 0.6, "maxOutputTokens": 700},
            },
            timeout=timeout,
        )
        _raise_for_api_error(resp, "Gemini")
        data = resp.json()
        cands = data.get("candidates") or []
        if not cands:
            raise RuntimeError("Gemini returned no candidates")
        parts = cands[0].get("content", {}).get("parts", []) or []
        out = "".join(p.get("text", "") for p in parts).strip()
        if not out:
            raise RuntimeError("Gemini returned an empty response")
        return out

    # Groq and OpenRouter are both OpenAI-chat-compatible.
    base = {
        "groq": "https://api.groq.com/openai/v1/chat/completions",
        "openrouter": "https://openrouter.ai/api/v1/chat/completions",
    }[provider]
    messages = [{"role": "system", "content": system}]
    for turn in history[-8:]:
        role = "user" if turn.get("role") == "user" else "assistant"
        messages.append({"role": role, "content": turn.get("content", "")})
    messages.append({"role": "user", "content": message})

    headers = {"Authorization": f"Bearer {api_key}"}
    if provider == "openrouter":
        headers["HTTP-Referer"] = "http://127.0.0.1:8000"
        headers["X-Title"] = "Savana Sinhala Sign Language"

    resp = requests.post(
        base,
        headers=headers,
        json={"model": model, "messages": messages, "temperature": 0.6, "max_tokens": 700},
        timeout=timeout,
    )
    _raise_for_api_error(resp, PROVIDERS.get(provider, {}).get("name", provider))
    data = resp.json()
    return (data["choices"][0]["message"]["content"] or "").strip()


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

class ChatTurn(BaseModel):
    role: str = "user"
    content: str = ""


class ChatRequest(BaseModel):
    message: str = ""
    history: List[ChatTurn] = []
    provider: Optional[str] = None
    apiKey: Optional[str] = None
    model: Optional[str] = None


@router.get("/meta")
def assistant_meta():
    """Everything the UI needs to introduce itself, computed from real data."""
    return {
        "name": "සුවණ Suvana AI",
        "greeting": local_answer(""),
        "signCount": len(SIGNS),
        "summary": f"Learn {KNOWLEDGE['facts']['learnCount']}; Recognize {KNOWLEDGE['facts']['recognitionCount']}",
        "categories": {c: sum(s.get("recognizeCategory") == c for s in SIGNS) for c in ["letter", "month", "number", "phrase"]},
        "providers": [
            {"id": pid, "name": p["name"], "defaultModel": p["default_model"], "keysUrl": p["keys_url"]}
            for pid, p in PROVIDERS.items()
        ],
        "starters": [
            "How do I sign hello",
            "What does 'gannawa' mean?",
            "Show me the letters",
            "Teach me a random sign",
        ],
    }


@router.post("/verify")
def assistant_verify(req: ChatRequest):
    """Check a pasted API key without spending a real chat turn."""
    provider = (req.provider or "gemini").lower()
    if provider not in PROVIDERS:
        return {"ok": False, "error": "Unknown provider."}
    if not (req.apiKey or "").strip():
        return {"ok": False, "error": "No API key supplied."}
    api_key = req.apiKey.strip()
    model, note = _resolve_model(provider, api_key, (req.model or "").strip())
    model = model or PROVIDERS[provider]["default_model"]
    try:
        _call_llm(provider, api_key, model, "Reply with the single word: ok",
                  [], "ping", timeout=20)
        return {"ok": True, "provider": PROVIDERS[provider]["name"], "model": model, "note": note}
    except Exception as exc:
        return {"ok": False, "error": _friendly_error(exc), "model": model}


@router.post("/models")
def assistant_models(req: ChatRequest):
    """List the models this provider will actually accept.

    The settings pane offers a free-text model box, and provider websites show
    display names rather than api ids -- so the box invites exactly the mistake
    that produces an opaque HTTP 400. Letting the user pick from the real
    catalogue removes the guesswork.
    """
    provider = (req.provider or "").lower()
    if provider not in PROVIDERS:
        return {"ok": False, "error": "Unknown provider."}
    try:
        models = _list_models(provider, (req.apiKey or "").strip())
    except Exception as exc:
        return {"ok": False, "error": _friendly_error(exc)}
    models.sort(key=lambda m: (not m["free"], m["id"].lower()))
    return {
        "ok": True,
        "models": models[:500],
        "count": len(models),
        "freeCount": sum(1 for m in models if m["free"]),
        "default": PROVIDERS[provider]["default_model"],
    }


def _friendly_error(exc: Exception) -> str:
    """A plain-language hint, followed by whatever the provider actually said.

    The provider's own message is the most useful part, so it is never thrown
    away -- the hint just puts it in context.
    """
    text = str(exc)
    low = text.lower()
    detail = text.split(": ", 1)[1].strip() if ": " in text else text
    detail = detail[:220]

    def combine(hint):
        return f"{hint} ({detail})" if detail and detail.lower() not in hint.lower() else hint

    if "http 400" in low or "bad request" in low:
        return combine(
            "The provider rejected the request — this is almost always the Model "
            "field holding a display name instead of a model id. Use Browse to pick one."
        )
    if "401" in text or "403" in text or "api_key_invalid" in low or "no auth" in low:
        return combine("That key was rejected — check you copied all of it.")
    if "429" in text or "rate limit" in low:
        return combine("Free-tier rate limit hit. Wait a minute and try again.")
    if "404" in text or "not found" in low:
        return combine("That model isn't available on your key. Use Browse to pick one.")
    if "402" in text or "credit" in low:
        return combine("That model needs credits on your account. Pick one marked FREE.")
    if "connection" in low or "timed out" in low or "timeout" in low or "proxy" in low:
        return "Couldn't reach the provider — check your internet connection."
    return detail or text[:220]


@router.post("/chat")
def assistant_chat(req: ChatRequest):
    message = (req.message or "").strip()
    local = local_answer(message)

    provider = (req.provider or "").lower()
    api_key = (req.apiKey or "").strip()

    if local.get("refused") or local.get("intent") == "random" or not api_key or provider not in PROVIDERS:
        return {**local, "engine": "local", "engineLabel": "Verified index"}

    system = SYSTEM_PROMPT + "\n\n" + _build_context(message)
    history = []  # Previous model/user text is not a verified knowledge source.

    try:
        model, _note = _resolve_model(provider, api_key, (req.model or "").strip())
        model = model or PROVIDERS[provider]["default_model"]
        text = _call_llm(provider, api_key, model, system, history, message)
        return {
            **local,
            "text": text.strip() if text.strip() == local["text"] else local["text"],
            "engine": provider,
            "engineLabel": f"{PROVIDERS[provider]['name']} · {model}",
            "modelId": model,
            "notice": None,
        }
    except Exception as exc:
        return {
            **local,
            "engine": "local",
            "engineLabel": "Verified index",
            "notice": "The optional model is unavailable; answered from the verified index.",
        }
