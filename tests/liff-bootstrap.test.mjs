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
  const appIndex = html.indexOf("app.js?v=20260831-liff-1");
  assert.ok(sdkIndex >= 0);
  assert.ok(appIndex > sdkIndex);
});

test("waits for LIFF identity and customer data before opening a deep link", () => {
  const start = app.indexOf("async function startTeamLinkApplication()");
  const end = app.indexOf("async function initializeTeamLinkLiff()", start);
  const body = app.slice(start, end);
  const liffIndex = body.indexOf("await initializeTeamLinkLiff()");
  const dataIndex = body.indexOf("await syncProductionState");
  const viewIndex = body.indexOf("openInitialView(initialParams)", dataIndex);
  assert.ok(liffIndex >= 0);
  assert.ok(dataIndex > liffIndex);
  assert.ok(viewIndex > dataIndex);
});

test("reads LINE deep-link state only after liff.init resolves", () => {
  const start = app.indexOf("async function initializeTeamLinkLiff()");
  const end = app.indexOf("function rememberLiffLaunch()", start);
  const body = app.slice(start, end);
  assert.ok(body.indexOf("await liff.init") >= 0);
  assert.ok(body.indexOf("getPostLiffSearchParams()") > body.indexOf("await liff.init"));
  assert.match(app, /const LINE_DEEP_LINK_PAGES = new Set\(\["coupons", "gacha", "fortune"\]\)/);
});

test("passes the authenticated LINE user id into customer catalog loading", () => {
  assert.match(app, /apiRequest\("getBookingCatalog", \{\s*memberId: userKey,\s*lineUserId: profile\.lineUserId \|\| ""/);
  assert.match(app, /lineUserIdPresent: Boolean\(lineProfile\?\.userId\)/);
});
