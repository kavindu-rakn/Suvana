# L-25 follow-up: Sentence notice and phone controls
started 2026-10-16 by codex (Asia/Colombo)

Branch: agent/codex/L-25-notice-layout
Base: origin/main 82592a3
Status: review
r26_port: yes

kvn requests the experimental notice stay visible without covering controls,
especially Choose another sentence in Recall. Capture before/after renders at
390x844 and 360x800. Scope: SentenceView layout, browser regression and handoff.
Keep SENTENCE_EXPERIMENTAL_LABEL, dataset labels and scoring rules unchanged.

## Implementation
- Below 768px, the sentence view fits between the existing app bar and bottom
  navigation using --app-bar-h and --nav-offset. Back to path and the exact
  experimental notice occupy their own rows; .sentence-content scrolls below.
  The notice is static in its reserved row, so controls cannot scroll behind it.
- Native scrolling and keyboard focus reveal controls inside that content area.
  Phone result headings use a small scroll margin because the notice now has
  its own space. Desktop layout retains its existing behavior.
- Two browser regressions cover Recall at 390x844 and 360x800, light and dark:
  the full notice stays in the viewport while the chooser, stage switch,
  reveal, camera and record controls scroll to the top. Top/middle/bottom hit
  tests ensure the buttons are unobscured. Pointer and Enter both return to
  the catalogue; scored result focus is also checked.
- No changes to the notice text, dataset labels, meanings, reference files,
  order, score/capture logic, rewards, hot files, dependencies or other modules.

## Renders
`.agent-local/screens/L-25-notice-layout/index.html` (ignored, not committed).
- Paired Recall renders at 390x844 and 360x800, plus supplementary working
  chooser renders after activation. All phone renders visually inspected.
- Before: preserved clean origin/main 82592a3 build. At both widths the notice
  spans y=72..144 and covers the chooser's top (y=120). After: notice occupies
  y=136..208, chooser y=240..284, with all three button hit points verified.
- Supplementary 1280x800 Recall before/after PNGs are byte-identical (SHA256
  54dd87527aca3b38a2e929b708c0eb98b137113432f886ba8f459ec3455dc647).
- No page errors or horizontal overflow at any captured size. Same existing
  first dataset label/reference; synthetic unlock history and camera take
  only, not signer, participant, correctness or learning evidence. No K-13
  real-signer fixture/device validation is claimed.

## Gates
- Learn and tools/screens: npm@10.9.9 ci --offline passed.
- Learn lint: zero warnings/errors. Vitest: 330 passed, 13 skipped (47 passed
  files, 5 skipped). Production build passed; main JS 149.27 kB gzip.
- Targeted phone Recall browser checks: 2 passed; full Playwright suite:
  64 passed on configured port 5197 (4.4 minutes).
- Sync guard: 182 passed. git diff --check clean.
- Final fetch confirms origin/main remains 82592a3, the fresh branch base.

## Remaining
- Needs kvn: review/adopt the phone renders, merge/push the branch and check
  hosted CI. Include this portable layout fix in the later R26 milestone port.
- Plan correction: explicit chat authorizes this follow-up to the merged L-25;
  BOARD.md, tasks.json and DECISIONS.md are untouched.
- No agent push, merge, deploy or external messages.

Commit message:
Keep the sentence notice clear of phone controls

- Give the experimental notice its own row above scrolling sentence content
- Verify Recall controls and keyboard access at both phone sizes
- Record before/after renders and passing Learn/browser gates
