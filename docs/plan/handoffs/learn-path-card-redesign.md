# Learn Path lesson card redesign

- Started: 2026-10-19, Codex; revamp/learn-path in the main worktree per session request.
- Plan correction: direct session redesign overrides board/lane selection and the preceding card-content placement specification. Preserve the existing route, centres and viewport density.
- r26_port: yes.
- Scope: smaller, polished cards inspired by Shell's editorial headings, monospace labels, soft borders and raised surfaces. Preserve yellow stars, full lesson titles, notices, progress and locking.
- Before screenshots: .agent-local/screens/learn-path-card-redesign/before-{desktop,phone}-{light,dark}-*.png (1280x800 / 390x844, plus 360px).

## Implementation
- Rebuilt card hierarchy: monospace number and compact milestone/lock icon in the header; left-aligned serif title; separate signs and yellow-star tally in a quiet footer.
- Used Shell's overview step-card treatment as the reference: soft rounded borders, restrained surface tint, gentle shadow and teal/gold detail on open lessons. Hover/focus stays in place so the route continues to meet card centres.
- All visible cards are now 124px high and 20px narrower / 16px shorter than the preceding increment. Existing 160px slots, row pitch, SVG route and all lesson centres remain unchanged.
- Full curriculum titles wrap without truncation. Required partial-reference and experimental notices remain readable, with extra internal room for Preview cards.
- Curriculum order/IDs, saved progress, star milestones, unlocking and detail interactions are unchanged. Yellow Lucide star remains with the accessible earned/available tally. No dependencies added.
- Generated assistant assets changed only for PathView source provenance. No recognition/model/label changes.

## Rendered evidence
- Review gallery: .agent-local/screens/learn-path-card-redesign/index.html.
- Before/after: desktop 1280x800 at all six aligned scroll positions, phone 390x844 top/middle/end and 360x800, both themes.
- Inspected desktop contact sheet and canonical desktop/phone views, including the final experimental challenge. Screenshots use fresh local progress.
- Browser fixtures for progress and missing references are synthetic UI evidence only, not learner or recognition results.

## Gates and preview
- Learn npm ci and lint passed; full unit suite with --maxWorkers=1: 371 passed / 13 skipped (57 files passed / 4 skipped). Used one worker because the preceding increment exposed timing sensitivity under contention; no scoring changes or threshold changes.
- Learn production build passed, main JS 155.22 kB gzip (limit 160 kB).
- Playwright: all 37 path/card/progress checks passed. Full title/notice fit, star counts, fixed centres, middle-height route crossings, nine-card desktop viewport density, mobile gutters, keyboard/return behavior and locking remain covered.
- Shell: 157 tests, TypeScript and build passed. Recognize required keypoint/Sinhala-label plus Suvana-label consistency tests: 42 passed.
- Generated metadata --check, 265 sync guards and git diff --check passed. Deep comparison confirms both generated JSON files differ only in the PathView source hash.
- Existing dependency audit findings (2 moderate / 3 high) and Shell's >500 kB chunk advisory remain; no dependency versions/manifests changed.
- Existing 320px app-header overflow is separate from Path; card content fits 320px and full-page fit remains checked at 360px+.
- Restored dev preview with forced dependency optimization at http://localhost:5174/learn/. Actual rendering rechecked at 1280x800 and 390x844 in both themes: 54 cards, no runtime or Learn asset failures. Standalone Vite's account-session request to /communicate/api/auth/session returns 404 (backend unavailable); the Path renders successfully. This unrelated endpoint is not mocked or changed.

## Remaining
- kvn can refresh the Learn preview and review the before/after gallery. UI adoption, merge/push/deploy and the next approved R26 port remain manual; r26_port: yes.
