"""Suvana-only, source-backed assistant. Pure stdlib; no inference imports.

The browser engine mirrors this small router. Policy, sources and questions are
shared, and cross-runtime tests compare the entire payload for every fixture.
"""
import difflib
import json
import random
import re
from pathlib import Path

STATIC = Path(__file__).resolve().parent / "static"
KNOWLEDGE = json.loads((STATIC / "suvana-knowledge.json").read_text(encoding="utf-8"))
POLICY = json.loads((STATIC / "assistant-policy.json").read_text(encoding="utf-8"))
SIGNS = KNOWLEDGE["signs"]


def match(pattern, text):
    # JS word boundaries are ASCII; keep the Sinhala literal alternatives.
    return re.search(pattern, text, re.I | re.ASCII)


def clean(value):
    return re.sub(r'^["\'“‘]|["\'”’]$', '', re.sub(r'[?.!]+$', '', value.strip())).strip()


def norm(value):
    return re.sub(r'[^a-z0-9඀-෿ ]+', ' ', value.lower()).strip()


def fill(template, **values):
    facts = {**KNOWLEDGE["facts"], **values}
    return re.sub(r'\{(\w+)\}', lambda hit: str(facts.get(hit[1], "")), template)


def exact(query):
    q = query.strip().lower()
    if not q:
        return []
    named = [s for s in SIGNS if any(n and n.lower() == q for n in s["names"] + [s["sinhala"]])]
    return named or [s for s in SIGNS if s["english"] and s["english"].lower() == q]


def suggestions(query):
    q = norm(query)
    if len(q) < 4:
        return []
    ranked = [(max([difflib.SequenceMatcher(None, q, norm(n)).ratio() for n in s["names"] if len(n) >= 4] or [0]), s) for s in SIGNS]
    return [s for score, s in sorted(ranked, key=lambda pair: (-pair[0], pair[1]["label"])) if score >= .82][:3]


def card(sign):
    category = sign.get("recognizeCategory") or (sign["categories"] or ["Sign"])[0]
    return {"label": sign["label"], "sinhala": sign["sinhala"], "english": sign["english"],
            "category": category, "categoryLabel": {"letter":"Letter", "number":"Number", "month":"Month", "phrase":"Word / phrase"}.get(category, category),
            "tips": [], "learnUrl":sign["learnUrl"], "recognizeLabel":sign["recognizeLabel"], "units":[u["title"] for u in sign["units"]]}


def answer(intent, text, cards=None, url=None, label="Browse Learn"):
    return {"intent":intent, "text":text, "cards":cards or [], "chips":POLICY["chips"], "links":[{"label":label,"url":url}] if url else []}


def support(sign):
    return POLICY["recognizeYes" if sign["recognizeLabel"] else "recognizeNo"]


def sign_answer(sign, teaching):
    meaning = fill(POLICY["meaning"], english=sign["english"]) if sign["english"] else POLICY["meaningUnknown"]
    if teaching:
        text = fill(POLICY["teach"], label=sign["label"]) + "\n\n" + support(sign) if sign["learnUrl"] else fill(POLICY["recognizeOnly"], label=sign["label"])
    else:
        text = f'**{sign["label"]}**' + (f' · {sign["sinhala"]}' if sign["sinhala"] else '') + f'\n\n{meaning}\n\n'
        text += ("Learn has an exact-name reference recording. " if sign["learnUrl"] else "No exact-name single-sign recording in Learn. ") + support(sign)
    return answer("teach" if teaching else "lookup", text, [card(sign)], sign["learnUrl"] or "/learn/", "Watch this sign in Learn" if sign["learnUrl"] else "Browse Learn")


def strip_query(message):
    q = clean(message)
    teach = match(POLICY["teachPattern"], q)
    if teach:
        q = clean(teach[1])
    else:
        for pattern in POLICY["lookupPatterns"]:
            hit = match(pattern, q)
            if hit:
                q = clean(hit[1])
                break
    for prefix in POLICY["stopTargets"]:
        if q.lower().startswith(prefix):
            q = q[len(prefix):]
    return clean(q)


