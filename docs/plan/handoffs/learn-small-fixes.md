# Learn small fixes from the 15 Oct review
started 2026-10-16 by codex (Asia/Colombo)

Branch: agent/codex/learn-small-fixes
Base: origin/main b0ce3d408cd88de2fa7ca17d9b454d04c4b6e710 (fresh from 34f43cc, metadata-only rebase)
Status: review (fixes ready; badge choice pending kvn)
r26_port: yes

kvn explicitly authorized heading focus styling, phone Watch's initial framing,
two rendered unit-badge choices (selection pending), and the camera E2E base URL
fix. This covers the necessary index.css/PracticeView.tsx edits. Game rules,
curriculum, scoring and SSL content stay unchanged. L-25 waits for L-22b.

## Handoff 2026-10-16 - codex

### Changes ready to merge
- Suppress outlines on non-interactive headings with tabindex=-1 that receive
  automatic focus for screen-reader announcements. Focus itself remains intact.
  Interactive controls retain the existing :focus-visible keyboard indicator.
  Simply adding :focus:not(:focus-visible) would not fix the observed reload:
  Chromium matches :focus-visible on the automatically focused heading then.
- Practice's Watch step starts zoomed to hands under 768 px; desktop, Try,
  Recall and result playback keep their existing defaults. The existing Zoom
  to hands toggle still lets the learner return to the full frame, and choosing
  a playback speed does not override that manual framing choice.
- camera.spec.ts now gives its new browser context the configured baseURL and
  navigates relatively. Verified with the entire suite configured on port 5197.
- Added five Watch boundary/toggle regressions (360/390/767/768/1280) and extended
  session-complete E2E to check retained heading focus/no outline, then Tab to
  Keep practising with a visible keyboard outline.

### Badge options (not adopted)
- A: rename the unit's existing mastered badge to **Well practised**. The
  separate match-history estimate still determines that badge; 14/21 and 21/21
  can both show Well practised.
- B: for passed/mastered units, render **Passed** until every star is earned,
  then **Mastered**. This is display-only: unitState(), starsFor(), mastery,
  rewards and successor unlocks stay unchanged. Preview/locked/open labels take
  precedence. Individual-sign mastery labels and their existing explanation
  in Progress remain separate from the unit badge.
- Both were compiled from real temporary source patches in PathView.tsx and
  ProgressView.tsx (unit plan only), rendered, and then restored. Neither is
  selected in committed production code while kvn chooses. Exact patches below.

### Gates and evidence
- Node v24.12.0; npm@10.9.9 ci --offline passed in Learn and tools/screens using
  the normal user cache; no dependency/lockfile changes.
- Learn lint: zero warnings/errors. Vitest: 320 passed, 13 skipped, 44 passed
  files and 5 skipped files. No generated report changes.
- Production build: passed, main JS 150.19 kB gzip (<160 kB). Both separate
  proposal builds passed too (150.20 kB gzip); all outputs ignored.
- Playwright: 51 passed on configured port 5197, including the formerly
  hard-coded tablet camera test. Full suite uses committed-default badge code.
- Both proposed badges also checked in actual browser renders with synthetic
  14/21 and 21/21 histories, at all three sizes.
- Sync guard: 181 passed. git diff --check clean. Fresh fetch advanced main
  only by b0ce3d4's board/journal approval records; clean rebase, no tested
  application/tooling source changes. Hosted CI not run for this branch.

### Renders
- `.agent-local/screens/learn-small-fixes/index.html`: all before/after renders.
- `.agent-local/screens/learn-small-fixes/badge-options.html`: current/A/B
  comparisons in Path and Progress, plus both options at 21/21 stars.
- Sizes: 1280x800, 390x844, 360x800. Before is preserved origin/main 34f43cc
  (Learn source identical on b0ce3d4). Watch shows the actual first Starter
  reference, paused at frame zero consistently; no synthetic sign frames.
- Session-complete/badge histories are explicitly synthetic test fixtures,
  using existing Starter corpus labels, not participant or learning results.
- Renders and evidence JSON confirm the heading stays focused, its outline
  changes solid to none, phone Watch changes raw to zoomed, desktop stays raw,
  and document widths match all three viewports. Visually inspected changed
  phone/360 and desktop screens, both badges and Progress unit rows.
- Screenshots, preview builds, patches and test output stay ignored.

### Remaining
- kvn chooses A or B from rendered screenshots, then the exact selected patch
  can be applied/tested as the next increment. No guessed choice adopted.
- kvn reviews/merges; agents did not push, merge, deploy or message anyone.
  r26_port: yes (later milestone from merged main).
- Plan correction: direct chat authorizes this small-fixes branch and its hot
  files; historical task handoffs and BOARD/tasks/DECISIONS were not edited.
- K-07 is now recorded complete on main; L-22b is being handled by the first
  Codex window. L-25 still waits for L-22b to land, per kvn.
- SSL content touched: none. Figures/rules touched: none.

Commit message (as committed):
Fix Learn heading focus and phone Watch framing

