// ==========================================================
// HVT 스크롤 전환 — 검은 입자 로고 → 영상 마스크 로고 → 갤러리 전체 노출
// - CSS sticky(.hvt__sticky)가 viewport 고정 담당 / ScrollTrigger는 pin:false로
//   스크롤 진행률과 단일 GSAP timeline만 제어 (이중 pin 금지)
// - 확대 초점: 공식 FOCAL_ANCHOR(0.555, 0.515) — LogoStage 정규화 좌표(window.HVT_FOCAL)
// - coverScale: 고정값 금지 — 초점→viewport 네 모서리 최대 거리 기반 동적 계산
// - 진행 구간: 0~6% 유지 / 6~12% 입자 복원 / 12~22% 로고 크로스페이드 /
//              22~88% 구멍 확대 / 88~100% 전체 화면 유지
// ==========================================================
(function () {
  "use strict";

  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  var FOCAL = window.HVT_FOCAL || { x: 0.555, y: 0.515 };
  var CROP = { x: 0.1594, y: 0.1781, w: 1.2319, h: 1.3759 }; // 마크 박스 ↔ viewBox 매핑

  var hvt = document.querySelector(".hvt");
  var masklogo = document.querySelector(".hvt__masklogo");
  var hero = document.querySelector(".hero2");
  var mark = document.querySelector(".hero2__mark");
  var svgEl = document.querySelector(".hero2 svg.mark");
  var finalPath = document.querySelector(".mark__final");
  if (!hvt || !masklogo || !hero || !mark || !svgEl || !finalPath) return;

  // ----- 로고 잉크 반경 실측 (viewBox 단위) -----
  // 초점 주변의 "연속된 검은 영역" 반경. 로고 고유값(해상도 무관)이라 초기 1회 측정.
  // coverScale에서 이 반경이 화면 최원거리 모서리를 덮도록 배율을 계산한다.
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
    // LogoStage 정규화 초점 → viewBox → 샘플 캔버스 좌표
    var fx = (CROP.x / CROP.w * 1254 + FOCAL.x * (1254 / CROP.w)) * k;
    var fy = (CROP.y / CROP.h * 1254 + FOCAL.y * (1254 / CROP.h)) * k;
    function alphaAt(px, py) {
      px |= 0; py |= 0;
      if (px < 0 || py < 0 || px >= S || py >= S) return 0;
      return data[(py * S + px) * 4 + 3];
    }
    if (alphaAt(fx, fy) < 128) return 0;   // 초점이 잉크 밖 — 호출부에서 보고용
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
    return minD / k;                        // viewBox 단위 반경
  }
  var inkRadiusVb = measureInkRadiusVb();

  // ----- coverScale 동적 계산 (고정값 금지) -----
  function coverScale() {
    var m = mark.getBoundingClientRect();
    var focalViewportX = m.left + m.width * FOCAL.x;
    var focalViewportY = m.top + m.height * FOCAL.y;
    var w = window.innerWidth, h = window.innerHeight;
    var farthest = Math.max(
      Math.hypot(focalViewportX, focalViewportY),
      Math.hypot(w - focalViewportX, focalViewportY),
      Math.hypot(focalViewportX, h - focalViewportY),
      Math.hypot(w - focalViewportX, h - focalViewportY)
    );
    var s = svgEl.getBoundingClientRect();
    var rPx = (inkRadiusVb || 30) * (s.height / 1254); // 현재 렌더 크기의 잉크 반경(px)
    return (farthest / Math.max(rPx, 1)) * 1.18;       // 안전 계수 — 흰 모서리 잔존 방지
  }

  // ----- 스크롤 트랙 길이: viewport 높이 기반 (짧은 노트북에서 과도한 구간 방지) -----
  function setTrackHeight() {
    var dist = Math.round(Math.min(Math.max(window.innerHeight * 1.8, 1000), 2400));
    hvt.style.height = "calc(100svh + " + dist + "px)";
  }

  // ----- 진행률 상태 머신 (상태가 바뀌는 순간에만 1회 호출) -----
  var particlesSuspended = false;
  var galleryVisible = false;
  function applyState(p) {
    if (p >= 0.06) {
      if (!particlesSuspended) {
        particlesSuspended = true;
        if (window.LogoParticles) window.LogoParticles.suspendAndSettle();
      }
    } else if (particlesSuspended) {
      // 진행률 0 부근 복귀: 마스크 숨김(타임라인상 12% 이전) + 로고 복원 상태
      particlesSuspended = false;
      if (window.LogoParticles) window.LogoParticles.resume();
    }
    var vis = p >= 0.14;                    // 구멍에서 영상이 보이기 시작하는 지점
    if (vis !== galleryVisible) {
      galleryVisible = vis;
      document.documentElement.classList.toggle("is-gallery-visible", vis);
      if (window.GalleryVideo) window.GalleryVideo.refresh();
    }
  }

  // ----- 데스크톱 전용 (모바일은 5-2에서 전환 구조 자체가 해제됨) -----
  var mm = gsap.matchMedia();
  var st = null;

  mm.add("(min-width: 769px)", function () {
    setTrackHeight();

    var tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: hvt,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        pin: false,                         // 고정은 CSS sticky 담당 — 이중 pin 금지
        invalidateOnRefresh: true,
        onUpdate: function (self) { applyState(self.progress); },
      },
    });
    st = tl.scrollTrigger;

    // 12~22%: 영상 마스크 로고 표시 + 검은 로고/Hero 콘텐츠 페이드
    //         (두 로고는 hvt-mask.js가 같은 실측 좌표로 동기화 → 같은 위치에서 전환)
    tl.to(masklogo, { autoAlpha: 1, duration: 0.05 }, 0.12)
      .to(hero, { autoAlpha: 0, duration: 0.07 }, 0.15)
      // 22~88%: 확정 초점 기준 구멍 확대 (coverScale은 함수형 → refresh마다 재계산)
      .to(masklogo, { "--hole-scale": coverScale, duration: 0.66, ease: "power1.in" }, 0.22)
      // 88~100%: 전체 화면 유지 구간
      .to({}, { duration: 0.12 }, 0.88);

    // ----- 리사이즈: 잠금 → 재측정 → refresh → 상태 복원 -----
    var resizePending = false;
    function onResize() {
      if (resizePending) return;
      resizePending = true;
      particlesSuspended = true;
      if (window.LogoParticles) window.LogoParticles.suspendAndSettle();
      requestAnimationFrame(function () {
        resizePending = false;
        setTrackHeight();                   // 트랙 길이 재산정
        ScrollTrigger.refresh();            // 초점·coverScale·구간 재계산 (hvt-mask도 자체 갱신)
        applyState(st ? st.progress : 0);   // 현 진행률에 맞는 상태 복원 (0 부근이면 입자 resume)
      });
    }
    window.addEventListener("resize", onResize);

    applyState(st.progress);                // 초기 상태 동기화

    return function () {                    // 모바일 전환/해제 시 cleanup
      window.removeEventListener("resize", onResize);
      tl.scrollTrigger && tl.scrollTrigger.kill();
      tl.kill();
      st = null;
      hvt.style.height = "";
      document.documentElement.classList.remove("is-gallery-visible");
      if (window.LogoParticles) window.LogoParticles.resume();
      particlesSuspended = false;
      galleryVisible = false;
    };
  });

  window.addEventListener("pagehide", function () {
    mm.revert();
  });

  // 검증용 훅 (프로덕션 동작 영향 없음)
  window.HVTScroll = {
    _test: {
      st: function () { return st; },
      applyState: applyState,
      coverScale: coverScale,
      inkRadiusVb: inkRadiusVb,
    },
  };
})();
