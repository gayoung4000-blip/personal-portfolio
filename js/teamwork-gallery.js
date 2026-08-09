(function () {
  "use strict";

  var gallery = document.querySelector(".teamwork__gallery");
  var track = document.getElementById("teamworkTrack");
  var prev = document.querySelector(".teamwork__prev");
  var next = document.querySelector(".teamwork__next");
  if (!gallery || !track || !prev || !next) return;

  var cards = Array.prototype.slice.call(track.querySelectorAll(".teamwork__card"));
  var positions = [0];
  var index = 0;

  function measure() {
    var maxOffset = Math.max(0, track.scrollWidth - gallery.clientWidth);
    var firstCardOffset = cards.length ? cards[0].offsetLeft : 0;
    positions = cards.map(function (card) {
      return Math.min(card.offsetLeft - firstCardOffset, maxOffset);
    }).filter(function (value, position, list) {
      return position === 0 || Math.abs(value - list[position - 1]) > 4;
    });
    if (positions[positions.length - 1] !== maxOffset) positions.push(maxOffset);
    index = Math.min(index, positions.length - 1);
    render(false);
  }

  function render(animate) {
    track.style.transitionDuration = animate ? "720ms" : "0ms";
    track.style.transform = "translate3d(" + -positions[index] + "px, 0, 0)";
    prev.disabled = index === 0;
    next.disabled = index === positions.length - 1;
  }

  prev.addEventListener("click", function () {
    if (index > 0) { index -= 1; render(true); }
  });

  next.addEventListener("click", function () {
    if (index < positions.length - 1) { index += 1; render(true); }
  });

  window.addEventListener("resize", measure, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  measure();
})();
