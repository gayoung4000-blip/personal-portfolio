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
    var nextOffset = (offset + direction + images.length) % images.length;
    var directionName = direction > 0 ? "next" : "prev";

    cards.forEach(function (card, cardIndex) {
      var current = card.querySelector("img");
      var content = images[(cardIndex + nextOffset) % images.length];
      var incoming = document.createElement("img");
      current.classList.add("teamwork__image--current");
      incoming.src = content.src;
      incoming.alt = content.alt;
      incoming.className = "teamwork__image--incoming-" + directionName;
      card.appendChild(incoming);
    });

    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        cards.forEach(function (card) {
          card.classList.add("is-sliding-" + directionName);
        });
      });
    });

    window.setTimeout(function () {
      cards.forEach(function (card) {
        var current = card.querySelector(".teamwork__image--current");
        var incoming = card.querySelector(".teamwork__image--incoming-" + directionName);
        if (current) current.remove();
        if (incoming) incoming.className = "";
        card.classList.remove("is-sliding-next", "is-sliding-prev");
      });
      offset = nextOffset;
      changing = false;
    }, 650);
  }

  prev.addEventListener("click", function () {
    rotate(-1);
  });

  next.addEventListener("click", function () {
    rotate(1);
  });
})();
