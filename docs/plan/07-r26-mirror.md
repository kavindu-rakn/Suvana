# 07 Keeping Learn identical in R26 and redeploying learn-ssl-module.vercel.app

## 1. Why

- Learn is developed in Suvana and mirrored to R26 and learn-ssl-module.vercel.app (kvn, 12 Oct; replaces the 10 Oct "developed in both" decision). Since 10 Oct the team uses R26 (`C:\Users\User\Documents\R26-SE-019`) as the official repo; its landing page links https://learn-ssl-module.vercel.app. kvn wants R26 to always have his latest Learn, so the site is redeployed after every Learn milestone.
- Today the live R26 site (`334beba`, deployment `dpl_4gfgnSdmCw8msd5dhc6nzMhknPLH`) still shows invented per-finger percentages and serves a year-long immutable cache. That is why M0 happens on 14 Oct.

## 2. Hard rules

- **Agents never commit, push or deploy in R26.** They write only to the R26 **working tree** (port tasks are in the Claude Code lane because Codex's sandbox may not write outside its worktree), run the gates there, take screenshots, and hand kvn two copyable blocks: a summary line, and a point-form body, with no Co-Authored-By trailer. kvn commits and pushes in GitHub Desktop, then redeploys.
- Port only from merged Suvana `main`, never from an agent branch.
- Never copy a lockfile. When `package.json` changed, run `npx -y npm@10 install` in `learn-ssl-module/web`.
- R26 builds at base `/`; Suvana builds at `/learn/`.
- **Never port Suvana's `vercel.json`.** Its header source carries the `/learn/` prefix, and the redirect `/` -> `/learn/` that L-06 adds would send learn-ssl-module.vercel.app to a 404. R26's `vercel.json` is edited by hand in R26 form (header source `/(models|references|wasm)/(.*)`, no redirect).
- Before each port, kvn pulls R26 main to `origin/main` (`git -C /c/Users/User/Documents/R26-SE-019 pull`). This also brings teammates' new commits (for example Lahiru's 12-Oct recognition work) into kvn's tree; that is expected.
- If a study ever starts, stop promoting; participants use one immutable deployment URL (UI-freeze rule).

## 3. Couplings (what differs between the two Learns)

