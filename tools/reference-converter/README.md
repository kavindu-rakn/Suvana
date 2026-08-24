# tools — dataset → reference converter

Turns SSL dataset videos into the reference recordings the web app scores
against, so references come from real signers rather than team members.

Two corpora are in use, under **different licences**. See
`../web/public/references/LICENSES.md` — every converted file records its own
`licence` and `attribution`, and the test suite fails if one does not.

## Corpus 2 — Yohan Abhishek (CC BY-NC-SA 4.0)

| | |
|---|---|
| Contents | 383 signs, 2,623 clips (~7 takes each), 16 grammatical categories |
| Labels | **English** (`Can`, `Where`, `Hello`) — no translation needed |
| **Licence** | **CC BY-NC-SA 4.0** — attribution, **non-commercial**, share-alike |
| Layout | Nested: `<Category>/<Sign>/<Sign>_001.mp4` |
| Pre-extracted CSVs | **Pose only** (33 landmarks). Our app is hand-based, so we process the videos ourselves and ignore them. |

```bash
python convert_references.py --dataset "<...>/Dataset - Original" --all \
  --prefix "yohan_" --source-id "yohan-dataset" \
  --dataset-name "YohanAbhishek Sinhala Sign Language dataset" \
  --licence "CC-BY-NC-SA-4.0" \
  --attribution "Yohan Abhishek, Sinhala Sign Language video dataset (CC BY-NC-SA 4.0)"
```

Covers 4 of the 7 avatar-aligned glosses (`I`→ME, `You`, `Can`, `Where`); NAME,
WHAT and YOUR are absent. Its **Greetings** category (Ayubowan, Hello, How are
you, Thank you) is a better basis for a first-meeting scenario than team
recordings.

## Corpus 1 — D. C. Kahawearachchi (CC0)

| | |
|---|---|
| Title | Sinhala Sign Language Video Dataset |
| Kaggle | `dckahawearachchi/sinhala-sign-language-dataset` |
| URL | https://www.kaggle.com/datasets/dckahawearachchi/sinhala-sign-language-dataset |
| Authors | D. C. Kahawearachchi and one collaborator |
| **Licence** | **CC0 1.0 — Public Domain** (confirmed on the dataset page, Aug 2026) |
| Related paper | "Real-Time Recognition and Translation of Sinhala Sign Language", IEEE ICARC 2025 — https://ieeexplore.ieee.org/document/10962983 |
| Upstream sources | Public YouTube videos and private interviews with certified Sinhala Sign Language instructors (per the dataset page) |
| Downloaded by | kvn, Aug 2026 |
| Contents | **175 videos** in 7 categories (A–Z 28, Verbs 59, Numbers 30, Months 13, Additional words 24, SSL Sentences 21), 549 MB |

**Licence: cleared.** CC0 places the dataset in the public domain, so
redistributing derived landmark coordinates in this repo is permitted, and no
attribution is legally required. Cite it anyway in the report — academic
practice, not licence compliance. We redistribute no video frames, only 21
(x, y, z) points per hand per frame.

> **On the "338 videos" in the dataset description.** The prose says 338; the
> Data Explorer lists **175 files**, which is what a download yields and what we
> hold. The 175 figure is the real one — 338 most likely counts annotated sign
> *instances* (a sentence clip contains several signs) rather than files. The
> download is complete; nothing is missing.

### What this dataset does and does not cover

**Confirmed against the complete 175-file corpus:** there are no standalone
clips for the seed glosses ME, YOU, NAME, WHAT, WHERE, CAN, YOUR. Those
concepts occur only *inside* the sentence clips (`Mage nama.mp4`,
`doctor koheda inne.mp4`, `oyaage upandinaya kawadda.mp4`), and cutting a single
sign out of continuous signing is segmentation work that CLAUDE.md scopes as
future work.

**The Social Gathering (Introductions) scenario therefore cannot be sourced from
this dataset.** Its seven glosses need either manual segmentation of the
sentence clips, team recordings (explicitly *not* ground truth per CLAUDE.md),
or School-for-the-Deaf recordings in the final phase.

Every other category is single-sign and converts directly.

## Setup

MediaPipe is a converter-only dependency — the web app never needs it.

```bash
cd learn-ssl-module/tools
python -m venv venv        # venv/ is gitignored; never commit it
venv/Scripts/python -m pip install -r requirements.txt
```

## Use

```bash
# See what would be converted, and the tracking quality, without writing
python convert_references.py --dataset "<dataset root>" --category "A-Z" --dry-run

# Convert one category
python convert_references.py --dataset "<dataset root>" --category "A-Z"

# Convert everything
python convert_references.py --dataset "<dataset root>" --all
```

Output goes to `../web/public/references/` as one JSON per gloss plus a
regenerated `manifest.json`.

## How it stays consistent with the app

- **No normalisation happens here.** The app stores *raw* image-normalised
  landmarks and normalises at comparison time
  (`web/src/scoring/normalize.ts`), applying the same treatment to reference and
  attempt. A converter that normalised would put references through the
  pipeline twice. The script emits exactly what MediaPipe returns.
- **Same model file** (`web/public/models/hand_landmarker.task`) and the same
  detector settings as `web/src/vision/handTracker.ts` — the constants are
  duplicated at the top of the script with a comment pointing at the source of
  truth.
- **Handedness** is left as MediaPipe reports it. The scorer already tries both
  orientations and keeps the better (`scoreAttempt`), so a systematic left/right
  difference between dataset video and webcam cannot break scoring.

## Conversion rules

| Rule | Why |
|---|---|
| Gloss = the corpus's own label, uppercased — never translated | Kahawearachchi's labels are Sinhala transliterations (`kanawa`). Inventing an English gloss for a sign none of us can verify is not acceptable; verified meanings live in `web/src/data/translations.ts`. Yohan's labels are already English. |
| One reference per gloss: the take closest to that sign's **median duration**, then best tracking | Coverage alone is unsafe — a truncated clip a fraction of the normal length trivially scores 100% and would teach half a sign. Measuring against the sign's own median means a genuinely brief sign is not punished. |
| Each finished gloss is written immediately | A full run is several hours; work already done should survive a crash. |
| Leading/trailing frames with no hand are trimmed | Clips open and close on a rest pose; without trimming, DTW wastes alignment on hands-down frames. |
| One reference per gloss, the take with the best hand tracking | PP2 ships one reference per sign; alternate takes (`B(first way)` / `B(second way)`) are reported for later multi-reference work. |
| Clips below `--min-coverage` (default 50% of frames with a hand) are skipped | A reference the tracker could barely see would teach the learner the wrong thing. |
| Coordinates rounded to 5 decimals | Beyond that is noise, and it roughly halves what lives in the repo. |
| Files written as `kaggle_*.json` | Cannot collide with browser-exported recordings, which are never overwritten. |

Each file records its provenance (`source`, `sourceDataset`, `sourceFile`,
`sourceCategory`, `sourceLabel`), so dataset-derived references stay
distinguishable from ones recorded in the browser.
