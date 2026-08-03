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

  // 데스크톱(전환 구조 활성)에서는 갤러리가 Hero 뒤에 가려져 있어 IO만으로 부족 —
  // 마스크 전환이 시작되어 실제로 보일 때(is-gallery-visible)만 재생 허용
  var gated = window.matchMedia("(min-width: 769px)").matches;

  function visibleAllowed() {
    return !gated || document.documentElement.classList.contains("is-gallery-visible");
  }

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
        e.target.__inView = e.isIntersecting;          // 최신 교차 상태 기억
        if (e.isIntersecting && visibleAllowed()) {
          safePlay(e.target);
        } else {
          e.target.pause();               // 가려짐/화면 밖 → 정지 (currentTime은 유지)
        }
      });
    },
    { rootMargin: "200px 0px" }           // 뷰포트 200px 전부터 미리 재생
  );
  targets.forEach(function (v) {
    v.__inView = false;
    io.observe(v);
  });

  // 전환(hvt-scroll)이 is-gallery-visible을 토글한 순간 재생 상태를 다시 판정
  window.GalleryVideo = {
    refresh: function () {
      targets.forEach(function (v) {
        if (v.__inView && visibleAllowed()) {
          safePlay(v);
        } else {
          v.pause();
        }
      });
    },
  };

  window.addEventListener("pagehide", function () {
    io.disconnect();                      // 정리
  });
})();
