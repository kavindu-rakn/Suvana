#!/usr/bin/env node
/**
 * tools/smoke/smoke.mjs
 * Production and staging deployment smoke checker for Suvana.
 *
 * Implements the verification steps defined in docs/plan/06-deploy.md section 4.
 *
 * Usage:
 *   node tools/smoke/smoke.mjs <base-url> [options]
 *
 * Options:
 *   --recognize-url <url>        URL of hosted Recognize service (checks /api/info)
 *   --standalone-learn-url <url> URL of standalone suvana-learn (checks / -> /learn/ redirect)
 *   --require-legal              Fail if /privacy, /terms, etc. return 404 (defaults to warning before I-06)
 *   --strict                     Treat warnings as errors
 *   --timeout <ms>               Per-request timeout in milliseconds (default: 10000)
 *   --help, -h                   Show this help message
 *
 * Exit codes:
 *   0: All required checks passed
 *   1: One or more checks failed
 */

const args = process.argv.slice(2);

function printHelp() {
  console.log(`
Suvana Deployment Smoke Checker (06-deploy.md section 4)

Usage:
  node tools/smoke/smoke.mjs <base-url> [options]

Arguments:
  <base-url>                   Root URL of deployment (e.g. https://suvana-shell.vercel.app or https://suvana.help)

Options:
  --recognize-url <url>        Origin of the Recognize service (e.g. https://recognize.suvana.help)
  --standalone-learn-url <url> URL of standalone suvana-learn deployment (checks root redirect to /learn/)
  --require-legal              Enforce that legal pages (/privacy, /terms, /contact, /pricing) return 200 (I-06)
  --strict                     Treat warnings as failures
  --timeout <ms>               Request timeout in ms (default: 10000)
  --help, -h                   Show this help message

Examples:
  node tools/smoke/smoke.mjs https://suvana-shell.vercel.app
  node tools/smoke/smoke.mjs https://suvana.help --recognize-url https://recognize.suvana.help
  node tools/smoke/smoke.mjs http://localhost:5173
`);
}

let rawBaseUrl = null;
let recognizeUrl = process.env.RECOGNIZE_URL || null;
let standaloneLearnUrl = null;
let requireLegal = false;
let strictMode = false;
let timeoutMs = 10000;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--help" || arg === "-h") {
    printHelp();
    process.exit(0);
  } else if (arg === "--recognize-url") {
    recognizeUrl = args[++i] || null;
  } else if (arg === "--standalone-learn-url") {
    standaloneLearnUrl = args[++i] || null;
  } else if (arg === "--require-legal") {
    requireLegal = true;
  } else if (arg === "--strict") {
    strictMode = true;
  } else if (arg === "--timeout") {
    timeoutMs = parseInt(args[++i], 10) || 10000;
  } else if (!arg.startsWith("-") && !rawBaseUrl) {
    rawBaseUrl = arg;
  }
}

if (!rawBaseUrl) {
  console.error("Error: <base-url> argument is required.\n");
  printHelp();
  process.exit(1);
}

const baseUrl = rawBaseUrl.replace(/\/+$/, "");

let passedCount = 0;
let failedCount = 0;
let warningCount = 0;
let skippedCount = 0;

function logPass(title, details = "") {
  passedCount++;
  console.log(`  ✓ PASS: ${title}${details ? ` (${details})` : ""}`);
}

function logFail(title, details = "") {
  failedCount++;
  console.error(`  ✗ FAIL: ${title}${details ? ` - ${details}` : ""}`);
}

function logWarn(title, details = "") {
  warningCount++;
  console.warn(`  ⚠ WARN: ${title}${details ? ` - ${details}` : ""}`);
}

