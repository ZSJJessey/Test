(function () {
  "use strict";

  var ROUTE_TEXT =
    "台北 → 淡水 → 九份 → 日月潭 → 阿里山 → 桃园\n" +
    "Day1 抵达·西门町·象山 | Day2 淡水 | Day3 故宫·九份 | Day4 日月潭 | Day5 阿里山 | Day6 日出·返程·桃园";

  /* 路线节点文案与地图关键词对照见 README；index 2 为「九份」行程，地图用台北车站 */
  var MAPS_HL = "zh-CN";
  var ROUTE_MAP_PLACES = [
    { label: "台北", url: "https://www.google.com/maps/search/?api=1&hl=" + MAPS_HL + "&query=%E5%8F%B0%E5%8C%97%E8%BB%8A%E7%AB%99" },
    { label: "淡水", url: "https://www.google.com/maps/search/?api=1&hl=" + MAPS_HL + "&query=%E6%B7%A1%E6%B0%B4%E6%BC%94%E4%BA%BA%E7%A2%BC%E9%A0%AD" },
    { label: "台北车站", url: "https://www.google.com/maps/search/?api=1&hl=" + MAPS_HL + "&query=%E5%8F%B0%E5%8C%97%E8%BB%8A%E7%AB%99" },
    { label: "日月潭", url: "https://www.google.com/maps/search/?api=1&hl=" + MAPS_HL + "&query=%E6%97%A5%E6%9C%88%E6%BD%AD" },
    { label: "阿里山", url: "https://www.google.com/maps/search/?api=1&hl=" + MAPS_HL + "&query=%E9%98%BF%E9%87%8C%E5%B1%B1%E5%9C%8B%E5%AE%B6%E6%A3%AE%E6%9E%97%E9%81%93" },
    { label: "桃园", url: "https://www.google.com/maps/search/?api=1&hl=" + MAPS_HL + "&query=%E6%A1%83%E5%9C%92%E5%9C%8B%E9%9A%9B%E6%A9%9F%E5%A0%B4" },
  ];

  var FULL_ROUTE_ORIGIN = "桃園國際機場";
  var FULL_ROUTE_WAYPOINTS = [
    "台北車站",
    "渔人码头",
    "淡水老街",
    "国立故宫博物馆",
    "九份老街",
    "日月潭",
    "阿里山",
  ];

  function buildFullRouteMapsUrl() {
    var params = [
      "api=1",
      "hl=" + MAPS_HL,
      "origin=" + encodeURIComponent(FULL_ROUTE_ORIGIN),
      "destination=" + encodeURIComponent(FULL_ROUTE_ORIGIN),
      "waypoints=" +
        FULL_ROUTE_WAYPOINTS.map(function (place) {
          return encodeURIComponent(place);
        }).join("%7C"),
      "travelmode=driving",
    ];
    return "https://www.google.com/maps/dir/?" + params.join("&");
  }

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function scrollToEl(el) {
    if (!el) return;
    var y = el.getBoundingClientRect().top + window.scrollY - 72;
    window.scrollTo({ top: y, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* Theme */
  var themeKey = "tw6d5n-theme";
  var root = document.documentElement;
  var themeBtn = $("#themeToggle");

  function applyTheme(mode) {
    if (mode === "dark") {
      root.setAttribute("data-theme", "dark");
      if (themeBtn) {
        themeBtn.setAttribute("aria-pressed", "true");
      }
    } else {
      root.removeAttribute("data-theme");
      if (themeBtn) {
        themeBtn.setAttribute("aria-pressed", "false");
      }
    }
  }

  try {
    var saved = localStorage.getItem(themeKey);
    if (saved === "dark" || saved === "light") {
      applyTheme(saved === "dark" ? "dark" : "light");
    }
  } catch (e) {
    /* ignore */
  }

  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next === "dark" ? "dark" : "light");
      try {
        localStorage.setItem(themeKey, next);
      } catch (err) {
        /* ignore */
      }
    });
  }

  /* Prep tabs */
  var tabsRoot = $("[data-tabs]");
  if (tabsRoot) {
    var tButtons = $$(".tabs__tab", tabsRoot);
    var tPanels = $$(".tabs__panel", tabsRoot);

    function activateTab(name) {
      tButtons.forEach(function (btn) {
        var isOn = btn.getAttribute("data-tab") === name;
        btn.classList.toggle("is-active", isOn);
        btn.setAttribute("aria-selected", isOn ? "true" : "false");
      });
      tPanels.forEach(function (panel) {
        var isOn = panel.getAttribute("data-panel") === name;
        panel.classList.toggle("is-active", isOn);
        if (isOn) {
          panel.removeAttribute("hidden");
        } else {
          panel.setAttribute("hidden", "");
        }
      });
    }

    tButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        activateTab(btn.getAttribute("data-tab"));
      });
    });
  }

  /* Day accordion + route sync */
  var dayCards = $$(".day-card");
  var routeNodes = $$(".route-node");
  var routeMapOpenCurrent = $("#routeMapOpenCurrent");

  function updateRouteMapLink(index) {
    if (!routeMapOpenCurrent || !ROUTE_MAP_PLACES[index]) return;
    var place = ROUTE_MAP_PLACES[index];
    routeMapOpenCurrent.href = place.url;
    routeMapOpenCurrent.textContent = "在 Google Maps 中打开：" + place.label;
  }

  function setActiveRouteIndex(index) {
    var idx = parseInt(String(index), 10);
    if (Number.isNaN(idx)) return;

    updateRouteMapLink(idx);

    routeNodes.forEach(function (node, i) {
      var on = i === idx;
      node.classList.toggle("is-active", on);
      if (on) {
        node.setAttribute("aria-current", "true");
      } else {
        node.removeAttribute("aria-current");
      }
    });

    dayCards.forEach(function (card) {
      var ri = parseInt(card.getAttribute("data-route-index"), 10);
      card.classList.toggle("is-active-route", ri === idx);
    });
  }

  function openDayCard(card, open) {
    var panel = card.querySelector(".day-card__panel");
    var btn = card.querySelector(".day-card__header");
    if (!panel || !btn) return;

    if (open) {
      panel.removeAttribute("hidden");
      btn.setAttribute("aria-expanded", "true");
      card.classList.add("is-open");
    } else {
      panel.setAttribute("hidden", "");
      btn.setAttribute("aria-expanded", "false");
      card.classList.remove("is-open");
    }
  }

  function toggleDayCard(card) {
    var panel = card.querySelector(".day-card__panel");
    var closed = !panel || panel.hasAttribute("hidden");
    openDayCard(card, closed);
    if (!closed) {
      /* was open, now closed */
    } else {
      setActiveRouteIndex(card.getAttribute("data-route-index"));
    }
  }

  dayCards.forEach(function (card) {
    var header = card.querySelector(".day-card__header");
    if (!header) return;

    header.addEventListener("click", function () {
      var panel = card.querySelector(".day-card__panel");
      var willOpen = panel && panel.hasAttribute("hidden");
      if (willOpen) {
        dayCards.forEach(function (c) {
          if (c !== card) {
            openDayCard(c, false);
          }
        });
      }
      toggleDayCard(card);
      if (willOpen) {
        setActiveRouteIndex(card.getAttribute("data-route-index"));
      }
    });
  });

  routeNodes.forEach(function (node, i) {
    node.addEventListener("click", function () {
      setActiveRouteIndex(i);
      var target = null;
      for (var j = 0; j < dayCards.length; j++) {
        if (parseInt(dayCards[j].getAttribute("data-route-index"), 10) === i) {
          target = dayCards[j];
          break;
        }
      }
      if (target) {
        dayCards.forEach(function (c) {
          openDayCard(c, c === target);
        });
        scrollToEl(target);
      }
    });
  });

  /* Default: highlight Day1 route */
  setActiveRouteIndex(0);

  var routeMapFullRoute = $("#routeMapFullRoute");
  if (routeMapFullRoute) {
    routeMapFullRoute.href = buildFullRouteMapsUrl();
  }

  /* Expand all */
  var expandBtn = $("#btnExpandAll");
  if (expandBtn) {
    expandBtn.addEventListener("click", function () {
      dayCards.forEach(function (card) {
        openDayCard(card, true);
      });
      scrollToEl($("#timeline"));
    });
  }

  /* Food toggles */
  $$(".food-card__toggle").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var expanded = btn.getAttribute("aria-expanded") === "true";
      var id = btn.getAttribute("aria-controls");
      var detail = id ? document.getElementById(id) : null;
      var next = !expanded;
      btn.setAttribute("aria-expanded", next ? "true" : "false");
      if (detail) {
        if (next) {
          detail.removeAttribute("hidden");
        } else {
          detail.setAttribute("hidden", "");
        }
      }
      var hint = btn.querySelector(".food-card__hint");
      if (hint) {
        hint.textContent = next ? "收起" : "展开";
      }
    });
  });

  /* Copy route */
  var toastArea = $("#toastArea");
  var copyBtn = $("#btnCopyRoute");

  function showToast(msg) {
    if (toastArea) {
      toastArea.textContent = msg;
      window.setTimeout(function () {
        if (toastArea && toastArea.textContent === msg) {
          toastArea.textContent = "";
        }
      }, 3200);
    }
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", function () {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(ROUTE_TEXT).then(
          function () {
            showToast("路线已复制到剪贴板。");
          },
          function () {
            fallbackCopy();
          }
        );
      } else {
        fallbackCopy();
      }
    });
  }

  function fallbackCopy() {
    var ta = document.createElement("textarea");
    ta.value = ROUTE_TEXT;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast("路线已复制到剪贴板。");
    } catch (e) {
      showToast("复制失败，请手动选择文本复制。");
    }
    document.body.removeChild(ta);
  }

  /* Hero 轮播 */
  var heroCarousel = $("#heroCarousel");
  if (heroCarousel) {
    var slides = $$(".carousel__img", heroCarousel);
    var indicatorsEl = $("#carouselIndicators");
    var dots = [];
    var cIdx = 0;
    var AUTO_MS = 2000;
    var carouselTimer = null;

    if (indicatorsEl && slides.length) {
      indicatorsEl.innerHTML = "";
      slides.forEach(function (_, j) {
        var dot = document.createElement("button");
        dot.type = "button";
        dot.className = "carousel__dot" + (j === 0 ? " is-active" : "");
        dot.setAttribute("aria-label", "显示第 " + (j + 1) + " 张，共 " + slides.length + " 张");
        if (j === 0) {
          dot.setAttribute("aria-current", "true");
        }
        dot.addEventListener("click", function () {
          showSlide(j);
          startCarousel();
        });
        indicatorsEl.appendChild(dot);
      });
      dots = $$(".carousel__dot", heroCarousel);
    }

    function showSlide(i) {
      var n = slides.length;
      if (n === 0) return;
      cIdx = ((i % n) + n) % n;
      slides.forEach(function (img, j) {
        img.classList.toggle("is-active", j === cIdx);
      });
      dots.forEach(function (dot, j) {
        var on = j === cIdx;
        dot.classList.toggle("is-active", on);
        if (on) {
          dot.setAttribute("aria-current", "true");
        } else {
          dot.removeAttribute("aria-current");
        }
      });
    }

    function nextSlide() {
      showSlide(cIdx + 1);
    }

    function startCarousel() {
      if (prefersReducedMotion() || slides.length < 2) return;
      stopCarousel();
      carouselTimer = window.setInterval(nextSlide, AUTO_MS);
    }

    function stopCarousel() {
      if (carouselTimer) {
        window.clearInterval(carouselTimer);
        carouselTimer = null;
      }
    }

    heroCarousel.addEventListener("mouseenter", stopCarousel);
    heroCarousel.addEventListener("mouseleave", startCarousel);
    heroCarousel.addEventListener("focusin", stopCarousel);
    heroCarousel.addEventListener("focusout", function (ev) {
      if (!heroCarousel.contains(ev.relatedTarget)) {
        startCarousel();
      }
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        stopCarousel();
      } else {
        startCarousel();
      }
    });

    showSlide(0);
    startCarousel();
  }

  /* Budget calculator */
  var budgetToggle = $("#budgetCalcToggle");
  var budgetPanel = $("#budgetCalcPanel");
  var budgetClose = $("#budgetCalcClose");
  var budgetForm = $("#budgetCalcForm");
  var budgetCalcRoot = $("#budgetCalc");
  var budgetPerPerson = $("#budgetPerPerson");
  var budgetGroupLine = $("#budgetGroupLine");
  var budgetTwdLine = $("#budgetTwdLine");
  var TRIP_DAYS = 6;
  var TRIP_NIGHTS = 5;

  function parseNum(val, fallback) {
    var n = parseFloat(String(val));
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  }

  function formatRmb(amount) {
    return "¥" + Math.round(amount).toLocaleString("zh-CN");
  }

  function formatTwd(amount) {
    return "NT$" + Math.round(amount).toLocaleString("zh-CN");
  }

  function readBudgetForm() {
    if (!budgetForm) return null;
    var fd = new FormData(budgetForm);
    return {
      people: Math.min(10, Math.max(1, parseNum(fd.get("people"), 1))),
      rate: Math.max(3, parseNum(fd.get("rate"), 4.6)),
      stayPerNight: parseNum(fd.get("stay"), 280),
      foodDaily: parseNum(fd.get("foodDaily"), 150),
      transit: parseNum(fd.get("transit"), 800),
      easyCard: parseNum(fd.get("easyCard"), 1000),
      cash: parseNum(fd.get("cash"), 7000),
      sim: parseNum(fd.get("sim"), 120),
      extra: parseNum(fd.get("extra"), 400),
    };
  }

  function computeBudget(data) {
    var stayRmb = data.stayPerNight * TRIP_NIGHTS;
    var foodRmb = data.foodDaily * TRIP_DAYS;
    var twdPerPerson = data.easyCard + data.cash;
    var twdToRmb = twdPerPerson / data.rate;
    var rmbPerPerson =
      stayRmb + foodRmb + data.transit + data.sim + data.extra + twdToRmb;
    var groupRmb = rmbPerPerson * data.people;
    return {
      rmbPerPerson: rmbPerPerson,
      groupRmb: groupRmb,
      twdPerPerson: twdPerPerson,
      people: data.people,
    };
  }

  function renderBudget() {
    var data = readBudgetForm();
    if (!data || !budgetPerPerson) return;
    var result = computeBudget(data);
    budgetPerPerson.textContent = formatRmb(result.rmbPerPerson);
    if (budgetGroupLine) {
      budgetGroupLine.textContent =
        data.people > 1
          ? data.people + " 人合计约 " + formatRmb(result.groupRmb)
          : "单人行程合计与人均相同";
    }
    if (budgetTwdLine) {
      budgetTwdLine.textContent =
        "台币现金项 " +
        formatTwd(result.twdPerPerson) +
        " / 人（悠游卡+现金，按汇率 " +
        data.rate +
        " 折算）";
    }
  }

  function setBudgetOpen(open) {
    if (!budgetPanel || !budgetToggle) return;
    if (open) {
      budgetPanel.removeAttribute("hidden");
      budgetToggle.setAttribute("aria-expanded", "true");
      renderBudget();
    } else {
      budgetPanel.setAttribute("hidden", "");
      budgetToggle.setAttribute("aria-expanded", "false");
    }
  }

  if (budgetToggle && budgetPanel && budgetForm) {
    budgetToggle.addEventListener("click", function () {
      var isOpen = budgetToggle.getAttribute("aria-expanded") === "true";
      setBudgetOpen(!isOpen);
    });

    if (budgetClose) {
      budgetClose.addEventListener("click", function () {
        setBudgetOpen(false);
        budgetToggle.focus();
      });
    }

    budgetForm.addEventListener("input", renderBudget);
    budgetForm.addEventListener("change", renderBudget);

    document.addEventListener("click", function (ev) {
      if (
        budgetToggle.getAttribute("aria-expanded") === "true" &&
        budgetCalcRoot &&
        !budgetCalcRoot.contains(ev.target)
      ) {
        setBudgetOpen(false);
      }
    });

    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && budgetToggle.getAttribute("aria-expanded") === "true") {
        setBudgetOpen(false);
        budgetToggle.focus();
      }
    });
  }
})();
