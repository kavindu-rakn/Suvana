started 2026-10-18 (Asia/Colombo)

Branch: agent/codex/homepage-fingers, fresh origin/main 874196f203c5f8e139072c89d685570a36bb7777
after integration/2026-10-18d (333efd814b72c2e98b011e84ac8bf9547cd3d594), verified ancestor.
Authorization: kvn directly assigned this follow-up and authorized apps/shell/index.html
for exactly two supplied paragraph replacements. Testimonials unchanged (D-A34).
Scope: index.html, this handoff, LOG append; ignored renders/evidence only.
r26_port: no. Status: review; implementation, required gates and renders complete.

## Exact change

Only two paragraphs in apps/shell/index.html changed, using kvn's supplied text:

1. Modules Learn card: “Practice Sri Lankan Sign Language with your camera.
   Every attempt is scored against real-signer references, with tips on timing
   and hand movement. Some signs also show finger labels.”
2. “Corrections, not just a score”: “The comparison measures deviation per joint
   and per frame, so feedback can point to timing and hand movement. Some signs
   also show finger labels.”

All other HTML, including the overview's option B copy, links, testimonials,
stats and inline styles, is unchanged. No CSS, layout rules, runtime behavior,
test, dependency, lockfile or other copy changes. The slightly longer Modules
paragraph wraps naturally; the full text and button fit at both sizes.
No SSL content or numerical research claim added. L-33 coverage is qualified
as “Some signs”; no learner-accuracy claim.

## Preservation / gates

| Check | Result |
|---|---|
| Shell `npm test`, clean baseline and final | PASS; 117 tests, 7 files, each run |
| Shell `npm run build`, clean baseline and final | PASS, includes typecheck; main 180.55 kB gzip, assistant widget 32.91 kB gzip; unchanged >500 kB main-chunk advisory |
| `node tools/ci/check-brands.mjs` | PASS; 140 tracked source files |
| `node tools/sync/sync.mjs guard` | PASS; 240 checks |
| `git diff --check` | PASS |
| Whole-file preservation | PASS; base HTML plus exactly the two supplied textual replacements equals complete final HTML byte-for-byte after CRLF-to-LF normalization, same method as homepage-copy |
| Testimonial region | PASS; normalized section before/after SHA-256 both `6de6976e1a82863a4363e15ba0fb3128464f08ef69ce3cceffd188e560f24946` |
| Browser assertions | PASS; four before and four after captures, exact target identity/text, complete paragraph within viewport, animated Module content opacity >0.99 |

Preservation script: `node .agent-local/homepage-fingers/check.mjs`.
Its before snapshot equals the HTML at the exact branch base. Expected final
HTML is computed solely from two unique old fragments replaced with the supplied
new fragments; full-file equality protects testimonials and all other markup,
not just selected snippets. Evidence: `.agent-local/homepage-fingers/preservation.json`.
Scope/LOG checks before commit require exactly index.html, this handoff and
one appended LOG entry, leaving owner-managed plan files untouched.

Used existing installed dependencies, Node 24.12.0; no install/lockfile churn.
No unrelated module tests needed for two copy replacements.

## Render review

Contact sheet: `.agent-local/screens/homepage-fingers/index.html`.
Eight PNGs, all opened and visually inspected, actual production homepage:

- `before|after-desktop|phone-module-learn.png`
- `before|after-desktop|phone-corrections.png`

Desktop **1280x800**, phone **390x844**. Clean branch-base build captured before
the first product edit; final production build captured afterward. Both via
localhost:5183. Targeted scroll captures keep the exact affected paragraphs
readable with surrounding heading/card context. Normal fonts and animations,
no CSS overrides, injected content, synthetic scores or fake signs. Phone is
Chromium emulation, not physical-device evidence. Existing Shell account
fetches can be unavailable on the local preview; no account interaction used.

Local capture helper: `node .agent-local/homepage-fingers/capture.mjs before`
or `after`; metadata at `.agent-local/homepage-fingers/{before,after}-renders.json`.
Contact sheet generated with unchanged `tools/screens/contact-sheet.mjs`.
First browser attempt could not reach the sandboxed preview; stopped it and
restarted our preview outside the sandbox, then all captures passed. This was
an environment retry, no product workaround. No screenshots/scripts committed.

## Owner boundary / next action

Plan correction: directly assigned narrow hot-file exception from kvn on
18 Oct. Explicitly waited for integration/2026-10-18d to be in origin/main.
No BOARD.md/tasks.json/DECISIONS.md or prior handoff edits; testimonials remain
untouched under D-A34. No new UI/design decision inferred from passing gates.

kvn: review the desktop/phone contact sheet for adoption, then usual branch
review/merge/push/deploy. No manual code repair is needed to review the result.
No push, merge, deploy, purchase or messages by this agent. r26_port: no.

Commit message (as committed; final SHA in git log):
Qualify the remaining homepage finger feedback passages

- Use the two supplied timing and hand movement descriptions
- Preserve testimonials and all other HTML byte-for-byte
- Record passing Shell gates and desktop and phone comparisons
