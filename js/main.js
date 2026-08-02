// ==========================================================
// 인트로 인터랙션 — 점 → gy 로고 morph → UI 순차 등장
// 단일 GSAP timeline (setTimeout 없음), 새로고침 시 자동 재실행
// morph: flubber (SVG path 보간)
// ==========================================================
(function () {
  "use strict";

  var finalPath = document.querySelector(".mark__final");
  var morphLayer = document.querySelector(".mark__morph");
  var morph = {
    g: document.querySelector(".mark__g"),
    hole: document.querySelector(".mark__hole"),
    y: document.querySelector(".mark__y"),
    acc: document.querySelector(".mark__acc"),
  };

  // 원본 로고 d를 서브패스로 분해 — 순서: [0]악센트 점, [1]g 윤곽, [2]g 구멍, [3]y
  var subs = finalPath.getAttribute("d").split(/(?=M)/);
  var TARGET = { acc: subs[0], g: subs[1], hole: subs[2], y: subs[3] };

  // 시작 상태(마크업의 초기 원과 동일한 d)
  var START = {
    g: morph.g.getAttribute("d"),
    hole: morph.hole.getAttribute("d"),
    y: morph.y.getAttribute("d"),
    acc: morph.acc.getAttribute("d"),
  };

  // 인트로 없이 최종 상태로 (reduced-motion / 라이브러리 로드 실패 시)
  function showFinal() {
    morphLayer.style.opacity = "0";
    finalPath.style.opacity = "1";
  }

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !window.gsap || !window.flubber) {
    showFinal();
    return;
  }

  var navItems = gsap.utils.toArray(".hero2__nav a");

  // 초기 상태: UI 숨김 (스크립트가 body 끝에서 첫 페인트 전에 실행되므로 깜빡임 없음)
  gsap.set(".hero2__logo", { autoAlpha: 0, y: -16 });
  gsap.set(navItems, { autoAlpha: 0, y: -12 });
  gsap.set([".hero2__credit", ".hero2__scroll"], { autoAlpha: 0, y: 20 });

  // flubber 보간을 GSAP 트윈으로 감싸는 헬퍼
  function morphTween(el, fromD, toD, duration, ease) {
    var f = flubber.interpolate(fromD, toD, { maxSegmentLength: 4 });
    var state = { t: 0 };
    return gsap.to(state, {
      t: 1,
      duration: duration,
      ease: ease,
      onUpdate: function () {
        el.setAttribute("d", f(state.t));
      },
    });
  }

  // ===== 단일 타임라인 =====
  // 0.00        점 즉시 표시 (마크업 초기 상태)
  // 0.05 ~ 0.70 점 → g 심벌 morph (+구멍 동시 morph)
  // 0.50 ~ 1.10 y, 악센트 점 stagger morph 등장
  // 1.10 ~ 1.22 morph 레이어 → 원본 path 크로스페이드 (최종 상태 = 디자인 원본 보장)
  // 0.80 ~ 1.45 헤더(DESIGNER) + 메뉴 등장
  // 1.00 ~ 1.70 크레딧 + SCROLL DOWN 등장
  var tl = gsap.timeline({
    defaults: { ease: "power3.out" },
    // 인트로 완전 종료 후에만 로고 입자 인터랙션 활성화
    onComplete: function () {
      if (window.LogoParticles) window.LogoParticles.enable();
    },
  });

  tl.add(morphTween(morph.g, START.g, TARGET.g, 0.65, "power3.inOut"), 0.05)
    .add(morphTween(morph.hole, START.hole, TARGET.hole, 0.65, "power3.inOut"), 0.05)

    .set(morph.y, { opacity: 1 }, 0.5)
    .add(morphTween(morph.y, START.y, TARGET.y, 0.5, "power3.out"), 0.5)
    .set(morph.acc, { opacity: 1 }, 0.65)
    .add(morphTween(morph.acc, START.acc, TARGET.acc, 0.45, "power3.out"), 0.65)

    .to(morphLayer, { opacity: 0, duration: 0.12, ease: "none" }, 1.1)
    .to(finalPath, { opacity: 1, duration: 0.12, ease: "none" }, 1.1)

    .to(".hero2__logo", { autoAlpha: 1, y: 0, duration: 0.5 }, 0.8)
    .to(navItems, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.05 }, 0.85)
    .to(".hero2__credit", { autoAlpha: 1, y: 0, duration: 0.5 }, 1.0)
    .to(".hero2__scroll", { autoAlpha: 1, y: 0, duration: 0.5 }, 1.2);
})();
