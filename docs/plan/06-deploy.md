# 06 Deployment runbook: Suvana on .vercel.app, then suvana.help

**Who does what.** Only kvn creates projects, sets secrets, deploys, promotes, rolls back and buys the domain. Agents prepare configs, scripts and checklists and run read-only checks (curl, the smoke script). Agents never deploy, and nothing is ever deployed from an agent worktree.

## 1. Order of steps

| # | Step | Task | Day | Precondition |
|---|---|---|---|---|
| 1 | Merge re-sync + plan to main; CI green on main | K-01 | 12 Oct | - |
| 2 | Create Vercel project `suvana-learn`; deploy current main | K-04, D-02 | 13-14 Oct | K-01 |
| 3 | M0 R26 redeploy (blocker fixes) | D-06 | 14 Oct | R-00 |
| 4 | Early phone check on suvana-learn | Q-06a | 15 Oct | D-02, L-04 merged |
| 5 | Atlas M0, Cloudinary, secrets; create `suvana-communicate`, `suvana-shell` | K-04 | by 16 Oct | - |
| 6 | Deploy Communicate, then shell | D-03 | 17 Oct | I-01, I-07 merged |
| 7 | M1 R26 redeploy | D-07 | 17 Oct | R-03 |
| 8 | Recognize host + uptime ping | D-04 | 18 Oct | I-08 merged, DN-02 |
| 9 | Speech: laptop only (default) | D-05 | 19 Oct | I-09, DN-03 |
| 10 | M2 R26 redeploy; full device matrix | D-08, Q-06 | 19 Oct | R-04 |
| 11 | Buy suvana.help; attach; smoke | K-08, D-09 | 20 Oct | steps 6 and 8 green |
| 12 | Final R26 redeploy; tag | D-10, Q-08 | 21 Oct | R-05 |

## 2. Vercel projects

Team `team_WVADC45JhBSU0pda5PJAy3Z6`, CLI scope `kavindu-rakns-projects`. Git integration on `kavindu-rakn/Suvana`, production branch `main`. Node 24.x (matches `.nvmrc` = 24). On every project set **Ignored Build Step** = `git diff --quiet HEAD^ HEAD -- .` so a Learn-only change does not rebuild Next.js.

| Project | Root Directory | Build | Env (Production + Preview) |
|---|---|---|---|
| `suvana-learn` | `apps/learn` | Vite; `outputDirectory: dist` (build writes `dist/learn`) | None. After R-01, `apps/learn/suvana.config.json` (committed, Suvana-only, no secrets) sets base `/learn/` and `VITE_SUVANA`. Add `VITE_CONTENT=cc0` only for a CC0 build (DN-04). |
| `suvana-communicate` | `apps/communicate` | Next.js 16 | `NEXT_PUBLIC_BASE_PATH=/communicate`, `MONGODB_URI` (kvn's Atlas M0), `NEXTAUTH_SECRET` (`npx auth secret`), `ADMIN_EMAILS=kavindu.rakn@gmail.com`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (kvn's), `NGROK_UPDATE_SECRET`, `STT_API_KEY` (only if speech is reachable). **Leave `NEXTAUTH_URL` unset** at first (I-11). |
| `suvana-shell` | `apps/shell` | Vite + Edge function `api/assistant.ts` | `GEMINI_API_KEY` (optional; never `VITE_`-prefixed), `VITE_RECOGNIZE_URL` (after D-04; read at build time only once I-01 lands, today the origin is the empty `data-service-url` in `apps/shell/index.html`). |

Notes:
- `public/wasm` is created by `postinstall` (`scripts/copy-wasm.mjs`); check `/learn/wasm/vision_wasm_internal.wasm` returns 200.
- No package in `apps/*` imports `packages/branding` at build time, so per-app Root Directories work.
- **Previews** are SSO-protected (302 to Vercel login). Open them on a phone through the dashboard **Share** link. **Production** `*.vercel.app` aliases are public (learn-ssl-module.vercel.app returns 200), so the shell rewrites work.
- **Promote / rollback:** merging to main produces production. CLI: `npx vercel promote <preview-url> --scope kavindu-rakns-projects`; rollback: `npx vercel rollback` or promote the previous deployment. Promoting a preview creates a new production deployment.
- **Plan caveat:** Vercel Hobby is for non-commercial use only. After I-06 the site's pricing page says the deployment is non-commercial and academic (no page says so today); a commercial launch moves to Vercel Pro (to be stated on that page and in docs/commercialisation.md, which T-07 creates).

## 3. Secrets policy

- Secrets live only in Vercel env and in local `.env.local` files (gitignored). Never in git, never in a `VITE_` variable, never in a handoff or LOG.md.
- Agents never ask for, read, print or copy secret values. If a task needs one, the handoff says "kvn: set X in Vercel".

## 4. Smoke checks (D-01 provides `node tools/smoke/smoke.mjs <base-url>`)

