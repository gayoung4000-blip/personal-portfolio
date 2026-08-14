(function () {
  "use strict";

  var root = document.documentElement;
  var openButton = document.getElementById("inappButton");
  var viewer = document.getElementById("inappViewer");
  var closeButton = document.getElementById("inappClose");
  var frame = document.getElementById("inappFrame");

  if (!openButton || !viewer || !closeButton || !frame) return;

  function openViewer() {
    if (!frame.getAttribute("src")) frame.src = frame.dataset.src;
    root.classList.add("is-inapp-open");
    viewer.setAttribute("aria-hidden", "false");
    closeButton.focus();
  }

  function closeViewer() {
    root.classList.remove("is-inapp-open");
    viewer.setAttribute("aria-hidden", "true");
    openButton.focus();
  }

  frame.addEventListener("load", function () {
    viewer.classList.add("is-loaded");
  });

  openButton.addEventListener("click", openViewer);
  closeButton.addEventListener("click", closeViewer);

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && root.classList.contains("is-inapp-open")) {
      closeViewer();
    }
  });
})();
