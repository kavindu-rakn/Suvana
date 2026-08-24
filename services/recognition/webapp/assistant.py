"""සවන AI Assistant -- a self-contained, zero-cost help engine for the web app.

Design goals
------------
1. **Additive only.** Nothing in this module mutates or monkey-patches existing
   application state. It exposes a FastAPI ``APIRouter`` that ``server.py``
   includes; if this file is deleted the rest of the app still runs unchanged.

2. **Free forever, offline first.** The default engine is a fully local
   retrieval + intent engine built on the project's own ``sinhala_labels.json``.
   No API key, no network call, no account, no quota. It answers instantly.

3. **Optionally smarter.** If the user pastes a free API key (Google Gemini,
   Groq or OpenRouter -- all have no-credit-card free tiers) the local engine
   still runs first and its results are handed to the LLM as grounded context
   (retrieval-augmented generation), so the model answers *about this project's
   actual dataset* rather than hallucinating. If the key is missing, invalid,
   rate-limited or the machine is offline, we silently fall back to the local
   answer -- the assistant never hard-fails.

The key is never written to disk by the server; the browser holds it in
localStorage and sends it per request, and this module only forwards it.
"""

from __future__ import annotations

import difflib
import json
import random
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel

DATA_PATH = Path(__file__).resolve().parent / "data" / "sinhala_labels.json"

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


# ---------------------------------------------------------------------------
# Knowledge base
# ---------------------------------------------------------------------------

