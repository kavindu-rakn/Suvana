# Shell hotfix: trailing-slash routes
started 2026-10-17T22:10:07+05:30 by codex

Branch: agent/codex/shell-trailing-slash, fresh from origin/main
5342b436e4d0f4e47d6333ed8ab9f021cafcfbda.
Status: review.
Authorization: kvn explicitly assigns this hotfix and authorizes the hot file
apps/shell/vercel.json on 17 Oct. Product boundary: that file only; this handoff
and an append-only LOG.md entry are also requested.
Plan correction: direct chat assigns this unscheduled hotfix to Codex;
BOARD.md, tasks.json and DECISIONS.md remain owner-managed.
r26_port: no.

## Handoff 2026-10-17 22:13 - codex

Changed files: apps/shell/vercel.json, this handoff, docs/plan/LOG.md append.

- Added /learn/ -> https://suvana-learn.vercel.app/learn/ immediately before
  /learn/:path*.
- Added /communicate/ -> https://suvana-communicate.vercel.app/communicate
  immediately before /communicate/:path*.
- Existing bare routes, wildcard destinations and other configuration are
  unchanged. Optional cleanUrls was left unset to keep this hotfix to the
  explicitly requested rewrites. Existing *.html links and Alerts config are
  unchanged; extensionless information-page support is not added here.
- Production 404 evidence is kvn's 17 Oct curl report in chat. No production
  requests, deployment or hosted routing validation were performed here.

## Gates

- Node v24.12.0; npm 10.9.9 ci passed (57 packages installed). Sandbox npx
  initially failed registry DNS; elevated retry succeeded. Install reported
  the existing Lenis package deprecation and one high-severity audit finding;
  dependencies and lockfile were not changed by this hotfix.
- Small Node routing test: 3 passed, 0 failed. Checks exact destinations,
  source uniqueness, placement before wildcard rules, and equality with the
  base config after removing only the two additions.
- Shell npm test: 44 passed, 2 files. First sandbox run could not load suites
  because of temporary-file rename EPERM; elevated retry passed.
- Shell npm run build: typecheck and Vite build passed. Main JS 644.62 kB /
  180.47 kB gzip; Vite's >500 kB chunk warning remains. dist/alerts/index.html
  and all four *.html information pages were emitted.
- node tools/ci/check-brands.mjs: passed, 128 tracked source files.
- node tools/sync/sync.mjs guard: 182 checks passed.
- git diff --check: passed. Only eight product-config lines added.
- Screenshots: n/a, routing configuration only; no visual changes.
- SSL content touched: none. Research/accuracy figures touched: none.
- Proposed diffs for unowned hot files: none. No new sync coupling: Shell is
  Suvana-owned; upstream module files and coupling declarations are unchanged.

Local test retained at .agent-local/shell-trailing-slash.test.mjs (ignored).
Run from the repository root:

```powershell
node --test .agent-local/shell-trailing-slash.test.mjs
```

Portable equivalent of that test (save as a .mjs file and run with node --test
from the repository root):

```javascript
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const config = JSON.parse(readFileSync('apps/shell/vercel.json', 'utf8'))
const additions = [
  ['/learn/', 'https://suvana-learn.vercel.app/learn/'],
  ['/communicate/', 'https://suvana-communicate.vercel.app/communicate'],
]
for (const [source, destination] of additions) {
  test(`${source} has its exact destination before the wildcard`, () => {
    const index = config.rewrites.findIndex(rule => rule.source === source)
    const wildcard = config.rewrites.findIndex(rule => rule.source === `${source}:path*`)
    assert.ok(index >= 0, `missing ${source}`)
    assert.ok(wildcard > index, `${source} must precede its wildcard`)
    assert.equal(config.rewrites[index].destination, destination)
    assert.equal(config.rewrites.filter(rule => rule.source === source).length, 1)
  })
}
test('all pre-existing config and rewrites remain unchanged', () => {
  const baseline = JSON.parse(execFileSync('git', [
    'show', '5342b436e4d0f4e47d6333ed8ab9f021cafcfbda:apps/shell/vercel.json',
  ], { encoding: 'utf8' }))
  const rewrites = config.rewrites.filter(rule =>
    !additions.some(([source]) => rule.source === source))
  assert.deepEqual({ ...config, rewrites }, baseline)
})
```

## Production checks after kvn merges and deploys

claude-code re-runs (kvn coordinates; no message sent by this agent):

```powershell
node tools/smoke/smoke.mjs https://suvana-shell.vercel.app
```

Re-check these production URLs, following redirects where present. The two
new slash routes must finish at 200 with the expected module content; also
check the existing routes and wildcard asset/auth paths for regressions:

- https://suvana-shell.vercel.app/
- https://suvana-shell.vercel.app/learn/
- https://suvana-shell.vercel.app/learn
- https://suvana-shell.vercel.app/learn/index.html
- https://suvana-shell.vercel.app/learn/reference-index.json
- https://suvana-shell.vercel.app/learn/references/kaggle_100.json
- https://suvana-shell.vercel.app/learn/wasm/vision_wasm_internal.wasm
- https://suvana-shell.vercel.app/learn/models/hand_landmarker.task
- The /learn/assets/ URLs actually referenced by production Learn HTML.
- https://suvana-shell.vercel.app/communicate/
- https://suvana-shell.vercel.app/communicate
- https://suvana-shell.vercel.app/communicate/api/auth/session (200 JSON)
- https://suvana-shell.vercel.app/alerts/ (Alerts index page)
- https://suvana-shell.vercel.app/privacy.html
- https://suvana-shell.vercel.app/terms.html
- https://suvana-shell.vercel.app/contact.html
- https://suvana-shell.vercel.app/pricing.html

The smoke script also probes /privacy, /terms, /contact and /pricing; their
extensionless support remains outside this minimal patch. Do not claim those
routes are fixed or suppress smoke output. Existing *.html URLs above must
continue to work. Exercise both landing Learn links, the assistant Learn link
and the sign-in callback returning to /learn/ after deployment.

Needs kvn: review, merge/push, allow deployment, then coordinate claude-code's
production smoke and the explicit /communicate/ check (the smoke currently
checks only bare /communicate). No agent push, merge, deployment or messages.

Commit message (as committed):
Fix Shell trailing-slash rewrites for Learn and Communicate

- Add explicit slash routes before the module wildcard rewrites
- Preserve existing routes and leave optional cleanUrls unchanged
- Record routing assertions, Shell gates and production recheck URLs
