// ==========================================================
// 로고 마우스 입자 인터랙션
// - 인트로 종료 후 main.js의 onComplete에서 enable() 호출로 활성화
// - Canvas 2D 입자 시스템: 포인터 주변의 실제 로고 픽셀만 분해→복원
// - 완전 반응형: 로고 컨테이너 크기 기준으로 모든 값(캔버스, 입자,
//   반경, 좌표)을 계산하고 ResizeObserver로 재계산
// ==========================================================
window.LogoParticles = (function () {
  "use strict";

  // Figma 크롭 지오메트리 (style.css의 .hero2__mark svg와 동일한 값)
  var CROP = { x: -0.1594, y: -0.1781, w: 1.2319, h: 1.3759 };

  var mark, svgEl, canvas, ctx, ink = "#000000";
  var enabled = false, building = false;
  var particles = [], activeCount = 0;
  var baseCv = null;                    // 오프스크린 원본 래스터 (로고 박스 크기 × dpr)
  var dpr = 1, pad = 0, boxW = 0, boxH = 0, cvW = 0, cvH = 0;
  var R = 70, coreR = 26, pSize = 1, eraseSize = 3.5, step = 3, sizeF = 1;
  var vMax = 8, maxD = 56;              // 입자 최대 속도·최대 분산 거리 (로고 크기 비례)
  var raf = null, lastT = 0, ro = null, resizePending = false;

  // 포인터 상태 — pointermove에서는 좌표/속도만 기록 (계산은 루프에서)
  // sx/sy = 보간된 좌표 (실제 힘 계산에 사용, 거친 움직임 완화)
  var ptr = { x: -1e4, y: -1e4, sx: -1e4, sy: -1e4, vx: 0, vy: 0, inside: false, t: 0 };

  var cores = navigator.hardwareConcurrency || 4;
  var CAP = cores >= 8 ? 9000 : cores >= 4 ? 6000 : 3500;

  // ----- 크기·강도 기준값: 전부 로고 렌더 크기 비례 (고정 px 금지) -----
  function metrics() {
    var rect = mark.getBoundingClientRect();
    boxW = rect.width;
    boxH = rect.height;
    var short = Math.min(boxW, boxH);
    dpr = Math.min(window.devicePixelRatio || 1, cores >= 4 ? 2 : 1.5);
    R = Math.min(95, Math.max(40, short * 0.14));   // 반응 반경
    coreR = R * 0.38;                               // 강한 중심 영역
    pad = Math.ceil(R * 1.1);                       // 흩어짐 여유 공간
    step = Math.min(5, Math.max(1.8, short / 170)); // 샘플링 간격 (소폭 촘촘하게)
    sizeF = R / 70;                                 // 화면별 강도 보정
    vMax = R * 0.11;                                // 입자 최대 속도 (px/frame)
    maxD = R * 0.8;                                 // 최대 분산 거리
    deriveSizes();
  }

  function deriveSizes() {
    // 입자 기본 크기: CSS 시각 크기 기준 0.35~0.85px (로고 크기 비례, DPR 무관)
    // 입자별로 0.6~1.5배 랜덤 변주가 곱해짐 (대부분 작고 일부만 약간 큼)
    pSize = Math.min(0.85, Math.max(0.35, step * 0.28));
    eraseSize = step * 1.6;                         // 원본에서 지워지는 셀 (샘플 격자 커버)
  }

  function sizeCanvas() {
    cvW = boxW + pad * 2;
    cvH = boxH + pad * 2;
    canvas.width = Math.max(1, Math.round(cvW * dpr));   // 내부 해상도 = CSS 크기 × dpr
    canvas.height = Math.max(1, Math.round(cvH * dpr));
    canvas.style.width = cvW + "px";
    canvas.style.height = cvH + "px";
    canvas.style.left = -pad + "px";
    canvas.style.top = -pad + "px";
  }

  // ----- 원본 로고 래스터화 (SVG path → 오프스크린 캔버스) -----
  function rasterize(done) {
    var d = document.querySelector(".mark__final").getAttribute("d");
    var svgStr =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1254 1254">' +
      '<path d="' + d + '" fill="' + ink + '" fill-rule="evenodd"/></svg>';
    var url = URL.createObjectURL(new Blob([svgStr], { type: "image/svg+xml" }));
    var img = new Image();
    img.onload = function () {
      baseCv = document.createElement("canvas");
      baseCv.width = Math.max(1, Math.round(boxW * dpr));
      baseCv.height = Math.max(1, Math.round(boxH * dpr));
      var bc = baseCv.getContext("2d");
      bc.drawImage(
        img,
        CROP.x * boxW * dpr, CROP.y * boxH * dpr,
        CROP.w * boxW * dpr, CROP.h * boxH * dpr
      );
      URL.revokeObjectURL(url);
      done();
    };
    img.onerror = function () { URL.revokeObjectURL(url); }; // 실패 시 정적 로고 유지
    img.src = url;
  }

  // ----- 입자 생성: 불투명 픽셀 위치에서만 (투명 영역 제외) -----
  function build() {
    var bc = baseCv.getContext("2d");
    var data = bc.getImageData(0, 0, baseCv.width, baseCv.height).data;

    function sample(spx) {
      var out = [];
      var sd = spx * dpr;
      for (var y = sd / 2; y < baseCv.height; y += sd) {
        for (var x = sd / 2; x < baseCv.width; x += sd) {
          var a = data[((y | 0) * baseCv.width + (x | 0)) * 4 + 3];
          if (a > 120) {
            // 격자 패턴 방지: 샘플 위치에 미세 jitter
            var jx = (Math.random() - 0.5) * spx * 0.7;
            var jy = (Math.random() - 0.5) * spx * 0.7;
            var hx = x / dpr + pad + jx, hy = y / dpr + pad + jy;
            var r = Math.random();
            out.push({
              hx: hx, hy: hy, x: hx, y: hy, vx: 0, vy: 0, active: false,
              seed: Math.random() * 6.283,
              sz: 0.6 + r * r * 0.9,            // 크기 변주 0.6~1.5 (대부분 작음)
              rv: 0.85 + Math.random() * 0.3,   // 입자별 복귀 속도 편차
            });
          }
        }
      }
      return out;
    }

    particles = sample(step);
    if (particles.length > CAP) {       // 상한 초과 시 간격 보정 후 재샘플
      step *= Math.sqrt(particles.length / CAP);
      deriveSizes();
      particles = sample(step);
    }
    activeCount = 0;
  }

  // ----- 시뮬레이션 (dt 정규화) -----
  function stepSim(dt) {
    var k = dt / 16.67;

    // 포인터 좌표 보간 — 실제 힘 계산은 sx/sy 사용 (지연감 없이 미세하게 부드럽게)
    var sm = 1 - Math.pow(1 - 0.14, k);
    ptr.sx += (ptr.x - ptr.sx) * sm;
    ptr.sy += (ptr.y - ptr.sy) * sm;

    var springBase = 0.038 * k;                   // 복귀 스프링 (~0.7~1.0초, 입자별 편차 곱해짐)
    var damp = Math.pow(0.87, k);                 // 감쇠 (관성 약간 유지 → 흐름이 이어짐)
    var speed = Math.min(Math.hypot(ptr.vx, ptr.vy), 40);

    // 마우스 이동 방향 (정규화) — directional force와 캡슐형 반응 영역의 축
    var mdx = 0, mdy = 0;
    if (speed > 0.5) {
      mdx = ptr.vx / speed;
      mdy = ptr.vy / speed;
    }
    var elong = Math.min(speed * 0.045, 1.3);     // 빠를수록 이동 축으로 영역이 길어짐
    var radialK = (0.16 + speed * 0.012) * sizeF; // 약한 radial (보조)
    var dirK = 0.075 * sizeF;                     // directional (주도) — 흐름을 끌고 감
    var wakeR = R * (1 + elong) * 1.15;           // 깨움 검사용 보수적 반경
    var wakeR2 = wakeR * wakeR;

    activeCount = 0;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var dx = p.x - ptr.sx, dy = p.y - ptr.sy;

      if (!p.active) {                            // 휴면 입자: 반응 영역 안일 때만 깨움
        if (!ptr.inside || dx * dx + dy * dy > wakeR2) continue;
        p.active = true;
      }

      if (ptr.inside) {
        // 캡슐형 유효 거리: 마우스가 지나온 뒤쪽으로 더 길게 늘어난 영역
        var along = dx * mdx + dy * mdy;
        var stretch = along < 0 ? 1 + elong : 1 + elong * 0.35;
        var ax = along / stretch;
        var px2 = dx - along * mdx, py2 = dy - along * mdy;
        var eff = Math.sqrt(ax * ax + px2 * px2 + py2 * py2);
        var Rn = R * (1 + 0.14 * Math.sin(p.seed * 5.7)); // 경계 noise — 완전한 원 방지

        if (eff < Rn) {
          var t = 1 - eff / Rn;
          var fall = t * t * (3 - 2 * t);         // smoothstep — 경계가 전혀 드러나지 않게
          var core = eff < coreR ? 1.2 : 1;       // 중심 증폭 최소화 (폭발감 방지)
          var dist = Math.sqrt(dx * dx + dy * dy) || 1;
          var jx = Math.cos(p.seed * 3.1 + speed * 0.3);   // 입자별 미세 noise
          var jy = Math.sin(p.seed * 2.3);
          p.vx += (dx / dist * radialK * core + mdx * speed * dirK + jx * 0.18 * sizeF) * fall * k;
          p.vy += (dy / dist * radialK * core + mdy * speed * dirK + jy * 0.18 * sizeF) * fall * k;
        }
      }

      var spring = springBase * p.rv;             // 입자별 복귀 편차 → 순차적으로 잦아드는 복원
      p.vx += (p.hx - p.x) * spring;
      p.vy += (p.hy - p.y) * spring;
      p.vx *= damp;
      p.vy *= damp;

      var vm = Math.hypot(p.vx, p.vy);            // 최대 속도 제한 (급격한 튐 방지)
      if (vm > vMax) {
        var vf = vMax / vm;
        p.vx *= vf;
        p.vy *= vf;
      }

      p.x += p.vx * k;
      p.y += p.vy * k;

      var dhx = p.x - p.hx, dhy = p.y - p.hy;
      var dh = Math.sqrt(dhx * dhx + dhy * dhy);
      if (dh > maxD) {                            // 분산 거리 소프트 캡 (급정지 없이 감쇠)
        var df = (maxD + (dh - maxD) * 0.7) / dh;
        p.x = p.hx + dhx * df;
        p.y = p.hy + dhy * df;
      }

      if (dh < 0.4 && Math.abs(p.vx) + Math.abs(p.vy) < 0.15) {
        p.x = p.hx; p.y = p.hy; p.vx = p.vy = 0;  // 정확한 원위치 정착
        p.active = false;
      } else {
        activeCount++;
      }
    }
    ptr.vx *= 0.8;                                // 이벤트 공백 시 포인터 속도 감쇠
    ptr.vy *= 0.8;
  }

  // ----- 렌더링: 원본 레이어 + 국소 지움 + 입자(짧은 잔상 포함) -----
  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cvW, cvH);
    ctx.drawImage(baseCv, pad, pad, boxW, boxH);  // 1) 선명한 원본

    if (activeCount) {
      // 2) 원본 부분 지움 — 밀려난 거리에 비례한 점진적 분해
      //    (조금 밀린 입자 자리는 옅게만 지워져 원본이 비쳐 보임 → 원형 구멍 방지)
      ctx.globalCompositeOperation = "destination-out";
      var i, p, half = eraseSize / 2, eraseRef = step * 2.2;
      for (i = 0; i < particles.length; i++) {
        p = particles[i];
        if (!p.active) continue;
        var dsp = Math.hypot(p.x - p.hx, p.y - p.hy);
        var ea = Math.min(0.85, dsp / eraseRef);  // 최대 85%만 — 원본 미세 유지
        if (ea > 0.03) {
          ctx.globalAlpha = ea;
          ctx.fillRect(p.hx - half, p.hy - half, eraseSize, eraseSize);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = ink;
      ctx.strokeStyle = ink;
      var ph;
      for (i = 0; i < particles.length; i++) {    // 3) 입자 + 속도 비례 연속 잔상
        p = particles[i];
        if (!p.active) continue;
        var vmag = Math.abs(p.vx) + Math.abs(p.vy);
        if (vmag > 0.35) {                        // 잔상: 문턱 대신 연속 감쇠 (끊김 없음)
          ctx.globalAlpha = Math.min(0.22, vmag * 0.045);
          ctx.lineWidth = Math.max(0.3, pSize * p.sz * 0.7);
          ctx.beginPath();
          ctx.moveTo(p.x - p.vx * 2.4, p.y - p.vy * 2.4);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
        var s = pSize * p.sz;                     // 입자별 크기 변주
        ph = s / 2;
        ctx.globalAlpha = 0.92;
        ctx.fillRect(p.x - ph, p.y - ph, s, s);
      }
      ctx.globalAlpha = 1;
    }
  }

  // ----- 루프: 활동이 없으면 스스로 정지 (idle 시 CPU 0) -----
  function loop(t) {
    raf = null;
    var dt = lastT ? Math.min(t - lastT, 32) : 16.7;
    lastT = t;
    stepSim(dt);
    render();
    if (activeCount > 0 || ptr.inside) {
      raf = requestAnimationFrame(loop);
    } else {
      lastT = 0;
    }
  }

  function wake() {
    if (enabled && raf === null) {
      lastT = 0;
      raf = requestAnimationFrame(loop);
    }
  }

  // ----- 이벤트: pointermove에서는 좌표·속도만 기록 -----
  function onMove(e) {
    if (!enabled) return;
    var rect = canvas.getBoundingClientRect();    // 현재 컨테이너 기준 local 좌표
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    var now = performance.now();
    var dt = ptr.t ? Math.min(now - ptr.t, 50) : 16.7;
    if (dt > 0 && ptr.x > -9000) {
      var ivx = (x - ptr.x) / dt * 16.7;          // px/frame 단위 속도
      var ivy = (y - ptr.y) / dt * 16.7;
      ptr.vx = ptr.vx * 0.5 + Math.max(-40, Math.min(40, ivx)) * 0.5;
      ptr.vy = ptr.vy * 0.5 + Math.max(-40, Math.min(40, ivy)) * 0.5;
    }
    if (raf === null) {                           // 휴면에서 깨어날 때 보간 좌표 리셋
      ptr.sx = x;
      ptr.sy = y;
    }
    ptr.x = x;
    ptr.y = y;
    ptr.t = now;
    ptr.inside = x >= 0 && x <= cvW && y >= 0 && y <= cvH;
    if (ptr.inside) wake();
  }

  function onLeave() {                            // 창 이탈/blur → 전원 복귀
    ptr.inside = false;
    ptr.vx = ptr.vy = 0;
    wake();
  }

  function onVis() {
    if (document.hidden) {
      ptr.inside = false;                         // 탭 전환 시 복귀 상태로
    } else {
      wake();                                     // 복귀 시 남은 입자 정리
    }
  }

  // ----- 리사이즈: 전체 재구축 (rAF debounce) -----
  function onResize() {
    if (!enabled || resizePending) return;
    resizePending = true;
    requestAnimationFrame(function () {
      resizePending = false;
      rebuild();
    });
  }

  function rebuild() {
    metrics();
    sizeCanvas();
    rasterize(function () {
      build();                                    // 입자 전부 새 크기로 재생성 = 원본 복원
      ptr.inside = false;
      render();
    });
  }

  // ----- 활성화 (인트로 onComplete에서 호출) -----
  function enable() {
    if (enabled || building) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return; // 터치 기기: 정적 로고 유지
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;    // 모션 감소: 비활성화

    mark = document.querySelector(".hero2__mark");
    svgEl = mark && mark.querySelector("svg.mark");
    canvas = mark && mark.querySelector(".mark__canvas");
    if (!mark || !svgEl || !canvas) return;
    ctx = canvas.getContext("2d");
    ink = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#000000";

    building = true;
    metrics();
    sizeCanvas();
    rasterize(function () {
      build();
      render();
      mark.classList.add("is-live");              // SVG → Canvas 표시 전환 (인라인 스타일 무손상)
      enabled = true;
      building = false;
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("blur", onLeave);
      document.documentElement.addEventListener("pointerleave", onLeave);
      document.addEventListener("visibilitychange", onVis);
      window.addEventListener("resize", onResize);
      if (window.ResizeObserver) {
        ro = new ResizeObserver(onResize);
        ro.observe(mark);
      }
    });
  }

  function destroy() {                            // 정리 (리스너/옵저버/rAF 해제)
    if (raf !== null) cancelAnimationFrame(raf);
    raf = null;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("blur", onLeave);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    document.removeEventListener("visibilitychange", onVis);
    window.removeEventListener("resize", onResize);
    if (ro) ro.disconnect();
    if (mark) mark.classList.remove("is-live");
    particles = [];
    enabled = false;
  }

  return {
    enable: enable,
    destroy: destroy,
    // 테스트 훅 (rAF가 정지된 환경에서 검증용 — 프로덕션 동작에 영향 없음)
    _test: {
      step: function (dt) { stepSim(dt); render(); },
      state: function () {
        return {
          enabled: enabled, count: particles.length, active: activeCount,
          R: R, pSize: pSize, step: step, pad: pad, dpr: dpr,
          boxW: boxW, boxH: boxH, cvW: cvW, cvH: cvH,
        };
      },
      pointer: ptr,
      particles: function () { return particles; },
      rebuild: rebuild,
    },
  };
})();