# English glosses for the Romanised-Sinhala dataset labels. Only entries we are
# confident about are listed -- an unglossed sign simply shows its Sinhala
# script rather than a guessed translation, because a wrong gloss in a teaching
# tool is worse than no gloss.
ENGLISH_GLOSS: Dict[str, str] = {
    "adinawa": "to pull",
    "adum sodanawa": "to wash clothes",
    "ahanawa": "to listen / to ask",
    "ambaranawa": "to mix or knead",
    "andanawa": "to cry",
    "andinawa(draw)": "to draw",
    "asniipai": "feeling ill",
    "athu gaanawa": "to prune branches",
    "awidinawa": "to walk",
    "bag eka": "the bag",
    "balanawa": "to look / to watch",
    "bara kilogram 1 k ": "one kilogram of weight",
    "beheth kiiyada": "how much is the medicine?",
    "Bilpatha": "the bill",
    "bonawa": "to drink",
    "dakinawa": "to see",
    "dakunata harenna": "turn right",
    "dakunata(right)": "right (direction)",
    "denawa": "to give",
    "doctor koheda inne": "where is the doctor?",
    "duwanawa": "to run",
    "ellanawa": "to hang something up",
    "gannawa": "to take / to get",
    "gas kapanawa": "to cut down trees",
    "gedara issaraha": "in front of the house",
    "geyak hadanawa": "to build a house",
    "haaranawa": "to dig",
    "hatharamn handiya(4 way junction)": "four-way junction",
    "hinawenawa(1st way)": "to laugh or smile",
    "hinawenawa(2nd way)": "to laugh or smile (second variant)",
    "iranawa": "to tear",
    "ischole bag eka": "the school bag",
    "Kadaya": "the shop",
    "kadanawa": "to break",
    "Kanda nagala bahinna": "climb the hill and come back down",
    "kanawa": "to eat",
    "kasanawa": "to scratch",
    "kotanawa": "to pound or chop",
    "kunu damanawa": "to throw out rubbish",
    "laptop eka": "the laptop",
    "liyanawa": "to write",
    "Mage nama": "my name",
    "Mage nama Daham": "my name is Daham",
    "mage bage eke hoyanna udaw karanna": "please help me find my bag",
    "mage lap eka hoyanna udaw karanna ": "please help me find my laptop",
    "mage phone eka hoyanna udaw karanna": "please help me find my phone",
    "makanawa": "to erase",
    "mama oyata usaaviyedi nadu pawaranawa": "I will take you to court",
    "mas maalu kapanawa": "to cut meat and fish",
    "mata asaniipai": "I am feeling ill",
    "mata beheth denna": "please give me medicine",
    "miladii gannawa": "to buy",
    "muuna kasanawa": "to scratch your face",
    "muuna soodanawa": "to wash your face",
    "naanawa": "to bathe",
    "nagitinawa": "to stand up",
    "nurse": "nurse",
    "nurse mata beheth denna": "nurse, please give me medicine",
    "nurse mata beheth ennath karanawa": "the nurse gives me an injection",
    "oluwa kasanawa": "to scratch your head",
    "osawanawa": "to lift",
    "oyaage upandinaya kawadda": "when is your birthday?",
    "paadam karanawa": "to study",
    "paan(bread) kapanawa": "to cut bread",
    "paara dige kelin gihilla wamata harenne": "go straight along the road, then turn left",
    "paare idiriyata yanna": "go forward along the road",
    "paninawa": "to jump",
    "parimaawa liter 1 k": "one litre of volume",
    "peenawa": "to be visible",
    "phone eka": "the phone",
    "pigana hodanawa": "to wash the dishes",
    "pihinanawa": "to swim",
    "pitipassata enna": "come back / move backwards",
    "randu karagannawa": "to quarrel",
    "sodanawa": "to wash",
    "soynawa": "to search for",
    "sudu kolayak": "a sheet of white paper",
    "T shirt eke mila kiiyada": "how much is the T-shirt?",
    "thattu karanawa": "to knock",
    "thel liter 1 k": "one litre of oil",
    "therum gannawa": "to understand",
    "thoranawa": "to select or choose",
    "udaw karanawa": "to help",
    "uthuranawa": "to pour",
    "waadi wenawa": "to sit down",
    "wada karanawa": "to work",
    "wama(left)": "left (direction)",
    "wamaata harenna": "turn left",
    "wamata U turn eken harenna": "take the U-turn and go left",
    "wapuranawa": "to sow seed",
    "wiyadam karanawa": "to spend money",
    "yanawa": "to go",
    "50 KM idiriyata yanna": "go 50 km ahead",
    "50 meters": "fifty metres",
    "100 meters": "one hundred metres",
    "(ex- kunu)": "rubbish",
    "(1st way)": "first variant of the sign",
    "(2nd way)": "second variant of the sign",
    "miliyanaya (meka pennaddigassala pennanna.)": "million",
}

# Spelled-out forms for the numeric labels, so "one hundred" and "five thousand"
# resolve as reliably as "100" and "5000".
_UNITS = {"1": "one", "2": "two", "3": "three", "4": "four", "5": "five",
          "6": "six", "7": "seven", "8": "eight", "9": "nine"}
_TENS = {"30": "thirty", "40": "forty", "50": "fifty", "60": "sixty",
         "70": "seventy", "80": "eighty", "90": "ninety"}


def _number_gloss(label: str) -> str:
    """English words for the numeric labels in this dataset."""
    s = label.strip()
    if not s.isdigit():
        return ""
    if s in _TENS:
        return _TENS[s]
    for zeros, word in ((5, "lakh"), (3, "thousand"), (2, "hundred")):
        tail = "0" * zeros
        if s.endswith(tail) and len(s) > zeros:
            head = s[: -zeros]
            if head in _UNITS:
                unit = _UNITS[head]
                base = f"{unit} {word}"
                if zeros == 5:
                    return f"{base} / {unit} hundred thousand"
                return base
            if head == "10" and zeros == 3:
                return "ten thousand"
    return ""

CATEGORY_LABEL = {
    "letter": "Fingerspelling letter",
    "number": "Number",
    "month": "Calendar month",
    "phrase": "Word / phrase",
}

