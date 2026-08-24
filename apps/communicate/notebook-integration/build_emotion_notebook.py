"""
Emits notebook-integration/EmotionClassifier.ipynb.

A *separate* notebook from WhishperBackend.ipynb on purpose. Training is a
one-off that runs for minutes and needs the whole dataset in memory; the
serving notebook has to start fast and stay hot.

The two meet at one point: this writes `emotion_clf.joblib`, and the serving
notebook loads it. The feature extractor is injected verbatim from
_shared_features.py so the two cannot drift apart.

Run:  python notebook-integration/build_emotion_notebook.py
"""

import json
import pathlib

from _shared_features import FEATURE_SOURCE

CELLS = [
# ── 0. intro ─────────────────────────────────────────────────────────────
(r'''# Sinhala Emotion Classifier

Trains the emotion model for the SignSpeak pipeline: **neutral / happy / sad /
angry**, matching the four postures the 3D avatar can perform.

Point it at recordings collected through `/contribute`. UrduSER can be loaded
alongside as extra training data, but it is optional and off by default.

---

### How it decides what to report

The evaluation protocol is chosen from the data, not configured, because the
honest thing to report depends entirely on how many people you recorded:

| speakers | protocol | what the number means |
|---|---|---|
| **3 or more** | leave-one-**speaker**-out | Works on a voice it has never heard. This is the number for the write-up. |
| **1 or 2** | leave-one-**sentence**-out | Works on words it has never heard, *from a voice it knows*. A pipeline check, **not** a result. |

With one speaker there is no way to measure whether the model generalises to
people — it can only be measured on the thing that varies, which is the
sentences. That is genuinely useful for confirming the pipeline works and that
the four emotions are separable at all, and it is not something a reviewer will
accept as an accuracy figure. The notebook says which one it ran, every time.''', "markdown"),

# ── 1. install ───────────────────────────────────────────────────────────
(r'''!pip install -q librosa soundfile scikit-learn joblib matplotlib pandas openpyxl''', "code"),

# ── 2. config ────────────────────────────────────────────────────────────
(r'''import os, re, glob, json, time, math, warnings, collections, urllib.request
import numpy as np, librosa, soundfile as sf
warnings.filterwarnings("ignore", category=UserWarning)

# ── Your recordings ──
# Two ways in, whichever you have:
#
#   MANIFEST  Download it from Dashboard -> Dataset, upload the .json here,
#             and cell 3 fetches every wav listed in it.
#   FOLDER    Already have the wavs? Drop them in and leave MANIFEST empty.
#
# Either way the files end up in SINHALA_DIR named spk01_s03_happy.wav.
MANIFEST = "/content/emotion_dataset_manifest.json"
SINHALA_DIR = "/content/emotion_data"

# ── UrduSER (optional) ──
# Extra training data from https://data.mendeley.com/datasets/jcpfjnk5c2/3.
# Off by default: it is acted Pakistani TV dialogue, and testing showed its
# prosody sits well outside natural speech — a model trained on it alone
# scored below chance on a Sinhala speaker. Worth trying as a *supplement*
# once you have real data to test against, which is what cell 7 measures.
USE_URDU = False
URDUSER_DIR = "/content/UrduSER"
URDU_LABEL_MAP = {
    "angry": "angry", "anger": "angry",
    "happy": "happy", "happiness": "happy",
    "neutral": "neutral",
    "sad": "sad", "sadness": "sad",
    # fear / boredom / disgust deliberately absent — the avatar has no posture
    # for them, and folding them into these four would be inventing data.
}

EMOTIONS = ["neutral", "happy", "sad", "angry"]
MIN_DURATION_S, MAX_DURATION_S = 0.4, 15.0

# Takes quieter than this are dropped. A near-silent clip still produces a
# full feature vector, so nothing warns you — it just quietly drags the model.
MIN_PEAK = 0.03

MODEL_OUT = "emotion_clf.joblib"

print("Config set.")
print(f"  manifest : {MANIFEST if os.path.exists(MANIFEST) else '(not uploaded — will use the folder)'}")
print(f"  audio    : {SINHALA_DIR}")
print(f"  urdu     : {'ON — ' + URDUSER_DIR if USE_URDU else 'off'}")''', "code"),

# ── 3. fetch from manifest ───────────────────────────────────────────────
(r'''"""
Pull the audio down from the manifest.

Cloudinary URLs are public, so no credentials are needed here — the manifest
itself is the thing that stays behind the dashboard login.

Already-downloaded files are skipped, so re-running after collecting more
recordings only fetches the new ones.
"""
os.makedirs(SINHALA_DIR, exist_ok=True)

if os.path.exists(MANIFEST):
    with open(MANIFEST, encoding="utf-8") as fh:
        manifest = json.load(fh)

    samples = manifest.get("samples", [])
    print(f"Manifest lists {len(samples)} recordings.")
    print(f"  generated {manifest.get('generatedAt', '?')}")
    totals = manifest.get("totals", {})
    if totals:
        print(f"  speakers  {totals.get('speakers')}   per emotion {totals.get('perEmotion')}")

    fetched = skipped = failed = 0
    for i, s in enumerate(samples, 1):
        dest = os.path.join(SINHALA_DIR, s["fileName"])
        if os.path.exists(dest) and os.path.getsize(dest) > 1000:
            skipped += 1
            continue
        try:
            urllib.request.urlretrieve(s["url"], dest)
            fetched += 1
        except Exception as e:
            print(f"  could not fetch {s['fileName']}: {e}")
            failed += 1
        if i % 25 == 0:
            print(f"  {i}/{len(samples)}")
    print(f"\ndownloaded {fetched}, already had {skipped}, failed {failed}")
else:
    have = len(glob.glob(os.path.join(SINHALA_DIR, "*.wav")))
    print(f"No manifest at {MANIFEST}.")
    print(f"Using whatever is already in {SINHALA_DIR} — {have} wav file(s).")
    if have == 0:
        raise SystemExit(
            "No audio to train on.\n"
            "Either upload emotion_dataset_manifest.json (Dashboard -> Dataset -> "
            "Download manifest), or copy your wav files into " + SINHALA_DIR
        )''', "code"),

# ── 4. load + inventory ──────────────────────────────────────────────────
(r'''"""
Read the labels off the filenames, and report what the dataset actually looks
like before anything is trained on it.

`spk01_s03_happy.wav` -> speaker 01, sentence s03, emotion happy.

The sentence id is carried through because it is what makes an evaluation
possible at all when there is only one speaker.
"""
NAME_RE = re.compile(r"^(?P<spk>[A-Za-z0-9]+)_(?P<sent>[A-Za-z0-9]+)_(?P<emo>[a-z]+)$")


def load_sinhala(root):
    rows, skipped = [], []
    for ext in ("wav", "flac", "ogg", "mp3"):
        for path in glob.glob(os.path.join(root, "**", f"*.{ext}"), recursive=True):
            stem = os.path.splitext(os.path.basename(path))[0].lower()
            m = NAME_RE.match(stem)
            if not m or m.group("emo") not in EMOTIONS:
                skipped.append((path, "filename is not spkNN_sNN_<emotion>"))
                continue
            try:
                info = sf.info(path)
                duration = info.frames / info.samplerate
            except Exception as e:
                skipped.append((path, f"unreadable: {e}"))
                continue
            if not (MIN_DURATION_S <= duration <= MAX_DURATION_S):
                skipped.append((path, f"duration {duration:.1f}s out of range"))
                continue
            rows.append({"path": path, "speaker": m.group("spk"), "sentence": m.group("sent"),
                         "emotion": m.group("emo"), "duration": duration, "corpus": "sinhala"})
    return rows, skipped


def load_urdu(root):
    """UrduSER: emotion folders, and the actor number leads the filename."""
    if not os.path.isdir(root):
        print(f"  UrduSER not found at {root} — skipping.")
        return []
    rows = []
    norm = lambda s: re.sub(r"[^a-z]", "", str(s).lower())
    for path in glob.glob(os.path.join(root, "**", "*.wav"), recursive=True):
        rel = os.path.relpath(path, root).replace("\\", "/").lower()
        label = next((URDU_LABEL_MAP[k] for k in sorted(URDU_LABEL_MAP, key=len, reverse=True)
                      if k in rel), None)
        if not label:
            continue
        parts = os.path.splitext(os.path.basename(path))[0].split("_")
        actor = parts[0] if parts and parts[0].isdigit() else "x"
        try:
            info = sf.info(path)
            duration = info.frames / info.samplerate
        except Exception:
            continue
        if not (MIN_DURATION_S <= duration <= MAX_DURATION_S):
            continue
        rows.append({"path": path, "speaker": f"urdu{actor}", "sentence": f"u{parts[-1] if parts else '0'}",
                     "emotion": label, "duration": duration, "corpus": "urdu"})
    return rows


records, skipped = load_sinhala(SINHALA_DIR)
if skipped:
    print(f"{len(skipped)} file(s) skipped:")
    for p, why in skipped[:8]:
        print(f"  {os.path.basename(p)}: {why}")
    print()

if USE_URDU:
    urdu_rows = load_urdu(URDUSER_DIR)
    print(f"UrduSER: {len(urdu_rows)} clips")
    records += urdu_rows

if not records:
    raise SystemExit(f"Nothing usable in {SINHALA_DIR}.")

si = [r for r in records if r["corpus"] == "sinhala"]
speakers = sorted({r["speaker"] for r in si})
sentences = sorted({r["sentence"] for r in si})
grid = collections.Counter((r["speaker"], r["emotion"]) for r in si)

print(f"Sinhala: {len(si)} clips, {len(speakers)} speaker(s), {len(sentences)} sentence(s), "
      f"{sum(r['duration'] for r in si)/60:.1f} min\n")
print("            " + "".join(f"{e:>10}" for e in EMOTIONS))
for s in speakers:
    print(f"{s:>12}" + "".join(f"{grid[(s,e)]:>10}" for e in EMOTIONS))
print(f"{'TOTAL':>12}" + "".join(
    f"{sum(1 for r in si if r['emotion']==e):>10}" for e in EMOTIONS))

# ── what can honestly be measured with this ──
print()
if len(speakers) >= 3:
    print(f"{len(speakers)} speakers -> leave-one-SPEAKER-out. This is the number to report.")
elif len(sentences) >= 6:
    print(f"Only {len(speakers)} speaker(s) -> leave-one-SENTENCE-out.")
    print("  Confirms the pipeline works and that the emotions are separable.")
    print("  It is NOT a speaker-independent result and should not be reported as accuracy —")
    print(f"  add {3-len(speakers)} more speaker(s) for that.")
else:
    print(f"Only {len(speakers)} speaker(s) and {len(sentences)} sentence(s): too little to")
    print("  hold anything out. Everything below will be optimistic.")''', "code"),

# ── 5. features ──────────────────────────────────────────────────────────
('"""\nFeature extraction — shared verbatim with WhishperBackend.ipynb.\n\nBoth notebooks are generated from notebook-integration/_shared_features.py, so\nthe vectors the classifier trains on and the vectors it is served cannot drift\napart. That mismatch is the classic way a model quietly loses accuracy in\nproduction with nothing in the logs to show for it.\n"""\n\n'
 + FEATURE_SOURCE
 + '\n\n_probe, FEATURE_NAMES = extract_features(np.random.randn(SAMPLE_RATE).astype(np.float32) * 0.01)\nprint(f"Feature extractor ready — {len(FEATURE_NAMES)} features per clip")', "code"),

# ── 6. build the matrix ──────────────────────────────────────────────────
(r'''X, y, speaker_of, sentence_of, corpus_of, meta = [], [], [], [], [], []
dropped_quiet = []
t0 = time.perf_counter()

for i, r in enumerate(records, 1):
    try:
        wave = load_and_trim(r["path"])
        peak = float(np.max(np.abs(wave))) if wave.size else 0.0
        # A silent take still yields a full feature vector, so it has to be
        # caught here or it silently drags the model.
        if peak < MIN_PEAK:
            dropped_quiet.append((os.path.basename(r["path"]), peak))
            continue
        if wave.size < SAMPLE_RATE * MIN_DURATION_S:
            continue
        vec, _ = extract_features(wave)
    except Exception as e:
        print(f"  skip {os.path.basename(r['path'])}: {e}")
        continue
    X.append(vec); y.append(r["emotion"])
    speaker_of.append(r["speaker"]); sentence_of.append(r["sentence"])
    corpus_of.append(r["corpus"]); meta.append(r)
    if i % 100 == 0 or i == len(records):
        print(f"  {i}/{len(records)}  ({time.perf_counter()-t0:.0f}s)")

X = np.vstack(X); y = np.array(y)
speaker_of = np.array(speaker_of); sentence_of = np.array(sentence_of)
corpus_of = np.array(corpus_of)
is_si = corpus_of == "sinhala"

if dropped_quiet:
    print(f"\n{len(dropped_quiet)} take(s) dropped as too quiet (peak < {MIN_PEAK}):")
    for name, peak in dropped_quiet[:8]:
        print(f"  {name}  peak {peak:.3f}")

print(f"\nFeature matrix: {X.shape[0]} clips x {X.shape[1]} features "
      f"({int(is_si.sum())} Sinhala)")
print(f"Labels: {dict(collections.Counter(y[is_si]))}")''', "code"),

# ── 7. train ─────────────────────────────────────────────────────────────
(r'''"""
Train and evaluate.

Whichever protocol runs, the group being held out is never split across train
and test — that is what stops the score being inflated by the model having
already seen the thing it is being asked about.

Three model families are compared rather than one being asserted best, and
prediction latency is measured alongside accuracy. For this component latency
is a stated requirement, so a forest that wins by half a point of F1 while
costing 40 ms on every response is the worse model; the tie-break band below
makes that trade explicit rather than a judgement call buried in a notebook.
"""
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.svm import SVC
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import LeaveOneGroupOut, cross_val_predict
from sklearn.metrics import (accuracy_score, f1_score, classification_report,
                             confusion_matrix)

CANDIDATES = {
    # Scaling lives inside the pipeline so it is refit per fold — scaling on
    # the whole dataset first leaks the held-out group's statistics.
    "SVM (RBF)": Pipeline([("scale", StandardScaler()),
        ("clf", SVC(C=10, gamma="scale", kernel="rbf", class_weight="balanced",
                    probability=True, random_state=0))]),
    "Random Forest": Pipeline([("scale", StandardScaler()),
        ("clf", RandomForestClassifier(n_estimators=200, min_samples_leaf=2,
                                       class_weight="balanced", random_state=0))]),
    "Logistic Regression": Pipeline([("scale", StandardScaler()),
        ("clf", LogisticRegression(max_iter=2000, class_weight="balanced", random_state=0))]),
}

# Parallel folds help on Colab but joblib spawns processes, which fails on
# memory-constrained machines. Try parallel, fall back rather than dying.
N_JOBS = -1
def fit_folds(pipe, Xf, yf, gf, cv):
    global N_JOBS
    try:
        return cross_val_predict(pipe, Xf, yf, groups=gf, cv=cv, n_jobs=N_JOBS)
    except (OSError, MemoryError) as e:
        if N_JOBS == 1: raise
        print(f"  (parallel workers unavailable — {e}; continuing single-threaded)")
        N_JOBS = 1
        return cross_val_predict(pipe, Xf, yf, groups=gf, cv=cv, n_jobs=1)

Xs, ys = X[is_si], y[is_si]
spk, sent = speaker_of[is_si], sentence_of[is_si]
n_speakers, n_sentences = len(set(spk)), len(set(sent))

# The protocol follows from the data — see the table in cell 0.
if n_speakers >= 3:
    PROTOCOL, groups = "leave-one-speaker-out", spk
    HONEST = True
elif n_sentences >= 6:
    PROTOCOL, groups = "leave-one-sentence-out", sent
    HONEST = False
else:
    raise SystemExit(
        "Not enough to hold anything out — need 3+ speakers, or 6+ sentences "
        "from one speaker."
    )

# Urdu clips, if loaded, are training-only. They are never tested on: the
# question is always whether this works on Sinhala.
extra_X, extra_y = X[~is_si], y[~is_si]
cv = LeaveOneGroupOut()
n_folds = len(set(groups))
print(f"Protocol: {PROTOCOL}  ({n_folds} folds)")
if extra_X.size:
    print(f"Plus {len(extra_X)} Urdu clips as extra training data (never tested on).")
print()

results = {}
for name, pipe in CANDIDATES.items():
    if extra_X.size:
        # cross_val_predict can't add fixed training data, so the folds are
        # walked by hand to append the Urdu clips to each training split.
        preds = np.empty(len(ys), dtype=object)
        for tr, te in cv.split(Xs, ys, groups):
            pipe.fit(np.vstack([Xs[tr], extra_X]), np.concatenate([ys[tr], extra_y]))
            preds[te] = pipe.predict(Xs[te])
        preds = preds.astype(str)
    else:
        preds = fit_folds(pipe, Xs, ys, groups, cv)

    fitted = pipe.fit(Xs, ys)
    fitted.predict_proba(Xs[:1])
    lat = []
    for _ in range(20):
        t = time.perf_counter(); fitted.predict_proba(Xs[:1]); lat.append((time.perf_counter()-t)*1000)
    results[name] = {"preds": preds,
                     "accuracy": accuracy_score(ys, preds),
                     "macro_f1": f1_score(ys, preds, average="macro", zero_division=0),
                     "predict_ms": float(np.median(lat))}
    r = results[name]
    print(f"{name:22s}  acc {r['accuracy']*100:5.1f}%   macro-F1 {r['macro_f1']*100:5.1f}%"
          f"   predict {r['predict_ms']:6.2f} ms")

TIE_BAND = 1.0
top = max(results, key=lambda k: results[k]["macro_f1"])
close = [k for k in results if (results[top]["macro_f1"] - results[k]["macro_f1"]) * 100 <= TIE_BAND]
best_name = min(close, key=lambda k: results[k]["predict_ms"])
best = results[best_name]
if best_name != top:
    print(f"\n{top} scored highest, but {best_name} is within {TIE_BAND} F1 points and "
          f"{results[top]['predict_ms'] - best['predict_ms']:.2f} ms faster — taking the faster one.")

print("\n" + "=" * 62)
print(f"RESULT — {best_name}, {PROTOCOL}")
print("=" * 62)
print(f"accuracy   {best['accuracy']*100:5.1f}%")
print(f"macro F1   {best['macro_f1']*100:5.1f}%")
print(f"chance     {100/len(EMOTIONS):5.1f}%")
if not HONEST:
    print()
    print("  NOTE: this held out SENTENCES, not speakers. It shows the four")
    print("  emotions are separable and the pipeline works end to end. It does")
    print("  NOT show the model works on a new person, because there is only")
    print("  one voice in the data. Do not report this as accuracy.")
print()
print(classification_report(ys, best["preds"], zero_division=0))

label = "speaker" if PROTOCOL.endswith("speaker-out") else "sentence"
print(f"per-{label} accuracy (each as the held-out group)")
for g in sorted(set(groups)):
    m = groups == g
    print(f"  {g:>10}  {accuracy_score(ys[m], best['preds'][m])*100:5.1f}%  (n={int(m.sum())})")''', "code"),

# ── 8. confusion matrix + save ───────────────────────────────────────────
(r'''import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import joblib, sklearn

cm = confusion_matrix(ys, best["preds"], labels=EMOTIONS)
cmn = cm.astype(float) / np.maximum(cm.sum(axis=1, keepdims=True), 1)

fig, ax = plt.subplots(figsize=(5.5, 4.8), dpi=160)
im = ax.imshow(cmn, cmap="Blues", vmin=0, vmax=1)
ax.set_xticks(range(len(EMOTIONS)), EMOTIONS, rotation=30, ha="right")
ax.set_yticks(range(len(EMOTIONS)), EMOTIONS)
ax.set_xlabel("predicted"); ax.set_ylabel("actual")
ax.set_title(f"{best_name} — {PROTOCOL}\nacc {best['accuracy']*100:.1f}%  "
             f"macro-F1 {best['macro_f1']*100:.1f}%")
for i in range(len(EMOTIONS)):
    for j in range(len(EMOTIONS)):
        ax.text(j, i, f"{cm[i,j]}\n{cmn[i,j]*100:.0f}%", ha="center", va="center",
                fontsize=9, color="white" if cmn[i, j] > 0.5 else "black")
fig.colorbar(im, ax=ax, fraction=0.045, label="share of actual class")
fig.tight_layout(); fig.savefig("confusion_matrix.png", bbox_inches="tight")
print("wrote confusion_matrix.png"); plt.show()

# Refit on everything for deployment. The cross-validation above is what gets
# reported; there is no held-out set left to contaminate.
final_X = np.vstack([Xs, extra_X]) if extra_X.size else Xs
final_y = np.concatenate([ys, extra_y]) if extra_X.size else ys
final_model = CANDIDATES[best_name].fit(final_X, final_y)

bundle = {
    "model": final_model,
    "labels": EMOTIONS,
    "feature_names": FEATURE_NAMES,
    "sample_rate": SAMPLE_RATE,
    # Provenance travels with the artifact so a stale .joblib can't be mistaken
    # for a current one weeks later — including whether the score is a real
    # speaker-independent number or a pipeline check.
    "metrics": {
        "cv": PROTOCOL,
        "speaker_independent": HONEST,
        "n_speakers": int(n_speakers),
        "n_sentences": int(n_sentences),
        "n_clips_sinhala": int(is_si.sum()),
        "n_clips_urdu": int((~is_si).sum()),
        "accuracy": float(best["accuracy"]),
        "macro_f1": float(best["macro_f1"]),
        "algorithm": best_name,
        "predict_ms": float(best["predict_ms"]),
    },
    "sklearn_version": sklearn.__version__,
    "trained_at": time.strftime("%Y-%m-%d %H:%M:%S"),
}
joblib.dump(bundle, MODEL_OUT)
print(f"\nwrote {MODEL_OUT}  ({os.path.getsize(MODEL_OUT)/1024:.0f} KB)")
print(json.dumps(bundle["metrics"], indent=2))

probe = load_and_trim(meta[0]["path"])
extract_features(probe)
times = []
for _ in range(20):
    t = time.perf_counter(); v, _ = extract_features(probe); final_model.predict([v])
    times.append((time.perf_counter()-t)*1000)
print(f"\nend-to-end emotion inference: {np.median(times):.1f} ms")
print("\nDownload it:")
print("  from google.colab import files; files.download('emotion_clf.joblib')")''', "code"),

# ── 9. try your own voice ────────────────────────────────────────────────
(r'''"""
Try it live.

A quick sanity check, not evidence: you know the answer while you perform it,
and if you are also the speaker in the training data then the model has heard
your voice already. Use it to confirm the thing responds sensibly before
wiring it into the backend.
"""

def predict_emotion(path, show=True):
    """Exactly what the serving notebook does, so this is a real rehearsal."""
    wave = load_and_trim(path)
    if wave.size < 0.4 * SAMPLE_RATE:
        return {"emotion": "neutral", "confidence": None}
    vec, _ = extract_features(wave)
    probs = final_model.predict_proba([vec])[0]
    order = np.argsort(probs)[::-1]
    if show:
        for i in order:
            print(f"      {EMOTIONS[i]:>8}  {probs[i]*100:5.1f}%  {'#' * int(round(probs[i]*30))}")
    i = int(order[0])
    return {"emotion": EMOTIONS[i], "confidence": round(float(probs[i]), 3)}


def record(seconds=4, countdown=3):
    """
    Records with an unmistakable start and stop signal.

    The countdown runs inside the browser, after the microphone is already
    open — `getUserMedia` can take a second or two to grant, so a "speak now"
    printed from Python appears before recording actually begins, which is how
    the front of every sentence goes missing.
    """
    from IPython.display import Javascript, display
    from google.colab import output
    import base64, subprocess

    display(Javascript(r"""
    window._rec = async function(seconds, countdown) {
      const p = document.createElement('div');
      p.style.cssText = 'font:700 32px system-ui;padding:24px;text-align:center;' +
        'border-radius:12px;background:#12121a;color:#eee;margin:8px 0';
      document.body.appendChild(p);
      const say = (t,c) => { p.textContent = t; p.style.color = c || '#eee'; };
      say('opening microphone...', '#888');
      let stream;
      try {
        // Gain control, noise suppression and echo cancellation are tuned for
        // voice calls: they flatten loudness and smooth spectral detail, which
        // is exactly the prosody this model reads.
        stream = await navigator.mediaDevices.getUserMedia({audio:{
          autoGainControl:false, noiseSuppression:false, echoCancellation:false}});
      } catch (e) { say('microphone blocked — allow it in the address bar', '#f66'); throw e; }
      const ctx = new (window.AudioContext||window.webkitAudioContext)();
      const beep = (f,ms) => { const o=ctx.createOscillator(),g=ctx.createGain();
        o.frequency.value=f;o.connect(g);g.connect(ctx.destination);
        g.gain.setValueAtTime(0.25,ctx.currentTime);o.start();o.stop(ctx.currentTime+ms/1000); };
      const wait = ms => new Promise(r=>setTimeout(r,ms));
      for (let i=countdown;i>0;i--){ say('get ready... '+i,'#f4b400'); beep(440,90); await wait(1000); }
      const rec = new MediaRecorder(stream), chunks = [];
      rec.ondataavailable = e => chunks.push(e.data);
      rec.start(); beep(880,180);
      for (let l=seconds;l>0;l--){ say('SPEAK NOW  ('+l+')','#34a853'); await wait(1000); }
      rec.stop(); beep(330,260);
      await new Promise(r=>rec.onstop=r);
      stream.getTracks().forEach(t=>t.stop());
      say('done','#888');
      const fr = new FileReader();
      return await new Promise(r=>{ fr.onloadend=()=>r(fr.result); fr.readAsDataURL(new Blob(chunks)); });
    };
    """))

    data = output.eval_js(f"_rec({seconds}, {countdown})")
    stamp = int(time.time())
    webm, wav = f"/content/take_{stamp}.webm", f"/content/take_{stamp}.wav"
    with open(webm, "wb") as fh:
        fh.write(base64.b64decode(data.split(",")[1]))
    # librosa decodes through libsndfile, which has no Opus decoder.
    r = subprocess.run(["ffmpeg","-y","-loglevel","error","-i",webm,
                        "-ar",str(SAMPLE_RATE),"-ac","1",wav], capture_output=True, text=True)
    if r.returncode != 0 or not os.path.exists(wav):
        raise RuntimeError(f"ffmpeg could not convert the recording:\n{r.stderr}")
    return wav


def test_emotions(seconds=4, order=("neutral","happy","sad","angry")):
    """Guided run through all four, with playback."""
    from IPython.display import Audio, display
    hits = []
    for emo in order:
        print("\n" + "-"*54)
        print(f"  say it in an {emo.upper()} way")
        print("-"*54)
        input("  press Enter when ready  ")
        path = record(seconds)
        wave = load_and_trim(path)
        peak = float(np.max(np.abs(wave))) if wave.size else 0.0
        if peak < MIN_PEAK:
            print(f"  ! very quiet (peak {peak:.3f}) — move closer and try again")
        display(Audio(path))
        got = predict_emotion(path)
        ok = got["emotion"] == emo
        hits.append(ok)
        print(f"\n  you said {emo.upper()}  ->  model heard {got['emotion'].upper()}  {'OK' if ok else 'X'}")
    print(f"\n{sum(hits)} of {len(hits)} correct")
    return hits


print("="*54)
print("  Ready. In a new cell run:    test_emotions()")
print("="*54)
print("  press Enter -> three ticks -> HIGH beep = speak -> LOW beep = stop")''', "code"),

# ── 10. what next ────────────────────────────────────────────────────────
(r'''## Reading the result

**If it ran leave-one-speaker-out** (3+ speakers): that accuracy is your
result. Chance is 25%. Report it with the number of speakers and the protocol
name — both matter more to a reviewer than the figure itself.

**If it ran leave-one-sentence-out** (1–2 speakers): it tells you the pipeline
works and the emotions are separable in your own voice. That is genuinely worth
knowing — it is what proves the recording setup, the features and the training
are all sound. It is not an accuracy figure, because nothing in the data
measures whether it generalises to a new person.

Expect the sentence-held-out number to be **higher** than the speaker-held-out
one you will get later. Same voice, same room, same microphone across train and
test makes the task easier. A drop when you add speakers is normal, not a
regression.

## Getting to a reportable number

Send `/contribute` to more people. **Three is the minimum; five is comfortable.**
Then re-run this notebook — it switches protocol on its own and will say so.

Speakers matter far more than sentences here. Eight speakers × 10 sentences
beats five × 20, because the number of folds is what tightens the confidence
interval on the estimate.

## Trying Urdu as a supplement

Now that you have real Sinhala data to test against, `USE_URDU = True` in cell 2
is worth one run. The Urdu clips are added to training only and never tested
on, so the comparison is clean: same protocol, same test clips, more training
data. Run it both ways and keep whichever wins.

Earlier testing showed Urdu alone transfers badly — it is acted TV dialogue and
its prosody sits well outside natural speech. As a supplement alongside real
data it may still help. Measure rather than assume.

## Then

Upload `emotion_clf.joblib` next to **WhishperBackend.ipynb** and it is picked
up automatically. Nothing changes on the web side: same response shape, and the
four labels are exactly what `resolveEmotion()` in `lib/emotion/styles.ts`
already maps to avatar postures.''', "markdown"),
]


def main() -> None:
    cells = []
    for source, kind in CELLS:
        cell = {"cell_type": kind, "metadata": {}, "source": source.splitlines(keepends=True)}
        if kind == "code":
            cell["execution_count"] = None
            cell["outputs"] = []
        cells.append(cell)

    notebook = {
        "cells": cells,
        "metadata": {
            "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
            "language_info": {"name": "python", "version": "3.11"},
            "colab": {"provenance": []},
        },
        "nbformat": 4,
        "nbformat_minor": 5,
    }

    out = pathlib.Path(__file__).with_name("EmotionClassifier.ipynb")
    out.write_text(json.dumps(notebook, indent=1, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {out}  ({len(CELLS)} cells)")


if __name__ == "__main__":
    main()
