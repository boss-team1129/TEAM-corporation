import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../docs/app.js", import.meta.url), "utf8");
const html = readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");

test("uses the LIFF ID registered in LINE Developers", () => {
  assert.match(app, /const TEAM_LINK_LIFF_ID = "2011349129-0lFO8qFb";/);
  assert.doesNotMatch(app, /2011349129-0IFO8qFb/);
});

test("loads the official LIFF SDK before the application", () => {
  const sdkIndex = html.indexOf("https://static.line-scdn.net/liff/edge/2/sdk.js");
  const appIndex = html.indexOf("app.js?v=20260901-line-coupon-admin-1");
  assert.ok(sdkIndex >= 0);
  assert.ok(appIndex > sdkIndex);
});

test("waits for LIFF identity and customer data before opening a deep link", () => {
  const start = app.indexOf("async function startTeamLinkApplication()");
  const end = app.indexOf("async function initializeTeamLinkLiff()", start);
  const body = app.slice(start, end);
  const liffIndex = body.indexOf("await initializeTeamLinkLiff()");
  const dataIndex = body.indexOf("syncProductionState({ renderDuringSync: false");
  const viewIndex = body.indexOf("openInitialView(initialParams)", dataIndex);
  assert.ok(liffIndex >= 0);
  assert.ok(dataIndex > liffIndex);
  assert.ok(viewIndex > dataIndex);
});

test("reads LINE deep-link state only after liff.init resolves", () => {
  const start = app.indexOf("async function initializeTeamLinkLiff()");
  const end = app.indexOf("function waitForLiffSdk()", start);
  const body = app.slice(start, end);
  assert.ok(body.indexOf("withStartupTimeout(liff.init") >= 0);
  assert.ok(body.indexOf("getPostLiffSearchParams()") > body.indexOf("withStartupTimeout(liff.init"));
  assert.doesNotMatch(app, /rememberLiffLaunch|wasOpenedFromLiff|liff\.state|liff\.referrer/);
});

test("maps the four production page values after LIFF initialization", () => {
  assert.match(app, /home: "home"/);
  assert.match(app, /coupon: "coupons"/);
  assert.match(app, /gacha: "gacha"/);
  assert.match(app, /fortune: "fortune"/);
});

test("passes the authenticated LINE user id into customer catalog loading", () => {
  assert.match(app, /apiRequest\("getBookingCatalog", \{\s*memberId: userKey,\s*lineUserId: profile\.lineUserId \|\| ""/);
  assert.match(app, /lineUserIdPresent: Boolean\(lineProfile\?\.userId\)/);
});

test("never calls liff.login inside the LIFF browser", () => {
  const start = app.indexOf("if (!isLoggedIn) {");
  const end = app.indexOf("updateStartupStatus(\"LINEプロフィール取得中\"", start);
  const branch = app.slice(start, end);
  const inClientBranch = branch.slice(0, branch.indexOf("if (!isAdminRoute"));
  assert.doesNotMatch(inClientBranch, /liff\.login/);
  assert.match(branch, /if \(isInClient\) \{\s*throw createStartupError/);
});

test("provides visible diagnostics, timeout, and retry recovery", () => {
  assert.match(html, /id="startupStatus"/);
  assert.match(html, /id="startupDetails"/);
  assert.match(html, /id="startupRetryButton"/);
  assert.match(app, /const TEAM_LINK_STARTUP_TIMEOUT_MS = 10000;/);
  assert.match(app, /function showStartupFailure\(/);
});

test("shows LINE official coupons without requiring an optional lin.ee share URL", () => {
  assert.match(app, /\.filter\(\(coupon\) => !coupon\.lineCouponUrl \|\| isSafeLineCouponUrl\(coupon\.lineCouponUrl\)\)/);
});

test("hides diagnostic JSON in production", () => {
  assert.match(app, /const TEAM_LINK_LIFF_DEBUG = false;/);
  assert.match(app, /if \(details && TEAM_LINK_LIFF_DEBUG\)/);
  assert.match(html, /id="startupStatus"[^>]*hidden/);
  assert.match(html, /id="startupDetails"[^>]*hidden/);
});
