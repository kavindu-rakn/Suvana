# Suvana — PP2 and beyond

Written 26 Aug 2026. **PP2 deadline is end of August — roughly 5 days.**

Percentages are rough completion estimates, not measurements.

**Confidence.** Lists 1 and 2 are grounded — the Learn module was audited directly
this session (suite run, build measured, UI inspected in a browser, corpus
counted). Lists 3 and 4 cover teammates' modules that were only surveyed from the
repo, so treat those percentages as informed guesses and check them with the
owner before quoting any of it.

The recurring theme, and the thing worth internalising: **the software is
essentially finished and the evaluation has barely started.** Three of the four
proposal targets are unmeasured, and no amount of further building moves them.

---

## 1. Learn module — before PP2

**Overall: ~70%.** Build ~100%, evaluation ~5%.

### Done

| Item | % |
|---|---|
| Web app, in-browser capture, recorder, library | 100 |
| DTW scoring, per-finger corrective feedback, mirrored-handedness | 100 |
| Scoring constants fitted to data (anchors, feature weights) | 100 |
| Reference corpus — 501 recordings, 490 glosses, two corpora, licences attached | 100 |
| Learner model v1 — mastery, practice selection, progress dashboard | 100 |
| Practice session loop, streak, activity history | 100 |
| Scenarios — Restaurant 5/5, Introductions 3/7 (PP2 scope was 1) | 100 |
| UI/UX overhaul — all six phases | 100 |
| Accessibility pass — live regions, focus, contrast, touch targets | 100 |
| Latency instrumentation (end-to-end, honest paint marking) | 100 |
| Pilot export tooling — CSV + JSON, participant codes, session ids | 100 |
| Performance budgets — index now enforced by test at 44.5 B/reference | 100 |

### Remaining

| Item | % | Notes |
|---|---|---|
| **Freeze the UI and tag the pilot commit** | 0 | Costs nothing at zero participants. Do first. |
| **Re-measure the scoring bench** | 0 | 5 min. `latency-report.md` still says "362 on disk"; there are 501. Run `$env:BENCH_WRITE=1; npx vitest run scoring.bench`. |
| **Produce live latency figures** | 0 | ~20 attempts on localhost, ~1 h. Closest target to done. Also verifies the camera path and Phase 3 motion, which nobody has watched recently. |
| **SUS questionnaire** | 0 | 10 standard items on a form. No code. Gates a whole target. |
| **Deploy to Vercel** | 0 | Postponed 26 Aug. Blocks the pilot, real-device testing and the shell rewrites. |
| **Recruit pilot participants** | 0 | Longest lead time of anything left. |
| **Run the pilot** | 0 | Blocked on deploy + recruitment. |
| Learning-gain figures | 0 | Needs the pilot. |
| SUS score | 0 | Needs the pilot + the questionnaire. |
| **Accuracy vs expert (≥90%)** | 0 | **Weakest target.** No code addresses it, and nothing this session moved it. Needs an SSL teacher grading real learner attempts. Do not conflate with the 74.6% separation figure — different claim. |
| Real-device verification (motion, camera, ≥55 fps reveal) | 0 | Needs the deployment: a LAN IP is not a secure context, so the camera will not start. |
| PP2 slides | 0 | |

### Known gaps carried into PP2 as stated limitations

- Introductions runs 3/7. `NAME`, `WHAT`, `YOUR` are in neither corpus; `ME`
  depends on the `I`/`ME` question. Demo **Restaurant** — 5/5 on real signers.
- Non-manual markers are not scored (hands-only tracking). Rubric is 50/30/20
  with the deviation stated in the UI.
- Calibration is one fluent signer — natural variation of a correct rendition,
  not a learner's spread.
- Reference index is 22.3 kB gzip; `id` is 12.7 kB of that and is irreducible
  without breaking the attempt↔reference join in the exported pilot CSV.

---

## 2. Learn module — after PP2 to project completion

**Overall: ~10%** (mostly groundwork already laid, little built).

| Item | % | Notes |
|---|---|---|
| BKT + Q-learning curriculum | 0 | Deferred by plan. Attempt log is already the right input, so v1 swaps out without a data migration. |
| K-means / PrefixSpan error mining | 15 | Not started, but `attemptLog` already persists the per-attempt error signature it needs. |
| Remaining 3 of 5 scenarios | 20 | Engine is data-driven — authoring JSON only, no code. Blocked on vocabulary and an SSL teacher for word order. |
| Non-manual markers (face/pose landmarks) | 0 | Requires a second MediaPipe model and a rubric change back to 40/30/20/10. |
| School-for-the-Deaf reference recordings | 0 | The real fix for reference authority and for ME/NAME/WHAT/YOUR. |
| Video references alongside skeletons | 0 | Agreed fix for reference legibility. 3D avatar was considered and rejected. |
| Re-fit calibration on real learner attempts | 0 | Needed before the ≥90% accuracy claim can be quoted. |
| 40-participant study | 0 | PP2 ships a 5–10 pilot. |
| Scale-aware movement feature | 0 | The velocity experiment beat position (75.5% vs 73.5%) but was reverted for a real reason; a scale-aware version would likely beat both. |
| Continuous / co-articulated signing | 0 | Explicit future work. Would unlock the sentence clips. |
| `Numbers` category reconciliation | 0 | 21 signs held back — dataset folders renamed to `1. one` while shipped glosses are `1`, `2`, `4`, `5`. Needs a naming decision. |
| `I` vs `ME` gloss question | 0 | For the School for the Deaf. Worth one Introductions turn. |
| Final report, viva, paper (by Dec 2026) | 0 | |

