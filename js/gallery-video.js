// ==========================================================
// 영상 갤러리 재생 제어
// - IntersectionObserver: 섹션이 화면에 가까워지면 재생, 멀어지면 일시정지
// - play() promise 실패는 조용히 무시 → poster가 그대로 보임
// - 터치 기기: data-mobile-play 붙은 핵심 영상만 재생 (나머지는 poster)
// - prefers-reduced-motion: 자동 재생 안 함
// ==========================================================
(function () {
  "use strict";

  var vids = Array.prototype.slice.call(
    document.querySelectorAll(".vgallery__item video")
  );
  if (!vids.length) return;

  var touch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function safePlay(v) {
    var p = v.play();
    if (p && typeof p.catch === "function") p.catch(function () {});
  }

  // 재생 대상 선별 — 제외 대상은 autoplay 제거로 다운로드/재생 방지 (poster 유지)
  var targets = [];
  vids.forEach(function (v) {
    var excluded = reduced || (touch && !v.hasAttribute("data-mobile-play"));
    if (excluded) {
      v.removeAttribute("autoplay");
      v.pause();
    } else {
      targets.push(v);
    }
  });
  if (!targets.length) return;

  if (!("IntersectionObserver" in window)) {
    targets.forEach(safePlay);            // 구형 브라우저: 그냥 재생
    return;
  }

  var io = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          safePlay(e.target);
        } else {
          e.target.pause();               // 화면에서 멀어지면 정지
        }
      });
    },
    { rootMargin: "200px 0px" }           // 뷰포트 200px 전부터 미리 재생
  );
  targets.forEach(function (v) {
    io.observe(v);
  });

  window.addEventListener("pagehide", function () {
    io.disconnect();                      // 정리
  });
})();

// Temporary Journey patch for the production GitHub deploy path.
// This file loads before vlogo.js, so the injected image/style exist before GSAP resolves targets.
(function () {
  "use strict";

  var style = document.createElement("style");
  style.textContent = [
    ".journey__huge-text .tracking-wide{letter-spacing:-4px!important}",
    ".journey__pastels{position:relative}",
    ".journey__pastels-swap{position:absolute!important;inset:0;width:100%!important;height:100%!important;object-fit:cover;object-position:center;opacity:1;clip-path:inset(100% 0 0 0);z-index:2!important;will-change:clip-path,transform}"
  ].join("");
  document.head.appendChild(style);

  function ensurePastelsSwap() {
    var pastelsFrame = document.querySelector(".journey__pastels");
    if (!pastelsFrame || pastelsFrame.querySelector(".journey__pastels-swap")) return;

    var swap = document.createElement("img");
    swap.src = "img/2.img.png";
    swap.alt = "";
    swap.className = "journey__img-content journey__pastels-swap";
    swap.loading = "eager";
    swap.decoding = "async";
    swap.setAttribute("aria-hidden", "true");
    pastelsFrame.appendChild(swap);
  }

  ensurePastelsSwap();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensurePastelsSwap, { once: true });
  }

})();
