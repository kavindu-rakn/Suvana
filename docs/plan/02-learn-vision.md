# 02 Suvana Learn: product vision for the 22 Oct demo

## 1. One sentence

A hearing beginner with no SSL watches a sign slowly, copies it, then performs it **from memory**, in about two minutes per sign. They get honest feedback on which finger, how fast and what path, and they progress through a short game of units, stars and goals. Every rule that picks the next exercise can be explained to the panel.

## 2. Who it is for

- **Primary:** hearing family members, teachers, health and front-line staff who need a small working SSL vocabulary.
- **Secondary (now):** the IT4010 panel. Panel members may say "learn this sign and perform it on the spot". Learn must give a novice in the room the best honest chance to succeed, and must never pretend to recognise signs.

## 3. Why the current Learn fails that test (evidence in 01-state.md and 04-bugs.md)

1. **Teaching material.** A centred, per-clip-zoomed, hands-only wireframe of about 2.5 s, playing at 1x; no body, face or location; most signs show no meaning.
2. **Feedback.** One number plus per-finger percentages that are **made up** (a guardrail breach); it never says how to fix the attempt; "Close match" can appear at low scores.
3. **Structure.** Alphabetical cold start (ADINAWA); no onboarding, no recall, no levels or goals, no session end; adaptive sessions unreachable; weak signs never revisited.
4. **Demo-killing bugs.** Esc throws the learner to the Hero; Enter on Retry goes to the next sign; a lost camera hangs a take; one IndexedDB failure blanks the app; the standalone root returns 404.

## 4. The product we build by 21 Oct

### Pillar 1: Learn by watching slowly, with the honest data we have
- References are hand landmarks only. We show them as they are:
  - **Raw framing by default**: the skeleton is drawn where it was in the original video frame, inside a plain rectangle labelled "position in the original video frame". This keeps the hands' relative position and the movement's size. A "Zoom to hands" toggle restores today's per-clip fit for finger detail.
  - **No body silhouette.** The references contain no pose, so a head-and-shoulders outline would place the hands relative to a body the data does not contain, which is an invented location claim. A silhouette is possible later only after pose landmarks are re-extracted from source video (future work).
  - 0.5x for the first two loops, then 1x; a visible speed control (0.25/0.5/0.75/1); "Mirrored: copy it like a mirror".
- **Real-signer video is conditional (DN-05).** The Kaggle corpus says its clips come from public YouTube videos and private interviews, so the uploader's CC0 may not cover redistributing that footage or the signers' likeness. Video is shown only for clips kvn permits under DN-05, only from Cloudinary, never from the repo, with the corpus credit and a takedown contact. If DN-05 = no video, Learn ships with the improved skeleton and the plan does not depend on video.

### Pillar 2: Watch, Try, Recall (the core loop)
- **Watch:** reference (video if permitted, else skeleton) at 0.5x; the learner presses "My turn".
- **Try:** imitation with the reference visible; ghost overlay anchored to the learner's wrist; feedback after the attempt.
- **Recall:** reference hidden; cue = verified English meaning, else the gloss label (DN-09); sign it; then the reference is revealed beside the score. Revealing early costs the third star.
- This answers PP1's "showing the accuracy of the gesture is not enough": the learner proves retrieval, not copying. Retrieval practice is well supported in general; no study has tested it on sign vocabulary, and the thesis says so.

