# tools/screens: automated screenshot & visual review tooling

This folder provides Playwright-based screenshot tooling for capturing desktop (1280x800) and phone (390x844) before/after states, seeding IndexedDB progress, using fake camera feeds, rendering contact sheets for kvn's review, and testing isolated dev fixtures.

Screenshots are saved locally to:
```
<worktree>/.agent-local/screens/<TASK_ID>/
```
`.agent-local/` is excluded by git and is never committed.

---

## 1. Installation

Run from this folder:
```bash
npm install
npx playwright install chromium
```
This folder maintains its own `package.json` with `@playwright/test` and does not touch `apps/learn/package.json`.

---

## 2. Taking screenshots with `shoot.mjs`

### Basic command
```bash
node tools/screens/shoot.mjs --base http://localhost:5174 --id <TASK> --label before|after --paths /learn/
```

### Options
- `--base <url>`: Base URL of the running server (default: `http://localhost:5174`).
- `--id <TASK>`: Task identifier (e.g. `Q-00`, `L-01`, `I-01`, `L-05`).
- `--label <before|after>`: Whether this is the `before` (on `main`) or `after` (on your feature branch) capture.
- `--paths <path1,path2>`: Comma-separated list of paths to shoot (e.g. `/learn/`, `/learn/fixtures.html`, `/`).
- `--state <name>`: Optional state name for the filename suffix (e.g. `--state result`). Output filename: `<label>-<viewport>[-<state>].png`.
- `--fake-video <file.y4m>`: Provide a `.y4m` video file to emulate real camera input in Chromium.
- `--seed <attempts.json>`: Seed IndexedDB `ssl-learn` store `attempts` via `addInitScript` before page render.
- `--layout`: Also capture 360x800 layout viewport.
- `--delay <ms>`: Delay in milliseconds after page load (default: 800ms) to ensure smooth animations settle.
- `--wait-for <selector>`: Wait for a specific DOM selector before snapping the screenshot.

---

## 3. Fake video & ffmpeg command (for K-13 and camera testing)

Chromium's `--use-file-for-fake-video-capture` requires an uncompressed Y4M video stream.

### Converting an MP4 or camera recording to Y4M
Use `ffmpeg` to convert video to 640x480 at `yuv420p`:
```bash
ffmpeg -i input.mp4 -pix_fmt yuv420p -s 640x480 -r 30 output.y4m
```

### Recommended test fixture clips (K-13)
Store test clips outside the repo in `C:/Users/User/Documents/Suvana-wt/_fixtures/`:
- `C:/Users/User/Documents/Suvana-wt/_fixtures/hands-sign.y4m`: ~5s of signing gestures.
- `C:/Users/User/Documents/Suvana-wt/_fixtures/no-hands.y4m`: ~3s of empty room (testing "no hands detected" diagnostics).

Run `shoot.mjs` with:
```bash
node tools/screens/shoot.mjs --id L-01 --label after --paths /learn/ --fake-video C:/Users/User/Documents/Suvana-wt/_fixtures/hands-sign.y4m
```

---

## 4. Seeding IndexedDB (`--seed`)

To test views that require existing attempts (e.g. Path view, Progress dashboard), pass a JSON file containing attempt records:
```bash
node tools/screens/shoot.mjs --id L-23 --label after --paths /learn/ --seed ./test-attempts.json
```
`shoot.mjs` injects the entries into `ssl-learn` IndexedDB before the page scripts execute.

---

## 5. Generating contact sheets with `contact-sheet.mjs`

After shooting both `before` and `after` images:
```bash
node tools/screens/contact-sheet.mjs <TASK>
```
This generates:
```
<worktree>/.agent-local/screens/<TASK>/index.html
```
Open `index.html` in a browser to review side-by-side desktop and phone comparisons for kvn's adoption or rejection.

---

## 6. Dev fixtures page (`fixtures.html`)

For UI testing of isolated components (`ScoreBadge`, result card, diagnostics, finger deviations):
- Start the Learn dev server: `cd apps/learn && npm run dev`
- Navigate to: `http://localhost:5174/learn/fixtures.html` or `/fixtures.html`
- JSON fixtures live in `apps/learn/src/dev/fixtures/*.json`.
- The fixtures page is excluded from `npm run build` production bundles.

---

## 7. End-to-end smoke tests (`npm run e2e`)

Playwright smoke tests cover critical user flows that are not tested by unit tests:
- Onboarding modal shows on first run and persists dismissed state
- Escape key during practice countdown cancels countdown and stays in PracticeView (without navigating back to Hero)
- Enter key on focused Retry button triggers attempt retry without navigating
- Blocked IndexedDB (simulated storage security error) still renders the bundled reference list with a non-blocking `StorageNotice`

To run:
```bash
npm run e2e
```
Playwright runs headless against `vite preview` on port 5194, with fake camera media stream flags enabled (and K-13 `.y4m` fixtures if present).
Later UI tasks can add their own `.spec.ts` files under `tools/screens/e2e/`.

