/**
 * 内容导出：小红书文案 / 行前清单 / 时间轴
 */
(function (global) {
  "use strict";

  var TripKnowledge = global.TripKnowledge;

  function exportXiaohongshu(plan) {
    var lines = [];
    lines.push("🏝️ 台湾 " + (plan.days ? plan.days.length : 6) + " 天自由行｜" + plan.name);
    lines.push("");
    lines.push(plan.tagline + "｜" + plan.audience);
    lines.push("");
    lines.push("✨ 为什么选这版？");
    lines.push(plan.whyVersion);
    lines.push("");
    lines.push("📍 每日路线");
    (plan.days || []).forEach(function (d) {
      lines.push("");
      lines.push("Day" + d.day + " · " + d.city);
      lines.push("🌅 上午：" + d.morning);
      lines.push("☀️ 下午：" + d.afternoon);
      lines.push("🌙 晚上：" + d.evening);
      lines.push("🚇 交通：" + d.transport);
      lines.push("💰 预算约：" + d.budgetEstimate + " RMB/人");
      if (d.bookAhead) lines.push("⚠️ 建议提前订票/预约");
    });
    lines.push("");
    if (plan.validation && plan.validation.risks.length) {
      lines.push("⚠️ 风险提示");
      plan.validation.risks.slice(0, 5).forEach(function (r) {
        lines.push("· [" + r.level + "] " + r.message + " → " + r.suggestion);
      });
    }
    lines.push("");
    lines.push("#台湾自由行 #台湾旅游 #行程攻略 #台北 #日月潭 #阿里山");
    lines.push("（交通与票价以出发前官方信息为准）");
    return lines.join("\n");
  }

  function exportChecklist(plan, userInput) {
    var lines = [];
    lines.push("【行前准备清单】" + plan.name);
    lines.push("");
    TripKnowledge.PREP_CHECKLIST.forEach(function (item, i) {
      lines.push((i + 1) + ". [ ] " + item);
    });
    if (userInput && userInput.diet) {
      lines.push((TripKnowledge.PREP_CHECKLIST.length + 1) + ". [ ] 饮食忌口：" + userInput.diet);
    }
    lines.push("");
    lines.push("【本方案需预订项】");
    (plan.days || []).forEach(function (d) {
      if (d.bookAhead) {
        lines.push("· Day" + d.day + " " + d.city + "：" + (d.spots || []).join("、"));
      }
    });
    return lines.join("\n");
  }

  function exportTimeline(plan) {
    var lines = [];
    lines.push("【时间轴 / 地图节点】" + plan.name);
    lines.push("");
    (plan.days || []).forEach(function (d) {
      lines.push("Day" + d.day + " | " + d.city);
      lines.push("  节点：" + (d.spots || []).join(" → "));
      lines.push("  住宿建议：" + (d.lodgingArea || "—"));
      lines.push("  耗时：" + d.duration);
      lines.push("");
    });
    lines.push("地图关键词：" + (plan.days || []).map(function (d) {
      return (d.spots || [])[0] || d.city;
    }).filter(Boolean).join(" · "));
    return lines.join("\n");
  }

  global.TripExport = {
    exportXiaohongshu: exportXiaohongshu,
    exportChecklist: exportChecklist,
    exportTimeline: exportTimeline,
  };
})(typeof window !== "undefined" ? window : global);
