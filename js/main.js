(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Mobile nav ---------- */
  var toggle = document.getElementById("navToggle");
  var links = document.getElementById("navLinks");
  function closeNav() {
    if (!links || !toggle) return;
    links.classList.remove("open");
    toggle.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.classList.toggle("open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", closeNav);
    });
  }

  /* ---------- Condense nav once the page scrolls ---------- */
  var nav = document.querySelector(".nav");
  if (nav) {
    var onScroll = function () { nav.classList.toggle("scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Staggered reveal-on-scroll ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  // Give each element a delay based on its position within its group of siblings.
  revealEls.forEach(function (el) {
    var parent = el.parentElement;
    if (!parent) return;
    var group = Array.prototype.filter.call(parent.children, function (c) {
      return c.classList && c.classList.contains("reveal");
    });
    var idx = group.indexOf(el);
    el.style.setProperty("--rd", Math.min(idx, 6) * 90 + "ms");
  });
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Scroll-spy: highlight the nav link for the section in view ---------- */
  var navMap = {};
  document.querySelectorAll(".nav-links a").forEach(function (a) {
    var href = a.getAttribute("href") || "";
    if (href.charAt(0) === "#" && href.length > 1) navMap[href.slice(1)] = a;
  });
  var spySections = document.querySelectorAll("main section[id]");
  if ("IntersectionObserver" in window && spySections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        for (var key in navMap) navMap[key].classList.remove("active");
        if (navMap[entry.target.id]) navMap[entry.target.id].classList.add("active");
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    spySections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- Count-up stats ---------- */
  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var suffix = el.getAttribute("data-suffix") || "";
    if (isNaN(target)) return;
    var dur = 1300, startT = null;
    function step(ts) {
      if (startT === null) startT = ts;
      var p = Math.min((ts - startT) / dur, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(target * eased) + suffix;
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = target + suffix;
    }
    requestAnimationFrame(step);
  }
  var statWrap = document.querySelector(".stats");
  var countEls = document.querySelectorAll(".stat strong[data-count]");
  if (statWrap && countEls.length && "IntersectionObserver" in window && !reduce) {
    var statObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          countEls.forEach(countUp);
          statObs.disconnect();
        }
      });
    }, { threshold: 0.4 });
    statObs.observe(statWrap);
  }

  /* ---------- Contact form: AJAX submit with graceful fallback ---------- */
  // The submit event only fires once the browser's native validation passes.
  // Without fetch we leave the default POST to FormSubmit in place.
  var contactForm = document.getElementById("contactForm");
  if (contactForm && window.fetch) {
    var statusEl = contactForm.querySelector(".form-status");
    var submitBtn = contactForm.querySelector('button[type="submit"]');
    var setStatus = function (type, msg) {
      if (!statusEl) return;
      statusEl.textContent = msg;
      statusEl.className = "form-status" + (type ? " form-status--" + type : "");
    };
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var ajaxUrl = contactForm.action.replace("formsubmit.co/", "formsubmit.co/ajax/");
      var defaultLabel = submitBtn ? submitBtn.textContent : "";
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Sending…"; }
      setStatus("", "");
      var restore = function () {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = defaultLabel; }
      };
      fetch(ajaxUrl, {
        method: "POST",
        headers: { "Accept": "application/json" },
        body: new FormData(contactForm)
      }).then(function (res) {
        if (!res.ok) throw new Error("Request failed");
        contactForm.reset();
        setStatus("success", "Thanks — your message is on its way. I'll usually reply within a day.");
        restore();
      }).catch(function () {
        setStatus("error", "Sorry, something went wrong. Please email or message me on WhatsApp instead.");
        restore();
      });
    });
  }
})();
