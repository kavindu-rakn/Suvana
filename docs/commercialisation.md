# Suvana commercialisation: open core, licences, costs and competitors

Written 16 Oct 2026 for task T-07 (claude-code-thesis). It feeds the final
presentation, the Roadmap page (`apps/shell/pricing.html`, I-06) and thesis
section 7.7. It describes a **plan, not an offer**: Suvana is an academic,
non-commercial research demo with no paid offering.

Decisions this follows (`docs/plan/DECISIONS.md`):

- **DN-04 = (a) (D-A23, 15 Oct):** the public deployment serves the full corpus
  as a free, non-commercial, academic edition with a visible non-commercial
  notice. No payments, no ads. The Roadmap page says there is no paid offering.
- **DN-15 (D-A27, 14 Oct):** an open-core Roadmap page with **no prices and no
  paid offering**.
- **DN-02 (D-A21):** Recognize runs on Railway Hobby from 18 Oct, paid by kvn,
  with the laptop as fallback. **DN-03 (D-A22):** speech stays on kvn's laptop.

Nothing here states users, revenue, prices for Suvana, accuracy or learning
gains, because none exist. Items marked **CHECK** need kvn.

## 1. What Suvana is today

Suvana is one brand over four modules, each owned by a team member:

| Module | Owner | What it does | Where it runs |
|---|---|---|---|
| Learn | kvn | Practise named SSL signs; each attempt gets a 0-100 match score against one signer's reference, short tips and a side-by-side replay | In the browser; hand landmarks computed on the device |
| Recognize | Lahiru | Recognises signs from the camera and speaks them in Sinhala | Camera frames go to a server (Railway Hobby from 18 Oct) |
| Communicate | Lithira | Accounts; speech or text to sign with an avatar | Next.js app; MongoDB Atlas and Cloudinary on kvn's accounts; speech service on kvn's laptop |
| Alerts | Karindra | Sound awareness on an Android phone | On the phone, offline after installation (APK v1.0.0) |

Only Learn is kvn's to commercialise. Any commercial use of Recognize,
Communicate or Alerts needs its owner's agreement and a check of its upstream
repository's licence (**CHECK**: none of the three upstream licences has been
recorded in this repo).

## 2. Value: what Suvana can honestly claim

From `docs/plan/02-learn-vision.md` section 6:

1. To our knowledge, the only SSL learning tool that grades the learner's own
   production of a named sign. ("To our knowledge": the store search was
   partial.) It grades a specified sign; it does not recognise signs.
2. Explainable feedback read from the measured comparison: a missing hand,
   a hand path that differs, signing too fast or too slow, and a replay of the
   take beside the reference that pauses where they differ most. Per-finger
   corrections are computed but **not shown**: a same-sign vs different-sign
   check found that a correct take's finger deviations overlap a wrong sign's
   (D-A15, `fingerStates.calibration.test.ts`, L-30 handoff). Do not claim
   per-finger feedback (02-learn-vision.md section 6 item 2 is out of date).
3. Learn is on-device: landmarks are computed in the browser and no video is
   uploaded. Median scoring time is 1.8 ms on the measured machine.
4. Built on open SSL corpora, with per-file licence provenance enforced by a
   test (`apps/learn/src/scoring/references.test.ts`).
5. Rule-based adaptation that the learner can see ("Why this sign?").

The score separates same-sign from different-sign attempts at 74.6% at the
best threshold, against a 65.4% majority-class baseline (ROC AUC 0.744). That
is not the proposal's 90% agreement target, which was never evaluated.

Never claim: recognition accuracy (no figure from Recognize is a Suvana
result), accuracy against experts, learning gains, users, or anything compared
with PopSignAI's published figures.

**Who it is for** (proposal users, thesis 7.7): parents and families of Deaf
children, teachers in inclusive classrooms, healthcare and public-service
staff, employers and colleagues, and students. For organisations it is a way
to practise between sessions with a human teacher, not a replacement for one.

