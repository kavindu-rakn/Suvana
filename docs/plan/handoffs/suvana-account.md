# Suvana account at the front door (D-A32, D-A33)
started 2026-10-18T03:07:29+05:30 by codex

Branch: agent/codex/suvana-account, restarted from origin/main
83a52001acd6174efe23c1ade1833cf179d228f5, including D-A32 and D-A33.
Status: review (wording/adoption and production checks remain kvn's gates).
Authorization: kvn's 18 Oct chat replaces all previous account briefs and
authorizes apps/shell/vercel.json, apps/shell/index.html and
tools/sync/upstreams.json. Auth.js, User and MongoDB remain in Communicate.
The superseded unfinished attempt is preserved in stash@{0} (named
Preserve superseded suvana-account attempt before restart on 83a5200).
r26_port: yes; Learn source/tests only. Never edit the R26 repository.

## Handoff 2026-10-18 03:24 - codex

Base remains current origin/main 83a5200 after a final fetch. No stacking.
This is a fresh implementation on that base, reusing reviewed form/callback
pieces from the preserved attempt and rebuilding host routing from evidence.
Board/tasks/decisions are untouched. The previous generated-report changes
also remain recoverable in the stash; this task's generated reports were
restored and are excluded from the commit.

## Behavior and changed files

- apps/shell/vercel.json: root /login and /register rewrite to two HTML-only
  Edge entry points, api/login.ts and api/register.ts, before module wildcards.
  /communicate/login and /communicate/register permanently redirect to their
  root equivalents. Direct /api/login and /api/register aliases redirect too.
  The first redirect is a 308 for only host suvana-shell.vercel.app, preserving
  the path on https://suvana.help. Existing module rewrites remain unchanged.
- apps/shell/src/accountProxy.ts: those two entry points call this helper.
  It fetches Communicate's existing /communicate/login or /register page,
  forwards query/cookies and relevant Next request headers, supplies an
  explicit routing marker, preserves redirects without following them, streams
  HTML and sets no-store. Only GET/HEAD are accepted. It never handles a
  password submission, an auth API, registration write or database connection.
  accountProxy.test.ts and accountRouting.test.ts cover the boundary/config.
- Communicate lib/accountPage.ts, accountPaths.ts and suvanaOrigin.ts:
  server-side entry gate, safe callback helper and non-secret configured
  origin. Direct visits without the Shell marker go to canonical /login or
  /register with all query values retained. A signed-in visitor goes to a safe
  callback (default /) before the form is rendered. Absolute URLs, // URLs,
  backslashes/control characters and account-page loops are rejected.
- Communicate app/login/{page.tsx,LoginForm.tsx} and
  app/register/{page.tsx,RegisterForm.tsx}: shared Suvana metadata/copy;
  safe callback passed from server to form, retained across account links and
  after sign-in or sign-up. Successful registration still auto-signs in.
  Plain anchors and full browser navigation avoid Next adding /communicate.
- Communicate lib/auth.config.ts: pages.signIn is /login; protected-route
  redirects carry a relative callback to the root account address. Existing
  JWT, roles, credentials provider, User and MongoDB behavior remain in place.
  app/admin/page.tsx changes only the unauthenticated account destination.
- Communicate components/Navbar.tsx and auth/AccountLinks.tsx: homepage brand
  link and root account links; callbacks retain the current module path/query.
  Home HeroSection.tsx and CTASection.tsx also use root registration links.
- Communicate next.config.ts: exact unprefixed /login and /register aliases
  on the direct Communicate production host redirect to SUVANA_ORIGIN, with
  basePath:false. This also makes its own root anchors reach the canonical
  account pages. These aliases do not match module/API/static paths.
- Communicate auth/AuthShell.tsx and accountCopy.ts: two rendered options;
  both say the account is shared by Learn, Communicate and Recognize, and
  Alerts needs no account. Account pages have no emotion-detection claim.
- apps/shell/index.html: Start Now points to root /register with return /;
  both landing emotion claims are replaced with speech-to-text wording.
  src/main.ts signed-out account links also use /login and /register.
- Learn src/app/session.ts: root /login?callbackUrl=%2Flearn%2F; identity
  fetch remains gated by VITE_SUVANA. session.test.ts and platform.test.ts
  check the link and standalone inactivity. No account requirement added.
- tools/sync/upstreams.json: every modified upstream Communicate file has
  a Suvana-only coupling reason; new helpers/components/tests are declared
  suvanaOnly. Guards preserve routing, callback validation, copy and links.
  Shell proxy/config have root guards. No upstream revision was recorded.

## Header evidence and the extra Shell HTML proxy

Do not distinguish these requests by Host or x-forwarded-host alone.

1. Vercel documents x-forwarded-host as identical to Host at its deployment
   runtime: https://vercel.com/docs/headers/request-headers . Its external
   rewrite documentation does not promise preservation of the public Shell
   hostname in those fields: https://vercel.com/docs/routing/rewrites .
2. Read-only public production requests on this run to
   https://suvana.help/communicate/api/auth/providers and
   https://suvana-communicate.vercel.app/communicate/api/auth/providers both
   returned 200 and the identical credentials signinUrl:
   https://suvana-communicate.vercel.app/api/auth/signin/credentials . Their
   callbackUrl values also both used the Communicate hostname.
3. Installed @auth/core/lib/utils/env.js createActionURL prefers AUTH_URL /
   NEXTAUTH_URL, else x-forwarded-host, then Host. The provider response is
   corroborating public-origin evidence, NOT a raw incoming-header dump.
   No deployed diagnostic endpoint or raw production-header measurement was
   available, and none was deployed. A Host-only classifier would be a guess.
4. Therefore the Shell's two narrow HTML proxy handlers explicitly SET
   x-suvana-account-origin to the configured canonical origin, overriding any
   incoming marker. Communicate checks that exact marker. Ordinary direct
   browser navigation does not carry it and is redirected. This marker is
   non-secret routing metadata, NOT an authentication or authorization check;
   a custom HTTP client can set it. Auth.js still authenticates every session.
5. Local production-build integration tests prove marked requests serve the
   forms, unmarked requests redirect, cookies reach server auth, signed-in
   redirects are preserved, and APIs/static assets are not redirected. Hosted
   delivery of the new custom header and Vercel routing still need the checks
   below. This small proxy avoids relying on an unverified platform header.

SUVANA_ORIGIN defaults to https://suvana.help in both the Shell proxy and
Communicate. No secret or new env setting is needed for that default. If kvn
changes the origin, set the same non-secret value on BOTH projects and rebuild.
The canonical legacy-Shell host redirect remains fixed to suvana.help as asked.

Next documents query preservation and basePath:false redirects here:
https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects .
The Shell's Vercel routing itself has not been executed on hosted infrastructure.

## Gates and their limits

- Node 24.12.0, npm 10.9.9 clean installs for Shell and Learn; no package or
  lockfile changes. Existing audit output: Shell one high; Learn two moderate
  and three high. No dependency remediation in this task. Existing Lenis
  deprecation remains.
- Callback/origin unit tests: 6 passed using node --test on the two new .mjs
  files. Node emits a module-type inference warning; no package edits needed.
- Communicate npm run lint: passed, no diagnostics. NEXT_PUBLIC_BASE_PATH set
  to /communicate, npm run build: passed, including TypeScript and page data.
  A and B were both built for production renders; final source/build is A.
- Shell npm ci, npm test: 52 passed in four files. npm run build including
  typecheck: passed; main 644.60 kB / 180.48 kB gzip. Existing >500 kB warning.
- Learn npm ci, npm run lint: passed, no diagnostics; npm test: 350 passed,
  7 skipped across 57 files. npm run build: passed, main 155.11 kB gzip.
- Standalone Learn built with suvana.config.json physically absent, into
  ignored .agent-local/suvana-account-standalone-dist. Config restored in a
  finally block, byte-preserved and absent from the diff. Main 154.64 kB gzip.
  Browser checks at 1280x800 and 390x844 before/after entering Learn: zero
  account buttons, zero sign-in links, zero /communicate or /login requests,
  no page errors. Only this Suvana checkout was used; R26 was never edited.
- Brand check: passed, 132 tracked source files after staging new files.
- Sync guard: 212 passed after staging all guarded files. Diff check passed.
- Local production server tests: 16 entry/session/API cases passed, including
  both direct pages with duplicate query values, both proxied signed-out
  pages, signed-in callbacks/defaults/rejected destinations and protected
  dashboard return. Extra checks: two direct-host root aliases return 308,
  direct static asset returns 200. These use a synthetic locally minted JWT.
- Two browser submission cases passed: login and registration retain the
  callback while switching forms and navigate to /learn/?return=fixture on
  success. Auth.js and registration responses were mocked; synthetic inputs
  were used. No account created; no MongoDB or production writes performed.
- Local harness pitfalls corrected: development HMR was not forwarded, so
  form tests were repeated against the production build and hydration was
  verified. Host-rule tests use Node HTTP because fetch ignored its custom
  Host header. Scroll-reveal screenshots were retaken after animation settled.

Local test/evidence helpers (ignored): .agent-local/account-restart-check.mjs,
account-alias-check.mjs, account-client-check.mjs, account-gateway.mjs,
learn-account-standalone-build.mjs and standalone-account-check.mjs.
Result JSONs are alongside the screenshots, named restart-*-check.json plus
standalone-check.json. The local gateway invokes the actual production HTML
proxy helper with only upstream addresses changed to local servers.

## Renders and wording decision

Review sheet (22 images, all ignored/uncommitted):
C:/Users/User/Documents/Suvana-wt/codex/.agent-local/screens/suvana-account/restart-review.html

- Before at 83a5200: login/register signed out, 1280x800 and 390x844. These
  forms still had the Communicate hero and dashboard-focused copy.
- After A and B: root login/register signed out, both sizes, production build.
  Captures have 200 responses, no page errors or horizontal overflow.
- Both changed Shell sections (Communicate module and speech pipeline): exact
  83a5200 source before, current source after, both sizes. Retaken after scroll
  reveals settled. The rest of the visible pipeline remains unchanged.
- Two standalone Learn captures support the config-free browser checks.
- Desktop/phone samples of both forms/options and both Shell sections were
  visually inspected; no clipped form controls or hidden changed copy.

Option A: One account. All of Suvana. / Sign in to Suvana /
Create your Suvana account.
Option B: Welcome to Suvana. / Welcome back / Join Suvana.
A is the branch's review default, not owner adoption. Both option definitions
are committed; selecting B is the one-line accountCopyOptions.B export change.
No runtime wording switch or public preview flag was added.

## Production checklist for kvn after review, merge and deployment

1. https://suvana-shell.vercel.app/learn/?sign=example returns 308 to the same
   path/query at https://suvana.help . Check /, /login and /register too.
   suvana.help and preview hosts must not match this legacy-host redirect.
2. Direct https://suvana-communicate.vercel.app/communicate/login?callbackUrl=%2Flearn%2F
   goes to https://suvana.help/login with the callback retained. Repeat for
   /communicate/register and root /login and /register aliases.
3. https://suvana.help/login and /register serve the account forms while
   signed out, without a loop. /communicate/login and /communicate/register
   on suvana.help redirect to the root pages, keeping query strings.
4. Start sign-in from Shell (return /), Learn (return /learn/) and Communicate
   (current module path/query). Sign in at suvana.help/login and confirm the
   original destination. Repeat sign-up and auto sign-in using an owner test
   account. Verify the form-switch link retains the callback.
5. Signed-in visits to /login and /register immediately redirect server-side;
   a safe callback reaches that path, missing/absolute/// callbacks reach /.
6. https://suvana.help/learn/ and /communicate still load. Check the actual
   HTML-referenced JS/CSS, Learn assets and /communicate/api/auth/session
   (200 JSON, session on the canonical host). Direct Communicate API and
   /communicate/_next assets must never receive account redirects.
7. https://suvana.help/alerts/ remains account-free. Check /api/login and
   /api/register on the Shell redirect to the public root pages rather than
   exposing a second visible form URL. Re-run the smoke script against
   https://suvana.help; extensionless information-page warnings are unchanged.
8. Only after the hosted checks pass can kvn accurately complete the Google
   review request. This branch does not establish the Safe Browsing flag is
   cleared; its reported cause/status came from kvn, not a live console audit.

Needs kvn: choose/adopt wording from the renders, review/merge/push and allow
deployment, then perform the production checklist and later Learn mirror.
No push, merge, deploy, account changes, purchase or external messages made.
Plan correction: direct chat assigns the account task and authorizes its hot
files; no plan correction beyond recording that authorization is needed.
SSL content touched: none. Research/accuracy figures touched: none.

Commit message (as committed):
Put Suvana account pages at the canonical homepage

- Serve root account pages through a marked HTML-only Shell proxy
- Keep safe return paths and redirect signed-in or direct-host visitors
- Update platform copy and preserve standalone Learn account inactivity
- Declare upstream couplings and record gates, renders and hosted checks
