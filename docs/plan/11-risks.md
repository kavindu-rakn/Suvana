# 11 Risk register (12 Oct 2026)

Likelihood/impact: Low, Medium, High. "Owner" = who watches it.

| # | Risk | L | I | Mitigation | Fallback | Owner |
|---|---|---|---|---|---|---|
| R1 | A novice (or the panel) still cannot perform a sign on the spot | M | H | Onboarding, 0.5x playback, raw framing, Watch/Try/Recall, readiness gate first; demo signs from U1 (one-handed, still, CC0, meaning verified) | kvn demonstrates the loop himself; show Path/adaptation and feedback replay; never claim success rates | CC, K |
| R2 | Corpus video provenance (Kaggle clips partly from public YouTube videos) makes showing video improper | H | H | No video before DN-05; video only for clips kvn permits, with credit and takedown note; licence statements updated in the same change | Ship skeleton-only Learn (the plan does not depend on video) | K |
| R3 | Recognize host cold-starts or fails during the viva | M | H | Always-on host from 20 Oct, uptime ping, open 5 minutes early | Laptop `docker run` + cloudflared, or localhost:7860 | K, CX |
| R4 | Communicate has no animations (Lithira silent) | H | M | Say up front: accounts, UI, avatar only; placeholder seed guarded (I-07) | Import if data arrives (I-13) | K, AG |
| R5 | Auth.js session breaks behind the Vercel external rewrite | M | M | Test 19 Oct (I-11); `AUTH_URL`/`trustHost` | Communicate on its own URL without the shared session (kvn decides) | AG, K |
| R6 | Parallel agents conflict on hot files | H | M | One owner per day (10-schedule), new components with own CSS, proposed diffs, union merge for LOG.md, per-task handoff files | kvn merges one branch, the other owner rebases next morning | All |
| R7 | Invented SSL content slips in (meanings, hints, sentence translations, location via drawings) | M | H | Meanings only from translations.ts; scenario hints hidden; sentence cues = dataset labels verbatim; no silhouette; self-check in every handoff | kvn rejects at merge; revert | All, K |
| R8 | Invented or misquoted figures (finger %, 98.78%, "accuracy", latency without measurement) | M | H | L-01 on day 1; grep in gates; Q-09 before any O1 claim; thesis wording rules (09) | Remove the claim | CC, CX |
| R9 | NC content and a pricing page on suvana.help read as commercial use; Vercel Hobby forbids commercial use | M | M | Pricing page labelled roadmap, no paid offering, non-commercial deployment; Hobby caveat on the page; `cc0` build available (DN-04) | Serve the `cc0` build at suvana.help | K, CX |
| R10 | The R26 mirror breaks learn-ssl-module (for example by porting the Suvana redirect) or redeploys a dirty tree | M | H | `vercel.json` never ported; `port --check`; redeploy only from a clean committed tree; preview + share-link check before promote | `npx vercel rollback` to the previous deployment (`dpl_4gfgn...` first) | CC, K |
| R11 | Immutable caches serve stale references or WASM | H until L-06 | M | L-06 headers; `ASSET_VERSION` query on changed files; clear site data on demo devices once | Bump `ASSET_VERSION` | CX, K |
| R12 | Camera failures on iOS Safari or Android (GPU, backgrounding, permissions) | M | H | L-04; Q-06a on 15 Oct; Q-06 on 19 Oct; record which phones exist | Laptop as primary demo device | CX, K |
| R13 | No iPhone available for testing | M | M | Q-06a asks kvn to borrow one | Demo on Android + laptop; state iOS untested | K |
| R14 | kvn becomes the bottleneck (reviews, deploys, decisions, thesis) | H | H | Budget about 6 h/day; contact sheets; decisions with needed-by dates and defaults; D-05 laptop-only; own-words pass from 16 Oct | Drop optional tasks first: L-31, L-32, L-25, L-15b, I-14, D-05 | K |
| R15 | Agent usage limits stop a lane mid-task | M | M | Small tasks, commit per task, handoff files, LOG.md | kvn reassigns the task to another lane in chat | All |
| R16 | Codex sandbox cannot write outside its worktree (locks, screens, R26) | M | M | Screens in `<worktree>/.agent-local/`; no shared lock folder; R26 ports in the Claude lane | kvn runs the port command himself | CX, CC |
| R17 | Stacked branches cascade when kvn rejects a UI render | M | M | UI tasks are leaf branches; logic tasks may stack; bottom-up merges | Rebase next morning | All |
| R18 | Longer capture window shifts scores against the calibrated bands | M | M | Learner-take trimming (L-07); thesis states no recalibration | Revert to the old window | CC, T |
| R19 | Teammates do not answer (APK, model facts, data, mapper) | M | M | Deadlines 15/16 Oct in the messages | Alerts rebuilt under kvn's EAS; tracked `best_model.h5`; Communicate without animations; no sequence level | K |
| R20 | Supervisor does not answer about informal testing (unresponsive since March) | H | L | Ask on 13 Oct; no answer by 18 Oct = no | kvn rehearses alone; thesis says no participants | K |
| R21 | The sentence challenge is unusable (labels numeric, DTW too slow or meaningless) | M | L | L-22a evidence before DN-08; perf test; "experimental" label | Drop it; thesis says the sentence request is only partly answered | CX, K |
| R22 | Thesis overrun | M | H | Drafts from merged state on 19-20 Oct by CC-T; T-09 from 16 Oct; Turnitin morning of 22 Oct | Shorter Ch5; keep draft text where unchanged | K, CC-T |
| R23 | Antigravity workflows stop working (unverified: 19 Oct date; Google's migration guide moves workflows to Skills) | H | L | Never use workflows; AGENTS.md and Skills | - | AG |
| R24 | Line-ending churn across three tools | M | L | Q-02 `.gitattributes`; diff-stat self-check | Revert churn | AG |
| R25 | Recognition `tf_function` path slower than `predict` or needs new deps | L | M | I-08 measures before adoption | Keep the old path | CX |
| R26 | Domain bought too early or DNS late | L | L | Buy only after deployments green (20 Oct) | `.vercel.app` URLs | K |
| R27 | Hosting costs or card requirements block Recognize hosting | M | M | DN-02 decided by 16 Oct; Railway Hobby about $5-8 for the window | Laptop + cloudflared only; say so up front | K |
| R28 | Uploaded draft thesis accidentally edited (50% penalty) | L | H | T-01 copy first; agents never open the draft docx for writing | - (irreversible: prevent it) | K, CC-T |
