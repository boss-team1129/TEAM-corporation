import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("../apps-script/CouponEntryRoute.gs", import.meta.url), "utf8");
const buildRoute = new Function(
  "getCanonicalTeamLinkPublicUrl_",
  `${source}; return buildTeamLinkMemberRouteUrl_;`
)(() => "https://boss-team1129.github.io/TEAM-LINK/");

test("all LINE coupon entries use the canonical LIFF coupon route", () => {
  const url = buildRoute(
    "coupons",
    "memberId=TL-000001&lineUserId=masked&memberToken=test",
    "&feature=line",
    "https://boss-team1129.github.io/TEAM-LINK/"
  );
  assert.equal(
    url,
    "https://liff.line.me/2011349129-0lFO8qFb/?page=coupon&memberId=TL-000001&lineUserId=masked&memberToken=test&feature=line"
  );
  assert.doesNotMatch(url, /github\.io\/TEAM-LINK/);
});

test("non-coupon member routes retain their existing destination", () => {
  assert.equal(
    buildRoute("gacha", "memberId=TL-000001", "", "https://boss-team1129.github.io/TEAM-LINK/"),
    "https://boss-team1129.github.io/TEAM-LINK/?view=gacha&memberId=TL-000001"
  );
});
