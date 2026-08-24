"""Resolves each dataset gesture label to real Sinhala script + a speakable form.

Dataset labels are informally Romanized Sinhala filenames (e.g. "gannawa",
"mama oyata usaaviyedi nadu pawaranawa"), so feeding them straight into gTTS's
Sinhala voice mispronounces them -- that voice expects actual Sinhala Unicode
script. Three label shapes need different handling:

  - Pure numbers ("100", "5000")   -> spoken as Sinhala number words
  - Calendar months ("August")     -> spoken as the standard Sinhala month name
  - Fingerspelling letters ("A",
    "B(first way)")                -> spoken as the English letter name
  - Everything else                -> transliterated Romanized-Sinhala to
                                       Sinhala Unicode via Google's phonetic
                                       Input Tools API (the same engine behind
                                       everyday Sinhala phonetic typing).
"""

import re
import time

import requests

NUMBER_WORDS = {
    "30": "තිහ", "40": "හතළිහ", "50": "පනහ", "60": "හැට", "70": "හැත්තෑව",
    "80": "අසූව", "90": "අනූව",
    "100": "සියය",
    "200": "දෙසීය", "300": "තුන් සීය", "400": "හතර සීය", "500": "පන් සීය",
    "600": "හය සීය", "700": "හත සීය", "800": "අට සීය", "900": "නවය සීය",
    "1000": "දහස", "2000": "දෙදහස්", "3000": "තුන් දහස්", "4000": "හතර දහස්",
    "5000": "පන් දහස්", "6000": "හය දහස්", "7000": "හත් දහස්", "8000": "අට දහස්",
    "9000": "නවය දහස්",
    "10000": "දහ දහස්",
    "100000": "ලක්ෂය", "200000": "දෙලක්ෂය", "300000": "තුන් ලක්ෂය",
}

MONTH_WORDS = {
    "january": "ජනවාරි", "february": "පෙබරවාරි", "march": "මාර්තු", "mrach": "මාර්තු",
    "april": "අප්‍රේල්", "may": "මැයි", "june": "ජූනි", "july": "ජූලි",
    "august": "අගෝස්තු",
    "september": "සැප්තැම්බර්", "september (similar to s)": "සැප්තැම්බර්",
    "october": "ඔක්තෝබර්", "october(second way)": "ඔක්තෝබර්",
    "november": "නොවැම්බර්", "december": "දෙසැම්බර්",
}

_FINGERSPELLING_RE = re.compile(r"^([A-Za-z])(\([^)]*\))?$")
_PAREN_RE = re.compile(r"\([^)]*\)")

# The phonetic transliterator does very well overall, but a few labels come
# out garbled (dataset typos, ambiguous "(ex- ...)"-style annotations, or
# words it just guesses wrong). These are manually corrected/verified.
MANUAL_OVERRIDES = {
    "(1st way)": "පළමු ක්‍රමය",
    "(2nd way)": "දෙවන ක්‍රමය",
    "(ex- kunu)": "කුණු",
    "asniipai": "අසනීපයි",
    "mata asaniipai": "මට අසනීපයි",
    "muuna kasanawa": "මූණ කසනවා",
    "muuna soodanawa": "මූණ සෝදනවා",
    "beheth kiiyada": "බෙහෙත් කීයද",
    "T shirt eke mila kiiyada": "ටී ෂර්ට් එකේ මිල කීයද",
    "doctor koheda inne": "ඩොක්ටර් කොහෙද ඉන්නේ",
}


def classify_label(label):
    """Return (category, speak_text, speak_lang) without hitting the network.

    category is one of "number", "month", "letter", "phrase". For "phrase",
    speak_text/speak_lang are None -- the caller must transliterate it.
    """
    stripped = label.strip()

    if stripped in NUMBER_WORDS:
        return "number", NUMBER_WORDS[stripped], "si"

    if stripped.lower() in MONTH_WORDS:
        return "month", MONTH_WORDS[stripped.lower()], "si"

    letter_match = _FINGERSPELLING_RE.match(stripped)
    if letter_match:
        return "letter", letter_match.group(1).upper(), "en"

    return "phrase", None, "si"


def phrase_for_transliteration(label):
    """Strip English clarifying parentheticals before sending to the transliterator."""
    cleaned = _PAREN_RE.sub("", label).strip()
    return cleaned or label.strip()


def transliterate(text, retries=3, pause=0.4):
    """Romanized Sinhala -> Sinhala Unicode via Google's Input Tools API."""
    for attempt in range(retries):
        try:
            resp = requests.get(
                "https://inputtools.google.com/request",
                params={
                    "text": text,
                    "itc": "si-t-i0-und",
                    "num": 1,
                    "cp": 0,
                    "cs": 1,
                    "ie": "utf-8",
                    "oe": "utf-8",
                },
                timeout=10,
            )
            data = resp.json()
            if data[0] == "SUCCESS" and data[1] and data[1][0][1]:
                return data[1][0][1][0]
        except Exception as e:
            print(f"Transliteration attempt {attempt + 1} failed for {text!r}: {e}")
        time.sleep(pause)
    return text  # fall back to the original Romanized text


def build_label_entry(label):
    if label in MANUAL_OVERRIDES:
        sinhala = MANUAL_OVERRIDES[label]
        return {"category": "phrase", "sinhala": sinhala, "speakText": sinhala, "speakLang": "si"}

    category, speak_text, speak_lang = classify_label(label)
    if category != "phrase":
        return {"category": category, "sinhala": speak_text, "speakText": speak_text, "speakLang": speak_lang}

    to_translate = phrase_for_transliteration(label)
    sinhala = transliterate(to_translate)
    return {"category": category, "sinhala": sinhala, "speakText": sinhala, "speakLang": "si"}
