# tools/smoke: deployment smoke check suite

Automated post-deployment verification script for Suvana, implementing the 8-step
verification specification in `docs/plan/06-deploy.md` section 4.

## Quick start

```bash
# Verify production shell deployment
node tools/smoke/smoke.mjs https://suvana-shell.vercel.app

# Verify custom domain with hosted Recognize service
node tools/smoke/smoke.mjs https://suvana.help --recognize-url https://recognize.suvana.help

# Verify local multi-module stack (shell on port 5173)
node tools/smoke/smoke.mjs http://localhost:5173
```

## Checks executed

| # | Check | Verification rule |
|---|---|---|
| 1 | `GET /` | Returns HTTP 200; page contains "Suvana" title/brand |
| 2 | `GET /learn/` | Returns HTTP 200; references assets under `/learn/assets/` (no broken root `/assets/`) |
| 3 | Learn runtime assets | `/learn/reference-index.json`, `/learn/references/kaggle_100.json`, `/learn/wasm/vision_wasm_internal.wasm`, `/learn/models/hand_landmarker.task` return HTTP 200; `Cache-Control` header does **not** contain `immutable` |
| 4 | Communicate | `GET /communicate` returns HTTP 200; `/communicate/api/auth/session` returns HTTP 200 with valid JSON |
| 5 | Alerts & Legal | `GET /alerts/` returns HTTP 200; `/privacy`, `/terms`, `/contact`, `/pricing` return HTTP 200 (warns if 404 before I-06 on 18 Oct) |
| 6 | Standalone redirect | Optional `--standalone-learn-url <url>`: root `GET /` redirects to `/learn/` |
| 7 | Recognize service | Optional `--recognize-url <url>` (or env `RECOGNIZE_URL`): `GET /api/info` returns HTTP 200 with `numClasses: 171` |

## CLI Options

```text
Usage:
  node tools/smoke/smoke.mjs <base-url> [options]

Arguments:
  <base-url>                   Root origin of the deployment to smoke-test

Options:
  --recognize-url <url>        Origin of the Recognize service (e.g. https://recognize.suvana.help)
  --standalone-learn-url <url> Origin of standalone suvana-learn (checks / -> /learn/ redirect)
  --require-legal              Treat 404 on legal pages as failure (default: warn before I-06)
  --strict                     Treat warnings as errors
  --timeout <ms>               Request timeout in ms (default: 10000)
  --help, -h                   Show help message
```

## Exit codes

- `0`: All required checks passed.
- `1`: One or more checks failed (or warning failed under `--strict`).