# Honest, category-specific practice guidance. We deliberately do not invent
# handshape descriptions we have no reference for -- instead we give the
# practice protocol that actually raises this model's recognition confidence.
CATEGORY_TIPS = {
    "letter": [
        "Fingerspelling is a single static handshape — form it, then hold it still.",
        "Keep the hand at chest height, palm toward the camera, fingers clearly separated.",
        "Some letters have two accepted variants in this dataset; try both and use whichever the model reads more confidently.",
    ],
    "number": [
        "Number signs are held rather than moved — settle the shape and keep it steady.",
        "Large numbers are compound: perform the parts in order without a long pause between them.",
        "Keep your other hand out of the frame so it is not mistaken for a two-handed sign.",
    ],
    "month": [
        "Month signs are usually fingerspelled or initialised — start from the letter shape, then complete the movement.",
        "Perform it at a steady, even pace; rushing the movement is the most common cause of a missed detection.",
    ],
    "phrase": [
        "This is a movement sign — the model reads the whole motion path, not a single frame.",
        "Start from a neutral rest position, perform the motion once cleanly, then return to rest.",
        "Keep your torso and both hands inside the frame; the model tracks pose and face as well as hands.",
    ],
}

GENERAL_TIPS = [
    "Sit about an arm's length from the camera so your head, torso and both hands stay in frame.",
    "Light your face from the front — backlighting from a window is what breaks landmark tracking most often.",
    "Hold each sign for the full capture window; the model classifies a sequence of frames, not a snapshot.",
    "Use a plain background and avoid clothing that matches your skin tone.",
]


def _norm(text: str) -> str:
    return re.sub(r"[^a-z0-9඀-෿ ]+", " ", (text or "").lower()).strip()


def _tokens(text: str) -> List[str]:
    return [t for t in _norm(text).split() if t]


