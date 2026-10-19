# Account page browser-review refinements
started 2026-10-19 by Codex

Direct user assignment: implement browser comments 1–13 on the combined account page, on uifixes/suvana in the main worktree. Remove marked copy, use Login/Register sliding switch, animated Suvana mark, shared landing footer, slimmer black/white header action and responsive viewport fit.
Plan correction: unscheduled direct follow-up overrides usual lane/branch setup. No planner-owned files edited.

## Handoff 2026-10-19 - Codex
Branch: uifixes/suvana in main worktree; follows d4e343e.
Status: review

Implemented browser comments 1–13:
- Removed the story eyebrow, module-name row, Back to Suvana link, form note, form eyebrow and form-top gradient line.
- Selected account description in the final working copy: Join Suvana to enhance your experience. The short replacement paragraph is retained; the working copy includes the connecting word to.
- Replaced the two mode buttons with one native button exposed as a switch, using a sliding highlight. Login is left; Register is right. Pointer sides, Space/Enter and arrow keys work. Register mode is the switch's on state. Submit/alternate-link labels also use Login/Register.
- Replaced decorative orbit with the actual Suvana mark, floating/tilting gently; reduced-motion disables movement. The compact welcome block condenses on phones; very short screens hide that decoration and animate the existing header mark instead.
- Shared header Sign Up is wider/slimmer (black with white text); same style applies on Shell and account pages.
- Reused landing-footer bottom markup and shared base CSS: Suvana, copyright, Privacy, Terms, Contact, Roadmap. Shell's footer appearance stays unchanged; the account instance uses compact spacing to fit its viewport.
- Account page uses a 100svh grid. Small phones condense the welcome/form, and short landscape uses two field columns. No overflow:hidden or scale/zoom trick is used to suppress page scrolling. Controls remain within the visible header/footer bounds at the tested sizes. Visible errors reserve room by reducing optional welcome/title decoration on short screens.
- Added a shared footer stylesheet import and sync guard; retained existing authentication handlers, API endpoints, callback safety and route aliases.

Validation:
- Shell: 157 tests across 9 files, typecheck and production build pass. Existing >500 kB bundle advisory remains (644.95 kB main chunk).
- Communicate: lint and /communicate production build/TypeScript pass.
- Sync: 263 guard checks pass; git diff --check pass.
- Browser fit assertions: 22 combinations (Login/Register at 1280x800, 903x532, 768x1024, 700x700, 701x700, 390x844, 360x640, 320x568, 360x568, 844x390, 480x320). Document scrollWidth/scrollHeight fit viewport, card stays between header/footer, inputs/submit/footer links are visible with no horizontal overflow. This is desktop-browser emulation, not real-device/keyboard proof or an assertion about every possible zoom/font setting.
- Visible synthetic duplicate-registration errors also fit at 320x568, 903x532, 480x320.
- Existing mocked account behavior checks pass: mode state and callback preservation, login/register errors, auto-login fallback, successful login return; 360/390/768/1280 light/dark theme, keyboard and reduced motion. Writes intercepted; no real account created or real credentials used.
- Normal-motion logo and sliding highlight tested; pointer left/right and arrow keys select correct modes without navigation.
- Clean npm ci not repeated: prior increment's Windows lock limitation still applies; no package/lockfiles changed.

Screenshots: .agent-local/screens/account-review/index.html; before/after desktop 1280x800, review 903x532, phone 390x844, small-phone 360x640, light/dark; extra 320x568 and 480x320 mode captures. Final renders visually inspected. Screenshots remain uncommitted.
SSL content: none. Figures: none. r26_port: no.
Plan correction: direct browser-review assignment on the user's session branch overrides board/lane workflow; planner files untouched. Narrow sync guards protect the newly shared footer and requested UI structure.
Needs kvn: visual review/adoption. Merge/push/deploy and live account smoke test remain manual; no breaking authentication migration required.

Commit message:
Refine account page from browser review

- Remove marked copy and replace mode buttons with a Login/Register switch
- Animate the Suvana mark and share the landing footer
- Fit account controls into desktop, phone and short landscape viewports
- Record rendered comparisons, mocked auth checks and validation gates
