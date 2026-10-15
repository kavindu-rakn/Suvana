# Licences for the bundled reference recordings

These JSON files contain **hand-landmark coordinates derived from third-party
sign-language video corpora**. No video frames are redistributed — only 21
(x, y, z) points per hand per frame.

**The files here are not all under the same licence.** Every file records its
own `licence`, `attribution`, `source` and `sourceDataset`, and a test
(`src/scoring/references.test.ts`) fails the build if any dataset-derived
reference is missing them. Check the file, not this table, when in doubt.

## This edition (DN-04 / D-A23, kvn, 15 Oct 2026)

The default full-corpus edition is **free, non-commercial and academic**.
There are **no payments, no ads and no paid offering**. Yohan-derived landmarks
remain under CC BY-NC-SA 4.0; the app's code and the individual corpora do not
become a single shared licence.

Both corpora have been **modified (landmark extraction)**: source video was
converted to hand-landmark coordinates. Corpus credits and licence links are
visible in the Reference library. No new permission to redistribute video is
implied by this edition choice.

Kaggle source: https://www.kaggle.com/datasets/dckahawearachchi/sinhala-sign-language-dataset

CC0 1.0: https://creativecommons.org/publicdomain/zero/1.0/

| Prefix | Source corpus | Licence | Commercial use |
|---|---|---|---|
| `kaggle_*` | D. C. Kahawearachchi et al., *Sinhala Sign Language Video Dataset* (Kaggle) | **CC0 1.0** (public domain) | Permitted |
| `yohan_*` | Yohan Abhishek, *Sinhala Sign Language video dataset* | **CC BY-NC-SA 4.0** | **Not permitted** |
| anything else | Recorded by the project team in the app's Record tab | Project's own | Permitted |

## What CC BY-NC-SA 4.0 requires of us

- **BY** — credit the author, link the licence, and state that we modified the
  work (we did: video → hand landmarks).
- **NC** — non-commercial use only. Academic research and teaching are fine.
  **While `yohan_*` files are present, this platform cannot be commercialised.**
- **SA** — derivatives must be offered under the same licence, so the `yohan_*`
  files here are themselves CC BY-NC-SA 4.0.

Full text: https://creativecommons.org/licenses/by-nc-sa/4.0/

## CC0 content preview

Set `VITE_CONTENT=cc0` when building to make only references explicitly marked
`CC0-1.0` selectable. Yohan references are excluded from the runtime index and
direct frame loads; incomplete scenarios show Preview. The default is `all`.
This setting does **not** remove NC JSON assets from Vite's copied public
directory and is **not** a commercially cleared distribution. No payments or
ads are introduced. A separate commercial distribution would need to remove
restricted assets and audit its content and claims before publication.

## Replacing restricted content later

The obligation attaches to the data and its derivatives, not permanently to this
codebase. Replacing the `yohan_*` files with independently cleared recordings,
then regenerating the manifest and index, is separate from this preview. Anything
already *published* while they were included stays distributed under those terms
— fine for academic release, worth knowing before any commercial decision.

The intended end state is a corpus recorded with the School for the Deaf,
Ratmalana, which would replace both third-party sources and carry no such
restriction.

## Citing them

CC0 requires no attribution, but cite both in the report regardless — academic
practice, not licence compliance. The Kahawearachchi corpus has an associated
paper: *Real-Time Recognition and Translation of Sinhala Sign Language*, IEEE
ICARC 2025, https://ieeexplore.ieee.org/document/10962983

Yohan source (SSL400, supplied by kvn and dataset-page title verified 15 Oct 2026):
https://www.kaggle.com/datasets/yohanabhishek/ssl400-dynamic-sri-lankan-sign-language-dataset/data

The source download carried no licence file or README; the existing reference
metadata remains the record of the CC BY-NC-SA 4.0 attribution used here.
