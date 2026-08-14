(function () {
  "use strict";

  var section = document.querySelector(".contact-lead");
  var text = document.querySelector(".contact-lead__text");
  if (!section || !text) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduceMotion.matches || !window.gsap || !window.ScrollTrigger) {
    section.classList.add("is-contact-lead-ready");
    return;
  }

  window.gsap.registerPlugin(window.ScrollTrigger);

  var readableText = text.textContent;
  var fragment = document.createDocumentFragment();
  Array.from(readableText).forEach(function (character, index) {
    var span = document.createElement("span");
    span.className = "contact-lead__char";
    span.setAttribute("aria-hidden", "true");
    span.dataset.charIndex = index;
    span.textContent = character === " " ? "\u00a0" : character;
    fragment.appendChild(span);
  });
  text.textContent = "";
  text.setAttribute("aria-label", readableText);
  text.appendChild(fragment);

  var characters = window.gsap.utils.toArray(".contact-lead__char");

  var edgeSpace = function () {
    return Math.max(32, window.innerWidth * 0.12);
  };

  var assembledX = function () {
    return Math.max(24, window.innerWidth * 0.1);
  };
  var exitX = function () {
    return -text.scrollWidth - edgeSpace();
  };

  var characterStartX = function (index, element) {
    var finalLeft = assembledX() + element.offsetLeft;
    return window.innerWidth + edgeSpace() + index * Math.max(12, window.innerWidth * 0.012) - finalLeft;
  };
  var characterStartY = function (index) {
    var offsets = [1.12, 0.96, 1.2, 1.02, 1.16];
    return -window.innerHeight * offsets[index % offsets.length];
  };
  var characterStartRotation = function (index) {
    var rotations = [-14, 9, -7, 16, -11, 6];
    return rotations[index % rotations.length];
  };

  window.gsap.set(text, { x: assembledX, y: 0, yPercent: -50 });
  window.gsap.set(characters, { autoAlpha: 1 });
  section.classList.add("is-contact-lead-ready");

  var timeline = window.gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: "top 85%",
      end: "bottom bottom",
      scrub: 1.15,
      invalidateOnRefresh: true
    }
  });

  timeline
    .fromTo(text, {
      x: assembledX,
      y: 0,
      yPercent: -50
    }, {
      x: assembledX,
      y: 0,
      yPercent: -50,
      duration: 2.2,
      ease: "none"
    }, 0)
    .fromTo(characters, {
      x: characterStartX,
      y: characterStartY,
      scale: function (index) { return index % 3 === 0 ? 1.12 : 0.88; },
      rotation: characterStartRotation,
      transformOrigin: "50% 70%"
    }, {
      autoAlpha: 1,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      duration: 0.8,
      stagger: 0.04,
      ease: "back.out(1.9)"
    }, 0)
    .to(text, {
      x: exitX,
      y: 0,
      duration: 0.9,
      ease: "none"
    }, 2.22);

  var refresh = function () {
    window.ScrollTrigger.refresh();
  };

  window.addEventListener("load", refresh, { once: true });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(refresh);
  }
})();