## 3. Open core (roadmap only)

**Free core.** Learn stays free: practice, feedback, the learning path, stars,
progress, and the references the edition is allowed to carry. Deaf families
should never pay for the core.

**Possible services for organisations later** (none is built or priced):

| Line | Who | What they might pay for (ideas only) |
|---|---|---|
| B2B | Hospitals, banks, hotels, employers, accessibility trainers | Vocabulary packs for their setting, recorded with Deaf signers; staff progress reports; setup and hosting |
| B2G | Schools and education authorities, public services | Curriculum aligned with teaching; deployment on their own infrastructure; teacher dashboards |
| NGO | Deaf associations, schools for the Deaf | Free or at-cost licences; co-designed content; recording programmes in which signers are paid and credited |

What makes these possible is **content the project has the right to sell**,
not code. The intended content partner is the School for the Deaf, Ratmalana
(the project's external partner): recordings made with consent, a written
licence and paid, credited signers would replace both third-party corpora.

**What the Roadmap page says today** (`apps/shell/pricing.html`, updated 14
Oct): "No paid products or services. This demo is for academic,
non-commercial use", and the open-core idea "is not an offer to sell
anything". It names the Yohan non-commercial licence, plans a CC0-only option
without promising a commercial version, and states Vercel's Hobby terms. This
document matches it; no prices are added (DN-15).

## 4. Licence constraints

### 4.1 Reference landmarks (counted from `apps/learn/public/references/`, 16 Oct)

| Files | Count | Licence | Commercial use |
|---|---|---|---|
| `yohan_*` (Yohan Abhishek, SSL400) | 360 | CC BY-NC-SA 4.0 | **Not permitted**; share-alike; credit and "modified" notice required |
| `kaggle_*` single signs (Kahawearachchi et al.) | 141 | CC0 1.0 | Permitted |
| `kaggle_sent_*` sentence clips (K-07, experimental) | 19 | CC0 1.0 | Permitted |
| Total | 520 | | |

So 360 of the 501 single-sign references are non-commercial. While any
`yohan_*` file is served, Suvana cannot be commercialised
(`apps/learn/public/references/LICENSES.md`).

### 4.2 The `cc0` build is not a commercial edition

`VITE_CONTENT=cc0` makes only CC0 references selectable. It does **not**
remove the NC JSON files from the built site, so it is a preview, not a
commercially cleared distribution (`LICENSES.md`, "CC0 content preview"). A
commercial build would have to remove the restricted files, regenerate the
manifest and index, and audit content and claims first. Anything already
published with the NC files stays distributed under NC terms.

### 4.3 Corpus video provenance

No corpus video is shown (DN-05 = no video, D-A16). Even the CC0 corpus states
that its clips come from "public YouTube videos and private interviews with
certified Sinhala Sign Language instructors"
(`tools/reference-converter/README.md:145`). An uploader's CC0 cannot license
third-party footage or a signer's likeness, so landmark extraction is the
safer form, and video would need fresh permission. Yohan video is NC and
share-alike in any case.

### 4.4 Code and dependencies

- **No licence file at the repo root** (16 Oct). An "open core" needs a chosen
  open-source licence for the core code. **CHECK** for kvn: which licence, and
  whether teammates' modules may be included.
- Learn's main runtime dependencies: `@mediapipe/tasks-vision` Apache-2.0,
  `react` MIT, `lenis` MIT, `lucide-react` ISC (from each package's
  `package.json`). `gsap` uses GreenSock's "Standard 'no charge' license"
  (https://gsap.com/standard-license); review its terms before any commercial
  release.

### 4.5 Hosting terms

Vercel's Hobby plan is for personal, non-commercial use only
(https://vercel.com/docs/plans/hobby, accessed 16 Oct 2026). All suvana-*
projects are on Hobby, which fits the academic demo. Any commercial use moves
to a paid plan first.

## 5. Privacy as a feature

- **Learn:** hand tracking and scoring run in the browser; no camera video is
  uploaded; progress stays in the browser (IndexedDB) with no account
  (DN-11, D-A18). This is the strongest selling point for schools and
  hospitals, and it keeps Learn's running cost close to static hosting.
- **Alerts:** runs on the phone, offline after installation.
- **Recognize is different:** its web page sends camera frames (JPEG images)
  to the server over a WebSocket (`services/recognition/webapp/static/app.js`).
  Do not describe the whole platform as on-device.
- **Communicate** stores email and a hashed password in MongoDB
  (05-integration.md, I-06).
- **The landing page's assistant** sends questions to Gemini when its key is
  enabled (05-integration.md).
- Any accounts, sync or analytics would bring duties under Sri Lanka's
  Personal Data Protection Act No. 9 of 2022 (thesis reference `pdpa2022`).

## 6. Costs (with source and date)

| Item | Cost | Source and date | Status |
|---|---|---|---|
| Domain `suvana.help` | $1.99 first year, $32.12 renewal | Infra audit, 12 Oct (`docs/plan/01-state.md`); not re-checked | Not bought; kvn buys it only after the deploy smoke passes |
| Vercel Hobby (shell, Learn, Communicate) | $0 | https://vercel.com/docs/plans/hobby, accessed 16 Oct 2026 | In use; non-commercial only |
| Vercel Pro (needed for commercial use) | $20 per month per deploying seat, including $20 of usage credit; usage above that billed | Summarised from Vercel's pricing pages, accessed 16 Oct 2026; **check https://vercel.com/pricing before budgeting** | Not needed for the demo |
| Recognize host: Railway Hobby | $5 per month subscription that includes $5 of usage; usage above $5 billed after the month | https://docs.railway.com/reference/pricing/plans, accessed 16 Oct 2026 | From 18 Oct, kvn pays (D-A21) |
| Recognize, demo window estimate | about $5-8 for 10 days at about 2 GB of memory | `docs/plan/06-deploy.md`, estimate of 12 Oct | Estimate, not a bill |
| Speech service | $0 (kvn's laptop) | D-A22 | Demo only; not a production option |
| Communicate data: MongoDB Atlas M0, Cloudinary | Atlas M0 is the free tier; Cloudinary plan not recorded (**CHECK**) | 05-integration.md | kvn's accounts; production costs not estimated |
| Alerts APK | $0 (GitHub Release) | D-A29 | App-store publishing not costed |

**Cost structure.** Learn needs no server per learner: the tracking runtime
(about 11 MB) and model (7.8 MB) are downloaded once when the camera first
starts and then cached (thesis 4.4.1). Its marginal cost is bandwidth on
static hosting. The services that cost money per use are Recognize (a server
running a model) and, later, any accounts. The largest real cost of a
commercial edition is **content**: paid signer time for recordings and teacher
review, not computation.

## 7. Competitors (from `02-learn-vision.md` section 5, re-checked 16 Oct 2026)

| App | Language | Demonstration | Grades the learner's signing? | Gamification | Price as listed | Source |
|---|---|---|---|---|---|---|
| Lingvano | ASL, BSL, ÖGS | Native Deaf signers on video | No for signs: the "mirror" is for self-checking (the 12 Oct audit noted a graded fingerspelling exercise; not re-checked) | Streaks, achievements | ASL Premium about $17.99/month, $47.99/quarter, $119.99/year | App Store id1547252782; Lingvano Help Center (thesis `lingvano_mirror`) |
| ASL Bloom | ASL | Signer video, slow mode | No (receptive quizzes) | Points, streak, spaced repetition | about $98.99/year; free daily lesson | App Store id1631587710; langoly.com ASL Bloom review |
| SignSchool | ASL | Video dictionary of 4,000+ signs, slow motion | No | Light (fingerspelling game) | Free | App Store id1145529881 |
| The ASL App (Ink & Salt, Deaf-owned) | ASL | Deaf signer video | No | None | Free basics; themed bundles about $0.99; full pack $9.99 | App Store id921030207; Healthline sign-language app review |
| Hand Talk | ASL, Libras, BSL | 3D avatars (Hugo, Maya) | No (text/speech to sign) | Coins | Free with ads; paid ad-free option | App Store id659816995; handtalk.me blog |
| NVIDIA Signs (Feb 2025) | ASL | 3D avatar | **Yes**: webcam hand tracking with tips (hands only; 100 signs at launch) | Not documented | Free, web | eWeek, "Nvidia's Signs AI teaches American Sign Language" (2025) |
| PopSignAI (research) | ASL | Signer video | **Yes**: the phone camera recognises the sign played in a bubble-shooter game | Levels | Free (Google Play) | Georgia Tech PopSign v1.0 dataset page; NeurIPS 2023 Datasets and Benchmarks paper |
| SLSL Dictionary | **SSL** | One signer's video per word | No | Flashcards, spaced repetition | Free (iPad, iPhone) | App Store id6445848879 |
| SSL research prototypes (e.g. Hastha) | SSL | Lessons, avatar or animation | No learner production feedback | Hastha: game-based modules | Not released | Thesis `wanasinghe2022` |

Source URLs (all accessed 16 Oct 2026):
- https://apps.apple.com/app/id1547252782 (Lingvano)
- https://help-asl.lingvano.com/support/solutions/articles/101000374811-why-does-the-mirror-not-work-
- https://apps.apple.com/app/id1631587710 and https://www.langoly.com/asl-bloom-review/ (ASL Bloom)
- https://apps.apple.com/app/id1145529881 (SignSchool)
- https://apps.apple.com/app/id921030207 and https://www.healthline.com/health/sign-language-app (The ASL App)
- https://apps.apple.com/app/id659816995 and https://www.handtalk.me/en/blog/meet-the-hand-talk-sign-language-translator-app/ (Hand Talk)
- https://www.eweek.com/news/nvidia-signs-platform/ (NVIDIA Signs)
- https://signdata.cc.gatech.edu/view/datasets/popsign_v1_0/ and https://proceedings.nips.cc/paper_files/paper/2023/file/00dada608b8db212ea7d9d92b24c68de-Paper-Datasets_and_Benchmarks.pdf (PopSignAI)
- https://apps.apple.com/us/app/slsl-dictionary/id6445848879 (SLSL Dictionary)

Store prices change and vary by country; quote them as "as listed on 16 Oct
2026".

**What the table shows.**
- Leaders win on content: native signer video and conversations.
- Most games are receptive (watch and choose). Graded production of word
  signs is rare: NVIDIA Signs and PopSignAI, both ASL.
- Premium ASL apps sit around $99-120 a year. Duolingo has no sign course.
- For SSL there is a free video dictionary and research prototypes, but, to
  our knowledge, no tool that grades a learner's own production.

**Positioning.** Suvana does not compete on content volume or video quality,
where it is weakest (hands-only landmark skeletons, one signer per
reference). It competes on SSL, production feedback, privacy and zero
hardware. The honest weakness is content, and the fix is the same as the
commercial route: licensed recordings with the School for the Deaf.

## 8. Before any commercial step

1. Content rights: recordings with consent and a written licence; signers
   paid and credited; no NC files in the build.
2. Deaf community involvement in design and content, not only testing
   (thesis 2.5.1).
3. Teammates' agreement for their modules; upstream licences recorded.
4. A licence for the open-core code (**CHECK**).
5. Paid hosting (Vercel Pro or another host whose terms allow commercial use).
6. Ethics approval and a real user study before any claim about learning or
   satisfaction.
7. Privacy policy and terms reviewed (the current pages say "draft, not legal
   advice"); PDPA duties if accounts or sync are added.
8. An accessibility audit against WCAG 2.1 AA (a design target, not yet
   verified).