function logSkip(title, reason = "") {
  skippedCount++;
  console.log(`  ○ SKIP: ${title}${reason ? ` (${reason})` : ""}`);
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

async function runCheck(name, fn) {
  try {
    await fn();
  } catch (err) {
    logFail(name, err.message);
  }
}

async function main() {
  console.log(`\n============================================================`);
  console.log(`Suvana Deployment Smoke Check`);
  console.log(`Target Base URL: ${baseUrl}`);
  if (recognizeUrl) console.log(`Recognize URL:   ${recognizeUrl}`);
  if (standaloneLearnUrl) console.log(`Standalone Learn: ${standaloneLearnUrl}`);
  console.log(`============================================================\n`);

  // 1. GET / - 200, landing title contains "Suvana"
  console.log("Check 1: Shell Landing (GET /)");
  await runCheck("Shell Landing (GET /)", async () => {
    const res = await fetchWithTimeout(`${baseUrl}/`);
    if (res.status !== 200) {
      logFail("Landing status code", `Expected 200, got ${res.status}`);
      return;
    }
    const html = await res.text();
    const hasTitle = /<title>[^<]*Suvana[^<]*<\/title>/i.test(html) || html.includes("Suvana");
    if (!hasTitle) {
      logFail("Landing title/brand", "Page does not contain 'Suvana'");
    } else {
      logPass("Landing status and brand", `200 OK, title verified`);
    }
  });

  // 2. GET /learn/ - 200, HTML references only /learn/assets/...
  console.log("\nCheck 2: Learn SPA Entry (GET /learn/)");
  await runCheck("Learn Entry (GET /learn/)", async () => {
    const res = await fetchWithTimeout(`${baseUrl}/learn/`);
    if (res.status !== 200) {
      logFail("Learn entry status code", `Expected 200, got ${res.status}`);
      return;
    }
    const html = await res.text();
    const hasLearnAssets = html.includes("/learn/assets/") || html.includes("./assets/");
    const hasUnprefixedRootAssets = / (?:src|href)=["']\/assets\//i.test(html);

    if (hasUnprefixedRootAssets) {
      logFail("Asset base paths", "Found un-prefixed '/assets/' reference (expected '/learn/assets/')");
    } else if (hasLearnAssets) {
      logPass("Learn entry and asset prefixes", "200 OK, assets properly prefixed under /learn/");
    } else {
      logPass("Learn entry status", "200 OK");
    }
  });

  // 3. Learn runtime assets & cache headers (not immutable)
  console.log("\nCheck 3: Learn Runtime Assets & Cache Headers");
  const assetPaths = [
    "/learn/reference-index.json",
    "/learn/references/kaggle_100.json",
    "/learn/wasm/vision_wasm_internal.wasm",
    "/learn/models/hand_landmarker.task",
  ];

  for (const assetPath of assetPaths) {
    await runCheck(`Asset ${assetPath}`, async () => {
      const res = await fetchWithTimeout(`${baseUrl}${assetPath}`);
      if (res.status !== 200) {
        logFail(`Fetch ${assetPath}`, `Expected 200, got ${res.status}`);
        return;
      }
      const cacheControl = res.headers.get("cache-control") || "";
      if (cacheControl.toLowerCase().includes("immutable")) {
        logFail(`Cache headers for ${assetPath}`, `Header contains forbidden 'immutable': "${cacheControl}"`);
      } else {
        logPass(`Asset ${assetPath}`, `200 OK, Cache-Control: "${cacheControl || 'none'}"`);
      }
    });
  }

  // 4. GET /communicate - 200, /communicate/api/auth/session - 200 JSON
  console.log("\nCheck 4: Communicate App & Auth Session");
  await runCheck("Communicate Entry (GET /communicate)", async () => {
    const res = await fetchWithTimeout(`${baseUrl}/communicate`);
    if (res.status !== 200) {
      logFail("Communicate entry status", `Expected 200, got ${res.status}`);
    } else {
      logPass("Communicate entry (GET /communicate)", "200 OK");
    }
  });

  await runCheck("Communicate Auth Session (GET /communicate/api/auth/session)", async () => {
    const res = await fetchWithTimeout(`${baseUrl}/communicate/api/auth/session`);
    if (res.status !== 200) {
      logFail("Auth session endpoint status", `Expected 200, got ${res.status}`);
      return;
    }
    const contentType = res.headers.get("content-type") || "";
    try {
      const data = await res.json();
      logPass("Auth session endpoint", `200 OK, valid JSON (${contentType})`);
    } catch (err) {
      logFail("Auth session body", `Failed to parse JSON body: ${err.message}`);
    }
  });

  // 5. GET /alerts/ (200), legal pages (/privacy, /terms, /contact, /pricing)
  console.log("\nCheck 5: Alerts & Legal Pages");
  await runCheck("Alerts Entry (GET /alerts/)", async () => {
    const res = await fetchWithTimeout(`${baseUrl}/alerts/`);
    if (res.status !== 200) {
      logFail("Alerts entry status", `Expected 200, got ${res.status}`);
    } else {
      logPass("Alerts entry (GET /alerts/)", "200 OK");
    }
  });

  const legalPages = ["/privacy", "/terms", "/contact", "/pricing"];
  for (const page of legalPages) {
    await runCheck(`Legal page ${page}`, async () => {
      const res = await fetchWithTimeout(`${baseUrl}${page}`);
      if (res.status === 200) {
        logPass(`Legal page ${page}`, "200 OK");
      } else if (res.status === 404) {
        if (requireLegal) {
          logFail(`Legal page ${page}`, "404 Not Found (required by --require-legal)");
        } else {
          logWarn(`Legal page ${page}`, "404 Not Found (scheduled for I-06 on 18 Oct)");
        }
      } else {
        logFail(`Legal page ${page}`, `Unexpected status: ${res.status}`);
      }
    });
  }

  // 6. Standalone redirect check (https://suvana-learn.vercel.app/ -> /learn/)
  console.log("\nCheck 6: Standalone Learn Root Redirect");
  const checkStandaloneUrl = standaloneLearnUrl || (baseUrl.includes("suvana-learn.vercel.app") ? baseUrl : null);
  if (checkStandaloneUrl) {
    await runCheck("Standalone Learn Redirect (GET /)", async () => {
      const targetUrl = checkStandaloneUrl.replace(/\/+$/, "");
      const res = await fetchWithTimeout(`${targetUrl}/`, { redirect: "manual" });
      const location = res.headers.get("location") || "";
      if ([301, 302, 307, 308].includes(res.status) && location.includes("/learn/")) {
        logPass("Standalone root redirect", `${res.status} redirect -> ${location}`);
      } else if (res.status === 200 && res.url.includes("/learn/")) {
        logPass("Standalone root redirect", `Redirect followed to ${res.url}`);
      } else {
        logFail("Standalone root redirect", `Expected redirect to /learn/, got status ${res.status}, location: "${location}"`);
      }
    });
  } else {
    logSkip("Standalone Learn Redirect", "Specify --standalone-learn-url <url> to verify root redirect to /learn/");
  }

  // 7. Recognize service check (GET <recognize>/api/info with numClasses: 171)
  console.log("\nCheck 7: Recognize Service (/api/info)");
  if (recognizeUrl) {
    await runCheck("Recognize Service (/api/info)", async () => {
      const recBase = recognizeUrl.replace(/\/+$/, "");
      const res = await fetchWithTimeout(`${recBase}/api/info`);
      if (res.status !== 200) {
        logFail("Recognize /api/info status", `Expected 200, got ${res.status}`);
        return;
      }
      const data = await res.json().catch(() => null);
      if (!data || typeof data !== "object") {
        logFail("Recognize /api/info body", "Did not return JSON object");
      } else if (data.numClasses !== 171 && data.count !== 171) {
        logFail("Recognize numClasses", `Expected 171 classes, got ${data.numClasses ?? data.count}`);
      } else {
        logPass("Recognize /api/info", `200 OK, numClasses = ${data.numClasses ?? data.count}`);
      }
    });
  } else {
    logSkip("Recognize Service", "Specify --recognize-url <url> (or set RECOGNIZE_URL) to verify Recognize container");
  }

  // Summary
  console.log("\n============================================================");
  console.log("Smoke Test Summary:");
  console.log(`  Passed:  ${passedCount}`);
  console.log(`  Failed:  ${failedCount}`);
  console.log(`  Warnings: ${warningCount}`);
  console.log(`  Skipped: ${skippedCount}`);
  console.log("============================================================\n");

  const effectiveFailures = failedCount + (strictMode ? warningCount : 0);

  if (effectiveFailures > 0) {
    console.error(`Smoke check FAILED with ${effectiveFailures} issue(s).\n`);
    process.exit(1);
  } else {
    console.log("All smoke checks PASSED successfully.\n");
    process.exit(0);
  }
}

main().catch((err) => {
  console.error("Fatal error during smoke test:", err);
  process.exit(1);
});