class SignKnowledgeBase:
    """Loads the project's own label data and answers questions about it."""

    def __init__(self, path: Path = DATA_PATH):
        self.entries: List[Dict[str, Any]] = []
        self.by_label: Dict[str, Dict[str, Any]] = {}
        raw: Dict[str, Any] = {}
        try:
            if path.exists():
                raw = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:  # pragma: no cover - defensive
            print(f"[assistant] could not read {path}: {exc}")

        for label, meta in raw.items():
            entry = {
                "label": label,
                "sinhala": (meta or {}).get("sinhala", label),
                "category": (meta or {}).get("category", "phrase"),
                "speakText": (meta or {}).get("speakText", label),
                "english": ENGLISH_GLOSS.get(label) or _number_gloss(label),
            }
            entry["_haystack"] = " ".join(
                [_norm(label), _norm(entry["english"]), entry["sinhala"]]
            )
            self.entries.append(entry)
            self.by_label[label] = entry

        self.categories: Dict[str, List[Dict[str, Any]]] = {}
        for e in self.entries:
            self.categories.setdefault(e["category"], []).append(e)

    # -- retrieval ---------------------------------------------------------

    # A hit must clear this score before we claim it answers the question.
    # Without a floor, fuzzy matching cheerfully returns a sign for "what is
    # quantum physics" -- confidently wrong is the worst failure mode for a
    # teaching tool, so below the floor we say "not in this dataset" instead.
    MIN_SCORE = 38.0

    def search(self, query: str, limit: int = 6) -> List[Dict[str, Any]]:
        q = _norm(query)
        if not q:
            return []
        q_tokens = set(_tokens(query))
        scored = []
        for e in self.entries:
            label_n = _norm(e["label"])
            eng_n = _norm(e["english"])
            score = 0.0

            if q == label_n or q == eng_n:
                score += 120
            # Substring credit only for queries long enough to be meaningful --
            # a 1-2 char query like "b" is a substring of half the dataset.
            if len(q) >= 3 and (q in label_n or (eng_n and q in eng_n)):
                score += 55
            if len(q) >= 2 and q in e["sinhala"]:
                score += 60

            overlap = q_tokens & set(_tokens(e["_haystack"]))
            score += 18 * len(overlap)

            # A short query that *is* a whole word of the label or gloss is a
            # strong signal even though it's too short for substring credit --
            # this is what makes "go", "K" and "eat" resolve correctly.
            label_tokens = _tokens(label_n)
            if q in label_tokens or q in _tokens(eng_n):
                score += 45
            if label_tokens and label_tokens[0] == q:
                score += 30

            # Tie-break toward the concise, canonical sign: "yanawa" (to go)
            # should rank above "50 KM idiriyata yanna" for the query "go".
            score += max(0, 12 - 2 * len(label_tokens))

            # Fuzzy match rescues typos and half-remembered Romanisation.
            ratio = difflib.SequenceMatcher(None, q, label_n).ratio()
            if ratio > 0.62:
                score += ratio * 45
            if eng_n:
                eratio = difflib.SequenceMatcher(None, q, eng_n).ratio()
                if eratio > 0.68:
                    score += eratio * 30

            if score > 12:
                scored.append((score, e))

        if not scored:
            return []

        scored.sort(key=lambda pair: (-pair[0], pair[1]["label"].lower()))
        if scored[0][0] < self.MIN_SCORE:
            return []
        # Keep only results in the same quality band as the best one, so a
        # strong match isn't padded out with weak noise.
        cutoff = max(self.MIN_SCORE * 0.62, scored[0][0] * 0.42)
        return [e for s, e in scored[:limit] if s >= cutoff]

    def card(self, entry: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "label": entry["label"],
            "sinhala": entry["sinhala"],
            "english": entry["english"],
            "category": entry["category"],
            "categoryLabel": CATEGORY_LABEL.get(entry["category"], "Sign"),
            "tips": CATEGORY_TIPS.get(entry["category"], CATEGORY_TIPS["phrase"]),
        }

    def stats_line(self) -> str:
        parts = [
            f"{len(self.categories.get(c, []))} {CATEGORY_LABEL.get(c, c).lower()}s"
            for c in ("letter", "number", "month", "phrase")
            if self.categories.get(c)
        ]
        return f"{len(self.entries)} signs in total — " + ", ".join(parts)


KB = SignKnowledgeBase()


# ---------------------------------------------------------------------------
# Local intent engine
# ---------------------------------------------------------------------------

# NOTE: the Sinhala alternatives are matched without a trailing \b -- Sinhala
# words often end in a combining mark (e.g. the hal kirima in ආයුබෝවන්), which
# is not a word character, so \b never fires there.
GREETING_RE = re.compile(
    r"^(hi|hey|hello|yo|hola|ayubowan|aayubowan|good (morning|evening|afternoon))\b"
    r"|^\s*(ආයුබෝවන්|ආයුබෝවන|හෙලෝ)",
    re.I,
)

THANKS_RE = re.compile(r"^\s*(thanks|thank you|thx|ty|cheers|nice|great|awesome|cool|perfect|බොහොම ස්තූතියි|ස්තූතියි)\b|^\s*(ස්තූතියි|බොහොම ස්තූතියි)", re.I)

CATEGORY_QUERY = [
    (re.compile(r"\b(letters?|alphabets?|fingerspell\w*|අකුරු)\b", re.I), "letter"),
    (re.compile(r"\b(numbers?|digits?|numerals?|counting|ඉලක්කම්|අංක)\b", re.I), "number"),
    (re.compile(r"\b(months?|calendar|මාස)\b", re.I), "month"),
    (re.compile(r"\b(phrases?|sentences?|verbs?|වචන)\b", re.I), "phrase"),
]

LIST_VERB_RE = re.compile(r"\b(show|list|all|which|what|browse|give|see|display|know)\b", re.I)

RANDOM_RE = re.compile(
    r"\b(random|surprise me|quiz me|something new|teach me (a|any|some)|"
    r"give me (a|any) sign|any sign to practi[cs]e)\b",
    re.I,
)

