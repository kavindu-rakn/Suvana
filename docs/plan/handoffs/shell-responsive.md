# Shell responsive landing
started 2026-10-19 by Codex

Status: review.

Scope: Make the full Shell landing page adapt to compact and large phones, tablets, desktop, wide screens and landscape. User directly assigned this follow-up on 19 Oct; the current plan board has no matching responsive task row. Plan correction: kvn assigned this Shell task to Codex in chat; planner-owned files remain unchanged.

Changes:
- Made the hero scale and grow with its content so short viewports do not clip the logo, title or introduction; sized the preloader and assistant panel against dynamic viewport height.
- Let module content and artwork use the available width, reduced spacing on small screens, and removed the 50px side-slide from module copy below 901px while keeping its fade. This prevents the entrance state from moving text beyond the phone edge.
- Allowed the step, pipeline, stats and testimonial grids to shrink below their former fixed minimum widths; adjusted phone gutters and card padding.

Validation:
- Shell `npm run build`: passed typecheck and Vite production build. Existing bundle-size advisory remains (`main` 644.91 kB minified).
- `node tools/sync/sync.mjs guard`: 255 checks passed.
- Browser responsive pass: 280, 300, 320, 340, 360, 375, 390, 430, 540, 600, 768, 820, 900, 901, 960, 1024, 1280, 1440, 1920 and 2560px wide; also 480x320 and 844x390 landscape. After module animation settled, document and module widths matched viewport widths; no module copy crossed the viewport.
- Rendered before/after captures cover light and dark themes at 320x700, 390x844, 768x1024, 1280x800 and 1920x1080. Focused Recognize card captures cover phone and desktop in both themes.

Screenshots: `.agent-local/screens/shell-responsive/index.html` and `.agent-local/screens/shell-responsive/`. Handoff: `docs/plan/handoffs/shell-responsive.md`.

Needs kvn: review the rendered screenshots, then merge/push/deploy if accepted. No SSL content, model data or figures changed.
