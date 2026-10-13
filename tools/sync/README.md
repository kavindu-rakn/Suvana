# tools/sync — keeping Suvana in step with its upstreams

Every component in Suvana is a copy of a folder in a teammate's repo, plus a few
deliberate Suvana-specific changes. `upstreams.json` records, per component,
where it came from, which upstream commit it last matched (`synced`), and every
file that is allowed to differ — with the reason. `sync.mjs` reads it.

| Component | Upstream | Owner |
|---|---|---|
| `apps/learn` | R26-SE-019 `learn-ssl-module/web` | kvn |
| `tools/reference-converter` | R26-SE-019 `learn-ssl-module/tools` | kvn |
| `services/recognition` | R26-SE-019 `sinhala_sign_language_recognition` | Lahiru |
| `apps/alerts` | R26-SE-019 `soundguard-karindra/sound_awareness_mobile` | Karindra |
| `services/sound-awareness` | R26-SE-019 `soundguard-karindra/sound_awareness_backend` | Karindra |
| `apps/communicate` | Sign-Detector (repo root) | Lithira |

`apps/shell`, `services/speech` and `packages/branding` are Suvana's own and
have no upstream.

## When an upstream gets a new commit

```bash
node tools/sync/sync.mjs status            # what is new, and what it would take
node tools/sync/sync.mjs apply learn       # do it, for one component
# resolve conflict markers, then run that component's gates (below)
node tools/sync/sync.mjs guard             # the couplings survived?
node tools/sync/sync.mjs record learn      # set `synced` to upstream's head
```

Then add an entry to the re-sync log in the root `README.md` and update its
provenance table. Work on a `sync/<date>` branch; one commit per upstream.

`status` sorts every changed file into:

- **take** — Suvana never touched it; upstream's version wins as-is.
- **merge** — Suvana changed it too. Declared couplings land here, and so does
  any Suvana edit the manifest does not know about. Dry-run results are shown
  (`merges cleanly` / `N conflict(s)`).
- **skip** — the manifest says this upstream path never comes across (the
  recognition module's own landing page, Lithira's Mixamo test FBX, …).

It also lists **undeclared differences**: files where Suvana differs from the
upstream commit it claims to match, without the manifest saying why. Learn is
developed in both repos (decided 10 Oct 2026), so this is the reminder that
Suvana-side work still needs porting back to R26. Port it, or — if it really is
Suvana-only — declare it. `record` refuses while any remain.

## Port merged Learn milestones to R26

From the Suvana root (kvn or an explicitly authorized port task):

```bash
MSYS_NO_PATHCONV=1 node tools/sync/sync.mjs port learn --to ../R26-SE-019 --check
MSYS_NO_PATHCONV=1 node tools/sync/sync.mjs port learn --to ../R26-SE-019
```

Fetch Suvana and pull R26 first. `--to` names the repository root, not `web`.
The command does not fetch, commit, push or deploy. It refuses a dirty R26
tree (including untracked files), a checkout other than `main`, or `main`
different from the local `origin/main` ref. It also refuses Learn edits
relative to Suvana's `origin/main`, so only merged milestones are ported.

It mirrors tracked, non-ignored `apps/learn` files into
`learn-ssl-module/web`, including tracked deletions. Five files are excluded
from copying **and deletion**: `suvana.config.json`, `vercel.json`,
`package-lock.json`, `AGENTS.md` and `CLAUDE.md` (kvn, 13 Oct: agent files stay
out of R26). Existing R26 versions are preserved. Ignored/untracked local
assets are preserved; collisions and symlink/junction paths are refused
before mutation. Text comparisons ignore CRLF versus LF; binaries compare
byte for byte. Add/modify/delete counts and the source SHA are printed.

`--check` writes nothing and exits 1 on differences (or invalid preconditions),
0 when equal. After a write the target is deliberately dirty: review its
diff and run gates before kvn commits, rather than rerunning the port on it.
If `package.json` changes, the command reminds kvn to run
`npx -y npm@10 install` in `learn-ssl-module/web`; lockfiles are never copied.
Then run Learn lint/tests/build, verify the root-base R26 build and capture
desktop/phone renders per `docs/plan/07-r26-mirror.md`. The port handoff must
include the source SHA and two R26 commit-message blocks for kvn.

Regression tests use disposable synthetic repositories only:
`node --test tools/sync/port.test.mjs`. Never test this command against the
real R26 working tree. R-02's five exclusions supersede the older three-file
list in the plan; kvn updates the plan documents.

## Rules that are not mechanical

A clean merge is not the same as a right merge. Two cases the script cannot
judge, and which therefore come to kvn first:

- **Upstream changes product behaviour.** Lithira's `7948c4a` closed
  registration; Suvana keeps it open (his reason — friends' test accounts —
  does not apply here). Its Navbar half merges cleanly, so only a guard notices.
- **Upstream changes the UI.** Show the before/after rendered, desktop and
  phone, before deciding. The 10 Oct Learn sync moved the header into a new
  `AppNavBar`, and the straightforward port of Suvana's account link broke the
  phone layout — visible only once rendered.

## Guards

`guard` is offline and runs in CI. Each component's `guards` assert that a
coupling is still there (`has`) or that something is not (`lacks`, e.g. a bare
`fetch("/api…")` that `basePath` would not rewrite, or a sub-brand name). Every
`suvanaOnly` file must exist. When you add a coupling, add a guard for it.

## Gates per component

| Component | Before `record` |
|---|---|
| learn | `npm test`, `npm run lint`, `npm run build` in `apps/learn` |
| communicate | `npm run lint`, then `npm run build` with the CI env from `.github/workflows/ci.yml` (in Git Bash prefix `MSYS_NO_PATHCONV=1`, or `/communicate` becomes a Windows path) |
| recognition | `pytest tests/test_keypoint_augmentation.py tests/test_sinhala_labels.py` |
| alerts | `npx tsc --noEmit` |

## Notes

- Upstreams are fetched into a blobless bare clone in `tools/sync/.cache/`
  (gitignored). To reuse a local clone instead, set `SYNC_LOCAL_R26` /
  `SYNC_LOCAL_SIGN_DETECTOR` to its path; its `origin/main` is compared, never
  unpushed local commits.
- CRLF vs LF is ignored everywhere. On Windows, `git apply --3way` cannot be
  used across these repos — Suvana's fresh history lacks the upstream base
  blobs — which is why `apply` merges file by file with `git merge-file`.
- Lockfiles are npm 10 output (CI's npm, see the root README). Never copy an
  upstream lockfile; regenerate with `npx -y npm@10 install`.