CAPABILITY_RE = re.compile(
    r"\b(what can you do|what do you do|who are you|your name|capabilit\w+|"
    r"what do you know|how can you help|what are you)\b",
    re.I,
)

TIPS_RE = [
    re.compile(r"\b(tips?|advice|guidance)\b", re.I),
    re.compile(r"\b(confiden\w+|accura\w+|detect\w+|recogni\w+)\b[^.?!]{0,24}\b(low|bad|poor|not|isn'?t|won'?t|never|fail\w*)\b", re.I),
    re.compile(r"\b(low|bad|poor|improve|increase|better|raise)\b[^.?!]{0,24}\b(confiden\w+|accura\w+|detect\w+|recogni\w+|result\w*|score)\b", re.I),
    re.compile(r"\b(model|it|camera)\b[^.?!]{0,20}\b(can'?t|cannot|won'?t|doesn'?t|not)\b[^.?!]{0,20}\b(see|read|detect|recogni\w+)\b", re.I),
]

# Words that describe *how* the user is asking rather than *what* they're
# asking about. Removing them is what turns "how do I sign to eat?" into the
# search query "eat".
STOPWORDS = {
    "how", "do", "does", "did", "i", "you", "your", "sign", "signs", "signing",
    "the", "a", "an", "for", "in", "on", "at", "what", "whats", "is", "are",
    "s", "to", "say", "says", "show", "me", "my", "of", "please", "can",
    "could", "would", "tell", "about", "mean", "means", "meaning", "make",
    "makes", "perform", "teach", "learn", "gesture", "gestures", "sinhala",
    "ssl", "language", "translate", "translation", "and", "with", "there",
    "any", "give", "list", "explain", "some", "something", "random", "again",
    "practice", "practise", "tip", "tips", "want", "need", "know",
    "this", "that", "it", "sing",
}


def _strip_query(message: str) -> str:
    """Reduce a natural question to the bare thing being asked about."""
    toks = _tokens(message)
    # "how do I sign the letter A" / "sign B" -- keep the single letter, which
    # STOPWORDS would otherwise swallow ("a" is a stopword).
    letter = re.search(r"\b(?:letters?|alphabets?|fingerspell\w*|signs?)\s+(?:the\s+)?(?:letter\s+)?([a-z])\b", message, re.I)
    if letter:
        return letter.group(1).lower()
    if len(toks) == 1 and len(toks[0]) <= 2:
        return toks[0]
    kept = [t for t in toks if t not in STOPWORDS]
    return " ".join(kept).strip()


