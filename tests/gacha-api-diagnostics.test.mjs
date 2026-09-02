import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../docs/app.js", import.meta.url), "utf8");

test("loads the current gacha state through one bootstrap request", () => {
  assert.match(app, /apiRequest\("getGachaBootstrap", payload\)/);
  assert.match(app, /targetYearMonth: currentMonthKey\(\)/);
  assert.match(app, /applyProductionGachaBootstrap\(result\.data \|\| result, userKey\)/);
});

test("reports the single bootstrap action when gacha startup fails", () => {
  assert.match(app, /\[TEAM LINK GACHA BOOTSTRAP FAILED\]/);
  assert.match(app, /action: "getGachaBootstrap"/);
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