**Today (before R-01):** `vite.config.ts` (base, outDir, port), `vercel.json` (header prefix), `src/App.tsx` (+18: `fetchSession`, `<AccountButton>`), `src/components/AppNavBar.tsx` (+6: `account` slot), `src/components/Hero.tsx` (home links), `src/index.css` (+66/-12: account CSS replacing R26's standalone trailing-slot CSS), Suvana-only `src/app/session.ts` and `src/app/AccountButton.tsx`, `package-lock.json`.

**After R-01 (DN-01 option B, recommended):** only three Suvana-only files differ, and the port never copies them:
- `apps/learn/suvana.config.json` (Suvana-only; read by `vite.config.ts`; sets base `/learn/`, port 5174 and `VITE_SUVANA`). A JSON file is used instead of a committed `.env`, because `.env*` files never enter the repo.
- `apps/learn/vercel.json` (Suvana form: `/learn/` header prefix, plus the redirect once L-06 lands).
- `apps/learn/package-lock.json` (each repo regenerates its own with npm 10).
Everything else, including `session.ts`, `AccountButton.tsx`, the AppNavBar slot and the account CSS, is identical in both repos and inert unless `VITE_SUVANA === '1'`. kvn sees before/after renders of both the Suvana build and the R26-form build (they should look unchanged).

## 4. M0 manual port (R-00, 14 Oct, before R-01/R-02 exist)

Run in Git Bash after kvn has merged L-01, L-02, L-04, L-05, L-06 (and L-03 if merged) and pulled R26.

```bash
cd /c/Users/User/Documents/R26-SE-019 && git status --short        # must print nothing
git log -1 --format=%H origin/main; git log -1 --format=%H           # must be equal
cd /c/Users/User/Documents/Suvana && git fetch && git log -1 --format=%H main   # record this sha
git diff --name-status 846d4fd main -- apps/learn                    # list what changed since the re-sync
```

For each listed file:
- **Plain files** (not in the coupling list above): copy `apps/learn/<path>` to `R26-SE-019/learn-ssl-module/web/<path>`; delete files that were deleted.
- **Coupling files** touched by the fixes (`AppNavBar.tsx` from L-02, possibly `Hero.tsx`): hand-merge only the fix hunks (`git diff 846d4fd main -- apps/learn/src/components/AppNavBar.tsx`). Carrying the `account` slot over is acceptable (it renders nothing unused and R-01 upstreams it anyway); do not carry `App.tsx` account code.
- **vercel.json:** in R26, change the header rule `/(models|references|wasm)/(.*)` to `public, max-age=86400, stale-while-revalidate=604800`. Add **no** redirect.
- **Never** copy `package-lock.json` or `vite.config.ts`.

Then the gates and the R26-form check:
```bash
cd /c/Users/User/Documents/R26-SE-019/learn-ssl-module/web
npm ci && npm test && npm run lint && npm run build
grep -c '/learn/' dist/index.html          # must print 0
npx vite preview --port 4173               # screenshots with tools/screens/shoot.mjs --base http://localhost:4173/
```

Handoff: changed file list, gate results, screenshots, the Suvana sha ported, and the two commit blocks, for example:
```
Learn: port Suvana blocker fixes (M0) from Suvana <sha>
```
```
- Replace invented per-finger percentages with measured on/close/off states
- Fix Esc and Enter/Space keyboard traps in Practice
- Detect lost cameras, recover the frame loop, require HTTPS, fall back to CPU
- Survive blocked IndexedDB and localStorage; add an error boundary
- Replace the year-long immutable cache with a 1-day cache plus revalidation
```

## 5. The port command (R-02, from 16 Oct)

`port` does not exist yet: R-02 adds it. Today `tools/sync/sync.mjs` has only `status`, `apply`, `record` and `guard`.

```bash
cd /c/Users/User/Documents/Suvana
MSYS_NO_PATHCONV=1 node tools/sync/sync.mjs port learn --to ../R26-SE-019 [--check]
```
- Refuses if the R26 tree is dirty or R26 `main` is not at `origin/main` (tells kvn to pull).
- Copies every tracked, non-ignored file under `apps/learn` to `learn-ssl-module/web/`, **except** `suvana.config.json`, `vercel.json`, `package-lock.json`; mirrors deletions; prints add/modify/delete counts; prints "run `npx -y npm@10 install` in learn-ssl-module/web" when `package.json` changed.
- `--check` writes nothing and exits 1 on any difference beyond the three exclusions.
- Never commits.
- If DN-01 = A instead, the command uses a three-way `git merge-file` with base = Suvana at the last `ported` sha (a new manifest field), as the infra audit describes.

**Per milestone (R-03 M1 17 Oct, R-04 M2 19 Oct, R-05 final 21 Oct):** kvn pulls R26 -> run the port command -> `npm ci && npm test && npm run lint && npm run build` in `learn-ssl-module/web` -> `grep -c '/learn/' dist/index.html` = 0 -> R26-form screenshots (desktop and phone) -> handoff with the two blocks and the ported sha -> kvn commits, pushes, redeploys (section 6) -> the codex lane records the ported sha in `tools/sync/upstreams.json` on its next slot, so `sync.mjs status` stops flagging Suvana-side Learn work.

## 6. Redeploy learn-ssl-module.vercel.app (kvn: D-06 M0, D-07 M1, D-08 M2, D-10 final)

Precondition: the port is committed and pushed by kvn; the R26 tree is clean (the Vercel CLI uploads the working tree, so a dirty tree gives a deployment that matches no commit).

```bash
cd /c/Users/User/Documents/R26-SE-019 && git status --short                 # empty
cd learn-ssl-module/web && npm ci && npm test && npm run lint && npm run build
npx vercel deploy                       # project prj_aVicvXvSdpv3kx4rREvCVDper4Z6 (.vercel/project.json)
# Open the preview via the dashboard Share link on desktop and phone:
#   Practice loads; one take scores; /references/kaggle_100.json, /wasm/vision_wasm_internal.wasm,
#   /models/hand_landmarker.task return 200; no '%' next to fingers.
npx vercel promote <preview-url> --scope kavindu-rakns-projects
curl -s -o /dev/null -w '%{http_code}\n' https://learn-ssl-module.vercel.app/   # 200
```
- Rollback: `npx vercel rollback`, or promote the previous deployment (first target: `dpl_4gfgnSdmCw8msd5dhc6nzMhknPLH`).
- Optional kvn commit in R26: `learn-ssl-module/web/.vercelignore` with `dist`, `node_modules`, `calibration` (faster uploads).
- After each redeploy kvn writes a LOG.md entry: R26 commit sha, deployment id, Suvana sha ported.

## 7. Cadence

| Milestone | Content | Port | Redeploy |
|---|---|---|---|
| M0 | Blocker fixes merged by 14 Oct morning (L-01, L-02, L-04, L-05, L-06, maybe L-03) | R-00 (manual), 14 Oct | D-06, 14 Oct evening |
| M1 | Learn on main after the 17 Oct morning merge (adds L-03, L-07..L-14, L-24-if-merged, R-01) | R-03, 17 Oct | D-07, 17 Oct |
| M2 | Learn on main after the 19 Oct morning merge (stages, hints, scenarios, licence, progress, sentences) | R-04, 19 Oct | D-08, 19 Oct |
| Final | The tagged demo commit | R-05, 21 Oct | D-10, 21 Oct |

kvn may run an extra port and redeploy on any other day; the procedure is about 20 minutes.

## 8. Video manifest in R26

If DN-05 allows video, `video-manifest.json` holds public Cloudinary URLs and can be ported unchanged. If kvn does not want R26 to depend on his Cloudinary (DN-06), the Watch stage shows video only when `VITE_SUVANA === '1'`.