def local_answer(message: str) -> Dict[str, Any]:
    """Answer purely from the local knowledge base. Never raises."""
    msg = (message or "").strip()
    low = msg.lower()

    if not msg:
        return {
            "text": "Ask me about any sign in the dataset and I'll show you the Sinhala script, the meaning and how to practise it.",
            "cards": [],
            "chips": ["What signs do you know?", "Show me the letters", "How do I sign 'to eat'?"],
        }

    # 1. Greeting -----------------------------------------------------------
    if GREETING_RE.search(low):
        return {
            "text": (
                "ආයුබෝවන්! I'm **සවන AI**, your sign-language tutor for this app.\n\n"
                f"I know all **{len(KB.entries)}** signs this model was trained on. "
                "Ask me how to sign something, what a sign means, or ask for a sign to practise."
            ),
            "cards": [],
            "chips": ["How do I sign 'to eat'?", "Show me the letters", "Teach me a random sign"],
        }

    # 1b. Thanks ------------------------------------------------------------
    if THANKS_RE.search(msg) and len(_tokens(msg)) <= 3:
        return {
            "text": "Anytime! Keep practising — ask me for another sign whenever you're ready.",
            "cards": [],
            "chips": ["Teach me a random sign", "Practice tips", "Show me the letters"],
        }

    # 2. Capability / help --------------------------------------------------
    if CAPABILITY_RE.search(low):
        return {
            "text": (
                "I'm the built-in tutor for **සවන**. I can:\n\n"
                "• **Look up any sign** — \"how do I sign *to drink*?\"\n"
                "• **Translate** — \"what does *gannawa* mean?\"\n"
                "• **Browse by group** — \"show me the numbers\"\n"
                "• **Give you practice tips** so the model reads your sign confidently\n"
                "• **Speak any sign aloud** — tap the speaker on any card\n\n"
                f"_{KB.stats_line()}._"
            ),
            "cards": [],
            "chips": ["Show me the months", "How do I sign 'to write'?", "Teach me a random sign"],
        }

    # 3. Dataset size -------------------------------------------------------
    if re.search(r"\b(how many|how much|count|total)\b", low) and re.search(r"\b(sign|gesture|class|label|word)\w*\b", low):
        return {
            "text": (
                f"This model recognises **{len(KB.entries)}** distinct signs.\n\n"
                f"{KB.stats_line()}.\n\n"
                "Every one of them is in the **Supported Signs** panel — and I can teach you any of them."
            ),
            "cards": [],
            "chips": ["Show me the letters", "Show me the numbers", "Teach me a random sign"],
        }

    # 4. Random / quiz ------------------------------------------------------
    if RANDOM_RE.search(low) and KB.entries:
        entry = random.choice(KB.entries)
        gloss = f" (*{entry['english']}*)" if entry["english"] else ""
        return {
            "text": (
                f"Here's one to practise — **{entry['sinhala']}**{gloss}.\n\n"
                "Perform it in front of the camera and watch the confidence bar climb."
            ),
            "cards": [KB.card(entry)],
            "chips": ["Teach me another one", "Practice tips", "Show me the letters"],
        }

    # 5. Category listing ---------------------------------------------------
    for pattern, cat in CATEGORY_QUERY:
        m = pattern.search(low)
        if m and (LIST_VERB_RE.search(low) or _norm(msg) == _norm(m.group(0))):
            items = KB.categories.get(cat, [])
            preview = items[:12]
            return {
                "text": (
                    f"The dataset has **{len(items)}** {CATEGORY_LABEL.get(cat, cat).lower()}"
                    f"{'s' if len(items) != 1 else ''}. "
                    + ("Here are the first few — ask me about any one for the full breakdown." if len(items) > len(preview) else "Here they are.")
                ),
                "cards": [KB.card(e) for e in preview],
                "chips": ["Practice tips", "Teach me a random sign", "How many signs do you know?"],
            }

    # 6. Practice tips ------------------------------------------------------
    if any(p.search(low) for p in TIPS_RE):
        bullets = "\n".join(f"• {t}" for t in GENERAL_TIPS)
        return {
            "text": f"**Getting a clean detection**\n\n{bullets}\n\nIf a sign still won't register, ask me about it by name and I'll give you guidance for that sign's type.",
            "cards": [],
            "chips": ["Teach me a random sign", "Show me the letters", "How many signs do you know?"],
        }

    # 7. Sign lookup (the main path) ----------------------------------------
    stripped = _strip_query(msg)
    results = KB.search(stripped or msg, limit=6)
    if not results and stripped != msg:
        results = KB.search(msg, limit=6)

    if results:
        top = results[0]
        rest = results[1:4]
        gloss = f" — *{top['english']}*" if top["english"] else ""
        text = (
            f"**{top['sinhala']}**{gloss}\n\n"
            f"Dataset label `{top['label']}` · {CATEGORY_LABEL.get(top['category'], 'Sign')}. "
            "The card below has practice guidance, and the speaker button plays the Sinhala pronunciation."
        )
        if rest:
            text += "\n\nClose matches: " + ", ".join(f"**{r['sinhala']}**" for r in rest) + "."
        return {
            "text": text,
            "cards": [KB.card(e) for e in results[:4]],
            "chips": ["Practice tips", "Teach me a random sign", "Show me the letters"],
        }

    # 8. Fallback -----------------------------------------------------------
    sample = ", ".join(f"*{e['label']}*" for e in random.sample(KB.entries, min(3, len(KB.entries)))) if KB.entries else ""
    return {
        "text": (
            "I couldn't match that to a sign in this dataset. I only know the "
            f"**{len(KB.entries)}** signs the model was trained on — try the English meaning "
            "(\"how do I sign *to walk*?\"), the Romanised Sinhala"
            + (f" ({sample})" if sample else "")
            + ", or Sinhala script."
        ),
        "cards": [],
        "chips": ["What can you do?", "Show me the letters", "Teach me a random sign"],
    }


