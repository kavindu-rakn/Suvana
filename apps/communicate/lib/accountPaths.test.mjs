import assert from "node:assert/strict";
import test from "node:test";
import { accountLink, safeCallbackUrl } from "./accountPaths.ts";

test("accepts root-relative destinations, including module paths and queries", () => {
  for (const path of ["/", "/learn/", "/communicate/dashboard", "/learn/?sign=a#practice", "/?next=https://example.com"]) {
    assert.equal(safeCallbackUrl(path), path);
  }
  assert.equal(safeCallbackUrl("/a/../learn/"), "/learn/");
});

test("rejects external, ambiguous, malformed and missing destinations", () => {
  for (const value of [undefined, null, [], ["/learn/"], "", "learn/", "https://suvana.help/learn/",
    "https://evil.example", "//evil.example", "///evil.example", "javascript:alert(1)",
    "/\\evil.example", "/%5cevil.example", "/%2f%2fevil.example", "/\nevil.example", " /learn/", "/learn/\t", "/%broken"]) {
    assert.equal(safeCallbackUrl(value), "/", String(value));
  }
});

test("prevents signed-in account-page redirect loops after path normalization", () => {
  for (const path of ["/login", "/register/", "/communicate/login?callbackUrl=/learn/", "/x/../login", "/l%6fgin", "/register//"]) {
    assert.equal(safeCallbackUrl(path), "/");
  }
});

test("login/register links preserve a safe callback and stay at the origin root", () => {
  assert.equal(accountLink("login", "/learn/?x=1&y=2"), "/login?callbackUrl=%2Flearn%2F%3Fx%3D1%26y%3D2");
  assert.equal(accountLink("register", "//evil.example"), "/register?callbackUrl=%2F");
});
