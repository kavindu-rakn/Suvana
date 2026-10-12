# 01 Honest state on 12 Oct 2026 (evening)

This is the baseline every agent starts from. Evidence is given for each claim. If something here turns out to be wrong, say so in your handoff and LOG.md ("Plan correction: ..."); do not work around it silently.

## 1. Repos and branches

**Suvana** `C:\Users\User\Documents\Suvana` (GitHub `kavindu-rakn/Suvana`)
- `main` = `9152637` ("Add Suvana conference paper and LaTeX assets"). Verified tonight with `git log --oneline -1 main`.
- `846d4fd` ("Log the 10 Oct re-sync; recognition README pytest note") is on `sync/upstream-2026-10` and `docs/revolution-plan`, **5 commits ahead of main** (`git rev-list --count main..846d4fd` = 5):
  - `c69f460` adds `tools/sync` (status/apply/guard/record, CI guards)
  - `476e911` adds the Suvana `CLAUDE.md`
  - `4e338bf` re-syncs Learn to R26 `334beba`
  - `f30ce1c` re-syncs Communicate to Sign-Detector `48ab8cb`
  - `846d4fd` logs the re-sync
- The re-sync is therefore **committed on a branch but not merged into main**. CI's `sync-guards` job needs `tools/sync`, so CI on main stays incomplete until K-01.
- Working tree on `docs/revolution-plan` (12 Oct): `CLAUDE.md` modified (now just `@AGENTS.md` plus notes), new root `AGENTS.md` (the single instruction file) and `docs/plan/` uncommitted. `docs/` contained only `assets/` before this plan.

**R26 team repo** `C:\Users\User\Documents\R26-SE-019`: read-only for agents.
- Local `main` is 6 behind `origin/main`; read with `git show origin/main:<path>`. kvn pulls in K-01.
- Learn = `learn-ssl-module/web`, built at base `/`.
- Lahiru pushed 5 recognition commits on 12 Oct (`656f371` through `ec2604a` inclusive, plus merge `3f1a684`).
- Its landing page (`sinhala_sign_language_recognition/webapp/static/index.html`) links Learn (learn-ssl-module.vercel.app) and Lithira's hosted Communicate (https://sign-detector-tawny.vercel.app).

**Lithira's repo** `C:\Users\User\Documents\DesktopItems\Sign-Detector`: unchanged since `48ab8cb`.

**Learn divergence (Suvana vs R26):** Suvana `apps/learn` = R26 `334beba` plus the declared couplings (infra audit, measured by diff): `vite.config.ts` base `/learn/`, outDir `dist/learn`, port 5174; `vercel.json` header prefix `/learn/`; `src/App.tsx` +18 lines (`fetchSession`, `<AccountButton>`); `AppNavBar.tsx` +6 lines (`account` slot); `Hero.tsx` home link; `index.css` +78 lines account CSS; Suvana-only `src/app/session.ts` and `src/app/AccountButton.tsx`; lockfile 19-line difference. **Nothing is un-ported today.** The manifest note that the AppNavBar slot is "also prepared in R26's working tree" is stale (R26 origin/main lacks it).

**Sync status tonight** (`node tools/sync/sync.mjs status`): learn nothing new upstream; recognition 5 new commits, 33 files to take; alerts/sound-awareness nothing new; reference-converter has kvn's port `5909a56` (merges cleanly) plus 3 undeclared Suvana-side diffs (`README.md`, `convert_references.py`, `missing_signs.txt`); communicate nothing new.

## 2. Gates run on 12 Oct

Full output: `C:\Users\User\AppData\Local\Temp\claude\c--Users-User-Documents-Suvana\243f806f-8050-4949-9708-1be3bf447c8d\scratchpad\gates.txt`.

| Gate | Result | Evidence |
|---|---|---|
| apps/learn test | 138 passed, 2 skipped | gates.txt |
| apps/learn lint | 2 warnings (exhaustive-deps): `src/vision/useHandTracking.ts:207`, `src/components/PracticeView.tsx:479` | gates.txt |
| apps/learn build | OK; main JS 142.7 kB gzip | gates.txt |
| apps/shell build | OK | gates.txt |
| apps/communicate lint | **Passed** on the corrected re-run | gates.txt:92 |
| apps/communicate build | **Passed** on the corrected re-run with `MSYS_NO_PATHCONV=1` (route list printed). The first failure (`basePath has to start with a /, found "C:/Program Files/Git/communicate"`) was the Git Bash path rewrite, not a code error. The build read the local `.env.local`, which CI does not have. | gates.txt:22-27, 66-92 |
| sync guard | 150 checks passed in gates.txt; **152 passed** on a re-run on 12 Oct (fact-check) | gates.txt:30; `node tools/sync/sync.mjs guard` |

## 3. Module status

