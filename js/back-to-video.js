(function () {
  "use strict";

  var button = document.querySelector(".back-to-video");
  var heroTrack = document.querySelector(".hvt");
  var gallery = document.querySelector("#gallery");
  var footer = document.querySelector(".site-footer");
  if (!button || !heroTrack || !gallery || !footer) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var desktop = window.matchMedia("(min-width: 769px)");

  function getDesktopTarget() {
    if (!window.ScrollTrigger) return heroTrack.offsetTop;

    var heroTrigger = ScrollTrigger.getAll().find(function (trigger) {
      return trigger.trigger === heroTrack && trigger.animation;
    });

    if (!heroTrigger || !heroTrigger.animation) return heroTrack.offsetTop;

    // The right-hand gallery video finishes expanding at 1.7 on the hero timeline.
    var fullScreenTime = Math.min(1.7, heroTrigger.animation.duration());
    var progress = fullScreenTime / heroTrigger.animation.duration();
    return heroTrigger.start + (heroTrigger.end - heroTrigger.start) * progress;
  }

  function getTarget() {
    return desktop.matches ? getDesktopTarget() : gallery.offsetTop;
  }

  button.addEventListener("click", function () {
    window.scrollTo({
      top: Math.max(0, getTarget()),
      behavior: reduceMotion.matches ? "auto" : "smooth",
    });
  });

  var footerObserver = new IntersectionObserver(function (entries) {
    button.classList.toggle("is-visible", entries[0].isIntersecting);
  }, { threshold: 0.02 });

  footerObserver.observe(footer);
})();
