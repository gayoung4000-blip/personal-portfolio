(function () {
  "use strict";

  var closeLink = document.querySelector("[data-case-study-close]");
  var isEmbedded = new URLSearchParams(window.location.search).get("embed") === "1";

  if (!closeLink || !isEmbedded || window.parent === window) return;

  closeLink.addEventListener("click", function (event) {
    event.preventDefault();
    window.parent.postMessage("close-pumto-case-study", window.location.origin);
  });
})();
