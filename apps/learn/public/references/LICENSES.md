# Licences for the bundled reference recordings

These JSON files contain **hand-landmark coordinates derived from third-party
sign-language video corpora**. No video frames are redistributed — only 21
(x, y, z) points per hand per frame.

**The files here are not all under the same licence.** Every file records its
own `licence`, `attribution`, `source` and `sourceDataset`, and a test
(`src/scoring/references.test.ts`) fails the build if any dataset-derived
reference is missing them. Check the file, not this table, when in doubt.

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

## Removing the restriction later

The obligation attaches to the data and its derivatives, not permanently to this
codebase. Deleting the `yohan_*` files and regenerating `manifest.json`
(`python tools/convert_references.py --manifest-only`) removes it. Anything
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

> **TODO (kvn):** record the source URL for Yohan Abhishek's dataset — the
> download carried no licence file or README, so the citation is incomplete.
