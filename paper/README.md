# Conference paper — Suvana (R26-SE-019)

IEEE conference format, 5 pages, 23 references. Built 1 Sep 2026.

```
suvana.tex          the paper
references.bib      bibliography — every entry verified (see below)
IEEEtran.cls        IEEE conference class v1.8b
IEEEtran.bst        IEEE bibliography style v1.14
figures/            fig9-crop.png (the baseline chart, title and footnote cropped
                    off so the LaTeX caption carries them)
suvana.pdf          the compiled paper
```

**Build:** `pdflatex suvana && bibtex suvana && pdflatex suvana && pdflatex suvana`

Or drop the whole folder into Overleaf — it compiles there unchanged, which is
the easiest way for four people to edit it at once.

---

## What the paper claims

Two contributions, both defensible from what is in the repository:

1. **The integration topology.** Four prototypes in incompatible stacks served
   as one product — shell owns the root, Vite `base` and Next `basePath`
   namespacing, and the WebSocket exception for Recognise stated rather than
   hidden. This is the part that makes it a systems paper rather than four
   project reports stapled together.
2. **The calibrated DTW grader**, with the confusable-pairs measurement as the
   reason it grades a specified sign instead of identifying an unknown one.
   That measurement — distinct signs at 0.135 vs. same-sign median 0.458 — is
   the closest thing the project has to a genuine research finding.

The recognition module's 98.8% is reported **as a signer-dependent result under
a random split**, with an explicit refusal to read it as generalisation
performance, and cited against AUTSL (95.95% → 62.02%) and KArSL-100 (99.74% →
68.2%). Written that way it is a strength: it shows you know the protocol
literature. Written as a headline it is the single biggest review risk.

The paper reports **no emotion result at all**, because the trained prosody
classifier artefact is not in the repository and the service falls back to an
English model.

There is a positionality section stating that all four student authors are
hearing and no Deaf signer has validated anything. This follows the convention
in the accessibility literature (Desai et al., De Meulder et al., Mack et al.),
and it is what makes the paper honest rather than merely careful.

---

## Before you submit — things only you can fix

- [x] ~~Three surnames are placeholders.~~ Supplied 1 Sep 2026 and set
      verbatim as given: R.M.LK. Chamara, G.W.L. Malkith, T.P.K. Gimhan,
      R.A.K.N. Ranathunga. Check the initial spacing matches how each of you
      writes your name on university submissions.
- [ ] **Confirm author order and whether both supervisors want to be listed.**
      That is a conversation, not a formatting decision.
- [ ] **Ask Lahiru how the recognition test split was made.** If it is signer-
      or session-independent, Sec. V-C should say so and the framing changes
      completely. If it is a plain random split, the section stands as written.
- [ ] **Ask Lithira whether `emotion_clf.joblib` is deployed.** If it is, the
      emotion pipeline can be described with a result instead of a disclaimer.
- [ ] **Ask Karindra whether the sound classifier has any evaluation.** If a
      test accuracy exists, it belongs in Sec. V with its class count and split.
- [ ] **Pick a venue, then adjust.** Currently US Letter, 5 pages, generic
      IEEE conference format. Page limits, blinding and page size vary; some
      venues want A4 and anonymous submission.

## Related-work gaps

Sec. II covers sign language recognition for low-resource languages, evaluation
protocol, and Deaf participation — all with verified citations. It does **not**
cover signing avatars, sound awareness for DHH users, or speech emotion
recognition, because that literature search was stopped before it ran. The
Communicate and Alerts subsections therefore describe our own system without
citing prior work in their areas. A reviewer may notice. Adding two or three
citations each would close it.

## On the bibliography

Every entry was checked against a retrieved page plus Crossref, the arXiv API
or the ACL Anthology. Nothing was written from memory. Four things to verify
before camera-ready:

- `herath2022approach` — the Springer page showed series volume 454; Crossref
  carries no volume. Check against the printed proceedings.
- `pal2023importance` and `decoster2023towards` are arXiv preprints with no
  published venue found. Cite as preprints; a reviewer may discount them, so
  the quantitative protocol argument leans on AUTSL and Alyami, which are both
  peer-reviewed.
- `vaezijoze2019msasl` — BMVC version, no DOI or page numbers retrieved.
- `thennakon2025realtime` and `ahinsa2025comprehensive` — IEEE Xplore blocks
  automated fetches, so metadata is Crossref-verified but the full texts were
  not read. Someone with institutional access should check whether Thennakon
  et al.'s 96% is signer-dependent before it is used as a comparator.
