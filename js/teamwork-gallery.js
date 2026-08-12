(function () {
  "use strict";

  var track = document.getElementById("teamworkTrack");
  var prev = document.querySelector(".teamwork__prev");
  var next = document.querySelector(".teamwork__next");
  if (!track || !prev || !next) return;

  var originalCards = Array.prototype.slice.call(track.querySelectorAll(".teamwork__card"));
  var cardCount = originalCards.length;
  var currentIndex = cardCount;
  var changing = false;
  var section = document.getElementById("teamwork");
  var titleLines = Array.prototype.slice.call(document.querySelectorAll(".teamwork__title-line"));
  var description = document.querySelector(".teamwork__heading p");
  var videoButton = document.querySelector(".teamwork__video");
  var navButtons = Array.prototype.slice.call(document.querySelectorAll(".teamwork__prev, .teamwork__next"));
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function splitIntoCharacters(element) {
    var textNodes = [];
    var walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    var node;

    while ((node = walker.nextNode())) textNodes.push(node);

    var characterIndex = 0;
    textNodes.forEach(function (textNode) {
      var fragment = document.createDocumentFragment();
      Array.from(textNode.nodeValue).forEach(function (character) {
        var span = document.createElement("span");
        span.className = "teamwork__char";
        span.textContent = character === " " ? "\u00a0" : character;
        span.style.setProperty("--char-index", characterIndex);
        characterIndex += 1;
        fragment.appendChild(span);
      });
      textNode.parentNode.replaceChild(fragment, textNode);
    });
  }

  titleLines.forEach(splitIntoCharacters);
  if (description) splitIntoCharacters(description);

  function makeClone(card) {
    var clone = card.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    clone.classList.add("teamwork__card--clone");
    return clone;
  }

  var before = document.createDocumentFragment();
  var after = document.createDocumentFragment();
  originalCards.forEach(function (card) { before.appendChild(makeClone(card)); });
  originalCards.forEach(function (card) { after.appendChild(makeClone(card)); });
  track.insertBefore(before, track.firstChild);
  track.appendChild(after);

  var visibleCards = Array.prototype.slice.call(track.querySelectorAll(".teamwork__card:not(.teamwork__card--clone)"));
  visibleCards.forEach(function (card, index) {
    card.style.setProperty("--card-delay", 4100 + index * 250 + "ms");
  });

  function allCards() {
    return Array.prototype.slice.call(track.querySelectorAll(".teamwork__card"));
  }

  function positionFor(index) {
    var cards = allCards();
    return -(cards[index].offsetLeft - cards[0].offsetLeft);
  }

  function render(animate) {
    track.style.transitionDuration = animate ? "680ms" : "0ms";
    track.style.transform = "translate3d(" + positionFor(currentIndex) + "px, 0, 0)";
  }

  function rotate(direction) {
    if (changing || !cardCount) return;
    changing = true;
    currentIndex += direction;
    render(true);

    window.setTimeout(function () {
      if (currentIndex >= cardCount * 2) currentIndex = cardCount;
      if (currentIndex < cardCount) currentIndex = cardCount * 2 - 1;
      render(false);
      changing = false;
    }, 720);
  }

  function revealTeamwork() {
    if (!section || section.classList.contains("is-teamwork-revealed")) return;
    section.classList.add("is-teamwork-revealed");
  }

  if (section) {
    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealTeamwork();
    } else {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          revealTeamwork();
          observer.disconnect();
        });
      }, { threshold: 0.12 });
      observer.observe(section);
    }
  }

  prev.addEventListener("click", function () {
    rotate(-1);
  });

  next.addEventListener("click", function () {
    rotate(1);
  });

  window.addEventListener("resize", function () { render(false); }, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { render(false); });
  render(false);
})();