### Pillar 3: Honest, actionable feedback
- Each finger: **Correct / Almost / Wrong** (kvn's wording, DN-17), from the measured per-landmark deviation. No percentages.
- At most two hints, ordered by contribution: handshape (which finger), timing ("about 2x faster than the reference"), path ("the hand path differs; watch the movement at 0.5x"). Thresholds are untuned UI constants and are documented as such.
- "Close match" only when the score is >= 85.
- Side-by-side synced replay (reference vs you, 0.5x), pausing at the worst-matching moment.
- Hints fade once a sign is "improving"; no hints in Recall before the reveal (retention-friendly terminal and faded feedback).
- Always "match score against one signer's reference", never "accuracy".

### Pillar 4: A game with units, stars, goals and unlocks (PP1)
- **Units derived from data, never hand-picked by agents** (L-09): U1 Starter = `kaggle_*` signs that are one-handed and still and have a verified (or self-explaining) meaning; later units by category, ordered by difficulty computed from reference data (hands, motion, duration). kvn approves the order (K-05).
- **Stars** (reusing the existing bands): one for a Try >= 60, two for a Try >= 85, three for a Recall >= 60 without revealing. A unit passes when every sign has two stars; passing unlocks the next unit.
- **Goals:** daily goal (default 10 scored attempts), streak, session-complete screen. The Hero's decorative preview cards stay as they are (kvn, 11 Oct); real stats live on the Path and Progress screens.
- **Sentence challenge** (if DN-08): a whole real SSL sentence from the Kaggle "SSL Sentences" clips, graded against the clip as one reference, cued by the dataset's own label, labelled "Experimental: whole-sentence match, not calibrated". The team never authors gloss order. A "sequence from memory" level (2-3 signs in order) is built only if Lithira's mapper supplies the order (L-32).
- **Scenarios:** Restaurant (5/5) gains a recall variant; Social Gathering shows "Preview: 3 of 7"; team-written movement/location hints are hidden from learners until a signer validates them.

### Pillar 5: Visible, explainable adaptation (PP2)
- **Rule-based by design, stated openly.** There is no attempt data to learn from yet.
- Next item: due reviews first (attempted signs with need > 0.5, ranked by the EWMA need score), then new signs from the current unit, interleaved about 2 reviews : 1 new. This fixes the bug where weak signs were never revisited.
- Difficulty: derived from reference data only (hands, still/moving, duration); orders signs inside units.
- Next-exercise rules: two Tries below 60 in a row -> offer 0.25x plus ghost; a Recall below 60 -> step back to Try; a Try >= 85 -> unlock Recall.
- A "Why this sign?" chip names the rule that chose each item; `learner/ADAPTATION.md` documents every rule and constant; the Progress screen explains them in plain words.
- Future work: BKT or learned adaptation once data exists; the proposal's K-means/PrefixSpan error mining.

### Pillar 6: Works on any device
- Mobile-first, no horizontal scroll at 360 px; camera checks before Record (HTTPS, live "hands in frame", capture window 2x the reference); recovery from a lost camera and blocked storage; correct cache headers; the root redirects to `/learn/`.
- Deployed at suvana-shell.vercel.app/learn/ (later suvana.help/learn/) and mirrored at learn-ssl-module.vercel.app after every milestone.

### Pillar 7: Licence-aware content
- Licence shown per sign in the attribution panel; build flag `VITE_CONTENT=cc0` removes `yohan_*` for a commercial edition.
- Any corpus video follows DN-05 exactly.

## 5. Competitors (market audit, 12 Oct; sources in the audit and T-07)

| App | Demonstration | Graded production? | Gamification | Price |
|---|---|---|---|---|
| Lingvano (ASL/BSL/ÖGS) | Native Deaf signers on video | Fingerspelling only; "mirror" selfie view ungraded | Streaks, achievements | ASL about $17.99/month or $119.99/year |
| ASL Bloom | Signer video, slow mode | No (receptive quizzes) | Points, streak, signs learned; spaced repetition | about $98.99/year |
| SignSchool | 4,000+ sign video dictionary, slow motion | No | Light (games) | Free |
| The ASL App | Deaf signer video, scrub speed | No | None | Freemium ($0.99 bundles) |
| Hand Talk | 3D avatars, adjustable speed | No | Coins, outfits | Free with ads |
| NVIDIA Signs (ASL, 2025) | 3D avatar, multiple angles | **Yes**, hand tracking, instant corrections (hands only) | Not documented | Free |
| PopSignAI (research) | Signer video | **Yes**, 250-sign recogniser in a game | Levels | Free preview |
| SLSL Dictionary (SSL, iOS) | One signer's video per word | No | Flashcards, spaced repetition | Free |
| SSL prototypes (Hastha, Utalk, SAWAN) | Avatar/animation | Recognition research, not learner feedback | Hastha "game-based" | Not released |

Market patterns: leaders win on content quality (native signer video, conversations); games are mostly receptive; graded production of word signs is rare (NVIDIA Signs, PopSignAI); price anchors about $99-120/year for premium ASL; Duolingo has no sign course.

## 6. What Suvana Learn can claim (honest wording)

1. "To our knowledge, the only SSL learning tool that grades the learner's own production of a named sign." (Store search was partial; keep "to our knowledge".)
2. "Per-finger, explainable feedback" that targets handshape, the most common novice error. Phrase as "grades a specified sign", never "recognises signs". 74.6% always with 65.4%; AUC 0.744.
3. "On-device and privacy-preserving": landmarks computed in the browser, no video uploaded, median scoring 1.8 ms.
4. "Built on open SSL corpora with per-file licence provenance enforced by a test" (`apps/learn/public/references/LICENSES.md:7-10`, `src/scoring/references.test.ts`).
5. Rule-based adaptation that the learner can see ("Why this sign?").

Do not claim: recognition, accuracy against experts, learning gains, users, or anything compared with PopSignAI's figures.

## 7. Commercialisation and licensing stance

- **Open core.** A free community/academic edition with all references under the NC notice; a commercial edition with CC0 landmarks plus recordings licensed from the School for the Deaf, Ratmalana (roadmap, `apps/learn/public/references/LICENSES.md:37-39`). Revenue lines: B2B, B2G and NGO licences for schools, hospitals, front-line staff and accessibility training; free core for Deaf families.
- **What the public deployments are:** non-commercial academic deployments. No payments, no ads. The pricing page is labelled "Roadmap: no paid offering; this deployment is non-commercial and academic", with the Vercel Hobby caveat (Hobby is non-commercial; a commercial launch moves to Pro). DN-04 decides whether suvana.help serves the full NC edition with that labelling or the CC0 edition.
- **Corpus video:** never shown before DN-05; never `yohan_*` video in a commercial edition (NC and share-alike).
- **Costs to state (with source and date):** domain $1.99 first year, $32.12 renewal; Vercel Pro for commercial use; recognition host about $5+/month (DN-02).

## 8. Non-goals before 22 Oct

Avatar, LLM tutor, BKT, K-means/PrefixSpan, continuous-signing grading, per-account progress sync, any user study, any team-made SSL content.

## 9. Demo success criteria

1. A panel member picks a U1 sign and, in under 2 minutes, watches it, tries it and does a Recall attempt that scores >= 60. kvn practises the flow beforehand; the outcome cannot be promised and is not claimed as evidence.
2. The Path shows units, stars, locks, a daily goal and a streak; "Why this sign?" states the rule.
3. Feedback names fingers and timing and shows the replay; no invented numbers anywhere.
4. It runs on a phone over HTTPS and on the laptop, with no keyboard traps.
5. The same build is live at learn-ssl-module.vercel.app.