---

## 3. Whole Suvana — before PP2

**Overall: ~65%.** Code integration largely done; nothing is deployed.
*(Lower confidence — teammates' modules surveyed, not audited.)*

| Item | % | Notes |
|---|---|---|
| Monorepo bootstrap, four components imported | 100 | |
| Branding package — palette tokens, logos | 100 | |
| Retheme every frontend to Suvana | 100 | Learn, Communicate, Alerts, Recognition |
| Sub-brand names stripped from UI copy | 100 | |
| Unified dark/light theme across the platform | 100 | |
| Unified Suvana account with roles + admin area | 100 | Built; Learn reads it same-origin and deliberately does not gate practice on it. |
| One-domain topology — **code** | 100 | `base: '/learn/'`, Next `basePath`, shell proxy, `apiPath()` |
| Speech service extracted from the Colab notebook | 100 | Runs as a Docker container. |
| Recognition module rebranded and wired | 90 | Runs on its own origin — WebSocket, so it cannot sit behind a Vercel rewrite. |
| **Deploy Learn, Communicate, then shell** | 0 | Order matters. |
| **Fill the shell rewrites** | 0 | `apps/shell/vercel.json` still has `REPLACE-WITH-LEARN-DEPLOYMENT` and `REPLACE-WITH-COMMUNICATE-DEPLOYMENT`. |
| Speech service on a persistent host | 0 | Extraction done; still ngrok-backed. Repointing is a DB config write, not a code change. |
| Communicate production secrets | 20 | `.env.local` exists locally; production needs its own MongoDB Atlas, Cloudinary and Auth.js secrets, plus gloss animations re-seeded from Lithira's Cloudinary. |
| Recognition deployed on its own origin/subdomain | 0 | See `services/recognition/DEPLOY-SUVANA.md`. |
| Alerts (SoundGuard) dev build for demo | 50 | Rethemed; needs a device build — Expo Go will not run it (custom native module). |
| End-to-end demo rehearsal across modules | 0 | |
| PP2 slides | 0 | |
| **Carry `CLAUDE.md` + the two handoffs into this repo** | 0 | They live only in `R26-SE-019`. Suvana is the working repo now, so its guardrails are invisible to anyone starting here. |

---

## 4. Whole Suvana — after PP2 to project completion

**Overall: ~5%.** *(Lower confidence.)*

| Item | % | Notes |
|---|---|---|
| Deep cross-module integration | 10 | PP2 gets a thin branded shell linking deployed modules; real integration is Sep–Oct. |
| Unified sign-on across all modules | 30 | Account exists platform-wide; Learn still keeps progress in local IndexedDB, so signing in does not yet carry progress between devices. |
| Server-side learner progress | 0 | The precondition for sign-on to mean anything in Learn. |
| Permanently de-Colab the speech backend | 0 | Notebook auto-registers a changing ngrok URL on every restart. Never demo against it. |
| **Lock down Communicate's `/translate`** | 0 | Lithira's own README flags it unauthenticated with a hardcoded ngrok token. Research-only until fixed — should not go near a public deployment. |
| Recognition: verify browser-side capture | 50 | Server-side webcam capture only works on localhost. |
| 40-participant study across the platform | 0 | |
| Purge `.git` blobs in the team repo | 0 | ~130 MB of old venv/dataset blobs. Rewrites shared history — needs Lahiru's coordination. After PP2. |
| Final report | 0 | |
| Viva (Oct 2026) | 0 | |
| Research paper (by Dec 2026) | 0 | |

---

## If you only do five things before PP2

1. **Freeze the UI and tag the commit.** Free today, expensive after P01.
2. **Write the SUS questionnaire.** Cheapest unclaimed mark on the board.
3. **Do the 20-attempt latency session.** One target measured, and it verifies
   the camera and motion nobody has watched.
4. **Start recruiting, and email the School for the Deaf the same day** — both
   have lead time nothing else can absorb, and the teacher request is the only
   route to the ≥90% accuracy target.
5. **Deploy, then fill the shell rewrites.** Everything participant-facing
   waits behind this.
