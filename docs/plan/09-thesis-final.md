# 09 Final thesis (due about 22 Oct 2026): what changes and how

## 1. Ground rules

- The uploaded draft `C:\Users\User\Documents\S L I I T\Y4S1\RP\Thesis\IT22552860_DRAFT.docx` and `IT22552860_DRAFT-preview.pdf` are **never edited or re-saved**. The panel deducts 50% if the uploaded draft is edited after 11 Oct. That rule does not freeze the app or the final thesis.
- **T-01:** kvn copies the draft to `IT22552860_FINAL.docx` in the same folder and edits that copy directly (regenerating the docx from Markdown would lose his edits).
- Agents draft replacement text in `C:\Users\User\Documents\S L I I T\Y4S1\RP\Thesis\final-source\<chapter>.md`, starting from the chapter sources in `C:\Users\User\AppData\Local\Temp\claude\c--Users-User-Documents-Suvana\243f806f-8050-4949-9708-1be3bf447c8d\scratchpad\thesis\*.md`. Each changed paragraph is marked (`<!-- CHANGED: reason -->`) so kvn can find it. kvn pastes and rewrites in his own words.
- Other inputs: the March proposal (`...\Individual Report\R26-SE-019_IT22552860_RANATHUNGA R A K N.pdf`), the panel-style review notes (`...\scratchpad\review\notes\`), PyMuPDF at `...\scratchpad\pdfenv\Scripts\python.exe` for reading PDFs.
- Describe **only what is merged** by 19 Oct 09:00 (Ch1/4/5) and what the Q-08 gate run shows (Ch6).

## 2. Claims that must not change

- Learn's evaluation: ROC AUC 0.744; best-threshold separation 74.6% **with** the 65.4% majority-class baseline; the 28.7-point gap as defined in EVALUATION.md; median scoring 1.8 ms. These numbers are unchanged unless the distance function changes (L-17 changes hints only; it must leave scores byte-identical).
- The scorer **grades a named sign; it is not a recogniser** (distinct signs can be closer than two takes of one sign).
- Zero participants; no ethics approval; no SUS, satisfaction, agreement-with-expert or learning-gain figures.
- No recognition accuracy (not 98.78%, not any figure from `model_comparison.json`).
- Adaptation is rule-based by design (no data to learn from).
- References are hands-only; one signer per reference; licence split CC0 / CC BY-NC-SA.
- AI-use disclosure stays consistent with section 1.8 and Appendix B as fixed: Gemini chatbot before PP1, Claude Code after PP1; add OpenAI Codex and Google Antigravity if they contributed merged code after 12 Oct.
- The Hero's preview cards are decorative; if a Hero screenshot appears, the caption says so.

## 3. Changes by chapter

### Ch1 Introduction (T-02)
- Scope statement updated to what was merged: game path, Watch/Try/Recall, honest feedback, adaptation made visible, sentence challenge (if merged), corpus video (only if DN-05 allowed and it shipped).
- Objectives O1-O5 stay as proposed; their status is reported in Ch6/Ch8.

### Ch4 Design (T-02, T-04)
- **Learning loop:** Watch -> Try -> Recall and why (PP1 request; retrieval practice in general; the guidance hypothesis for terminal and faded feedback). State that applying these to sign vocabulary is an inference.
- **Game structure:** units derived from reference data (U1 rule), stars (60/85 bands; Recall >= 60 for the third star), unlock rule, daily goal, streak; mapped to the PP1 comment. Stars reward similarity to one signer's reference, not proven correctness.
- **Adaptation:** the exact ADAPTATION.md rules; the T-04 worked example reproduced from the test output.
- **Content and licensing:** hands-only references shown in raw framing (no body outline, and why); video policy per DN-05; the `cc0` build flag.
- **Feedback design:** finger states from measured per-landmark deviation; timing and path hints; synced replay. Replace any draft text implying per-finger percentages.
- **Capture protocol change:** longer window plus trimming of the learner's take (L-07); the 85/60 bands were set under the old protocol and were not recalibrated (unless an evaluation re-run is done and cited).

### Ch5 Implementation (T-02)
- Modules: `learner/game.ts`, `learner/nextExercise.ts`, `ADAPTATION.md`, `PathView`, practice stages, `ReplayCompare`, `fingerStates`, storage resilience, camera lifecycle, sentence references, `SignVideo` (if shipped).
- Engineering: portability (R-01, `suvana.config.json`), R26 mirror procedure, CI additions, smoke script.
- **Section 5.5 Deployment:** deployed URLs (suvana-shell.vercel.app or suvana.help; learn-ssl-module.vercel.app), the exact commit (sha of tag `demo-2026-10-21` from Q-08) and the R26 deployment id (D-10). Placeholders until 21 Oct.

### Ch6 Results (T-03)
- Scoring evaluation numbers unchanged (say why).
- **Engineering verification table:** tests passing and skipped (Q-08 output), build size, lint, devices tested (Q-06), scoring median 1.8 ms, end-to-end feedback latency median/p90 (Q-09 output, n = 20, kvn's laptop) or "not measured".
- **Objectives table (honest wording):**

| Objective | Status wording |
|---|---|
| O1 feedback <= 300 ms | "Scoring compute 1.8 ms median; end-to-end N ms median, M ms p90 (n=20, one laptop, Q-09)". Say "met on the measured device" only if p90 <= 300 ms; otherwise "not met" or "not measured". |
| O1 >= 90% agreement with expert; >= 80% satisfaction | Not evaluated: no experts or participants. 74.6% vs 65.4% is a different metric. |
| O2 adaptive learning, error mining, >= 20% improvement | Rule-based adaptation built and demonstrable; error-pattern mining not built; improvement not evaluated. |
| O3 five gamified scenarios, engagement, completion | Game path built; scenarios: Restaurant complete, Social Gathering preview 3/7 (plus a third only if L-31 shipped); engagement and completion not evaluated. |
| O4 learning-communication integration | Deep link (if I-14 merged); 5-minute conversation test not evaluated. |
| O5 user validation, SUS >= 70 | Not done; ethics approval not applied for. Optional SUS appendix = instrument only, "not administered". |
| Recommendation relevance, session length | Not evaluated. |

### Ch7 Discussion (T-03)
- **Panel responses** subsection:
  - **PP1** ("accuracy is not enough"; game with levels and goals; a set of words or a sentence without a single word): what was built (units, stars, goals, Recall without the reference, whole-sentence attempts from real corpus clips if shipped, sequence level only if Lithira's mapper supplied orders) and the honest limits (sentence grading uncalibrated; multi-sign order never authored by the team; if no sentence or sequence shipped, say the request is only partly answered).
  - **PP2** (how levels, goals, difficulty and next exercises adapt; rule-based or learned): "rule-based by design", the exact rules, why (no attempt data), and BKT or learned adaptation as future work.
- **Limitations:** hands-only references; one signer per reference; grades but does not recognise; distinct signs closer than two takes; licence constraints and video provenance; capture protocol change without recalibration; no participants or ethics; untuned UI constants.

### Ch8 Conclusion and future work (T-03)
- BKT/learned adaptation; the proposal's error-mining objective; pose re-extraction (then a body reference becomes honest); partner recordings with the School for the Deaf (licence and consent); a pilot after ethics approval; continuous signing.

### Commercialisation (T-07)
In the thesis only if the template has a section; otherwise for the presentation. Source: `docs/commercialisation.md`.

## 4. Open draft items

- [ ] Learner-model worked example (T-04): from the real code, reproduced exactly.
- [ ] Appendix B CHECK: kvn describes his own revisions in his own words (T-05).
- [ ] Figure placeholders (unverified count: 4; none in the chapter sources) filled or removed, figures renumbered (T-05).
- [ ] Chart titles and footnotes; alt text and contrast of figures (T-05).
- [ ] App screenshots: DN-16 (2-3 screens only if adopted by 19 Oct).
- [ ] Own-words pass: Ch2/Ch3 16-18 Oct (T-09); remaining chapters 21 Oct.
- [ ] Turnitin report; final PDF (T-08, 22 Oct).
- Group report correction: **done 11 Oct** (kvn applied the Learn corrections and sent the new team draft). No task.

## 5. Timeline

| Day | Work |
|---|---|
| 13 Oct | T-01 copy |
| 16-18 Oct | T-09 own-words pass on Ch2/Ch3 (kvn) |
| 17 Oct | T-04 worked example |
| 19 Oct | T-02 (Ch1/4/5), T-07 commercialisation |
| 20 Oct | T-03 (Ch6/7/8) after Q-09; L-28 Learn docs |
| 21 Oct | Q-08 gate output and sha into 5.5; T-05 figures and checks; kvn's own-words pass on new text |
| 22 Oct | T-08 Turnitin and PDF; K-12 submit |