- Keep announcement headings focused without drawing a control outline
- Start phone Watch zoomed and preserve the learner's framing toggle
- Use configured camera-test URLs and hand off two rendered badge options

### Exact unadopted badge patches

Option A:

```diff
diff --git a/apps/learn/src/components/PathView.tsx b/apps/learn/src/components/PathView.tsx
index 2c7af21..cf59612 100644
--- a/apps/learn/src/components/PathView.tsx
+++ b/apps/learn/src/components/PathView.tsx
@@ -103,7 +103,7 @@ export function PathView({ onPractise, onSession }: {
       return <li key={item.id}><button className="path-card" data-state={state} onClick={() => { setDetail(item.id); setPreview(null); setNotice('') }}>
         <span className="path-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
         <span className="path-card-copy"><strong>{item.title}</strong><span>{item.description}</span><span>{item.signs.length} signs · {stars}/{item.signs.length * 3} stars</span>{coverage.preview && <span>Preview: {coverage.covered} of {coverage.total} signs available</span>}</span>
-        <span className="path-state">{{ preview: 'Preview', locked: 'Locked', open: 'Open', passed: 'Passed', mastered: 'Mastered' }[state]}</span>
+        <span className="path-state">{{ preview: 'Preview', locked: 'Locked', open: 'Open', passed: 'Passed', mastered: 'Well practised' }[state]}</span>
       </button></li>
     })}</ol>}
   </section>
diff --git a/apps/learn/src/components/ProgressView.tsx b/apps/learn/src/components/ProgressView.tsx
index d462a58..15eace4 100644
--- a/apps/learn/src/components/ProgressView.tsx
+++ b/apps/learn/src/components/ProgressView.tsx
@@ -581,7 +581,7 @@ export function ProgressView({
             {CURRICULUM_UNITS.map(unit => {
               const earned = unit.signs.reduce((sum, gloss) => sum + starsFor(gloss, attempts), 0)
               const state = unit.status === 'approved' ? unitState(unit, approvedUnits, attempts) : 'proposed'
-              const labels = { proposed: 'Plan preview', locked: 'Later', open: 'Ready', passed: 'Finished', mastered: 'Mastered' }
+              const labels = { proposed: 'Plan preview', locked: 'Later', open: 'Ready', passed: 'Finished', mastered: 'Well practised' }
               return <li key={unit.id}>
                 <div><strong>{unit.title}</strong><span>{unit.signs.length} signs · {labels[state]}</span></div>
                 <span>{earned}/{unit.signs.length * 3} stars</span>
```

Option B:

```diff
diff --git a/apps/learn/src/components/PathView.tsx b/apps/learn/src/components/PathView.tsx
index 2c7af21..3d17659 100644
--- a/apps/learn/src/components/PathView.tsx
+++ b/apps/learn/src/components/PathView.tsx
@@ -103,7 +103,7 @@ export function PathView({ onPractise, onSession }: {
       return <li key={item.id}><button className="path-card" data-state={state} onClick={() => { setDetail(item.id); setPreview(null); setNotice('') }}>
         <span className="path-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
         <span className="path-card-copy"><strong>{item.title}</strong><span>{item.description}</span><span>{item.signs.length} signs · {stars}/{item.signs.length * 3} stars</span>{coverage.preview && <span>Preview: {coverage.covered} of {coverage.total} signs available</span>}</span>
-        <span className="path-state">{{ preview: 'Preview', locked: 'Locked', open: 'Open', passed: 'Passed', mastered: 'Mastered' }[state]}</span>
+        <span className="path-state">{{ preview: 'Preview', locked: 'Locked', open: 'Open', passed: stars === item.signs.length * 3 ? 'Mastered' : 'Passed', mastered: stars === item.signs.length * 3 ? 'Mastered' : 'Passed' }[state]}</span>
       </button></li>
     })}</ol>}
   </section>
diff --git a/apps/learn/src/components/ProgressView.tsx b/apps/learn/src/components/ProgressView.tsx
index d462a58..1ca3015 100644
--- a/apps/learn/src/components/ProgressView.tsx
+++ b/apps/learn/src/components/ProgressView.tsx
@@ -581,7 +581,7 @@ export function ProgressView({
             {CURRICULUM_UNITS.map(unit => {
               const earned = unit.signs.reduce((sum, gloss) => sum + starsFor(gloss, attempts), 0)
               const state = unit.status === 'approved' ? unitState(unit, approvedUnits, attempts) : 'proposed'
-              const labels = { proposed: 'Plan preview', locked: 'Later', open: 'Ready', passed: 'Finished', mastered: 'Mastered' }
+              const labels = { proposed: 'Plan preview', locked: 'Later', open: 'Ready', passed: earned === unit.signs.length * 3 ? 'Mastered' : 'Passed', mastered: earned === unit.signs.length * 3 ? 'Mastered' : 'Passed' }
               return <li key={unit.id}>
                 <div><strong>{unit.title}</strong><span>{unit.signs.length} signs · {labels[state]}</span></div>
                 <span>{earned}/{unit.signs.length * 3} stars</span>
```
