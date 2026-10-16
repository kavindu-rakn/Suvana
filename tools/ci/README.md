# Q-03 CI checks

From the repository root, after `npm ci` in `apps/learn`:

```sh
node --test tools/ci/*.test.mjs
node tools/ci/check-brands.mjs
node tools/ci/check-learn-dist.mjs suvana
```

The dist check runs after the relevant Learn build. Suvana must use
`dist/learn/index.html` and `/learn/assets/`; standalone R26 uses
`dist/index.html` and `/assets/`, with no `/learn/` in its HTML. Both require
nonempty JS assets and WASM files. The optional third argument supplies a
different dist directory for local checks.

CI builds R26 in a separate checkout with `suvana.config.json` removed. For a
local check, temporarily move that file aside, build, run the check with `r26`,
then restore it and rebuild Suvana. Never commit the removal.

The brand check scans tracked source under Shell, Alerts, Communicate's `app`
and Recognize's static frontend. It checks TS/JS string/template literals and
JSX text/attributes using Learn's locked TypeScript parser. HTML/SVG/CSS are scanned
as text with comments removed. Tests, package manifests/locks and documentation
are excluded. Corpus words containing a similar substring are not brand names.
This is a source regression check, not rendered UI or image/OCR verification.

Exceptions are literal internal audio/storage/native-module IDs, legacy
Recognize resource/API names, and the shell assistant's instruction forbidding
sub-brands. They do not exempt whole files or matching lines. The native plugin's
generated Java comments/identifiers are ignored while its notification strings
remain checked. Add a narrow exception only for a confirmed internal identifier;
add a failure test proving nearby visible copy still fails.

The Docker matrix runs only for `workflow_dispatch`, builds both services and
never pushes an image. It checks image construction, not model startup or live
signing/speech quality. Manual runs have their own concurrency group so routine
pushes cannot cancel a requested Docker check.
