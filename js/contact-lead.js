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

  var wallX = function () {
    return window.innerWidth * 0.985;
  };
  var assembledThrough = function (index) {
    var character = characters[index];
    return wallX() - character.offsetLeft - character.offsetWidth;
  };
  var exitX = function () {
    return -text.scrollWidth - edgeSpace();
  };

  var characterStartX = function (index) {
    var wallOffsets = [26, 38, 18, 44, 30, 21, 35, 24];
    return wallOffsets[index % wallOffsets.length];
  };
  var characterStartY = function (index) {
    var verticalOffsets = [-24, 17, -11, 28, -19, 9, -31, 21];
    return verticalOffsets[index % verticalOffsets.length];
  };
  var characterStartRotation = function (index) {
    var rotations = [-14, 9, -6, 18, -11, 5, 13, -8];
    return rotations[index % rotations.length];
  };

  var entranceGaps = [0.42, 0.31, 0.49, 0.36, 0.55, 0.29, 0.46, 0.38];
  var entranceDurations = [1.62, 1.24, 1.78, 1.38, 1.9, 1.31, 1.7, 1.46];
  var entranceScales = [1.08, 0.92, 1.04, 0.88, 1.07, 0.95, 1.1, 0.91];
  var entranceBounces = [2.35, 1.65, 2.05, 1.8, 2.5, 1.7, 2.2, 1.9];
  var entranceTimes = [];
  var entranceCursor = 0;

  characters.forEach(function (character, index) {
    entranceTimes[index] = entranceCursor;
    entranceCursor += entranceGaps[index % entranceGaps.length];
  });

  var flowEnd = entranceCursor + 1.9;

  window.gsap.set(text, { x: function () { return assembledThrough(0); }, y: 0, yPercent: -50 });
  window.gsap.set(characters, { autoAlpha: 0 });
  section.classList.add("is-contact-lead-ready");

  var timeline = window.gsap.timeline({
    scrollTrigger: {
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      scrub: 1.15,
      invalidateOnRefresh: true
    }
  });

  characters.forEach(function (character, index) {
    if (index > 0) {
      timeline.to(text, {
        x: function () { return assembledThrough(index); },
        duration: entranceGaps[index % entranceGaps.length] * 1.35,
        ease: "power2.inOut"
      }, entranceTimes[index]);
    }

    timeline.fromTo(character, {
      autoAlpha: 0,
      x: function () { return characterStartX(index); },
      y: function () { return characterStartY(index); },
      scale: entranceScales[index % entranceScales.length],
      rotation: characterStartRotation(index),
      transformOrigin: index % 2 === 0 ? "35% 75%" : "70% 35%"
    }, {
      autoAlpha: 1,
      x: 0,
      y: 0,
      scale: 1,
      rotation: 0,
      duration: entranceDurations[index % entranceDurations.length],
      ease: "back.out(" + entranceBounces[index % entranceBounces.length] + ")"
    }, entranceTimes[index] + 0.04);
  });

  timeline.to(text, {
      x: exitX,
      y: 0,
      duration: 1.15,
      ease: "none"
    }, flowEnd + 0.25);

  var refresh = function () {
    window.ScrollTrigger.refresh();
  };

  window.addEventListener("load", refresh, { once: true });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(refresh);
  }
})();
