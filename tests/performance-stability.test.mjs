import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../docs/app.js", import.meta.url), "utf8");
const bundle = readFileSync(new URL("../apps-script/PerformanceBundle.gs", import.meta.url), "utf8");
const bundlePatch = readFileSync(new URL("../apps-script/PerformanceBundle.integration.patch", import.meta.url), "utf8");
const fortune = readFileSync(new URL("../apps-script/FortunePerformance.gs", import.meta.url), "utf8");
const fortunePatch = readFileSync(new URL("../apps-script/FortunePerformance.integration.patch", import.meta.url), "utf8");
const linePatch = readFileSync(new URL("../apps-script/LineResponsePerformance.integration.patch", import.meta.url), "utf8");

test("does not prefetch gacha while opening fortune or another customer route", () => {
  const startup = app.slice(app.indexOf("async function startTeamLinkApplication"), app.indexOf("async function initializeTeamLinkLiff"));
  assert.match(startup, /TEAM_LINK_GACHA_ROUTE_KEYS\.has\(initialView\)/);
  assert.doesNotMatch(startup, /syncProductionState\(\{ renderDuringSync: true, skipCatalog: true \}\)/);
});

test("does not redraw hidden fortune and gacha views during unrelated state updates", () => {
  const render = app.slice(app.indexOf("function renderApp()"), app.indexOf("function renderGachaCollectionViews"));
  assert.match(render, /if \(routeKey === "fortune"\) renderFortune\(\)/);
  assert.match(render, /TEAM_LINK_GACHA_ROUTE_KEYS\.has\(routeKey\)/);
  assert.doesNotMatch(render, /\n  renderFortune\(\);/);
});

test("ignores obsolete fortune promises after navigation or a newer render", () => {
  assert.match(app, /const renderSequence = \+\+teamFortuneRenderSequence/);
  assert.equal((app.match(/renderSequence !== teamFortuneRenderSequence/g) || []).length, 2);
});

test("deduplicates matching in-flight read requests", () => {
  assert.match(app, /const teamLinkApiInFlight = new Map\(\)/);
  assert.match(app, /teamLinkApiInFlight\.get\(dedupeKey\)/);
  assert.match(app, /teamLinkApiInFlight\.delete\(dedupeKey\)/);
});

test("gacha bundle reuses each sheet snapshot only inside the read-only bundle", () => {
  assert.match(bundle, /function getGachaBootstrap_/);
  assert.match(bundle, /withTeamLinkBundleReadCache_/);
  assert.match(bundle, /getGachaConfigMap_/);
  assert.match(bundle, /getDrawableGachaRewards_/);
  assert.doesNotMatch(bundle, /runExpiryUpdateInternal_/);
  assert.doesNotMatch(bundle, /getPublishedRewards_\(payload\)/);
  assert.doesNotMatch(bundle, /getUserCoupons_\(payload\)/);
  assert.match(bundlePatch, /case "getGachaBootstrap"/);
  assert.match(bundlePatch, /TEAM_LINK_BUNDLE_READ_CACHE_/);
});

test("fortune wrapper caches source sheets without replacing 24-type calculations", () => {
  assert.match(fortune, /resolveTeamFortuneUncached_\(payload\)/);
  assert.match(fortune, /getTeamFortuneCachedSheetObjects_/);
  assert.match(fortune, /CacheService\.getScriptCache\(\)/);
  assert.match(fortunePatch, /function resolveTeamFortuneUncached_/);
  assert.doesNotMatch(fortune, /classifyFortuneBaseStar_|lookupFortuneReigou_|getTeamFortuneTypeId_/);
});

test("LINE menu push happens before VisitReceptions and reuses loaded Members", () => {
  assert.match(linePatch, /nowValue, loadedMembers/);
  assert.match(linePatch, /Array\.isArray\(loadedMembers\)/);
  const push = linePatch.indexOf("sendLinkedMemberMenu_");
  const receptions = linePatch.indexOf('getSheetObjects_\(ss, "VisitReceptions"\)');
  assert.ok(push >= 0 && receptions > push);
});
