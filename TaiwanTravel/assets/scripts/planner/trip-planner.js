/**
 * AI 生成层（MVP：规则化模板 + 用户约束适配，可替换为真实 LLM API）
 */
(function (global) {
  "use strict";

  var TripKnowledge = global.TripKnowledge;
  var TripRules = global.TripRules;

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function parseInterests(raw) {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    return String(raw).split(",").filter(Boolean);
  }

  function normalizeInput(formData) {
    var fd = formData || {};
    return {
      days: parseInt(fd.days, 10) || 6,
      budget: parseInt(fd.budget, 10) || 5000,
      firstTime: fd.firstTime !== "false" && fd.firstTime !== false,
      interests: parseInterests(fd.interests),
      earlyBird: fd.earlyBird === "true" || fd.earlyBird === true,
      acceptTransfer: fd.acceptTransfer === "true" || fd.acceptTransfer === true,
      lodging: fd.lodging || "any",
      mustVisit: (fd.mustVisit || "").trim(),
      diet: (fd.diet || "").trim(),
      shopping: fd.shopping === "true" || fd.shopping === true,
      companion: fd.companion || "friends",
      stamina: fd.stamina || "balanced",
    };
  }

  function applyUserToDays(days, input, variant) {
    var result = days.map(function (d) {
      return TripRules.cloneDay(d);
    });

    if (input.mustVisit) {
      var extra = input.mustVisit.split(/[,，、\s]+/).filter(Boolean);
      if (extra.length && result[1]) {
        result[1].spots = result[1].spots.concat(extra.filter(function (x) {
          return result[1].spots.indexOf(x) === -1;
        }));
      }
    }

    if (input.diet) {
      result.forEach(function (d) {
        d.morning = d.morning + "（饮食注意：" + input.diet + "）";
      });
    }

    if (input.lodging !== "any") {
      var lodgingMap = {
        hostel: "青旅/背包客栈",
        hotel: "商务酒店",
        homestay: "民宿",
      };
      var label = lodgingMap[input.lodging] || input.lodging;
      result.forEach(function (d) {
        if (d.lodgingArea) d.lodgingArea = label + " · " + d.lodgingArea;
      });
    }

    if (!input.earlyBird && result[5]) {
      result[5].morning = "睡到自然醒 → 下山 → 桃园（不追日出）";
      result[5].whyArrangement = "你选择了不早起，已移除日出硬项，换取睡眠与缓冲。";
    }

    if (variant === "conservative") {
      if (result[2]) {
        result[2].evening = "九份 18:30 前下山，回台北休息（保守版提前返程）";
        result[2].afternoon = result[2].afternoon + "；控制停留不过晚";
      }
      if (result[4]) {
        result[4].afternoon = "阿里山核心步道，不排夜间萤火虫（保守版）";
      }
      result.forEach(function (d) {
        d.budgetEstimate = Math.round(d.budgetEstimate * 0.95);
      });
    }

    if (variant === "efficient") {
      if (result[1]) {
        result[1].evening = result[1].evening + "；可加北投/quick 夜景若体力允许";
      }
      if (result[3]) {
        result[3].afternoon = result[3].afternoon + "；缆车+环湖尽量同日完成";
      }
      if (result[4]) {
        result[4].evening = "萤火虫/星空 + 次日日出（高效版）";
      }
      result.forEach(function (d) {
        d.budgetEstimate = Math.round(d.budgetEstimate * 1.08);
      });
    }

    if (input.stamina === "easy") {
      result.forEach(function (d) {
        d.duration = d.duration.replace(/\d+–\d+/, function () {
          return "缩短为 6–7";
        });
        if (d.day === 3) d.alternatives = "建议故宫与九份拆到两天（轻松版）";
      });
    }

    if (!input.shopping && result[5]) {
      result[5].afternoon = "直接前往机场周边，跳过 Outlet";
    }

    if (input.interests.indexOf("food") >= 0 && result[0]) {
      result[0].evening = "品都串烧 + 西门町小吃（美食偏好加强）";
    }
    if (input.interests.indexOf("museum") >= 0 && result[2]) {
      result[2].morning = "故宫深度游：预留 4h+，语音导览必选";
    }
    if (input.interests.indexOf("nature") >= 0) {
      if (result[3]) result[3].afternoon = "环湖骑行/步道优先（自然偏好）";
      if (result[4]) result[4].morning = "森林步道 + 云海观景点（自然偏好）";
    }

    return result;
  }

  function buildPlan(versionId, input) {
    var meta = TripKnowledge.VERSION_META[versionId];
    var paceMap = { conservative: "relaxed", classic: "balanced", efficient: "intense" };
    var days = applyUserToDays(deepClone(TripKnowledge.BASE_DAYS), input, versionId);

    var plan = {
      versionId: versionId,
      name: meta.name,
      tagline: meta.tagline,
      audience: meta.audience,
      whyVersion: meta.whyVersion,
      pace: paceMap[versionId] || "balanced",
      days: days,
      generatedAt: new Date().toISOString(),
      userInputSnapshot: deepClone(input),
    };

    return TripRules.validatePlan(plan, input);
  }

  function generatePlans(userInput) {
    var input = normalizeInput(userInput);
    return ["conservative", "classic", "efficient"].map(function (vid) {
      return buildPlan(vid, input);
    });
  }

  function replan(basePlan, adjustments) {
    var input = deepClone(basePlan.userInputSnapshot || {});
    Object.keys(adjustments || {}).forEach(function (k) {
      if (adjustments[k] !== undefined && adjustments[k] !== "") {
        input[k] = adjustments[k];
      }
    });
    if (adjustments.budgetLower) {
      input.budget = Math.max(2000, (input.budget || 5000) - parseInt(adjustments.budgetLower, 10));
    }
    if (adjustments.skipSpot) {
      input.mustVisit = (input.mustVisit || "").replace(adjustments.skipSpot, "").trim();
    }
    if (adjustments.noEarly === "true" || adjustments.noEarly === true) {
      input.earlyBird = false;
    }
    if (adjustments.addDay) {
      input.days = Math.min(8, (input.days || 6) + 1);
    }
    if (adjustments.reduceDay) {
      input.days = Math.max(4, (input.days || 6) - 1);
    }
    if (adjustments.relaxMode === "true" || adjustments.relaxMode === true) {
      input.stamina = "easy";
    }

    var newPlan = buildPlan(basePlan.versionId, input);
    newPlan.replanFrom = basePlan.versionId;
    newPlan.diffSummary = diffPlans(basePlan, newPlan);
    return newPlan;
  }

  function diffPlans(oldPlan, newPlan) {
    var lines = [];
    (newPlan.days || []).forEach(function (d, i) {
      var prev = (oldPlan.days || [])[i];
      if (!prev) return;
      if (d.morning !== prev.morning) lines.push("Day" + d.day + " 上午安排已调整");
      if (d.evening !== prev.evening) lines.push("Day" + d.day + " 晚间安排已调整");
      if (d.budgetEstimate !== prev.budgetEstimate) {
        lines.push("Day" + d.day + " 预算估算 " + prev.budgetEstimate + " → " + d.budgetEstimate);
      }
    });
    if (lines.length === 0) lines.push("行程结构未大变，风险与提示已按新条件重算");
    return lines;
  }

  global.TripPlanner = {
    normalizeInput: normalizeInput,
    generatePlans: generatePlans,
    replan: replan,
    buildPlan: buildPlan,
  };
})(typeof window !== "undefined" ? window : global);
