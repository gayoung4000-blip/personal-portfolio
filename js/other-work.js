(function () {
  "use strict";

  var section = document.getElementById("other-work");
  var title = document.querySelector(".other-work__title");
  var description = document.querySelector(".other-work__description");
  if (!section || !title) return;

  var characterIndex = 0;
  Array.prototype.forEach.call(title.querySelectorAll(":scope > span"), function (line) {
    var textNodes = [];
    var walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) textNodes.push(node);

    textNodes.forEach(function (textNode) {
      var fragment = document.createDocumentFragment();
      Array.from(textNode.nodeValue).forEach(function (character) {
        var span = document.createElement("span");
        span.className = "other-work__char";
        span.textContent = character === " " ? "\u00a0" : character;
        span.style.setProperty("--other-char-index", characterIndex);
        characterIndex += 1;
        fragment.appendChild(span);
      });
      textNode.parentNode.replaceChild(fragment, textNode);
    });
  });

  if (description) {
    var descriptionNodes = [];
    var descriptionWalker = document.createTreeWalker(description, NodeFilter.SHOW_TEXT);
    var descriptionNode;
    while ((descriptionNode = descriptionWalker.nextNode())) descriptionNodes.push(descriptionNode);

    var descriptionIndex = 0;
    descriptionNodes.forEach(function (textNode) {
      var fragment = document.createDocumentFragment();
      var normalizedText = textNode.nodeValue.replace(/\s+/g, " ").trim();
      Array.from(normalizedText).forEach(function (character) {
        var span = document.createElement("span");
        span.className = "other-work__description-char";
        span.textContent = character === " " ? "\u00a0" : character;
        span.style.setProperty("--other-description-index", descriptionIndex);
        descriptionIndex += 1;
        fragment.appendChild(span);
      });
      textNode.parentNode.replaceChild(fragment, textNode);
    });

    section.style.setProperty("--other-description-count", descriptionIndex);
  }

  function reveal() {
    if (section.classList.contains("is-other-work-revealed")) return;
    section.classList.add("is-other-work-revealed");
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    section.style.setProperty("--other-work-fill", "0%");
    reveal();
    return;
  }

  if (window.gsap && window.ScrollTrigger) {
    window.gsap.registerPlugin(window.ScrollTrigger);
    window.gsap.to(section, {
      "--other-work-fill": "0%",
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top 92%",
        end: "top 28%",
        scrub: 0.45,
        onUpdate: function (self) {
          if (self.progress >= 0.48) reveal();
        },
        onLeave: reveal
      }
    });
    return;
  }

  section.style.setProperty("--other-work-fill", "0%");
  reveal();
})();
