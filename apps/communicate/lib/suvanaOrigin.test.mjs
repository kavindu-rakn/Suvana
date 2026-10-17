import assert from "node:assert/strict";
import test from "node:test";
import { isShellAccountRequest, suvanaOrigin } from "./suvanaOrigin.ts";

test("canonical account origin defaults to suvana.help and accepts an explicit origin", () => {
  const previous = process.env.SUVANA_ORIGIN;
  try {
    delete process.env.SUVANA_ORIGIN;
    assert.equal(suvanaOrigin(), "https://suvana.help");
    process.env.SUVANA_ORIGIN = "http://localhost:5185/";
    assert.equal(suvanaOrigin(), "http://localhost:5185");
    for (const invalid of ["https://example.com/path", "//example.com", "javascript:alert(1)", "https://user:pass@example.com", "https://example.com?x=1"]) {
      process.env.SUVANA_ORIGIN = invalid;
      assert.throws(suvanaOrigin);
    }
  } finally {
    if (previous === undefined) delete process.env.SUVANA_ORIGIN;
    else process.env.SUVANA_ORIGIN = previous;
  }
});

test("Host and x-forwarded-host alone never identify a Shell account request", () => {
  for (const host of ["suvana.help", "suvana-communicate.vercel.app", "preview.vercel.app"]) {
    const headers = new Headers({ host, "x-forwarded-host": host });
    assert.equal(isShellAccountRequest(headers), false);
    headers.set("x-suvana-account-origin", suvanaOrigin());
    assert.equal(isShellAccountRequest(headers), true);
    headers.set("x-suvana-account-origin", "https://suvana.help.evil.example");
    assert.equal(isShellAccountRequest(headers), false);
  }
});