1. `GET /` 200; landing title contains "Suvana".
2. `GET /learn/` 200; its HTML references only `/learn/assets/...`.
3. `/learn/reference-index.json`, `/learn/references/kaggle_100.json`, `/learn/wasm/vision_wasm_internal.wasm`, `/learn/models/hand_landmarker.task` all 200; cache headers not `immutable`.
4. `GET /communicate` 200; `/communicate/api/auth/session` 200 with JSON.
5. `GET /alerts/` 200; `/privacy`, `/terms`, `/contact`, `/pricing` 200 (after I-06).
6. Standalone (after L-06 adds the redirect): `https://suvana-learn.vercel.app/` redirects to `/learn/`.
7. Recognize: `GET <recognize>/api/info` 200 with `numClasses: 171` (`/api/info` has no `labels` field; `/api/labels` returns `count`).
8. Manual (kvn): phone camera starts on `/learn/`; sign in at `/communicate/login` and see the session on `/` and `/learn/`; theme carries across; no horizontal scroll at 360/390.

## 5. Recognize and speech hosting (DN-02, DN-03)

**Facts (12 Oct):** Recognize image = python 3.10-slim, TF 2.13, mediapipe 0.10.7, port 7860, WebSocket `/ws/recognize`, model loaded at import, gTTS needs outbound internet. HF Docker Spaces need PRO to create and sleep when idle; Render free is too small; Railway Hobby $5/month plus usage, always on (estimate $5-8 for 10 days at about 2 GB); Fly needs a card; Cloud Run needs billing and `min-instances=1` on demo days.

**Recommendation:** Railway Hobby from 18 Oct, deployed from `services/recognition` (Dockerfile), public domain, WebSockets on; uptime ping to `/api/info` every 10 minutes from 20 Oct. Speech stays on the laptop unless DN-03 says otherwise.

**D-04 steps (kvn):** create the service; root `services/recognition`; deploy; check `/api/info` reports `numClasses: 171`; open on a phone and run one live recognition; set the shell's `VITE_RECOGNIZE_URL`; redeploy the shell.

**Rehearsed laptop fallback (Git Bash):**
```bash
docker build -t suvana-recognition services/recognition
docker run -p 7860:7860 suvana-recognition
cloudflared tunnel --url http://localhost:7860     # free trycloudflare URL; carries WebSocket
```

## 6. Corpus clips (only if DN-05 allows)

kvn's Cloudinary, folder `suvana/learn/clips/`; upload the output of `tools/reference-converter/export_clips.py` from outside the repo; public delivery URLs go into `apps/learn/public/references/video-manifest.json` (no secrets). Check free-tier bandwidth after rehearsal 1.

## 7. suvana.help (K-08, D-09), only after steps 6 and 8 are green

1. kvn buys `suvana.help` once deployed (unverified: $1.99 first year, renewal $32.12; to be recorded in docs/commercialisation.md, created by T-07).
2. Vercel -> `suvana-shell` -> Domains: add `suvana.help` and `www.suvana.help` (redirect www to apex); Vercel nameservers or the shown A/CNAME. **Attach to suvana-shell only.**
3. If the Recognize host supports custom domains, add `recognize.suvana.help` (CNAME).
4. Update `VITE_RECOGNIZE_URL`; if I-11 needed `AUTH_URL`, set it to `https://suvana.help/communicate`; redeploy the shell (and Communicate if `AUTH_URL` changed).
5. Re-run the smoke against `https://suvana.help`.
6. A docs agent updates DEPLOYMENT.md and README.md in that day's single-writer slot.
The `.vercel.app` URLs stay valid as the fallback.

## 8. CI (Q-03, 20 Oct; `.github/workflows/ci.yml`)

Existing jobs: Learn lint/test/build, shell, Communicate, recognition pytest (2 suites), Alerts tsc, sync-guards. Q-03 adds:
- `concurrency` with cancel-in-progress.
- A `docker build` job for `services/recognition` and `services/speech` on `workflow_dispatch` only (no push).
- An R26-form Learn build (without `suvana.config.json`): `dist/index.html` has no `/learn/` paths.
- A Suvana-form dist check: `dist/learn/index.html` references only `/learn/assets`; `dist/learn/wasm/*.wasm` exists.
- A brand grep over user-visible files in `apps/shell`, `apps/alerts`, `apps/communicate/app`, `services/recognition/webapp/static`, with an allow-list for internal identifiers.
Later (post-demo): `paths:` filters, a weekly `sync.mjs status`, TF-based recognition tests, shell lint, `sync.mjs port --check` in CI.

## 9. R26 redeploys

The exact procedure is in 07-r26-mirror.md section 6 (preview -> share-link check -> promote). Rollback target before the first redeploy: `dpl_4gfgnSdmCw8msd5dhc6nzMhknPLH` (`334beba`).

## 10. Demo-day operations (20-22 Oct)

- Recognize host always on from 20 Oct; uptime ping confirmed; open the page 5 minutes before the panel.
- Laptop stack ready (05-integration section 6); Alerts APK pre-installed; hotspot ready.
- Learn on the demo devices: Demo profile selected and reset; site data cleared once after L-06 so no stale immutable cache remains.
