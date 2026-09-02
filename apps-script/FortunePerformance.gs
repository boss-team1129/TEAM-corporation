/**
 * Fast, read-only wrapper for the existing 24-type TEAM LINK fortune engine.
 * Calculation and source text stay in the existing implementation/DB.
 */
var TEAM_FORTUNE_READ_CACHE_ = null;
var TEAM_FORTUNE_CACHE_VERSION_ = "fortune-read-v1";

function resolveTeamFortune_(payload) {
  validateRequired_(payload, ["birthDate"]);
  var targetDate = String(payload.targetDate || serverDateKey_()).slice(0, 10);
  var spreadsheetId = String(payload.fortuneSpreadsheetId || TEAM_LINK_FORTUNE_SPREADSHEET_ID || "");
  var resultCache = CacheService.getScriptCache();
  var resultKey = [TEAM_FORTUNE_CACHE_VERSION_, "result", spreadsheetId, payload.birthDate, targetDate].join("|");
  var cached = resultCache.get(resultKey);
  if (cached) return JSON.parse(cached);

  var result = withTeamFortuneReadCache_(function() {
    return resolveTeamFortuneUncached_(payload);
  });
  try {
    resultCache.put(resultKey, JSON.stringify(result), 600);
  } catch (error) {
    console.warn("[TEAM FORTUNE RESULT CACHE SKIPPED] " + String(error && error.message || error));
  }
  return result;
}

function withTeamFortuneReadCache_(callback) {
  var previous = TEAM_FORTUNE_READ_CACHE_;
  TEAM_FORTUNE_READ_CACHE_ = {};
  try {
    return callback();
  } finally {
    TEAM_FORTUNE_READ_CACHE_ = previous;
  }
}

function getTeamFortuneCachedSheetObjects_(ss, sheetName) {
  var requestKey = String(ss.getId()) + "|" + String(sheetName);
  if (Object.prototype.hasOwnProperty.call(TEAM_FORTUNE_READ_CACHE_, requestKey)) {
    return cloneTeamFortuneRows_(TEAM_FORTUNE_READ_CACHE_[requestKey]);
  }

  var cache = CacheService.getScriptCache();
  var cacheKey = [TEAM_FORTUNE_CACHE_VERSION_, "sheet", ss.getId(), sheetName].join("|");
  var cached = cache.get(cacheKey);
  var rows;
  if (cached) {
    rows = JSON.parse(cached);
  } else {
    var sheet = ss.getSheetByName(sheetName);
    if (!sheet) throw new Error(sheetName + " シートが見つかりません");
    var values = sheet.getDataRange().getValues();
    if (values.length < 2) {
      rows = [];
    } else {
      var headers = values[0].map(function(value) { return String(value || "").trim(); });
      rows = values.slice(1)
        .filter(function(row) { return row.some(function(cell) { return cell !== ""; }); })
        .map(function(row) {
          var item = {};
          headers.forEach(function(header, index) {
            if (header) item[header] = row[index];
          });
          return item;
        });
    }
    try {
      cache.put(cacheKey, JSON.stringify(rows), 300);
    } catch (error) {
      console.warn("[TEAM FORTUNE SHEET CACHE SKIPPED] " + sheetName);
    }
  }
  TEAM_FORTUNE_READ_CACHE_[requestKey] = rows;
  return cloneTeamFortuneRows_(rows);
}

function cloneTeamFortuneRows_(rows) {
  return (rows || []).map(function(row) { return Object.assign({}, row); });
}
