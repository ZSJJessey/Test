(function () {
  "use strict";

  var ROUTE_TEXT =
    "台北 → 淡水 → 九份 → 日月潭 → 阿里山 → 桃园\n" +
    "Day1 抵达·西门町·象山 | Day2 淡水 | Day3 故宫·九份 | Day4 日月潭 | Day5 阿里山 | Day6 日出·返程·桃园";

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

  function setActiveRouteIndex(index) {
    var idx = parseInt(String(index), 10);
    if (Number.isNaN(idx)) return;

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
})();
