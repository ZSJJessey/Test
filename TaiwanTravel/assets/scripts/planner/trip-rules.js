/**
 * 规则校验层：对生成方案做二次检查
 */
(function (global) {
  "use strict";

  var TripKnowledge = global.TripKnowledge;

  function cloneDay(day) {
    return JSON.parse(JSON.stringify(day));
  }

  function buildContext(plan, userInput) {
    var days = plan.days || [];
    var totalBudget = days.reduce(function (sum, d) {
      return sum + (d.budgetEstimate || 0);
    }, 0);

    var transferScore = 0;
    days.forEach(function (d) {
      var t = d.transport || "";
      if (/高铁|公车|转|接驳/.test(t)) transferScore += 1;
      if (d.day === 4 || d.day === 5) transferScore += 1;
    });

    return {
      days: days,
      totalBudget: totalBudget,
      userBudgetCap: userInput.budget || 5000,
      hasJiufen: days.some(function (d) {
        return (d.spots || []).some(function (s) {
          return /九份/.test(s);
        });
      }),
      hasAlishan: days.some(function (d) {
        return /阿里山/.test(d.city || "") || (d.spots || []).some(function (s) {
          return /阿里山/.test(s);
        });
      }),
      earlyReturnJiufen: plan.versionId === "conservative",
      acceptTransfer: userInput.acceptTransfer,
      earlyBird: userInput.earlyBird,
      stamina: userInput.stamina,
      pace: plan.pace || "balanced",
      hasCrossCity: days.some(function (d) {
        return d.day === 4 || d.day === 5;
      }),
      transferScore: transferScore,
    };
  }

  function validatePlan(plan, userInput) {
    var ctx = buildContext(plan, userInput);
    var hits = [];
    var seen = {};

    TripKnowledge.RULE_DEFINITIONS.forEach(function (rule) {
      if (!rule.test(ctx)) return;
      if (seen[rule.id]) return;
      seen[rule.id] = true;
      hits.push({
        id: rule.id,
        level: rule.level,
        tag: rule.tag,
        message: rule.message,
        suggestion: rule.suggestion,
      });
    });

    plan.validation = {
      passed: !hits.some(function (h) {
        return h.level === "high" && h.id === "budget_over";
      }),
      risks: hits,
      totalBudget: ctx.totalBudget,
      budgetCap: ctx.userBudgetCap,
    };

    daysAttachRiskTags(plan, hits);
    return plan;
  }

  function daysAttachRiskTags(plan, hits) {
    (plan.days || []).forEach(function (day) {
      day.risks = [];
      hits.forEach(function (h) {
        if (h.id === "jiufen_last_bus" && day.day === 3) {
          day.risks.push(h);
        } else if (h.id === "alishan_bus" && day.day === 5) {
          day.risks.push(h);
        } else if (h.id === "tight_cross_city" && (day.day === 4 || day.day === 5)) {
          day.risks.push(h);
        } else if (h.id === "cash_prep" && day.day === 1) {
          day.risks.push(h);
        }
      });
      if (day.risks.length === 0 && day.bookAhead) {
        day.risks.push({
          level: "medium",
          tag: "建议预订",
          message: "本日含需提前锁位的交通或门票",
          suggestion: "出发前 1–2 周完成购票",
        });
      }
    });
  }

  global.TripRules = {
    validatePlan: validatePlan,
    buildContext: buildContext,
    cloneDay: cloneDay,
  };
})(typeof window !== "undefined" ? window : global);
