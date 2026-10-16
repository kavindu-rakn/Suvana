# Decisions

Only kvn (or a planner session he starts) edits this file, on `main`. If kvn answers a decision in chat with an agent, that agent records the answer in its handoff file and LOG.md; kvn copies it here during the daily merge. Newest changes are appended at the bottom of each section.

## A. Decided

| # | Date | Decision | Source |
|---|---|---|---|
| D-A1 | 10 Oct; 12 Oct | Learn is developed in Suvana and mirrored to R26 `learn-ssl-module/web` (kept identical by porting after every milestone) and learn-ssl-module.vercel.app (redeployed from there). | Suvana CLAUDE.md; kvn 12 Oct |
| D-A2 | 10 Oct | The team uses R26 as the official repo from 10 Oct; Suvana continues as kvn's single-brand build. | memory |
| D-A3 | 11 Oct | The "50% rule" means: do not edit the **uploaded draft** thesis after 11 Oct. It does not freeze the app or the final thesis. | memory |
| D-A4 | 11 Oct | The Learn home page's decorative preview cards (88% MATCH, 5 Day Streak, Fluent badge) stay as they are. | memory |
| D-A5 | 11 Oct | Group-report Learn corrections: kvn applied them himself at Lahiru's request and sent the new team draft. Closed. | memory |
| D-A6 | 12 Oct | Commits: each agent works in its own worktree on its own branch and may commit there; never commits to main; never pushes; kvn reviews and merges in GitHub Desktop. Message = summary line + point-form body, no Co-Authored-By trailer. In R26 agents never commit; they hand kvn the two blocks. | kvn |
| D-A7 | 12 Oct | suvana.help is bought later, by kvn, once everything is deployed on .vercel.app. Agents never buy. | kvn |
| D-A8 | 12 Oct | kvn has no teammate secrets. Plan around hosted versions where usable; list exact asks per teammate. | kvn |
| D-A9 | 12 Oct | Final demo about 22 Oct; demo-ready by 21 Oct. | kvn |
| D-A11 | 13 Oct | DN-01: Learn stays portable through **one config switch** (option B): Suvana-only parts are turned on by `apps/learn/suvana.config.json`; all other Learn files identical in both repos; verified with before/after renders of both builds (R-01). | kvn |
| D-A12 | 13 Oct | DN-17: per-finger feedback is qualitative, from the measured per-finger deviation, labelled **Correct / Almost / Wrong** (kvn's wording; replaces on/close/off). No percentages next to any finger. | kvn |
| D-A13 | 13 Oct | DN-18: from Lahiru's 12-Oct recognition commits take **code and tests only**; skip the 4 `.h5` models, PNGs, notebooks, training scripts, `demo_sentences.py` and `model_comparison.json`; never quote 98.78%. | kvn |
| D-A14 | 13 Oct | DN-10: game rules **looser** than the draft (stars 60/85 + Recall >= 60, unit pass = all signs >= 2 stars, daily goal 10). kvn gave no numbers: L-12's owner proposes concrete looser thresholds with a rendered mock for kvn's approval before building; nothing is built on guessed values. | kvn |
| D-A15 | 13 Oct | DN-17 amended (kvn in chat during L-01): **per-finger states are hidden for now.** The result shows the measured overall score, each hand's measured score for a two-handed sign, and the 'Focus on' worst-finger chips; no per-finger state, no hand diagram, no percentage. Reason (measured, `fingerStates.calibration.test.ts`): fixed cut-offs on per-finger deviation cannot tell a correct take from a wrong sign (99.7% of fingers in correct takes exceed 0.1). States return only if L-17 derives cut-offs that separate correct from wrong on the corpus. Supersedes D-A12's display. | kvn |
| D-A16 | 13 Oct | DN-05: **no corpus video** before the demo (option a). Learn ships with the improved skeleton; L-15a, L-15b and K-06 are cancelled. | kvn |
| D-A17 | 13 Oct | DN-06: not needed (no video). | kvn |
| D-A18 | 13 Oct | DN-11: learner progress stays **per browser** (IndexedDB), with reset and a demo profile. | kvn |
| D-A19 | 13 Oct | DN-14: ask Karindra (K-03) with a **15 Oct** deadline; on no reply, rebuild under kvn's EAS with package `help.suvana.alerts` (I-12a, 16 Oct). | kvn |
| D-A20 | 14 Oct | DN-19: **no third scenario** for the demo; Learn keeps Social Gathering and Restaurant, and L-31 is cancelled. | kvn |
| D-A21 | 15 Oct | DN-02: Recognize runs on **Railway Hobby** from 18 Oct (kvn pays, about $5/month plus usage), with kvn's laptop plus a free Cloudflare tunnel rehearsed as the fallback. Hosting needs Lahiru's OK (K-03 ask 5). | kvn |
| D-A22 | 15 Oct | DN-03: the speech service stays on **kvn's laptop**, not hosted; I-09 measures its speed. | kvn |
| D-A23 | 15 Oct | DN-04: option **(a)**: the full corpus as a free, non-commercial, academic edition with a visible NC notice; no payments, no ads; the Roadmap page says there is no paid offering; L-20 adds the attribution panel. | kvn |
| D-A24 | 15 Oct | DN-08: **whole Kaggle sentence clips, labelled experimental, lowest priority.** Only the 20 labelled clips (never the unlabelled one), cued by their dataset labels as written; kvn may add meanings himself. L-25 is built only if the Learn chain is on track on 19 Oct, otherwise dropped and named as future work. Sign sequences only if Lithira's mapper output arrives. | kvn |
| D-A25 | 15 Oct | DN-09: Recall shows the **verified English meaning, else the gloss label**. | kvn |
| D-A26 | 15 Oct | DN-13: Communicate is demoed as **Suvana's own instance** (accounts, UI, avatar), said up front; Lithira's data is imported if it arrives (I-13); never placeholders. | kvn |
| D-A27 | 14 Oct | DN-15: open-core Roadmap page with **no prices and no paid offering** (I-06, adopted by kvn from the renders). | kvn |
| D-A28 | 15 Oct | DN-20: **yes**: a second Claude Code session runs the thesis/docs lane (CC-T) from 17 Oct in `Suvana-wt\claude-thesis`. | kvn |
| D-A29 | 15 Oct | DN-14 follow-up: kvn rebuilt Alerts under his own Expo account regardless of any later reply from Karindra; the APK is GitHub Release alerts-v1.0.0 (I-12 done). | kvn |
| D-A30 | 16 Oct | DN-16: **no** app screenshots in the final thesis (kvn in chat with the thesis lane; T-02 removed the screenshot slot from 4.4.5). | kvn |
| D-A31 | 16 Oct | Per-finger labels (follow-up to D-A15): one time-boxed per-sign cut-off test (L-33, by 18 Oct). Labels return only if, on held-out takes, at most **20% of correct attempts** show a false Wrong and at least **50% of clearly different fingers** are labelled Wrong; then only for the signs that qualify, adopted from renders. The landing page's per-finger wording is held until the result. | kvn |
| D-A10 | 10 Oct | Upstream changes that alter product behaviour go to kvn before they are taken (e.g. Lithira closing registration was not taken). UI changes are decided from rendered before/after screenshots, desktop and phone. | Suvana CLAUDE.md |

## B. Plan defaults forced by hard rules (kvn may overturn; agents may not)

| # | Default | Rule behind it |
|---|---|---|
| PD-1 | No head-and-shoulders silhouette behind hands-only references; raw framing with a labelled frame instead. | Never invent SSL content (location) |
| PD-2 | No corpus video until DN-05 is decided. | Licence/provenance |
| PD-3 | Suvana's `apps/learn/vercel.json` (with the `/` -> `/learn/` redirect) is never ported to R26. | Protects learn-ssl-module.vercel.app |
| PD-4 | Suvana-only Learn build settings live in `apps/learn/suvana.config.json`, not a committed `.env`. | `.env*` never enter the repo |
| PD-5 | Scenario hints describing movement or location are hidden from learners until validated; "That looked closer to X" is removed. | Never invent SSL content; not a recogniser |
| PD-6 | No one else tries Learn for the project unless the supervisor says yes (K-09). | No ethics approval |
| PD-7 | Placeholder Communicate animations are never deployed or demoed. | Never invent SSL content |
| PD-8 | Recognition accuracy is never quoted. | Never misquote figures |

## C. Open decisions

Each has a **needed-by** date (the first task that consumes it). If kvn has not decided by then, the agent follows the **default** (the recommendation) only where the default is marked "safe to assume"; otherwise it skips the affected part.

### DN-01: How does Learn stay portable to R26? (needed by 13 Oct; R-01 on 14 Oct)
- Options: **B** config-driven base plus `VITE_SUVANA`-gated account code, files identical except `suvana.config.json`, `vercel.json`, lockfile (R-01). **A** keep the couplings and add a three-way-merge port command. **C** manual copy each milestone.
- Pros/cons: B makes ports a plain copy and removes most guards, but R26 carries dormant Suvana account code. A leaves R26 untouched but merges are conflict-prone. C is error-prone under time pressure.
- Recommendation: **B**, verified with before/after renders of both builds. Status: **decided 13 Oct: B (D-A11).**

### DN-02: Where is Recognize hosted for 18-22 Oct? (needed by 16 Oct; D-04 on 18 Oct)
- Options: Railway Hobby (about $5/month plus usage, always on); HF Docker Space (PRO needed; sleeps); Fly.io (card); Cloud Run with min-instances=1 (billing); laptop + cloudflared only.
- Pros/cons: Railway is the cheapest always-on WebSocket option. HF costs money and sleeps. Fly/Cloud Run need billing. Laptop-only cannot be opened from the panel's phones and depends on venue Wi-Fi.
- Recommendation: **Railway Hobby from 18 Oct**, plus the rehearsed laptop fallback. Status: decided 15 Oct (D-A21).

### DN-03: Host the speech service? (needed by 16 Oct; D-05 on 19 Oct)
- Options: host on the DN-02 platform; laptop only, registered in Communicate Settings on demo day; skip speech in the demo.
- Pros/cons: hosting costs money and CPU inference is slow (3.5 GB weights); laptop-only works locally but not from phones; skipping weakens Communicate.
- Recommendation: **laptop only** (safe to assume). Status: decided 15 Oct (D-A22).

### DN-04: Which content edition is served at suvana-shell.vercel.app and suvana.help? (needed by 16 Oct; L-20, I-06 on 18 Oct)
- Options: (a) full corpus as a free non-commercial academic edition with the NC notice, pricing page labelled "Roadmap: no paid offering; this deployment is non-commercial and academic", Hobby caveat on the page, and the `cc0` build shown as the commercial edition preview; (b) the `cc0` build at suvana.help and the full edition only at learn-ssl-module.vercel.app; (c) full corpus with no licence handling.
- Pros/cons: (a) keeps all 501 references (greetings, numbers, Social Gathering) for the demo but a pricing page beside NC content is arguable under CC's "directed towards commercial advantage" test. (b) is cleanest legally but drops about 72% of references and all of Social Gathering from the branded site. (c) risks breaching BY-NC-SA.
- Recommendation: **(a)** with the labelling, no payments, no ads; switch to (b) if kvn is uneasy. Status: decided 15 Oct: (a) (D-A23).

### DN-05: May corpus video be shown, and which? (needed by 14 Oct; L-15a/L-15b 15-16 Oct, K-06 16 Oct)
- Facts: the Kaggle dataset is CC0, but its own description says the clips come from "public YouTube videos and private interviews" (`tools/reference-converter/README.md:130`). The uploader's CC0 cannot license third-party footage or signers' likeness. The repo currently states no video frames are redistributed. Whether kvn has Yohan's source videos locally is unknown; Yohan video is NC and share-alike.
- Options: (a) no corpus video before the demo (skeleton only, improved); (b) only Kaggle clips identifiable as the uploader's own "private interviews" recordings, with credit and a takedown contact, on every deployment; (c) Kaggle clips (all) only on the non-commercial academic deployments, with credit and takedown note, none in a commercial edition; (d) (c) plus Yohan clips in the NC edition only, if kvn has them.
- Pros/cons: (a) zero risk, weaker learnability. (b) lowest-risk video, but may be few clips and needs kvn to identify them. (c)/(d) best learnability, real provenance risk.
- Recommendation: **(b) if kvn can identify own-recorded clips by 14 Oct; otherwise (a)**. Do not choose (c)/(d) without reading the dataset page's terms. Status: decided 13 Oct (D-A16). Default if undecided: (a).

### DN-06: Where are permitted clips hosted, and may R26 use them? (needed by 14 Oct)
- Options: kvn's Cloudinary with the manifest shared by both repos; Vercel Blob; Cloudinary with video only when `VITE_SUVANA === '1'` (R26 without video).
- Recommendation: **Cloudinary, manifest shared** (only matters if DN-05 allows video). Status: decided 13 Oct (D-A17).

### DN-07: merged into K-05 (curriculum approval). Closed.

### DN-08: How are sentences attempted? (needed by 16 Oct, after L-22a's label list; K-07 16 Oct, L-22b 18 Oct, L-25 19 Oct)
- Options: grade whole Kaggle "SSL Sentences" clips as single references, cued by their dataset labels, labelled experimental; sequence 2-3 isolated signs ordered only by Lithira's mapper (L-32, needs his reply); drop the sentence challenge.
- Pros/cons: whole clips use real SSL sentences with no authored order, but grading is uncalibrated and depends on usable labels. The mapper option depends on Lithira. Dropping leaves the PP1 sentence request unanswered.
- Recommendation: **whole-clip, experimental** if L-22a shows meaningful labels; add sequences only if the mapper output arrives. Status: decided 15 Oct: whole-clip, experimental, lowest priority (D-A24).

### DN-09: What cue does Recall show? (needed by 16 Oct; L-16b 18 Oct)
- Options: verified English meaning, else the gloss label; Sinhala text (only if verified); gloss label only.
- Recommendation: **verified English meaning, falling back to the gloss label** (safe to assume). Status: decided 15 Oct (D-A25).

### DN-10: Game rules (needed by 14 Oct; L-12 15 Oct)
- Options: as specified (stars 60/85 plus Recall >= 60; unit pass = all signs >= 2 stars; daily goal 10 attempts); stricter; looser.
- Note: match scores do not separate correct from incorrect strongly (74.6% vs 65.4%), so stars reward similarity to the reference, not proven correctness; UI and thesis say "match".
- Recommendation: **as specified** (safe to assume). Status: **decided 13 Oct: looser; exact values to be proposed by L-12 for kvn's approval (D-A14).**

### DN-11: Where is learner progress stored? (needed by 14 Oct)
- Options: per browser (IndexedDB) with reset and a demo profile; sync to the Communicate account in MongoDB.
- Recommendation: **per browser** for 22 Oct (safe to assume). Status: decided 13 Oct (D-A18).

### DN-12: Root AGENTS.md as single source for all three tools? (needed by 12 Oct night; Q-01 13 Oct)
- Options: AGENTS.md is the source and CLAUDE.md = `@AGENTS.md` + Claude notes; duplicate CLAUDE.md into AGENTS.md; keep CLAUDE.md only.
- Pros/cons: single source avoids drift and is native for Codex and Antigravity; duplication drifts; CLAUDE.md-only leaves two tools without rules.
- Recommendation: **single source** (Q-01; kvn reviews the rule-by-rule diff). Status: implemented on branch `docs/revolution-plan` (root `AGENTS.md`; `CLAUDE.md` = `@AGENTS.md` + Claude-only notes), pending kvn's review and merge in K-01; Q-01 adds the per-module files.

### DN-13: What does Communicate show in the demo without Lithira's data? (needed by 16 Oct)
- Options: Suvana's own instance (accounts, UI, avatar), said up front; link out to Lithira's hosted app; seeded placeholder animations.
- Recommendation: **own instance, said up front**; import his data if it arrives; never placeholders. Status: decided 15 Oct (D-A26).

### DN-14: How is the Alerts APK produced? (needed by 15 Oct; I-12a 16 Oct)
- Options: Karindra builds a signed preview APK **from Suvana's `apps/alerts`**; Karindra adds kvn to his EAS project; rebuild under kvn's EAS with package `help.suvana.alerts` if no reply by 15 Oct.
- Pros/cons: an APK from Karindra's own tree still says SoundGuard and carries his package id, so it is not acceptable under one brand. A rebuild gives brand control but changes the package id and needs an EAS build and install time.
- Recommendation: **ask (K-03), deadline 15 Oct, then rebuild.** Status: decided 13 Oct (D-A19); rebuilt 15 Oct (D-A29).

### DN-15: Pricing/business-model page content (needed by 16 Oct; I-06 18 Oct)
- Options: open-core model page with no prices; with indicative prices supplied by kvn; no pricing page.
- Recommendation: **open-core page, no prices unless kvn supplies and justifies them**, labelled roadmap and non-commercial, with the Hobby caveat. Status: decided 14 Oct (D-A27).

### DN-16: App screenshots in the final thesis? (needed by 19 Oct)
- Options: none (as in the draft); 2-3 key screens (Path, Recall, replay).
- Recommendation: **2-3 if adopted by 19 Oct**, captions honest (Hero cards decorative). Status: decided 16 Oct: no screenshots (D-A30).

### DN-17: Per-finger feedback form (needed by 13 Oct; L-01)
- Options: qualitative on/close/off from measured deviation; measured deviation numbers labelled "deviation".
- Recommendation: **qualitative** (safe to assume). Status: **decided 13 Oct: qualitative, labelled Correct / Almost / Wrong (D-A12).**

### DN-18: Take Lahiru's 12-Oct recognition commits? (needed by 13 Oct; I-04 14 Oct)
- Options: code and tests only (skip 4 `.h5`, PNGs, `demo_sentences.py`, training scripts, notebooks, `model_comparison.json`); everything; nothing until Lahiru answers.
- Recommendation: **code and tests only**; latency verified in I-08; never quote 98.78%. Status: **decided 13 Oct: code and tests only (D-A13).**

### DN-19: Build a third scenario from corpus signs? (needed by 16 Oct, after L-09's coverage table; L-31)
- Options: yes, one scenario whose turns are all existing references, English context written by kvn, no hints; no (O3 stays at 2 of 5 and the thesis says so).
- Recommendation: **only if the coverage table shows a fully playable scenario and kvn has an hour to write the context**; otherwise no. Status: **decided 14 Oct: no (D-A20).**

### DN-20: Run a second Claude Code session as a thesis/docs lane (CC-T)? (needed by 16 Oct)
- Options: yes (T-02, T-03, T-04, T-07, L-28 on 17-20 Oct, writing outside the repo except two small files); no (CC does T-04 and L-28; kvn drafts T-02/T-03 with CC on 20-21 Oct).
- Pros/cons: yes keeps the UI lane free but uses more Claude usage; no adds load to CC and kvn on the busiest days.
- Recommendation: **yes**, subject to usage limits. Status: decided 15 Oct: yes (D-A28).

## D. Teammate replies

(kvn or the planner logs replies here: date, who, what, consequence.)

- 15 Oct, Karindra (reply to kvn's note): Alerts needs no server; it runs on the phone ("Edge AI") and works offline. Consequence: nothing to host for Alerts; I-12 done with kvn's own build (D-A29).
