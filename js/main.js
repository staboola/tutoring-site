(function () {
  "use strict";

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Lead tracking (GA4 + Google Ads) ----------
     A lead fires two destinations:

     1. GA4 (G-BSKJWE0SD5) — a "generate_lead" event sends straight away with
        no setup. In GA4, mark "generate_lead" as a key event
        (Admin > Events) so it counts as a conversion.
     2. Google Ads (AW-18264377431) — needed so Ads can optimise bidding.
        Create a conversion action (Goals > Conversions > New > Website),
        then paste its "Send to" value ("AW-18264377431/xxxxxxxx") below.
        Until a real label replaces the placeholder only the GA4 event fires,
        so no junk Ads data is sent while you're setting it up.

     Only the WhatsApp lead is tracked here. The contact-form "enquiry"
     conversion now fires on its own clean page load in thank-you.html
     (the form redirects there on success), which is the most reliable
     way to attribute ad-driven enquiries — so paste that label there. */
  var GA4_ID = "G-BSKJWE0SD5";
  var ADS_CONVERSIONS = {
    whatsapp: "AW-18264377431/REPLACE_WITH_WHATSAPP_LABEL"
  };
  function trackLead(method, adsKey) {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", "generate_lead", { method: method, send_to: GA4_ID });
    var sendTo = ADS_CONVERSIONS[adsKey];
    if (sendTo && sendTo.indexOf("REPLACE_WITH_") === -1) {
      window.gtag("event", "conversion", { send_to: sendTo });
    }
  }

  /* Count every WhatsApp click (contact section + sticky bar) as a lead. */
  document.querySelectorAll(".btn-whatsapp").forEach(function (el) {
    el.addEventListener("click", function () { trackLead("whatsapp", "whatsapp"); });
  });

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
    el.style.setProperty("--rd", Math.min(idx, 5) * 60 + "ms");
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

  /* ---------- Subject picker: allow multiple, but keep "Not sure yet" exclusive ----------
     The subjects are now checkboxes so a parent can pick more than one (e.g. a child
     doing both Maths and Physics, or two siblings). "Not sure yet" only makes sense on
     its own, so selecting it clears the rest, and picking any real subject clears it. */
  document.querySelectorAll(".subject-picker").forEach(function (picker) {
    var boxes = Array.prototype.slice.call(picker.querySelectorAll('input[type="checkbox"]'));
    var unsure = boxes.filter(function (b) { return b.value === "Not sure yet"; })[0];
    if (!unsure) return;
    var others = boxes.filter(function (b) { return b !== unsure; });
    unsure.addEventListener("change", function () {
      if (unsure.checked) others.forEach(function (b) { b.checked = false; });
    });
    others.forEach(function (b) {
      b.addEventListener("change", function () {
        if (b.checked) unsure.checked = false;
      });
    });
  });

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
      // Require at least one subject — a checkbox group can't be natively "required".
      if (!contactForm.querySelector('input[name="subject"]:checked')) {
        setStatus("error", "Please choose at least one subject so I know what your child needs help with.");
        var firstBox = contactForm.querySelector('input[name="subject"]');
        if (firstBox) firstBox.focus();
        return;
      }
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
        // Success: hand off to the dedicated confirmation page, which fires the
        // enquiry conversion on a clean page load. We're navigating away, so
        // there's no need to reset the form or restore the button.
        window.location.assign("thank-you.html?sent=1");
      }).catch(function () {
        setStatus("error", "Sorry, something went wrong. Please email or message me on WhatsApp instead.");
        restore();
      });
    });
  }

  /* ---------- Sticky mobile CTA: appear after the hero, hide over the contact form ---------- */
  var mobileCta = document.getElementById("mobileCta");
  if (mobileCta) {
    var heroEl = document.querySelector(".hero");
    var contactEl = document.getElementById("contact");
    var syncCta = function () {
      var pastHero = window.scrollY > (heroEl ? heroEl.offsetHeight - 140 : 420);
      var contactInView = false;
      if (contactEl) {
        var r = contactEl.getBoundingClientRect();
        contactInView = r.top < window.innerHeight * 0.9 && r.bottom > 0;
      }
      mobileCta.classList.toggle("show", pastHero && !contactInView);
    };
    window.addEventListener("scroll", syncCta, { passive: true });
    window.addEventListener("resize", syncCta);
    syncCta();
  }

  /* ---------- Revision guides: filter the listing by subject ----------
     Built from each card's existing tag, so no markup changes are needed and,
     without JS, every guide simply shows (the correct fallback). */
  (function () {
    var grid = document.querySelector(".guide-grid");
    if (!grid) return;
    var cards = Array.prototype.slice.call(grid.querySelectorAll(".guide-card"));
    if (cards.length < 6) return; // only the full listing is worth filtering
    var subjects = [];
    cards.forEach(function (card) {
      var tag = card.querySelector(".guide-tag");
      var subject = tag ? tag.textContent.trim() : "";
      card.setAttribute("data-subject", subject);
      if (subject && subjects.indexOf(subject) === -1) subjects.push(subject);
    });
    if (subjects.length < 2) return;

    var bar = document.createElement("div");
    bar.className = "guide-filter";
    bar.setAttribute("role", "group");
    bar.setAttribute("aria-label", "Filter guides by subject");
    var buttons = [];
    ["All"].concat(subjects).forEach(function (label) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "guide-filter-btn";
      btn.textContent = label;
      btn.setAttribute("aria-pressed", label === "All" ? "true" : "false");
      btn.addEventListener("click", function () {
        buttons.forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
        btn.setAttribute("aria-pressed", "true");
        cards.forEach(function (card) {
          var show = label === "All" || card.getAttribute("data-subject") === label;
          card.hidden = !show;
          if (show) card.classList.add("in"); // don't let reveal-on-scroll leave it invisible
        });
      });
      buttons.push(btn);
      bar.appendChild(btn);
    });
    grid.parentNode.insertBefore(bar, grid);
  })();

  /* ---------- Article pages: reading-progress bar + back-to-top button ---------- */
  (function () {
    if (!document.querySelector(".article")) return;

    var progress = document.createElement("div");
    progress.className = "read-progress";
    progress.setAttribute("aria-hidden", "true");
    document.body.appendChild(progress);

    var toTop = document.createElement("button");
    toTop.type = "button";
    toTop.className = "to-top";
    toTop.setAttribute("aria-label", "Back to top");
    toTop.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
    });
    document.body.appendChild(toTop);

    var update = function () {
      var doc = document.documentElement;
      var top = window.scrollY || doc.scrollTop;
      var max = doc.scrollHeight - doc.clientHeight;
      progress.style.width = (max > 0 ? (top / max) * 100 : 0) + "%";
      toTop.classList.toggle("show", top > 600);
    };
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  })();
})();