# ---------------------------------------------------------------------------
# Optional free-tier LLM layer (retrieval-augmented)
# ---------------------------------------------------------------------------

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

SYSTEM_PROMPT = """You are "සවන AI", the built-in tutor inside a Sinhala Sign Language recognition web app built as a university research project.

Your job is to help the user learn and practise the signs this app's model recognises.

Hard rules:
- The CONTEXT block below is retrieved from the app's own dataset. It is the only ground truth about which signs exist. Never claim a sign exists if it is not in the dataset, and never invent a Sinhala translation.
- Never invent a specific handshape or finger-position description for a sign. You do not have that reference data. Instead give practice guidance: framing, lighting, holding the sign for the full capture window, movement pacing.
- Keep answers short and warm — 2 to 5 sentences, or a tight bullet list. This is a chat bubble, not an essay.
- Sinhala script may be used freely; the user reads Sinhala.
- Use light markdown (**bold**, bullets with •). No headings, no code fences.
- If the retrieved context is empty and the question is about a specific sign, say plainly that it is not in this dataset."""


def _build_context(message: str) -> str:
    hits = KB.search(_strip_query(message) or message, limit=8)
    if not hits:
        return "CONTEXT: no matching signs found in the dataset.\n" + f"DATASET SIZE: {KB.stats_line()}."
    lines = []
    for e in hits:
        gloss = f" | english: {e['english']}" if e["english"] else ""
        lines.append(f"- label: {e['label']} | sinhala: {e['sinhala']} | type: {e['category']}{gloss}")
    return (
        f"DATASET SIZE: {KB.stats_line()}.\n"
        "CONTEXT (signs retrieved from this app's dataset for the user's question):\n"
        + "\n".join(lines)
    )


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
        "name": "සවන AI",
        "signCount": len(KB.entries),
        "summary": KB.stats_line(),
        "categories": {c: len(v) for c, v in KB.categories.items()},
        "providers": [
            {"id": pid, "name": p["name"], "defaultModel": p["default_model"], "keysUrl": p["keys_url"]}
            for pid, p in PROVIDERS.items()
        ],
        "starters": [
            "How do I sign 'to eat'?",
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

    if not api_key or provider not in PROVIDERS:
        return {**local, "engine": "local", "engineLabel": "Offline engine"}

    model, note = _resolve_model(provider, api_key, (req.model or "").strip())
    model = model or PROVIDERS[provider]["default_model"]
    system = SYSTEM_PROMPT + "\n\n" + _build_context(message)
    history = [{"role": t.role, "content": t.content} for t in req.history]

    try:
        text = _call_llm(provider, api_key, model, system, history, message)
        return {
            "text": text,
            "cards": local.get("cards", []),
            "chips": local.get("chips", []),
            "engine": provider,
            "engineLabel": f"{PROVIDERS[provider]['name']} · {model}",
            "modelId": model,
            "notice": note,
        }
    except Exception as exc:
        return {
            **local,
            "engine": "local",
            "engineLabel": "Offline engine",
            "notice": f"AI model unavailable ({_friendly_error(exc)}) — answered offline instead.",
        }
