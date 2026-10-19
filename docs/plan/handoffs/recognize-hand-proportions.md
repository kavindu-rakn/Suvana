# Recognize hand proportions
started 2026-10-19 by Codex
Branch: codex/recognize-card-animation, follow-up to 7d82afd.
User request: the approved hand concept looks short; lengthen its proportions.
Scope: Shell card SVG and height, this handoff, append-only LOG.

## Handoff
Status: review
- Lengthened finger paths and palm, moved the thumb tracking point with its outline, and increased SVG height from 112px to 140px with a matching 24x30 viewBox. Width stays 112px; circles stay round.
- Retained centred placement, colours and staggered tracking-point animation. Generic decorative icon; no SSL content or figures changed.
- Gates: 157 Shell tests passed; typecheck/build passed; 255 sync guards passed; diff check passed. Existing bundle-size advisory remains. Clean npm ci was not repeated because the preceding increment established a live-preview Windows native-binary lock; dependencies were restored then and current tests/build pass.
- Browser: desktop 1280x800 and phone 390x844 in light/dark themes; five active point animations; distinct transforms verified at known 0ms/840ms pulse phases; reduced motion stops all five. Initial time-based sampling landed in the pulse's intentional rest interval, so the local check now samples known phases.
- Screenshots: .agent-local/screens/recognize-hand-proportions/index.html. Before is the previous committed artwork; after is this proportion adjustment. Existing page-wide phone overflow flag remains unrelated.
- Plan correction: direct user-requested refinement of the same Shell task. r26_port: no.
- Needs kvn: visual adoption; merge/push/deploy remain manual.

Commit message:
Lengthen the Recognize hand illustration

- Give the hand longer fingers and palm while retaining its compact width
- Keep tracking points aligned and verify both themes and reduced motion
