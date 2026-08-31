import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const app = fs.readFileSync(new URL("../docs/app.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../docs/index.html", import.meta.url), "utf8");

test("accepts only the official lin.ee HTTPS host", () => {
  assert.match(app, /url\.protocol === "https:" && url\.hostname === "lin\.ee"/);
});

test("keeps coupon usage history separate from LINE coupon URL management", () => {
  assert.match(app, /\{ key: "coupons", label: "クーポン使用履歴" \}/);
  assert.match(app, /\{ key: "lineCoupons", label: "LINEクーポン管理" \}/);
  const usageStart = app.indexOf("function renderAdminCoupons()");
  const lineStart = app.indexOf("function renderAdminLineCoupons()", usageStart);
  const usageBody = app.slice(usageStart, lineStart);
  assert.doesNotMatch(usageBody, /data-line-coupon-url/);
  assert.match(app.slice(lineStart), /LINE公式クーポン一覧/);
});

test("renders one URL setting keyed by couponId with expiry and registration state", () => {
  assert.match(app, /data-admin-action="saveLineCouponUrl" data-id="\$\{escapeHtml\(coupon\.couponId\)\}"/);
  assert.match(app, /couponId: \$\{escapeHtml\(coupon\.couponId\)\}/);
  assert.match(app, /有効期限：\$\{escapeHtml/);
  assert.match(app, /URL登録済み/);
});

test("persists the URL through the existing coupon master API", () => {
  assert.match(app, /apiRequest\("updateCouponMaster", \{/);
  assert.match(app, /couponId: coupon\.couponId,[\s\S]*lineCouponUrl,/);
});

test("retains a saved URL when a later LINE sync returns an empty URL", () => {
  assert.match(app, /existingLineCouponUrls = new Map/);
  assert.match(app, /lineCouponUrl: serverLineCouponUrl \|\| retainedLineCouponUrl/);
});

test("opens a registered coupon inside LINE and hides the action while unregistered", () => {
  assert.match(app, /LINEクーポンを詳しく見る/);
  assert.match(app, /詳細準備中/);
  assert.match(app, /window\.liff\.openWindow\(\{ url, external: false \}\)/);
});

test("keeps the existing booking selection action separate from coupon details", () => {
  assert.match(app, /selectionButtonHtml\("coupon", coupon\.couponId\)/);
});

test("loads the coupon URL release assets", () => {
  assert.match(html, /styles\.css\?v=20260831-line-coupon-url-3/);
  assert.match(html, /app\.js\?v=20260831-line-coupon-url-3/);
});
