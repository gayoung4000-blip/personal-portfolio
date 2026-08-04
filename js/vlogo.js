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

  // [최적화] 개발자 도구 오픈 등 단순 높이 변화 시 발생하는 무한 재계산 렉/디자인 깨짐 방지
  // 기본 'resize' 이벤트를 제거하여 GSAP가 화면 변화에 예민하게 반응하지 않도록 차단합니다.
  ScrollTrigger.config({
    autoRefreshEvents: "visibilitychange,DOMContentLoaded,load" 
  });

  // ===== 큰 리사이즈(개발자 도구 개폐·도킹 조절 포함) 제자리 재계산 =====
  // 리로드 방식은 개발자 도구 사용 자체를 방해(콘솔 초기화, 검사 상태 소실)하므로
  // 페이지를 유지한 채 조용히 전체 재계산한다:
  // 크기가 50px 이상 변한 뒤 300ms 멈추면 → 좌표 동기화 + ScrollTrigger.refresh() 1회.
  // (드래그로 연속 리사이즈해도 디바운스 덕에 마지막 한 번만 실행 — 렉 없음)
  var lastWinWidth = window.innerWidth;
  var lastWinHeight = window.innerHeight;
  window.addEventListener("resize", function() {
    var currentWidth = window.innerWidth;
    var currentHeight = window.innerHeight;
    if (Math.abs(currentWidth - lastWinWidth) > 50 ||
        Math.abs(currentHeight - lastWinHeight) > 50) {
      console.log("[vlogo] 큰 리사이즈 감지 (" + lastWinWidth + "x" + lastWinHeight +
        " → " + currentWidth + "x" + currentHeight + ") — 0.3초 후 제자리 재계산");
      lastWinWidth = currentWidth;
      lastWinHeight = currentHeight;
      clearTimeout(window.vlogoResizeTimer);
      window.vlogoResizeTimer = setTimeout(function() {
        if (typeof syncCoords === "function") syncCoords();
        ScrollTrigger.refresh();
        console.log("[vlogo] 재계산 완료 — 새 화면 기준으로 정렬됨 (리로드 없음)");
      }, 300);
    }
  });

  // 공식 확대 초점 — LogoStage(.hero2__mark) 정규화 좌표 (확정값, 변경 금지)
  var FOCAL = { x: 0.555, y: 0.515 };
  var CROP = { x: 0.1594, y: 0.1781, w: 1.2319, h: 1.3759 }; // 마크 박스 ↔ viewBox 매핑

  var hvt = document.querySelector(".hvt");
  var sticky = document.querySelector(".hvt__sticky");
  var gallery = document.querySelector(".hvt__sticky > .vgallery");
  var mark = document.querySelector(".hero2__mark");
  var svgEl = document.querySelector(".hero2 svg.mark");
  var finalPath = document.querySelector(".mark__final");
  var journeyPointerScene = null;
  var journeyPointerMove = null;
  var journeyPointerLeave = null;
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

  function getScrubDist() {
    var dist = Math.round(Math.min(Math.max(window.innerHeight * 1.6, 900), 2200));
    // 일광전구 영상 풀스크린 확대를 위한 추가 스크롤 길이 확보
    return dist + Math.round(window.innerHeight * 1.5);
  }

  // ----- 스크롤 트랙 길이 (viewport 높이 기반 — 짧은 화면에서 과도한 구간 방지) -----
  function setTrackHeight() {
    // 100svh(초기) + getScrubDist()(GSAP 구간) + 100svh(About 섹션 오버레이 고정 구간)
    hvt.style.height = "calc(200svh + " + getScrubDist() + "px)";
  }

  // ----- 데스크톱 전용 (모바일은 CSS에서 전환 구조 해제) -----
  // [최적화] 개발자 도구 오픈 등으로 가로 폭이 좁아질 때 데스크톱 애니메이션이 
  // 통째로 파괴되는 현상(matchMedia Revert)을 막기 위해 초기 로드 시점 폭으로 고정합니다.
  var isDesktop = window.innerWidth >= 769;

  if (isDesktop) {
    setTrackHeight();

    var tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: hvt,
        start: "top top",
        end: function() { return "+=" + getScrubDist(); }, // 트랙 끝이 아닌 정확히 이 거리까지만 애니메이션
        scrub: true,
        pin: false,                       // 고정은 CSS sticky — 이중 pin 금지
        invalidateOnRefresh: true,
      },
    });

    // ===== 순서가 핵심: "검정이 화면을 다 채운 다음에" 영상이 나온다 =====
    // 확대와 딤 걷기를 동시에 하면 로고가 뭉개지는 구간에 영상 조각이 같이 드러나
    // 정체불명의 화면이 된다(이전 구현의 실패 원인). 두 동작을 겹치지 않게 분리한다.
    //
    // 0~10%    로고 그대로 — 영상이 은은하게 비치는 상태 유지
    // 10~25%   딤 0.8 → 1 (영상이 잠기며 완전 검정) + 헤더/크레딧 페이드아웃
    // 10~70%   로고(마스크) 확대 1 → coverScale — 검정이 화면을 삼킴
    // 70~78%   완전 검정 유지 (숨 고르기)
    // 78~100%  딤 1 → 0 — 영상 갤러리 등장

    // 딤을 먼저 잠가 확대 구간 내내 "덩어리진 검정"으로 보이게 한다
    tl.to(gallery, { "--vdim": 1, duration: 0.15 }, 0.1)
      // 흰 배경 위 UI는 검정이 덮기 전에 비운다
      .to([".hero2__top", ".hero2__bottom"], { autoAlpha: 0, duration: 0.15 }, 0.1)
      // 확대 — power1.in: 초반엔 로고로 읽히다가 후반에 검정이 몰아친다
      .to(gallery, { "--logo-scale": coverScale, duration: 0.6, ease: "power1.in" }, 0.1)
      // 완전 검정 정지 구간 — 전환의 쉼표
      .to({}, { duration: 0.08 }, 0.7)
      // 검정이 다 찬 뒤에야 영상이 드러난다
      .to(gallery, { "--vdim": 0, duration: 0.22 }, 0.78);

    var rightVideo = document.querySelector(".vgallery__item--right");
    var stage = document.querySelector(".vgallery__stage");

    // 우측 하단 영상이 확대될 때 다른 요소들보다 위에 오도록 설정
    gsap.set(rightVideo, { zIndex: 10 });

    // 갤러리 완전히 등장(1.0) 후 약간의 여백(1.1부터) 뒤 풀스크린 확대
    tl.to(rightVideo, {
      left: function() { return -stage.offsetLeft; },
      top: function() { return -stage.offsetTop; },
      width: function() { return window.innerWidth; },
      height: function() { return window.innerHeight; },
      duration: 0.6,
      ease: "power2.inOut"
    }, 1.1);

    var aboutHeaderFixed = document.querySelector("#about-header-fixed");
    // 영상이 거의 다 차가는 시점(1.4)부터 텍스트가 스르륵(Fade-in) 나타남
    tl.to(aboutHeaderFixed, {
      autoAlpha: 1,
      duration: 0.6,
      ease: "power2.out"
    }, 1.4);

    var globalHeader = document.querySelector("#global-header");
    // 영상 텍스트와 거의 비슷한 타이밍에 상단 글로벌 메뉴바도 페이드인
    tl.to(globalHeader, {
      autoAlpha: 1,
      duration: 0.4,
      ease: "power2.out"
    }, 1.5);

    // 돔(Dome) 사각형 모핑 애니메이션
    // .about 섹션이 뷰포트 하단에서 나타나기 시작할 때(start)부터 최상단에 닿을 때(end)까지 진행
    var aboutDome = document.querySelector(".about__dome");
    gsap.to(aboutDome, {
      "--dome-progress": 1,
      ease: "none",
      scrollTrigger: {
        trigger: ".about",
        start: "top bottom",
        end: "top top",
        scrub: true
      }
    });

    // =======================================================
    // Journey 가로 스크롤 및 메뉴 전환 애니메이션
    // =======================================================
    var journeySection = document.querySelector("#journey");
    var journeyTrack = document.querySelector("#journeyTrack");
    var globalMenuBtn = document.querySelector("#globalMenuBtn");

    if (journeySection && journeyTrack && globalMenuBtn) {
      // 1. 가로 스크롤 트랙 이동 거리 계산
      function getScrollAmount() {
        var trackWidth = journeyTrack.scrollWidth;
        var viewWidth = window.innerWidth;
        // 트랙 전체 길이를 끝까지 스크롤하도록 설정 (Scene 1 -> Scene 2 파노라마)
        return -(trackWidth - viewWidth);
      }

      // 가로 이동을 실행할 타임라인 생성
      var tlJourney = gsap.timeline();
      
      // 트랙은 왼쪽 밀어냄
      tlJourney.to(journeyTrack, {
        x: getScrollAmount,
        ease: "none"
      }, 0);

      // 2. 타이포그래피 모션: 스크롤 내릴 때 "I DESIGNED" 텍스트가 오른쪽으로 멀어지는 효과
      tlJourney.to(".journey__huge-anim", {
        x: "35vw", /* 오른쪽으로 이동하며 피그마 시안처럼 여백 생성 */
        ease: "power1.out" /* 부드럽게 감속하는 이징 */
      }, 0);



      // 가로 스크롤 트리거 및 상단 메뉴바 ↔ 둥근 메뉴 버튼(MENU) 전환 병합
      ScrollTrigger.create({
        trigger: journeySection,
        start: "top top",
        end: () => "+=" + (journeyTrack.scrollWidth - window.innerWidth),
        pin: true,
        animation: tlJourney,
        scrub: 1, // 스크롤 시 부드럽게(1초 지연) 따라오도록 설정
        invalidateOnRefresh: true, // 리사이즈 시 거리 재계산
        onEnter: function() {
          gsap.to(globalHeader, { autoAlpha: 0, duration: 0.3, ease: "power2.out", overwrite: "auto" });
          gsap.to(globalMenuBtn, { autoAlpha: 1, duration: 0.3, delay: 0.1, ease: "power2.out", overwrite: "auto" });
        },
        onLeave: function() {
          gsap.to(globalHeader, { autoAlpha: 1, duration: 0.3, ease: "power2.out", overwrite: "auto" });
          gsap.to(globalMenuBtn, { autoAlpha: 0, duration: 0.3, ease: "power2.out", overwrite: "auto" });
        },
        onEnterBack: function() {
          gsap.to(globalHeader, { autoAlpha: 0, duration: 0.3, ease: "power2.out", overwrite: "auto" });
          gsap.to(globalMenuBtn, { autoAlpha: 1, duration: 0.3, delay: 0.1, ease: "power2.out", overwrite: "auto" });
        },
        onLeaveBack: function() { // 다시 위로 올라갈 때
          gsap.to(globalHeader, { autoAlpha: 1, duration: 0.3, delay: 0.1, ease: "power2.out", overwrite: "auto" });
          gsap.to(globalMenuBtn, { autoAlpha: 0, duration: 0.3, ease: "power2.out", overwrite: "auto" });
        }
      });

      // 3. journey4 이미지 전환: 책상 이미지가 화면에 절반쯤 들어온 순간
      //    책상 → 유치원 단체사진, 우측 스케치북 → 유치원 아이들 사진으로 동시 크로스페이드.
      //    (containerAnimation: 가로로 움직이는 트랙 내부 요소의 위치를 기준으로 발동,
      //     역스크롤 시 원래 이미지로 자연 복귀)
      var swapImgs = gsap.utils.toArray(".journey__swap");
      // 고정 My/JOURNEY — 트랙 밖(핀 섹션 직속)이라 화면 고정. journey4 진입과 함께 표시
      var fixedMy = gsap.utils.toArray([".journey__scene3-my", ".journey__scene3-journey"]);
      if (swapImgs.length) {
        ScrollTrigger.create({
          trigger: ".journey__ending-img",
          containerAnimation: tlJourney,
          start: "center right",   // 이미지 중심이 뷰포트 오른쪽 경계 도달 = 노출 50%
          onEnter: function () {
            gsap.to(swapImgs.concat(fixedMy), { autoAlpha: 1, duration: 0.7, ease: "power2.inOut", overwrite: "auto" });
          },
          onLeaveBack: function () {
            gsap.to(swapImgs.concat(fixedMy), { autoAlpha: 0, duration: 0.7, ease: "power2.inOut", overwrite: "auto" });
          },
        });
      }

      // 4. HUMAN INSIGHT 하이라이트: 단락이 가로로 흘러들어오는 동안
      //    읽기 진행 방향대로 단어가 회색 → 흰색으로 밝아짐 (스크럽 = 역스크롤 시 되감김)
      var insightText = document.querySelector(".journey__insight-text");
      var insightTitle = document.querySelector(".journey__insight-title");
      if (insightText && insightTitle) {
        // 단어 단위 span 래핑 (하이라이트 stagger 대상)
        insightText.innerHTML = insightText.textContent.trim().split(/\s+/).map(function (w) {
          return '<span class="jw">' + w + "</span>";
        }).join(" ");
        var insightWords = insightText.querySelectorAll(".jw");

        var tlInsight = gsap.timeline();
        tlInsight
          .to(insightTitle, { color: "#ffffff", duration: 0.6, ease: "none" }, 0)
          .to(insightWords, { color: "#ffffff", duration: 0.35, stagger: 0.045, ease: "none" }, 0.15);

        ScrollTrigger.create({
          trigger: insightText,
          containerAnimation: tlJourney,
          start: "left 85%",   // 단락이 오른쪽에서 들어오기 시작할 때
          end: "left 3%",      // 단락이 최종 위치(Figma x60 ≈ 3.1vw)에 도달할 때
          scrub: true,
          animation: tlInsight,
        });
      }

      // 5. 아이보리 구간 진입: 화면 고정 요소(My/JOURNEY·MENU) 색 반전
      //    (Figma 880-383 — 오른쪽에서 아이보리 밴드가 들어오는 시점에 검정으로)
      var scene5 = document.querySelector(".journey__scene--5");
      if (scene5) {
        ScrollTrigger.create({
          trigger: scene5,
          containerAnimation: tlJourney,
          start: "left 85%",   // 아이보리 밴드가 화면 오른쪽에 걸치기 시작할 때
          onEnter: function () {
            document.documentElement.classList.add("is-ivory-zone");
          },
          onLeaveBack: function () {
            document.documentElement.classList.remove("is-ivory-zone");
          },
        });

        // 6. 이미지 스왑 2탄 (Figma journey6): 아이보리 밴드가 화면 중앙을 향해 갈 때
        //    꽃다발 → 칠판 낙서, 폴라로이드 → 교실 단체사진으로 동시 크로스페이드
        var swap2 = gsap.utils.toArray(".journey__swap2");
        if (swap2.length) {
          ScrollTrigger.create({
            trigger: scene5,
            containerAnimation: tlJourney,
            start: "left 65%",
            onEnter: function () {
              gsap.to(swap2, { autoAlpha: 1, duration: 0.7, ease: "power2.inOut", overwrite: "auto" });
            },
            onLeaveBack: function () {
              gsap.to(swap2, { autoAlpha: 0, duration: 0.7, ease: "power2.inOut", overwrite: "auto" });
            },
          });
        }
      }

      // 7. 검은 구역(FORWARD/DIRECTION) 진입: 색 반전 해제 + My/JOURNEY 퇴장
      var scene6 = document.querySelector(".journey__scene--6");
      if (scene6) {
        ScrollTrigger.create({
          trigger: scene6,
          containerAnimation: tlJourney,
          start: "left 70%",   // 검은 구역이 화면에 본격 진입할 때
          onEnter: function () {
            document.documentElement.classList.remove("is-ivory-zone");
          },
          onLeaveBack: function () {
            document.documentElement.classList.add("is-ivory-zone");
          },
        });

        // Figma final scene: the mountain photo follows the pointer immediately.
        // Transform-only animation keeps the horizontal ScrollTrigger layout untouched.
        var focusPhoto = scene6.querySelector(".journey__focus-photo");
        var focusCanvas = scene6.querySelector(".journey__fwd-canvas");
        var hallasanImage = scene6.querySelector(".journey__focus-img--hallasan");
        var gwanakImage = scene6.querySelector(".journey__focus-img--gwanak");
        var hallasanCopy = scene6.querySelector(".journey__fwd-copy--hallasan");
        var gwanakCopy = scene6.querySelector(".journey__fwd-copy--gwanak");
        var isGwanakState = false;
        var canFollowPointer =
          window.matchMedia("(pointer: fine)").matches &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        function setJourneyMountainState(showGwanak) {
          if (showGwanak === isGwanakState) return;
          isGwanakState = showGwanak;

          hallasanImage.classList.toggle("is-active", !showGwanak);
          hallasanCopy.classList.toggle("is-active", !showGwanak);
          gwanakImage.classList.toggle("is-active", showGwanak);
          gwanakCopy.classList.toggle("is-active", showGwanak);
        }

        if (
          focusPhoto &&
          focusCanvas &&
          hallasanImage &&
          gwanakImage &&
          hallasanCopy &&
          gwanakCopy &&
          canFollowPointer
        ) {
          var setPhotoX = gsap.quickSetter(focusPhoto, "x", "px");
          var setPhotoY = gsap.quickSetter(focusPhoto, "y", "px");

          journeyPointerScene = scene6;
          journeyPointerMove = function (event) {
            var canvasBounds = focusCanvas.getBoundingClientRect();
            var imageBottomBoundary =
              canvasBounds.top + canvasBounds.height * (486 / 1032);
            var photoBaseCenterX =
              canvasBounds.left + canvasBounds.width * (0.62396 + 0.18854 / 2);
            var photoBaseCenterY =
              canvasBounds.top + canvasBounds.height * (0.12306 + 0.34787 / 2);

            setJourneyMountainState(event.clientY > imageBottomBoundary);
            setPhotoX(event.clientX - photoBaseCenterX);
            setPhotoY(event.clientY - photoBaseCenterY);
          };
          journeyPointerLeave = function () {
            setJourneyMountainState(false);
            setPhotoX(0);
            setPhotoY(0);
          };

          scene6.addEventListener("pointermove", journeyPointerMove, { passive: true });
          scene6.addEventListener("pointerleave", journeyPointerLeave);
        }
      }
    }

    // GSAP ScrollTrigger는 브라우저 리사이즈 시 자체적으로 디바운스(Debounce) 처리를 하여 렉 없이 안전하게 refresh를 호출합니다.
    // 강제 리사이즈 이벤트를 제거하고, ScrollTrigger가 스스로 재계산하기 직전(refreshInit)에만 트랙 길이를 업데이트하도록 수정하여 성능을 최적화합니다.
    // Skills: keep the vertical scene in place while the dome card rises
    // from below the viewport to its Figma resting position.
    var skillsIntro = document.querySelector(".skills-intro");
    var skillsInner = document.querySelector(".skills-intro__inner");
    var skillsDesignCard = document.querySelector(".skills-intro__card--design");
    var skillsFrontendCard = document.querySelector(".skills-intro__card--frontend");
    var skillsUxCard = document.querySelector(".skills-intro__card--ux");
    if (skillsIntro && skillsInner && skillsDesignCard && skillsFrontendCard && skillsUxCard) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set([skillsDesignCard, skillsFrontendCard, skillsUxCard], { y: 0 });
      } else {
        var cardEntryY = function (card) {
          return window.innerHeight - card.offsetTop + 24;
        };
        var skillsTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: skillsIntro,
            start: "top top",
            end: function () {
              return "+=" + window.innerHeight * 2.4;
            },
            pin: skillsInner,
            pinSpacing: true,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });

        skillsTimeline
          .fromTo(skillsDesignCard, {
            y: function () {
              return cardEntryY(skillsDesignCard);
            },
          }, {
            y: 0,
            duration: 1,
            ease: "none",
          })
          .fromTo(skillsFrontendCard, {
            y: function () {
              return cardEntryY(skillsFrontendCard);
            },
          }, {
            y: 0,
            duration: 1,
            ease: "none",
          })
          .to(skillsDesignCard, {
            y: function () {
              return -skillsInner.offsetHeight * 0.3195;
            },
            duration: 1,
            ease: "none",
          }, "<")
          .fromTo(skillsUxCard, {
            y: function () {
              return cardEntryY(skillsUxCard);
            },
          }, {
            y: 0,
            duration: 1,
            ease: "none",
          });
      }
    }

    ScrollTrigger.addEventListener("refreshInit", setTrackHeight);
  }

  window.addEventListener("pagehide", function () {
    if (ro) ro.disconnect();
    window.removeEventListener("resize", syncCoords);
    if (journeyPointerScene && journeyPointerMove) {
      journeyPointerScene.removeEventListener("pointermove", journeyPointerMove);
    }
    if (journeyPointerScene && journeyPointerLeave) {
      journeyPointerScene.removeEventListener("pointerleave", journeyPointerLeave);
    }
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
