# 00 Mission (12-22 Oct 2026)

## 1. Who and what

- **Project:** SLIIT IT4010 research project R26-SE-019 (Jan 2026 cohort): real-time two-way Deaf-hearing communication in Sri Lankan Sign Language (SSL). Supervisor Ms. Hansi De Silva, co-supervisor Ms. Ishara Weerathunga, external partner The School for the Deaf, Ratmalana.
- **kvn** (Ranathunga R A K N, IT22552860) owns the Suvana monorepo `C:\Users\User\Documents\Suvana` (GitHub `kavindu-rakn/Suvana`) and the Suvana brand. He owns the **Learn** component.
- **Suvana** integrates the four project components under one brand:

| Suvana module | Path | Owner | Upstream |
|---|---|---|---|
| Learn | `apps/learn`, `tools/reference-converter` | kvn | R26 `learn-ssl-module/` |
| Recognize | `services/recognition` | Lahiru (= Chamara) | R26 `sinhala_sign_language_recognition/` |
| Communicate | `apps/communicate`, `services/speech` | Lithira (= Malkith) | `lithiraMalkith/Sign-Detector` |
| Alerts | `apps/alerts`, `services/sound-awareness` | Karindra (= Gimhan) | R26 `soundguard-karindra/` |
| Shell | `apps/shell`, `packages/branding` | kvn | none |

