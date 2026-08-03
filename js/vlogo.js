// ==========================================================
// VLOGO — 영상 로고 스크롤 전환
// 1) 인트로 완성 순간부터 로고 안에 갤러리 영상이 은은하게 비침 (is-vlogo, main.js)
// 2) 스크롤하면 로고(마스크) 자체가 확정 초점 기준으로 눈에 보이게 확대
// 3) 검정 영역 = 영상 창이 화면을 삼키면 그 상태가 곧 최종 갤러리
// - CSS sticky가 고정 담당 / ScrollTrigger는 pin:false로 진행률만 (scrub → 역재생 자동)
// - coverScale 동적 계산: 초점→모서리 최대거리 ÷ 실측 잉크 반경 (고정값 금지)
// ==========================================================
(function () {
  "use strict";

  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  // 공식 확대 초점 — LogoStage(.hero2__mark) 정규화 좌표 (확정값, 변경 금지)
  var FOCAL = { x: 0.555, y: 0.515 };
  var CROP = { x: 0.1594, y: 0.1781, w: 1.2319, h: 1.3759 }; // 마크 박스 ↔ viewBox 매핑

  var hvt = document.querySelector(".hvt");
  var sticky = document.querySelector(".hvt__sticky");
  var gallery = document.querySelector(".hvt__sticky > .vgallery");
  var mark = document.querySelector(".hero2__mark");
  var svgEl = document.querySelector(".hero2 svg.mark");
  var finalPath = document.querySelector(".mark__final");
  if (!hvt || !sticky || !gallery || !mark || !svgEl || !finalPath) return;

  // ----- 좌표 동기화: 마스크(영상 로고)를 검은 로고 SVG 실측 rect에 정확히 맞춤 -----
  function syncCoords() {
    var base = sticky.getBoundingClientRect();
    var s = svgEl.getBoundingClientRect();
    gallery.style.setProperty("--hole-x", (s.left - base.left).toFixed(2) + "px");
    gallery.style.setProperty("--hole-y", (s.top - base.top).toFixed(2) + "px");
    gallery.style.setProperty("--hole-w", s.width.toFixed(2) + "px");
    gallery.style.setProperty("--hole-h", s.height.toFixed(2) + "px");
    var m = mark.getBoundingClientRect();
    var focalViewportX = m.left + m.width * FOCAL.x;
    var focalViewportY = m.top + m.height * FOCAL.y;
    gallery.style.setProperty("--focal-x", (focalViewportX - base.left).toFixed(2) + "px");
    gallery.style.setProperty("--focal-y", (focalViewportY - base.top).toFixed(2) + "px");
  }
  syncCoords();
  window.addEventListener("resize", syncCoords);
  var ro;
  if (window.ResizeObserver) {
    ro = new ResizeObserver(syncCoords);
    ro.observe(mark);
    ro.observe(sticky);
  }

  // ----- 초점 주변 잉크 반경 실측 (viewBox 단위, 로고 고유값) -----
  function measureInkRadiusVb() {
    var S = 502;
    var cv = document.createElement("canvas");
    cv.width = cv.height = S;
    var cx = cv.getContext("2d");
    cx.scale(S / 1254, S / 1254);
    cx.fillStyle = "#000";
    cx.fill(new Path2D(finalPath.getAttribute("d")), "evenodd");
    var data = cx.getImageData(0, 0, S, S).data;
    var k = S / 1254;
    var fx = (CROP.x / CROP.w * 1254 + FOCAL.x * (1254 / CROP.w)) * k;
    var fy = (CROP.y / CROP.h * 1254 + FOCAL.y * (1254 / CROP.h)) * k;
    function alphaAt(px, py) {
      px |= 0; py |= 0;
      if (px < 0 || py < 0 || px >= S || py >= S) return 0;
      return data[(py * S + px) * 4 + 3];
    }
    if (alphaAt(fx, fy) < 128) return 0;
    var minD = Infinity;
    for (var i = 0; i < 24; i++) {
      var a = (i / 24) * Math.PI * 2;
      var d = 0;
      while (d < S) {
        d += 1;
        if (alphaAt(fx + Math.cos(a) * d, fy + Math.sin(a) * d) < 128) break;
      }
      if (d < minD) minD = d;
    }
    return minD / k;
  }
  var inkRadiusVb = measureInkRadiusVb();

  // ----- coverScale: 초점에서 가장 먼 모서리를 잉크 영역이 덮는 배율 (동적) -----
  function coverScale() {
    var m = mark.getBoundingClientRect();
    var fx = m.left + m.width * FOCAL.x;
    var fy = m.top + m.height * FOCAL.y;
    var w = window.innerWidth, h = window.innerHeight;
    var farthest = Math.max(
      Math.hypot(fx, fy),
      Math.hypot(w - fx, fy),
      Math.hypot(fx, h - fy),
      Math.hypot(w - fx, h - fy)
    );
    var s = svgEl.getBoundingClientRect();
    var rPx = (inkRadiusVb || 30) * (s.height / 1254);
    return (farthest / Math.max(rPx, 1)) * 1.18;
  }

  // ----- 스크롤 트랙 길이 (viewport 높이 기반 — 짧은 화면에서 과도한 구간 방지) -----
  function setTrackHeight() {
    var dist = Math.round(Math.min(Math.max(window.innerHeight * 1.6, 900), 2200));
    hvt.style.height = "calc(100svh + " + dist + "px)";
  }

  // ----- 데스크톱 전용 (모바일은 CSS에서 전환 구조 해제) -----
  var mm = gsap.matchMedia();

  mm.add("(min-width: 769px)", function () {
    setTrackHeight();

    var tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: hvt,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        pin: false,                       // 고정은 CSS sticky — 이중 pin 금지
        invalidateOnRefresh: true,
      },
    });

    // 5~85%: 로고(마스크) 확대 — 은은한 시작에서 점점 가속 (power1.in)
    tl.to(gallery, { "--logo-scale": coverScale, duration: 0.8, ease: "power1.in" }, 0.05)
      // 5~55%: 딤 0.8 → 0 (은은한 영상이 점점 본색으로)
      .to(gallery, { "--vdim": 0, duration: 0.5 }, 0.05)
      // 30~55%: 헤더/크레딧 페이드아웃 (흰 배경은 로고가 삼킬 때까지 유지)
      .to([".hero2__top", ".hero2__bottom"], { autoAlpha: 0, duration: 0.25 }, 0.3)
      // 85~100%: 전체 갤러리 유지 구간
      .to({}, { duration: 0.15 }, 0.85);

    var resizePending = false;
    function onResize() {
      if (resizePending) return;
      resizePending = true;
      requestAnimationFrame(function () {
        resizePending = false;
        setTrackHeight();
        ScrollTrigger.refresh();          // coverScale 함수형 값 재계산 (invalidateOnRefresh)
      });
    }
    window.addEventListener("resize", onResize);

    return function () {                  // 모바일 전환 시 cleanup
      window.removeEventListener("resize", onResize);
      tl.scrollTrigger && tl.scrollTrigger.kill();
      tl.kill();
      hvt.style.height = "";
      gsap.set(gallery, { "--logo-scale": 1, "--vdim": 0.8 });
      gsap.set([".hero2__top", ".hero2__bottom"], { clearProps: "opacity,visibility" });
    };
  });

  window.addEventListener("pagehide", function () {
    if (ro) ro.disconnect();
    window.removeEventListener("resize", syncCoords);
    mm.revert();
  });

  // 검증용 훅
  window.VLogo = {
    _test: {
      coverScale: coverScale,
      inkRadiusVb: inkRadiusVb,
      syncCoords: syncCoords,
    },
  };
})();
