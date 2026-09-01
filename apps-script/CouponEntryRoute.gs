/**
 * Canonical customer entry for LINE coupon screens.
 *
 * Coupon links must enter through LIFF so LINE identity is ready before
 * getBookingCatalog and the shared coupon renderer run. Other routes retain
 * their existing URL behavior.
 */
const TEAM_LINK_CUSTOMER_LIFF_URL_ = "https://liff.line.me/2011349129-0lFO8qFb/";

function buildTeamLinkMemberRouteUrl_(view, identityQuery, featureQuery, fallbackBaseUrl) {
  const routeView = String(view || "home").trim() || "home";
  const identity = String(identityQuery || "").replace(/^[?&]+/, "");
  const feature = String(featureQuery || "").replace(/^[?&]+/, "");
  const querySuffix = [identity, feature].filter(Boolean).join("&");

  if (routeView === "coupons") {
    return TEAM_LINK_CUSTOMER_LIFF_URL_ + "?page=coupon" + (querySuffix ? "&" + querySuffix : "");
  }

  const baseUrl = String(fallbackBaseUrl || getCanonicalTeamLinkPublicUrl_()).replace(/\/+$/, "") + "/";
  return baseUrl + "?view=" + encodeURIComponent(routeView) + (querySuffix ? "&" + querySuffix : "");
}