def local_answer(message, random_value=None):
    msg = clean(message or "")
    target = strip_query(msg)
    sign_request = match(POLICY['teachPattern'],msg) or any(match(p,msg) for p in POLICY['lookupPatterns'])
    explicit_sign = sign_request and exact(target) and not match(r'\bsign\s+in\b',msg)
    for route in POLICY["routes"]:
        if match(route["pattern"], msg):
            if explicit_sign and route['intent'] not in ['translation','form','outside','camera','low-score','recognition-help']:
                continue
            result = answer(route["intent"], fill(route["text"]), url=route["url"], label=route["action"])
            if route.get("refused"):
                result["refused"] = True
            if route["intent"] == "form":
                hit = match(r'(?:for|of)\s+(.+)$', msg)
                named = next((s for s in exact(clean(hit[1])) if s["learnGloss"] and s["learnGloss"].lower() == clean(hit[1]).lower()), None) if hit else None
                if named:
                    result["links"] = [{"label":"Watch this sign in Learn", "url":named["learnUrl"]}]
            return result
    if match(r'\bhow many\b|\btotal signs\b|\bsign count\b', msg):
        facts = KNOWLEDGE["facts"]
        return answer("count", f'{facts["learnCount"]} Learn glosses and {facts["recognitionCount"]} Recognize labels form {len(SIGNS)} exact-name records. Shared names do not prove that both modules use the same recording.', url="/learn/")
    if match(r'\b(random|surprise me|another one|another sign)\b', msg):
        pool = [s for s in SIGNS if s["learnUrl"]]
        choice = random.random() if random_value is None else random_value
        result = sign_answer(pool[min(len(pool)-1,max(0,int(choice*len(pool))))], True)
        return {**result, "intent":"random"}
    for category in POLICY["categories"]:
        if match(category["pattern"], msg) and match(r'^(show|list|browse|what|which|all|months?|letters?|numbers?|මාස|අකුරු|ඉලක්කම්)', msg):
            related = [u for u in KNOWLEDGE['units'] if u['sourceCategory'] in category['sourceCategories']]
            items = []
            for unit in related:
                for gloss in unit['signs']:
                    sign = next((s for s in SIGNS if s['learnGloss']==gloss), None)
                    if sign and sign not in items: items.append(sign)
            items += [s for s in SIGNS if s.get('recognizeCategory')==category['key'] and s not in items]
            page_match = match(r'\bpage\s+(\d+)', msg)
            page = max(1, int(page_match[1]) if page_match else 2 if match(r'\b(more|next)\b', msg) else 1)
            preview = items[(page-1)*12:page*12]
            detail = 'No more names on this page. ' if not preview else f'{"Next" if page>1 else "First"} {len(preview)} shown (page {page}). ' if len(items)>12 else ''
            result = answer("browse", f'{len(items)} indexed names in {category["title"]}. {detail}Spellings follow the source; membership and verified meanings are on each card.', [card(s) for s in preview], "/learn/")
            result["chips"] = [f'Show {category["title"]} page {page+1 if page*12<len(items) else 1}', "Teach me a random sign"]
            return result
    query = strip_query(msg)
    unit = next((u for u in KNOWLEDGE['units'] if u['title'].lower()==query.lower()), None)
    if unit and match(r'^(show|list|browse)', msg):
        signs = [s for gloss in unit['signs'] for s in SIGNS if s['learnGloss']==gloss]
        return answer('browse', f'Learn unit: {unit["title"]}. These names follow the approved curriculum.', [card(s) for s in signs], '/learn/')
    teaching = bool(match(POLICY["teachPattern"], msg) or match(r'(සංඥා|භාෂා).*(කොහොම|කෙසේ|පෙන්ව)', msg))
    hits = exact(query)
    if len(hits) == 1:
        return sign_answer(hits[0], teaching)
    if hits:
        return answer("lookup", "More than one listed name has that verified meaning; choose a card.", [card(s) for s in hits], "/learn/")
    if not msg or match(r'^(hi|hey|hello|thanks|thank you|help)$', msg):
        return answer("help", POLICY["greeting"], url="/learn/")
    close = suggestions(query)
    return answer("unknown", POLICY["unknown"] + " " + POLICY["suggestions" if close else "unknownAction"], [card(s) for s in close], "/learn/")


def build_context(message):
    approved = local_answer(message)
    return json.dumps({"facts":KNOWLEDGE["facts"], "records":approved["cards"], "APPROVED_ANSWER":approved["text"]}, ensure_ascii=False)


if __name__ == "__main__":
    import sys
    print(json.dumps([local_answer(q, .5) for q in json.load(sys.stdin)], ensure_ascii=False))
