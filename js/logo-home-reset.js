(function () {
  "use strict";

  var logo = document.querySelector(".global-header__logo");
  var homeLinks = document.querySelectorAll('.global-header__nav a[href="#home"], .journey-menu-panel__nav a[href="#home"]');
  var aboutLinks = document.querySelectorAll('.global-header__nav a[href="#about"], .journey-menu-panel__nav a[href="#about"]');
  var aboutPhoto = document.querySelector(".about__photo");
  var processLinks = document.querySelectorAll('.global-header__nav a[href="#journey"], .journey-menu-panel__nav a[href="#journey"]');
  var journey = document.querySelector("#journey");
  var projectLinks = document.querySelectorAll('.global-header__nav a[href="#project"], .journey-menu-panel__nav a[href="#project"]');
  var workPage = document.querySelector("#project");
  var resetKey = "portfolio-reset-to-intro";

  function resetScrollPosition() {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
  }

  if (sessionStorage.getItem(resetKey) === "true") {
    sessionStorage.removeItem(resetKey);
    resetScrollPosition();
    window.addEventListener("pageshow", resetScrollPosition, { once: true });
    window.addEventListener("load", resetScrollPosition, { once: true });
  }

  if (!logo) return;

  homeLinks.forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();

      if (window.location.hash) {
        history.replaceState(null, "", window.location.pathname + window.location.search);
      }

      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      if (window.ScrollTrigger) ScrollTrigger.update();
    });
  });

  if (aboutPhoto) aboutLinks.forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();

      var photoRect = aboutPhoto.getBoundingClientRect();
      var target = window.scrollY + photoRect.top + photoRect.height / 2 - window.innerHeight / 2;

      history.replaceState(null, "", "#about");
      window.scrollTo({ top: Math.max(0, target), left: 0, behavior: "auto" });
      if (window.ScrollTrigger) {
        ScrollTrigger.update();
        requestAnimationFrame(function () {
          ScrollTrigger.refresh();
        });
      }
    });
  });

  if (journey) processLinks.forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();

      var target = window.scrollY + journey.getBoundingClientRect().top;
      history.replaceState(null, "", "#journey");
      window.scrollTo({ top: Math.max(0, target), left: 0, behavior: "auto" });
      if (window.ScrollTrigger) ScrollTrigger.update();
    });
  });

  if (workPage) projectLinks.forEach(function (link) {
    link.addEventListener("click", function (event) {
      event.preventDefault();

      var target = window.scrollY + workPage.getBoundingClientRect().top;
      history.replaceState(null, "", "#project");
      window.scrollTo({ top: Math.max(0, target), left: 0, behavior: "auto" });
      if (window.ScrollTrigger) ScrollTrigger.update();
    });
  });

  logo.addEventListener("click", function (event) {
    event.preventDefault();
    sessionStorage.setItem(resetKey, "true");
    resetScrollPosition();
    window.location.reload();
  });
})();
