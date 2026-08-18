(function () {
  "use strict";

  var sequence = document.querySelector(".case-studies-sequence");
  var section = document.querySelector(".case-studies-intro");
  var headline = document.querySelector(".case-studies-intro__headline");
  var subtitle = document.querySelector(".case-studies-intro__subtitle");
  var card = document.querySelector(".study-case__card");
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!sequence || !section || !headline || !subtitle || !card) return;
  if (reducedMotion || !window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  function splitCharacters(element, lineIndex) {
    var text = element.textContent;
    var fragment = document.createDocumentFragment();

    element.setAttribute("aria-label", text);
    element.textContent = "";

    Array.from(text).forEach(function (character, characterIndex) {
      var span = document.createElement("span");
      span.className = "case-studies-intro__char";
      span.setAttribute("aria-hidden", "true");
      span.dataset.line = String(lineIndex);
      span.dataset.character = String(characterIndex);
      span.dataset.space = character === " " ? "true" : "false";
      span.textContent = character === " " ? "\u00a0" : character;
      fragment.appendChild(span);
    });

    element.appendChild(fragment);
  }

  function shuffleDeterministically(items) {
    var result = items.slice();
    var seed = 4185;

    function random() {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }

    for (var index = result.length - 1; index > 0; index -= 1) {
      var swapIndex = Math.floor(random() * (index + 1));
      var current = result[index];
      result[index] = result[swapIndex];
      result[swapIndex] = current;
    }

    return result;
  }

  function seededValue(index, salt) {
    var value = Math.sin((index + 1) * (12.9898 + salt * 7.233)) * 43758.5453;
    return value - Math.floor(value);
  }

  function getFlight(character, index, characterCount) {
    var rect = character.getBoundingClientRect();
    var centerX = rect.left + rect.width / 2;
    var centerY = rect.top + rect.height / 2;
    var dx = centerX - window.innerWidth / 2;
    var dy = centerY - window.innerHeight / 2;
    var length = Math.hypot(dx, dy);

    if (length < 1) {
      var fallbackAngle = index / Math.max(characterCount, 1) * Math.PI * 2;
      dx = Math.cos(fallbackAngle);
      dy = Math.sin(fallbackAngle);
      length = 1;
    }

    var diagonal = Math.hypot(window.innerWidth, window.innerHeight);
    var distance = diagonal * (0.58 + seededValue(index, 1) * 0.2);
    var tangentX = -dy / length;
    var tangentY = dx / length;
    var drift = (seededValue(index, 2) - 0.5) * diagonal * 0.1;

    return {
      x: dx / length * distance + tangentX * drift,
      y: dy / length * distance + tangentY * drift,
      rotation: (seededValue(index, 3) - 0.5) * 190,
      scale: 0.95 + seededValue(index, 4) * 0.35,
    };
  }

  function initialize() {
    splitCharacters(headline, 0);
    splitCharacters(subtitle, 1);

    var characters = gsap.utils.toArray(".case-studies-intro__char", section);
    var naturalWidths = characters.map(function (character) {
      return character.getBoundingClientRect().width;
    });
    var revealOrder = shuffleDeterministically(characters.reduce(function (indexes, character, index) {
      if (character.dataset.space !== "true") indexes.push(index);
      return indexes;
    }, []));
    var revealedSpaces = {};

    gsap.set(characters, {
      width: 0,
      autoAlpha: 0,
      scale: 0.82,
      y: function (index) {
        return index % 2 === 0 ? -10 : 10;
      },
      willChange: "width, transform, opacity",
    });
    gsap.set(card, {
      autoAlpha: 0,
      scale: 0.78,
      transformOrigin: "50% 50%",
      willChange: "transform, opacity",
    });

    document.documentElement.classList.add("is-case-studies-assembly");

    var timeline = gsap.timeline({
      scrollTrigger: {
        trigger: sequence,
        start: "top top",
        end: "+=480%",
        pin: true,
        scrub: 0.65,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    });

    timeline.to({}, { duration: 0.18 });

    revealOrder.forEach(function (characterIndex, orderIndex) {
      var character = characters[characterIndex];
      var start = 0.18 + orderIndex * 0.042;
      var previousCharacter = characters[characterIndex - 1];

      timeline.set(character, {
        width: naturalWidths[characterIndex],
        autoAlpha: 1,
        scale: 1,
        y: 0,
      }, start);

      if (previousCharacter && previousCharacter.dataset.space === "true" && !revealedSpaces[characterIndex - 1]) {
        revealedSpaces[characterIndex - 1] = true;
        timeline.set(previousCharacter, {
          width: naturalWidths[characterIndex - 1],
          autoAlpha: 1,
          scale: 1,
          y: 0,
        }, start);
      }
    });

    var assemblyEnd = 0.18 + Math.max(revealOrder.length - 1, 0) * 0.042;
    var scatterStart = assemblyEnd + 0.36;

    timeline
      .to({}, { duration: 0.34 })
      .to(characters, {
        x: function (index, character) {
          return getFlight(character, index, characters.length).x;
        },
        y: function (index, character) {
          return getFlight(character, index, characters.length).y;
        },
        rotation: function (index, character) {
          return getFlight(character, index, characters.length).rotation;
        },
        scale: function (index, character) {
          return getFlight(character, index, characters.length).scale;
        },
        duration: 0.62,
        ease: "power2.in",
      }, scatterStart)
      .set(card, {
        autoAlpha: 1,
      }, scatterStart + 0.08)
      .to(card, {
        scale: 1,
        duration: 0.12,
        ease: "back.out(1.35)",
      }, scatterStart + 0.08)
      .to(characters, {
        autoAlpha: 0,
        duration: 0.1,
        ease: "power2.out",
      }, scatterStart + 0.82)
      .to({}, { duration: 0.34 });

    window.addEventListener("pagehide", function () {
      if (timeline.scrollTrigger) timeline.scrollTrigger.kill();
      timeline.kill();
    }, { once: true });

    ScrollTrigger.refresh();
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(initialize);
  } else {
    initialize();
  }
})();
