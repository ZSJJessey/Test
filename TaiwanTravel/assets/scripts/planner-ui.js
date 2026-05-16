(function () {
  "use strict";

  var MSG = {
    copied: "\u5df2\u590d\u5236\u5230\u526a\u8d34\u677f",
    copyFail: "\u590d\u5236\u5931\u8d25\uff0c\u8bf7\u624b\u52a8\u9009\u62e9\u6587\u672c",
    generated: "\u5df2\u751f\u6210 3 \u5957\u884c\u7a0b\uff0c\u8bf7\u9009\u62e9\u65b9\u6848\u67e5\u770b\u8be6\u60c5",
    replanned: "\u5df2\u6839\u636e\u65b0\u6761\u4ef6\u91cd\u65b0\u89c4\u5212",
  };

  var state = { plans: [], activePlan: null, userInput: null };

  function $(s, r) {
    return (r || document).querySelector(s);
  }
  function $$(s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  }
  function esc(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function riskCls(l) {
    return l === "high" ? "risk-tag--high" : l === "medium" ? "risk-tag--medium" : "risk-tag--low";
  }
  function toast(msg) {
    var el = $("#plannerToast") || $("#toastArea");
    if (!el) return;
    el.textContent = msg;
    window.setTimeout(function () {
      if (el.textContent === msg) el.textContent = "";
    }, 3200);
  }
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(function () {
        toast(MSG.copied);
      });
    }
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.cssText = "position:fixed;left:-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      toast(MSG.copied);
    } catch (e) {
      toast(MSG.copyFail);
    }
    document.body.removeChild(ta);
    return Promise.resolve();
  }
  function readForm() {
    var form = $("#plannerForm");
    if (!form) return {};
    var fd = new FormData(form);
    return {
      days: fd.get("days"),
      budget: fd.get("budget"),
      firstTime: fd.get("firstTime"),
      interests: $$('input[name="interests"]:checked', form).map(function (e) {
        return e.value;
      }),
      earlyBird: fd.get("earlyBird"),
      acceptTransfer: fd.get("acceptTransfer"),
      lodging: fd.get("lodging"),
      mustVisit: fd.get("mustVisit"),
      diet: fd.get("diet"),
      shopping: fd.get("shopping"),
      companion: fd.get("companion"),
      stamina: fd.get("stamina"),
    };
  }
  function findPlan(id) {
    for (var i = 0; i < state.plans.length; i++) {
      if (state.plans[i].versionId === id) return state.plans[i];
    }
    return null;
  }

  function renderCards() {
    var wrap = $("#plannerResults");
    if (!wrap) return;
    wrap.hidden = false;
    var html = "";
    state.plans.forEach(function (p) {
      var v = p.validation || {};
      var risks = v.risks || [];
      var hi = risks.filter(function (r) {
        return r.level === "high";
      }).length;
      html +=
        '<article class="plan-card"><h3 class="plan-card__title">' +
        esc(p.name) +
        '</h3><p class="plan-card__tagline">' +
        esc(p.tagline) +
        '</p><p class="plan-card__meta">\u9884\u4f30 <strong>' +
        (v.totalBudget || 0) +
        " RMB/\u4eba</strong> \u00b7 \u98ce\u9669 " +
        risks.length +
        (hi ? ' <span class="plan-card__warn">(' + hi + " \u9ad8)</span>" : "") +
        '</p><p class="plan-card__audience">' +
        esc(p.audience) +
        '</p><div class="plan-card__actions"><button type="button" class="btn btn--primary btn--sm plan-card__select" data-v="' +
        p.versionId +
        '">\u67e5\u770b\u8be6\u60c5</button><button type="button" class="btn btn--outline btn--sm plan-card__why" data-v="' +
        p.versionId +
        '">\u4e3a\u4ec0\u4e48\u9009\u8fd9\u7248</button></div></article>';
    });
    wrap.innerHTML =
      '<div class="planner-results__head"><h3>\u4e3a\u4f60\u751f\u6210 3 \u5957\u65b9\u6848</h3><p class="planner-results__hint">\u7ed3\u6784\u5316\u7ea6\u675f + \u89c4\u5219\u5f15\u64ce\uff08MVP\uff0c\u53ef\u63a5\u5165 LLM\uff09</p></div><div class="plan-cards">' +
      html +
      "</div>";
  }

  function renderRisks(p) {
    var risks = (p.validation && p.validation.risks) || [];
    if (!risks.length) return '<p class="planner-detail__empty">\u6682\u65e0\u98ce\u9669\u547d\u4e2d</p>';
    return (
      "<ul class=\"risk-list\">" +
      risks
        .map(function (r) {
          return (
            '<li><span class="risk-tag ' +
            riskCls(r.level) +
            '">' +
            esc(r.tag) +
            "</span><p><strong>" +
            esc(r.message) +
            "</strong></p><p>" +
            esc(r.suggestion) +
            "</p></li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  function renderDay(d) {
    var rh = "";
    if (d.risks && d.risks.length) {
      rh =
        '<div class="day-plan__risks">' +
        d.risks
          .map(function (r) {
            return '<span class="risk-tag ' + riskCls(r.level) + '">' + esc(r.tag) + "</span>";
          })
          .join("") +
        "</div>";
    }
    return (
      '<article class="day-plan"><header class="day-plan__head"><h4>Day ' +
      d.day +
      " \u00b7 " +
      esc(d.city) +
      "</h4>" +
      rh +
      '</header><dl class="day-plan__grid"><dt>\u4e0a\u5348</dt><dd>' +
      esc(d.morning) +
      '</dd><dt>\u4e0b\u5348</dt><dd>' +
      esc(d.afternoon) +
      '</dd><dt>\u665a\u4e0a</dt><dd>' +
      esc(d.evening) +
      '</dd><dt>\u4ea4\u901a</dt><dd>' +
      esc(d.transport) +
      '</dd><dt>\u9884\u7b97</dt><dd>' +
      d.budgetEstimate +
      ' RMB</dd><dt>\u666f\u70b9</dt><dd>' +
      esc((d.spots || []).join("\u3001")) +
      "</dd></dl><p class=\"day-plan__reason\">" +
      esc(d.reason) +
      '</p><button type="button" class="btn btn--ghost btn--sm day-plan__why" data-day="' +
      d.day +
      '">\u4e3a\u4ec0\u4e48\u8fd9\u6837\u6392</button><div class="day-plan__why-panel" id="why-' +
      d.day +
      '" hidden><p>' +
      esc(d.whyArrangement) +
      "</p><p>" +
      esc(d.alternatives) +
      "</p></div></article>"
    );
  }

  function renderDetail(p) {
    var el = $("#plannerDetail");
    if (!el) return;
    el.hidden = false;
    var diff = "";
    if (p.diffSummary && p.diffSummary.length) {
      diff =
        '<div class="planner-diff"><h4>\u4e0e\u4e0a\u7248\u5dee\u5f02</h4><ul>' +
        p.diffSummary
          .map(function (x) {
            return "<li>" + esc(x) + "</li>";
          })
          .join("") +
        "</ul></div>";
    }
    el.innerHTML =
      "<h3>" +
      esc(p.name) +
      ' \u00b7 \u884c\u7a0b\u8be6\u60c5</h3><p>' +
      esc(p.tagline) +
      "</p>" +
      diff +
      '<section class="planner-detail__risks"><h4>\u98ce\u9669\u6821\u9a8c</h4>' +
      renderRisks(p) +
      "</section><section class=\"planner-detail__days\">" +
      (p.days || []).map(renderDay).join("") +
      '</section><div class="planner-detail__toolbar"><button type="button" class="btn btn--secondary" id="btnReplan">\u91cd\u65b0\u89c4\u5212</button><button type="button" class="btn btn--outline" data-export="xiaohongshu">\u5bfc\u51fa\u5c0f\u7ea2\u4e66</button><button type="button" class="btn btn--outline" data-export="checklist">\u5bfc\u51fa\u6e05\u5355</button><button type="button" class="btn btn--outline"       data-export="timeline">\u5bfc\u51fa\u65f6\u95f4\u8f74</button></div>';

    $$(".day-plan__why", el).forEach(function (btn) {
      btn.onclick = function () {
        var panel = $("#why-" + btn.getAttribute("data-day"));
        if (!panel) return;
        var open = panel.hidden;
        panel.hidden = !open;
      };
    });
    var rb = $("#btnReplan");
    if (rb) rb.onclick = function () {
      var d = $("#plannerReplanDialog");
      if (d) {
        d.hidden = false;
        d.dataset.version = p.versionId;
      }
    };
    $$("[data-export]", el).forEach(function (btn) {
      btn.onclick = function () {
        var k = btn.getAttribute("data-export");
        var t =
          k === "xiaohongshu"
            ? TripExport.exportXiaohongshu(p)
            : k === "checklist"
              ? TripExport.exportChecklist(p, state.userInput)
              : TripExport.exportTimeline(p);
        $("#plannerExportText").value = t;
        $("#plannerExportTitle").textContent =
          k === "xiaohongshu" ? "\u5c0f\u7ea2\u4e66\u6587\u6848" : k === "checklist" ? "\u884c\u524d\u6e05\u5355" : "\u65f6\u95f4\u8f74";
        $("#plannerExportDialog").hidden = false;
      };
    });
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function generate() {
    state.userInput = readForm();
    state.plans = TripPlanner.generatePlans(state.userInput);
    renderCards();
    var d = $("#plannerDetail");
    if (d) d.hidden = true;
    toast(MSG.generated);
    $("#plannerResults").scrollIntoView({ behavior: "smooth" });
  }

  function replan() {
    var dlg = $("#plannerReplanDialog");
    var id = dlg ? dlg.dataset.version : "";
    var plan = findPlan(id) || state.activePlan;
    if (!plan) return;
    var adj = {
      budgetLower: ($("#replanBudgetLower") || {}).value,
      skipSpot: ($("#replanSkipSpot") || {}).value,
      noEarly: ($("#replanNoEarly") || {}).checked,
      relaxMode: ($("#replanRelax") || {}).checked,
    };
    var np = TripPlanner.replan(plan, adj);
    for (var i = 0; i < state.plans.length; i++) {
      if (state.plans[i].versionId === id) state.plans[i] = np;
    }
    state.activePlan = np;
    renderCards();
    renderDetail(np);
    dlg.hidden = true;
    toast(MSG.replanned);
  }

  function bind() {
    var form = $("#plannerForm");
    if (form) form.addEventListener("submit", function (e) {
      e.preventDefault();
      generate();
    });
    var res = $("#plannerResults");
    if (res)
      res.addEventListener("click", function (e) {
        var s = e.target.closest(".plan-card__select");
        var w = e.target.closest(".plan-card__why");
        if (s) {
          var p = findPlan(s.getAttribute("data-v"));
          if (p) {
            state.activePlan = p;
            renderDetail(p);
          }
        }
        if (w) {
          var p2 = findPlan(w.getAttribute("data-v"));
          if (p2) {
            $("#plannerExplainBody").innerHTML =
              "<p><strong>" + esc(p2.name) + "</strong></p><p>" + esc(p2.whyVersion) + "</p>";
            $("#plannerExplainDialog").hidden = false;
          }
        }
      });
    var rf = $("#replanForm");
    if (rf) rf.addEventListener("submit", function (e) {
      e.preventDefault();
      replan();
    });
    $$("[data-close]").forEach(function (b) {
      b.onclick = function () {
        var d = $("#" + b.getAttribute("data-close"));
        if (d) d.hidden = true;
      };
    });
    var ce = $("#btnCopyExport");
    if (ce) ce.onclick = function () {
      copy($("#plannerExportText").value);
    };
  }

  if (typeof TripPlanner !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
    else bind();
  }
})();
