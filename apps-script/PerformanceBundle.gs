/**
 * Read-only gacha bootstrap used by the TEAM LINK customer UI.
 *
 * One browser request replaces seven concurrent Apps Script executions. During
 * this bundle only, repeated reads of the same sheet reuse one in-memory
 * snapshot. Existing write APIs and their locking/idempotency are untouched.
 */
var TEAM_LINK_BUNDLE_READ_CACHE_ = null;

function getGachaBootstrap_(payload) {
  return withTeamLinkBundleReadCache_(function() {
    validateRequired_(payload, ["userId"]);
    var ss = getTeamLinkSpreadsheet_();
    var userId = getGachaUserId_(payload);
    var targetYearMonth = getCurrentGachaYearMonth_(ss, payload && payload.targetYearMonth || "");
    var currentYear = String(payload && (payload.currentYear || payload.year) || serverYearKey_());
    var targetYear = String(payload && payload.targetYear || currentYear);
    var today = serverDateKey_();
    var config = getGachaConfigMap_(ss);
    var rewards = getDrawableGachaRewards_(ss, targetYearMonth, false);
    var draws = getSheetObjects_(ss, "ガチャ抽選履歴");
    var rewardMaster = getSheetObjects_(ss, "ガチャ景品マスタ");
    var usageRows = getSheetObjects_(ss, "クーポン利用履歴");
    var binderRows = getSheetObjects_(ss, "カードバインダー");
    var collectionRules = getSheetObjects_(ss, "コレクション特典マスタ");
    var collectionExchanges = getSheetObjects_(ss, "コレクション特典交換履歴");
    var userCoupons = usageRows
      .filter(function(row) { return String(row.userId) === userId; })
      .map(function(row) {
        var draw = draws.find(function(item) { return String(item.drawId) === String(row.drawId); }) || {};
        var reward = rewardMaster.find(function(item) { return String(item.cardId) === String(row.cardId || draw.cardId); }) || {};
        var visibleStatus = String(row.status || "");
        var expiryDate = dateKey_(row.expiryDate);
        if (["available", "pending"].includes(visibleStatus) && expiryDate && expiryDate < today) visibleStatus = "expired";
        return Object.assign({}, row, {
          status: visibleStatus,
          targetYearMonth: draw.targetYearMonth || reward.targetYearMonth || "",
          rewardName: draw.rewardName || reward.rewardName || "",
          rewardDetail: reward.rewardDetail || "",
          rarity: draw.rarity || reward.rarity || "",
          targetMenu: reward.targetMenu || "",
          canCombine: isTruthy_(reward.canCombine),
          notes: reward.notes || ""
        });
      });
    var monthlyDraw = draws.find(function(row) {
      return String(row.userId) === String(userId)
        && yearMonthKey_(row.targetYearMonth) === targetYearMonth
        && String(row.isTest).toUpperCase() !== "TRUE";
    }) || null;
    var monthlyCoupon = monthlyDraw ? usageRows.find(function(row) {
      return String(row.drawId) === String(monthlyDraw.drawId);
    }) || null : null;
    var currentBinder = binderRows.filter(function(row) {
      return String(row.userId) === userId && String(row.year) === currentYear;
    });
    var pastByYear = {};
    binderRows.filter(function(row) {
      return String(row.userId) === userId && String(row.year) !== currentYear;
    }).forEach(function(row) {
      var year = String(row.year || "");
      if (!pastByYear[year]) pastByYear[year] = [];
      pastByYear[year].push(row);
    });
    var targetBinder = binderRows.filter(function(row) {
      return String(row.userId) === userId && String(row.year) === targetYear;
    });
    var targetExchanges = collectionExchanges.filter(function(row) {
      return String(row.userId) === userId && String(row.targetYear) === targetYear;
    });
    var visibleCollectionRules = collectionRules.filter(function(row) {
      return isTruthy_(row.isPublished) && (!row.targetYear || String(row.targetYear) === targetYear);
    });
    return apiSuccess_({
      config: { config: config, serverNow: now_(), serverDate: today, currentYearMonth: targetYearMonth },
      rewards: { targetYearMonth: targetYearMonth, rewards: rewards },
      coupons: { userId: userId, coupons: userCoupons },
      drawStatus: { userId: userId, targetYearMonth: targetYearMonth, canDraw: !monthlyDraw, alreadyDrawn: Boolean(monthlyDraw), draw: monthlyDraw, coupon: monthlyCoupon },
      binder: { userId: userId, year: currentYear, cards: currentBinder, summary: summarizeBinderCards_(currentBinder) },
      pastBinders: { userId: userId, years: pastByYear },
      collectionRewards: {
        userId: userId,
        targetYear: targetYear,
        rewards: visibleCollectionRules.map(function(rule) {
          return Object.assign({}, rule, {
            achieved: isCollectionRuleAchieved_(rule, targetBinder),
            exchange: targetExchanges.find(function(item) { return String(item.rewardRuleId) === String(rule.rewardRuleId); }) || null
          });
        })
      }
    }, "ガチャ表示データを取得しました");
  });
}

function withTeamLinkBundleReadCache_(callback) {
  var previous = TEAM_LINK_BUNDLE_READ_CACHE_;
  TEAM_LINK_BUNDLE_READ_CACHE_ = {};
  try {
    return callback();
  } finally {
    TEAM_LINK_BUNDLE_READ_CACHE_ = previous;
  }
}

function getTeamLinkBundleSheetObjects_(ss, sheetName) {
  var key = String(ss.getId()) + "|" + String(sheetName);
  if (!Object.prototype.hasOwnProperty.call(TEAM_LINK_BUNDLE_READ_CACHE_, key)) {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error(sheetName + " シートが見つかりません");
    var values = sheet.getDataRange().getValues();
    if (values.length < 2) {
      TEAM_LINK_BUNDLE_READ_CACHE_[key] = [];
    } else {
      var headers = values[0].map(function(value) { return String(value || "").trim(); });
      TEAM_LINK_BUNDLE_READ_CACHE_[key] = values.slice(1)
        .filter(function(row) { return row.some(function(cell) { return cell !== ""; }); })
        .map(function(row) {
          var item = {};
          headers.forEach(function(header, index) {
            if (header) item[header] = row[index];
          });
          return item;
        });
    }
  }
  return TEAM_LINK_BUNDLE_READ_CACHE_[key].map(function(row) { return Object.assign({}, row); });
}

function unwrapTeamLinkApiData_(result) {
  return result && result.data !== undefined ? result.data : (result || {});
}