| Module | Works locally | Deployed | Blockers and evidence |
|---|---|---|---|
| Shell `apps/shell` | Yes: landing, `/alerts/` page, Suvana AI (Gemini server-side via Edge `api/assistant.ts`; returns 503 when unset and the widget falls back to a local engine) | No | Recognize card hides its link off localhost (`src/main.ts:274-281`, `index.html:218` `data-service-url=""`). Visible sub-brand "SoundGuard Ecosystem" (`index.html:404`). Footer Privacy/Terms/Contact are `#` (`index.html:525-527`). Stale example `recognize.suvana.lk` (`index.html:211`). |
| Learn `apps/learn` | Yes | No Suvana deployment. R26 copy live at https://learn-ssl-module.vercel.app (commit `334beba`, deployment `dpl_4gfgnSdmCw8msd5dhc6nzMhknPLH`, 11 Oct) | Learnability and bugs (02, 03, 04). The live R26 site has the invented finger percentages, Esc bug and immutable cache. |
| Communicate `apps/communicate` | UI and accounts against local MongoDB (`mongodb://localhost:27017/suvana-dev`); avatar A loads (FBX committed under `public/models/A`) | No | No gloss animations (Lithira's Cloudinary/Mongo data), no speech service, `ADMIN_EMAILS` empty locally, `CLOUDINARY_CLOUD_NAME=placeholder`. `scripts/seedGlosses.ts` seeds one identical placeholder keyframe for 35 glosses: **never demo it**. Internal key `signspeak.contribute.speakerKey` (`ContributeClient.tsx:15`) is not user-visible. |
| Recognize `services/recognition` | Yes, uvicorn on :8000 using R26's venv | No host anywhere, including Lahiru's | `labels.npy`, `sinhala_labels.json`, `metadata.json`, `best_model.h5` (27 MB) are tracked in Suvana (R26 origin/main tracks `best_model.h5` but not `labels.npy` or `sinhala_labels.json`). Docker image not verified. Page has no link back to Suvana. Server still mounts `/api/soundguard` and ships `soundguard.js/.css` (`server.py:115-121`; internal names, no visible text found). Lahiru's 12-Oct code not yet synced. |
| Speech `services/speech` | Not run | No | About 3.5 GB of weights on first start; LoRA adapter `SPEAK-ASR/whisper-si-exp-10-medium-all` is public; `emotion_clf.joblib` optional; CPU 10-20x slower than GPU (its README). |
| Alerts `apps/alerts` | On-device only; needs a native build (Expo Go cannot run the custom module) | No APK | EAS project `80d799af-0e87-41d7-8a12-60fb02e661d1` and package `com.karindragimhan69.soundguard` belong to Karindra. User-visible "SOUNDGUARD" (`components/Onboarding.tsx:204`), "SoundGuard is listening" (`plugins/withSoundGuardBackground.js:171`, `:249`), slug/scheme `soundguard`. |

**Vercel** team `team_WVADC45JhBSU0pda5PJAy3Z6` (scope `kavindu-rakns-projects`) has 8 projects; the only Suvana/R26 one is `learn-ssl-module` (the rest are kvn's unrelated projects; do not touch them). `suvana-learn`, `suvana-communicate`, `suvana-shell` do not exist; their URLs return 404. Production `*.vercel.app` aliases are public; preview URLs are SSO-protected (302 to Vercel login) and need a dashboard Share link. **suvana.help** is not bought ($1.99 first year, $32.12 renewal).

**Hosting facts (infra audit, 12 Oct):** Hugging Face Docker Spaces now require a paid plan (PRO) to create; Render's free tier is too small for TensorFlow; Railway Hobby is $5/month plus usage and always on; Fly.io needs a card; Cloud Run needs a billing account.

## 4. Learn in numbers

- `apps/learn/public/references/`: 503 files = 501 references + `manifest.json` + `LICENSES.md`. 141 `kaggle_*` (CC0), 360 `yohan_*` (CC BY-NC-SA 4.0). About 490 distinct glosses. Assets: references 26 MB, models 7.5 MB, wasm 22 MB.
- References hold **hand landmarks only**: no pose, no face, no video. Each records provenance (`source`, `sourceFile`, `sourceCategory`, `sourceLabel`; `tools/reference-converter/README.md:216`), so each Kaggle reference maps mechanically to its source clip. No trim-offset field was seen in the first 600 chars of `kaggle_100.json` (rest unchecked).
- **Kaggle corpus:** 175 videos in 7 categories, including "SSL Sentences" (21 clips, not converted) (`tools/reference-converter/README.md:132`). Provenance stated as "public YouTube videos and private interviews" (`README.md:131`). The repo currently states "No video frames are redistributed" (`LICENSES.md:3-5`, `README.md:136-138`).
- **Starter content facts (reviewer's prefix grep, 12 Oct):** Greetings = 5 signs, all `yohan_*`. Numbers: only `yohan_1`, `yohan_2`, `yohan_4`, `yohan_5`; **no "3" in either corpus**. Kaggle numbers exist only as "20-99" (7) and "100-1 million". Kaggle also has A-Z (25), Months (11), Verbs (55), Additional words (20). So the unit "greetings plus numbers 1-5" is impossible and would be entirely non-commercial.
- Verified English meanings in `src/data/translations.ts`: between about 40 and about 75 (two line counts disagree; L-09 computes the exact join). Letters, numbers and months explain themselves.
- Median reference length 2.5 s (p10 1.5 s, p90 3.1 s).
- **Scenarios:** Restaurant 5/5 turns have references. Social Gathering 3/7 (ME, NAME, WHAT, YOUR missing from both corpora; they occur only inside Kaggle sentence clips). The 3 playable Social Gathering signs are all `yohan_*` (`apps/learn/README.md:353`). Scenario hints such as "movement towards your mouth" were written by the team and are not validated.
- **Scoring:** DTW over handshape + trajectory weighted 0.8/0.2; anchors 0.22/0.77; bands 85/60; mirror-aware. Median 1.8 ms. ROC AUC 0.744; best-threshold separation 74.6% against a 65.4% majority-class baseline. Distinct signs can be closer than two takes of the same sign (cross-sign minimum 0.134 vs same-sign median 0.459, per `score.ts` comments), so the scorer **grades a named sign; it is not a recogniser**.
- **Adaptation (rule-based):** EWMA mastery, weight 0.5 on the newest attempt; mastered at >= 0.85 after >= 3 attempts; improving at >= 0.6; need = 0.75(1 - m) + 0.25 min(days/5, 1); unseen signs first. `learner/session.ts startSession` is **never called from the UI** and unseen signs always outrank weak ones (bugs A4/A5).
- **UI facts:** the Hero shows decorative preview cards (88% MATCH, 5 Day Streak, Fluent badge); kvn decided on 11 Oct to leave them unchanged. Per-finger percentages on the result screen are invented by formula (bug A3) and must go.
- No participants, no pilot, **no ethics approval applied for**. Supervisor unresponsive since March.

## 5. Teammates

- **Secrets and data:** kvn has none from any teammate.
- **Lithira:** hosted Communicate (sign-detector-tawny.vercel.app) is SignSpeak-branded (`<title>Sign up — SignSpeak</title>`), registration closed, own origin with no basePath, speech on Colab/ngrok (R26 CLAUDE.md: never make a demo depend on it). Not integrable under the Suvana brand.
- **Lahiru:** no hosted recognition. His 12-Oct commits add `src/model/inference_engine.py` (TFLite, then `tf.function`, then `predict`; `*.tflite` is gitignored, so a clean clone uses `tf_function`), a `webapp/server.py` change, 4 new `.h5` (about 88 MB, not loaded at runtime), notebooks, `train_and_evaluate_all.py`, `model_comparison.json` (LSTM 0.9878, transformer 0.2895) and `VIVA_PROGRESS_ALIGNMENT.md` ("171 base recorded videos x 12" = one source video per class, so train and test probably share source videos). Labels and the runtime model are unchanged.
- **Karindra:** Alerts needs an APK built under his EAS project, or a rebuild under kvn's.

## 6. Thesis

- Draft uploaded on 11 Oct: `C:\Users\User\Documents\S L I I T\Y4S1\RP\Thesis\IT22552860_DRAFT.docx` (preview PDF `IT22552860_DRAFT-preview.pdf`). **Never edited** (50% penalty rule).
- Final due about 22 Oct, as a separate copy. Chapter sources: `...\scratchpad\thesis\*.md`. March proposal: `C:\Users\User\Documents\S L I I T\Y4S1\RP\Individual Report\R26-SE-019_IT22552860_RANATHUNGA R A K N.pdf`. Panel-style review notes: `...\scratchpad\review\notes\`.
- Open items: own-words rewrite; chart titles and footnotes; learner-model worked example; Appendix B CHECK; 4 figure placeholders; accessibility of figures; optional SUS appendix (instrument only, not administered).
- Group report: **resolved 11 Oct** (Lahiru asked kvn to apply the Learn corrections himself; kvn did and sent the new team draft).

## 7. Claims that are not true today (never make them)

- "Learn has adaptive sessions" (code exists, unreachable).
- "Learn has a game, levels or goals."
- "Learn recognises signs", "Learn is X% accurate", ">= 90% agreement".
- "Users were tested", "SUS score", "learning gain".
- "Suvana is deployed", "suvana.help is live".
- "Recognition is 98.78% accurate".
- "Communicate translates speech to signing in Suvana" (no animation data, no speech host).
- "Learn shows real signer video" (not until DN-05 and K-06).
