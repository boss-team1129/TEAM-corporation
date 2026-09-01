import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../docs/app.js", import.meta.url), "utf8");

test("requests the current month explicitly for gacha config and rewards", () => {
  assert.match(app, /apiRequest\("getGachaConfig", \{ targetYearMonth: currentGachaMonth \}\)/);
  assert.match(app, /apiRequest\("getPublishedRewards", \{ targetYearMonth: currentGachaMonth \}\)/);
  assert.match(app, /apiRequest\("checkMonthlyDrawStatus", \{[^}]*targetYearMonth: currentGachaMonth/);
});

test("names every gacha startup API when a partial sync fails", () => {
  assert.match(app, /productionSyncRequests = \[/);
  for (const action of [
    "getGachaConfig",
    "getPublishedRewards",
    "getUserCoupons",
    "checkMonthlyDrawStatus",
    "getUserBinder",
    "getPastBinderHistory",
    "getCollectionRewards"
  ]) {
    assert.match(app, new RegExp(`action: "${action}"`));
  }
  assert.match(app, /\[TEAM LINK API PARTIAL SYNC FAILED\][\s\S]*action: productionSyncRequests\[index\]\?\.action/);
});

test("preserves HTTP and response details on API business errors", () => {
  assert.match(app, /error\.httpStatus = response\.status;/);
  assert.match(app, /error\.responseBody = text\.slice\(0, 500\);/);
  assert.match(app, /error\.requestUrl = response\.url \|\| apiUrl;/);
  assert.match(app, /\[TEAM LINK GACHA DRAW FAILED\][\s\S]*httpStatus: error\?\.httpStatus/);
});

test("reports a missing monthly reward as preparation, not a transport failure", () => {
  const start = app.indexOf("function getGachaDrawErrorMessage(");
  const end = app.indexOf("function mapServerGachaDrawToLocal(", start);
  const factory = new Function(`${app.slice(start, end)}; return getGachaDrawErrorMessage;`);
  const messageFor = factory();
  assert.equal(messageFor({ errorCode: "NO_REWARD", message: "抽選できる景品がありません" }), "今月のガチャは準備中です。");
  assert.equal(messageFor({ errorCode: "NETWORK", message: "Failed to fetch" }), "通信に失敗しました。時間をおいてもう一度お試しください");
});
