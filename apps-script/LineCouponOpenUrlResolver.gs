/**
 * Resolves a saved LINE coupon share URL without changing its canonical value.
 * Only verified redirects from lin.ee to liff.line.me are returned to clients.
 */
const LINE_COUPON_OPEN_URL_CACHE_SECONDS_ = 300;

function resolveLineCouponOpenUrl_(payload) {
  const lineCouponUrl = String(payload && payload.lineCouponUrl || "").trim();
  if (!isSafeLineCouponShareUrl_(lineCouponUrl)) {
    return {
      success: true,
      resolvedUrl: "",
      fallbackUrl: lineCouponUrl,
      resolutionStatus: "invalid_source"
    };
  }

  const cache = CacheService.getScriptCache();
  const cacheKey = buildLineCouponOpenUrlCacheKey_(lineCouponUrl);
  const cachedUrl = String(cache.get(cacheKey) || "").trim();
  if (isSafeLineCouponLiffUrl_(cachedUrl)) {
    return {
      success: true,
      resolvedUrl: cachedUrl,
      fallbackUrl: lineCouponUrl,
      resolutionStatus: "cache"
    };
  }

  try {
    const response = UrlFetchApp.fetch(lineCouponUrl, {
      method: "get",
      followRedirects: false,
      muteHttpExceptions: true
    });
    const httpStatus = response.getResponseCode();
    const headers = response.getAllHeaders();
    const location = String(headers.Location || headers.location || "").trim();

    if (httpStatus >= 300 && httpStatus < 400 && isSafeLineCouponLiffUrl_(location)) {
      cache.put(cacheKey, location, LINE_COUPON_OPEN_URL_CACHE_SECONDS_);
      return {
        success: true,
        resolvedUrl: location,
        fallbackUrl: lineCouponUrl,
        resolutionStatus: "resolved",
        httpStatus: httpStatus
      };
    }

    return {
      success: true,
      resolvedUrl: "",
      fallbackUrl: lineCouponUrl,
      resolutionStatus: "unverified_redirect",
      httpStatus: httpStatus
    };
  } catch (error) {
    console.warn("[TEAM LINK LINE COUPON URL RESOLVE FAILED]", String(error && error.message || error));
    return {
      success: true,
      resolvedUrl: "",
      fallbackUrl: lineCouponUrl,
      resolutionStatus: "fetch_failed"
    };
  }
}

function isSafeLineCouponShareUrl_(value) {
  return /^https:\/\/lin\.ee\/[A-Za-z0-9_-]+(?:[?#][^\s]*)?$/.test(String(value || "").trim());
}

function isSafeLineCouponLiffUrl_(value) {
  return /^https:\/\/liff\.line\.me\/[A-Za-z0-9_-]+(?:\/[^\s]*)?(?:[?#][^\s]*)?$/.test(String(value || "").trim());
}

function buildLineCouponOpenUrlCacheKey_(lineCouponUrl) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, lineCouponUrl, Utilities.Charset.UTF_8);
  return "lineCouponOpen:" + Utilities.base64EncodeWebSafe(digest).replace(/=+$/, "").slice(0, 40);
}
