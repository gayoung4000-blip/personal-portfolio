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