- **Other repos (read-only for agents):** the R26 team repo `C:\Users\User\Documents\R26-SE-019` (the team's official repo; Learn lives in `learn-ssl-module/web`, deployed by kvn to https://learn-ssl-module.vercel.app), and Lithira's `C:\Users\User\Documents\DesktopItems\Sign-Detector`.

## 2. Goals (kvn, 12 Oct)

1. **Work in Suvana until finished.** Learn must stay portable to R26 `learn-ssl-module/web`, and learn-ssl-module.vercel.app is redeployed after every Learn milestone so R26 always has kvn's latest Learn.
2. **Make Learn genuinely great.** kvn's own verdict: today it is not presentable, not competitive with market learning apps, has many bugs, is not production-level, and if the panel says "learn this sign and perform it on the spot", even he cannot learn from it. Going beyond or differing from the March proposal is fine. Address the panel comments (PP1, PP2).
3. **Integrate every teammate's component** in Suvana so the demo works on any device.
4. **Commercialisation is graded:** one Suvana brand, deployed at suvana.help.
5. **Parallel agents:** Claude Code, Codex and Antigravity run in parallel; work is split into tasks with disjoint files, and everything is documented so no agent forgets anything.

## 3. Deadlines

| Date | Milestone |
|---|---|
| 12 Oct (tonight) | Plan committed; re-sync branch merged into main (K-01); DN-12 confirmed (already implemented on `docs/revolution-plan`: root `AGENTS.md`, `CLAUDE.md` = `@AGENTS.md`; pending kvn's merge) |
| 14 Oct | Blocker fixes live on suvana-learn.vercel.app and learn-ssl-module.vercel.app (M0) |
| 17 Oct | M1: game path, onboarding, playback, adaptation fix; Communicate + shell deployed |
| 19 Oct | M2: Watch/Try/Recall, feedback replay, scenarios, licence mode, progress; recognition hosted |
| 20 Oct | Domain bought and attached (if all green); rehearsal 1; thesis drafts |
| **21 Oct** | **Demo-ready:** final gates, tag `demo-2026-10-21`, final R26 redeploy, rehearsal 2; code freeze 18:00 |
| **22 Oct** | **Final demo and final thesis submission** |

## 4. kvn's decisions of 12 Oct (also in DECISIONS.md)

- **Commits:** each agent works in its own git worktree on its own branch and may commit there. Agents never commit to `main` and never push. kvn reviews and merges in GitHub Desktop. Commit message = summary line plus point-form body, **no Co-Authored-By trailer**. In the R26 repo agents never commit; they hand kvn the two copyable blocks (summary line; point-form body).
- **Domain:** suvana.help is bought later, by kvn, once everything is deployed on `.vercel.app`. Agents never buy anything.
- **Teammates' secrets:** kvn has none yet (Lithira's MongoDB/Auth/Cloudinary/admin env and speech service; Lahiru's model/data files). Plan around their hosted versions where usable and list exactly what to ask each teammate for (05-integration.md section 5).
- **Demo:** final demo about 22 Oct; be demo-ready by 21 Oct.
- Also standing (from 10-11 Oct): Learn is developed in Suvana and mirrored to R26; the Learn home page's decorative preview cards (88% MATCH, 5 Day Streak, Fluent badge) stay as they are; the "50% rule" applies only to the uploaded draft thesis (do not edit it after 11 Oct), not to the app or the final thesis.

## 5. Hard rules (non-negotiable)

1. **Never invent SSL content:** no glosses, meanings, Sinhala translations, sign or gloss order, handshape/location/movement descriptions. References come from the public corpora or real signers; meanings only from kvn-verified `apps/learn/src/data/translations.ts`; gloss order only from Lithira's mapper or a real corpus clip. A drawing that implies where on the body a sign is made (for example a head-and-shoulders silhouette behind hands-only data) counts as invented location.
2. **Never invent or misquote figures.** Learn's evaluation (EVALUATION.md): ROC AUC 0.744; best-threshold separation 74.6% **always with** the 65.4% majority-class baseline; the 28.7-point gap recorded in EVALUATION.md (quote it only with that file's own definition); median scoring time 1.8 ms. Scores are "match scores against one signer's reference", never "accuracy". Never quote Lahiru's 0.9878 / 98.78% (probable train/test leakage). Zero participants: no SUS, satisfaction or learning-gain figures. New numbers only from a script whose output is cited.
3. **UI changes are decided by kvn** from rendered before/after screenshots, desktop (1280x800) and phone (390x844; 360 for layout tasks), before adoption.
4. **Licences:** `kaggle_*` reference landmarks are CC0; `yohan_*` are CC BY-NC-SA 4.0 (non-commercial, share-alike). The Kaggle corpus states its clips come from "public YouTube videos and private interviews" (`tools/reference-converter/README.md:130`), so showing corpus **video** is a separate decision (DN-05); nothing shows video until kvn decides.
5. **Datasets never enter a repo;** large assets stay server-side or in Cloudinary/blob storage. Integrate teammates at the HTTP/contract level; never rewrite their stacks; never regenerate `labels.npy` or `sinhala_labels.json`.
6. **No sub-brands** inside Suvana (Sawana, SignSpeak, SoundGuard are teammates' standalone names).
7. **The submitted draft thesis file is never edited;** the final thesis is a separate copy.
8. **UI freeze during a study:** if a pilot ever starts, Learn's interaction, scoring and feedback do not change until its last participant, and participants are pinned to one deployment URL. (No study is planned: ethics approval was never applied for.)
9. Agents never commit to `main`, push, merge, deploy, buy, or message anyone; in R26 they never commit.

## 6. Scope

**In scope by 21 Oct**
- Learn: blocker bugs; honest feedback; onboarding; better playback; a game path (units, stars, unlocks, daily goal, streak); Watch, Try, Recall; visible rule-based adaptation; progress dashboard; scenario cleanup; licence mode; sentence challenge from real corpus clips (if DN-08); corpus video only if DN-05 allows; phone and accessibility polish.
- Integration: Suvana's own Communicate instance (accounts, UI, avatar; Lithira's animations only if he sends them); Recognize hosted; Alerts APK; shell pages for commercialisation.
- Deployment on `.vercel.app`, then suvana.help; CI gaps; R26 mirror and redeploys.
- Final thesis update in a separate copy.

**Out of scope (future work)**
- Avatar or LLM tutor in Learn; BKT or learned adaptation; K-means/PrefixSpan error mining; continuous-signing grading; per-account progress sync; any user study or pilot (no ethics approval).
- Any SSL content made up by the team.

## 7. Definition of done (21 Oct, 18:00)

- [ ] Every MAJOR bug in 04-bugs.md is fixed, merged and ported to R26.
- [ ] Learn: Path, Watch/Try/Recall, stars, daily goal, streak, session-complete, honest finger states, timing/path hints, replay, "Why this sign?" chip and ADAPTATION.md all work on phone and laptop, each adopted by kvn from screenshots.
- [ ] Learn gates on main: lint 0 warnings; all tests pass; main JS at most 160 kB gzip; Playwright smoke passes.
- [ ] The same Learn commit is live at suvana-shell.vercel.app/learn/ (or suvana.help/learn/) and at learn-ssl-module.vercel.app.
- [ ] Shell, Communicate (own instance), Recognize (hosted) and the Alerts APK are reachable from the landing page; the smoke script passes on the production URL.
- [ ] No sub-brand text on any user-visible Suvana surface (CI grep).
- [ ] DEMO.md rehearsed twice, including the laptop fallback.
- [ ] Final-thesis text drafted from what is actually merged; every figure sourced.
- [ ] Tag `demo-2026-10-21` proposed by Q-08 and created by kvn.
