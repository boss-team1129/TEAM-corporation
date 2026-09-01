import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("../apps-script/LineCouponOpenUrlResolver.gs", import.meta.url), "utf8");

function createResolver({ status = 301, location = "", fetchError = null } = {}) {
  const cacheValues = new Map();
  const CacheService = {
    getScriptCache: () => ({
      get: (key) => cacheValues.get(key) || null,
      put: (key, value) => cacheValues.set(key, value)
    })
  };
  const UrlFetchApp = {
    fetch: () => {
      if (fetchError) throw fetchError;
      return {
        getResponseCode: () => status,
        getAllHeaders: () => ({ Location: location })
      };
    }
  };
  const Utilities = {
    DigestAlgorithm: { SHA_256: "SHA_256" },
    Charset: { UTF_8: "UTF_8" },
    computeDigest: (_algorithm, value) => Array.from(Buffer.from(value)).slice(0, 32),
    base64EncodeWebSafe: (bytes) => Buffer.from(bytes).toString("base64url")
  };
  const console = { warn: () => {} };
  return new Function("CacheService", "UrlFetchApp", "Utilities", "console", `${source}; return resolveLineCouponOpenUrl_;`)(
    CacheService,
    UrlFetchApp,
    Utilities,
    console
  );
}

test("returns a verified liff.line.me redirect", () => {
  const resolve = createResolver({
    status: 301,
    location: "https://liff.line.me/1654883387-DxN9w07M/c/COUPON-1"
  });
  const result = resolve({ lineCouponUrl: "https://lin.ee/ubnjBYO" });
  assert.equal(result.success, true);
  assert.equal(result.resolutionStatus, "resolved");
  assert.equal(result.resolvedUrl, "https://liff.line.me/1654883387-DxN9w07M/c/COUPON-1");
});

test("rejects non-liff redirect destinations and preserves the lin.ee fallback", () => {
  const resolve = createResolver({ status: 301, location: "https://example.com/not-line" });
  const result = resolve({ lineCouponUrl: "https://lin.ee/ubnjBYO" });
  assert.equal(result.resolvedUrl, "");
  assert.equal(result.fallbackUrl, "https://lin.ee/ubnjBYO");
  assert.equal(result.resolutionStatus, "unverified_redirect");
});

test("does not fetch arbitrary URLs", () => {
  const resolve = createResolver();
  const result = resolve({ lineCouponUrl: "https://example.com/coupon" });
  assert.equal(result.resolvedUrl, "");
  assert.equal(result.resolutionStatus, "invalid_source");
});

test("falls back safely when redirect lookup fails", () => {
  const resolve = createResolver({ fetchError: new Error("network") });
  const result = resolve({ lineCouponUrl: "https://lin.ee/ubnjBYO" });
  assert.equal(result.success, true);
  assert.equal(result.resolvedUrl, "");
  assert.equal(result.resolutionStatus, "fetch_failed");
});
