# සුවණ Suvana

One-platform, single-brand build of SLIIT IT4010 research project **R26-SE-019**
(Jan 2026 cohort): real-time two-way Deaf–hearing communication in Sri Lankan
Sign Language (SSL). Supervisor Ms. Hansi De Silva, co-supervisor Ms. Ishara
Weerathunga, external partner The School for the Deaf, Ratmalana.

Adapted on 10 Oct 2026 from the team repo's `CLAUDE.md`
(`ChamaraIT22076816/R26-SE-019`), which is still the record of the project's
history and the PP2 plan. Read `README.md` here for structure, topology and how
to run each module.

## Who owns what

kvn (Ranathunga R A K N) owns this repo and the Suvana brand. Older docs and
commit history use other names: **Chamara = Lahiru, Malkith = Lithira,
Gimhan = Karindra**.

| Suvana module | Owner | Upstream (what Suvana syncs from) |
|---|---|---|
| Learn — `apps/learn`, `tools/reference-converter` | kvn | R26-SE-019 `learn-ssl-module/` |
| Recognize — `services/recognition` | Lahiru | R26-SE-019 `sinhala_sign_language_recognition/` |
| Communicate — `apps/communicate`; `services/speech` | Lithira | `lithiraMalkith/Sign-Detector` |
| Alerts — `apps/alerts`, `services/sound-awareness` | Karindra | R26-SE-019 `soundguard-karindra/` |
| Shell — `apps/shell`, `packages/branding` | kvn | none — Suvana's own |

## Guardrails

- **No sub-brands inside Suvana.** Sawana, SignSpeak and SoundGuard are the
  teammates' standalone names; every Suvana surface says Suvana, with
  descriptive module names. CI enforces this in the places it can.
- **Never invent SSL content.** No made-up glosses, sign meanings, Sinhala
  translations, gloss order, or handshape descriptions. Gloss order comes from
  Lithira's mapper; references come from the shared Kaggle corpus or real
  signers.
- **Never invent or misquote figures.** Learn's 74.6% separation is not the ≥90%
  accuracy target and is never quoted without its 65.4% majority-class baseline.
- **Never regenerate Recognize's label files** (`labels.npy`,
  `sinhala_labels.json`) — their order must match the trained model's outputs.
- **Integrate at the contract (HTTP) level** — never rewrite a teammate's stack.
  Datasets never enter this repo; large assets stay server-side or in Cloudinary.
- **UI freeze during a study.** From a pilot's first participant to its last,
  Learn's interaction, scoring and feedback do not change; participants are
  pinned to one deployment URL, and the commit piloted from is tagged.

## Syncing with the upstream repos

Use `tools/sync/` — its README is the procedure. In short: `status`, `apply`,
resolve, run the gates, `guard`, `record`, then log it in `README.md`.

- Learn is developed **in both** R26 and here (decided 10 Oct 2026).
  `sync.mjs status` flags Suvana-side Learn work that still needs porting back.
- An upstream change that alters **product behaviour** goes to kvn before it is
  taken (e.g. Lithira closing registration, which Suvana did not take).
- An upstream change to the **UI** is decided from rendered before/after
  screenshots, desktop and phone, never from a description.
- Every Suvana-specific change is declared in `tools/sync/upstreams.json` with
  its reason; add a guard for anything a clean merge could silently undo.

## Working conventions

- **kvn commits himself — never run `git commit` or push.** At a commit point,
  give the summary line and a point-form description as two separate copyable
  blocks. No `Co-Authored-By` trailer. He uses GitHub Desktop.
- Explain architectural choices briefly rather than making them silently.
- Lockfiles are npm 10 output, matching CI (Node pinned in `.nvmrc`). Never copy
  an upstream lockfile.
- In Git Bash, prefix commands that pass `/communicate` with
  `MSYS_NO_PATHCONV=1`, or MSYS rewrites it into a Windows path.
