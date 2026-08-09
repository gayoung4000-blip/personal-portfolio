(function () {
  "use strict";

  var track = document.getElementById("teamworkTrack");
  var prev = document.querySelector(".teamwork__prev");
  var next = document.querySelector(".teamwork__next");
  if (!track || !prev || !next) return;

  var cards = Array.prototype.slice.call(track.querySelectorAll(".teamwork__card"));
  var images = cards.map(function (card) {
    var image = card.querySelector("img");
    return { src: image.getAttribute("src"), alt: image.getAttribute("alt") };
  });
  var offset = 0;
  var changing = false;

  function rotate(direction) {
    if (changing || !images.length) return;
    changing = true;
    offset = (offset + direction + images.length) % images.length;
    cards.forEach(function (card) { card.classList.add("is-changing"); });

    window.setTimeout(function () {
      cards.forEach(function (card, cardIndex) {
        var image = card.querySelector("img");
        var content = images[(cardIndex + offset) % images.length];
        image.src = content.src;
        image.alt = content.alt;
      });

      window.requestAnimationFrame(function () {
        cards.forEach(function (card) { card.classList.remove("is-changing"); });
        window.setTimeout(function () { changing = false; }, 360);
      });
    }, 220);
  }

  prev.addEventListener("click", function () {
    rotate(-1);
  });

  next.addEventListener("click", function () {
    rotate(1);
  });
})();
