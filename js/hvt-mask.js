// ==========================================================
// 영상 마스크 로고 좌표 동기화 (VideoMaskLogoLayer)
// - 마스크 구멍(--hole-*)을 검은 로고 SVG의 실제 bounding rect와
//   항상 일치시킴 → 두 로고가 같은 좌표계를 공유 (고정 px 없음)
// - ResizeObserver + resize로 리사이즈 시 즉시 재계산
// - 레이어 표시/전환 제어는 6단계에서 함 (여기서는 좌표만)
// ==========================================================
(function () {
  "use strict";

  // 공식 확대 초점 — LogoStage(.hero2__mark) 내부 정규화 좌표. source of truth.
  // viewport 중앙·bbox 중앙·무게중심·Primary 실측값으로 대체 금지.
  window.HVT_FOCAL = { x: 0.555, y: 0.515 };

  var sticky = document.querySelector(".hvt__sticky");
  var svg = document.querySelector(".hero2 svg.mark");
  var mark = document.querySelector(".hero2__mark");
  var layer = document.querySelector(".hvt__masklogo");
  if (!sticky || !svg || !mark || !layer) return;

  function update() {
    var base = sticky.getBoundingClientRect();
    var s = svg.getBoundingClientRect();   // opacity와 무관하게 레이아웃 좌표 유지됨
    layer.style.setProperty("--hole-x", (s.left - base.left).toFixed(2) + "px");
    layer.style.setProperty("--hole-y", (s.top - base.top).toFixed(2) + "px");
    layer.style.setProperty("--hole-w", s.width.toFixed(2) + "px");
    layer.style.setProperty("--hole-h", s.height.toFixed(2) + "px");

    // 확정 초점: LogoStage 정규화 → viewport → 마스크 로컬 좌표로 명시적 변환
    var m = mark.getBoundingClientRect();
    var focalViewportX = m.left + m.width * window.HVT_FOCAL.x;
    var focalViewportY = m.top + m.height * window.HVT_FOCAL.y;
    layer.style.setProperty("--focal-x", (focalViewportX - base.left).toFixed(2) + "px");
    layer.style.setProperty("--focal-y", (focalViewportY - base.top).toFixed(2) + "px");
  }

  update();
  window.addEventListener("resize", update);
  var ro;
  if (window.ResizeObserver) {
    ro = new ResizeObserver(update);
    ro.observe(mark);
    ro.observe(sticky);
  }
  window.addEventListener("pagehide", function () {
    window.removeEventListener("resize", update);
    if (ro) ro.disconnect();
  });
})();
