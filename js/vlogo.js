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
    tl.to(gallery, { "--vdim": 0.3, duration: 0.6, ease: "power1.out" }, 0.1)
      .to(gallery, {
        filter: "blur(0px) saturate(1) contrast(1) brightness(1) drop-shadow(0 0 0 rgba(42,42,42,0))",
        "--collage-veil": 0,
        duration: 0.6,
        ease: "power1.out"
      }, 0.1)
      // 흰 배경 위 UI는 검정이 덮기 전에 비운다
      .to(".hero2__bottom", { autoAlpha: 0, duration: 0.15 }, 0.1)
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
    // 밝은 인트로에서는 검정, 로고가 확대되어 어두운 장면이 열리면 흰색으로 전환
    gsap.set(globalHeader, { autoAlpha: 1 });

    ScrollTrigger.create({
      trigger: hvt,
      start: "top top-=60",
      end: function() { return "+=" + Math.max(getScrubDist() - 60, 1); },
      onEnter: function() {
        globalHeader.classList.add("global-header--over-hero");
      },
      onLeave: function() {
        globalHeader.classList.remove("global-header--over-hero");
      },
      onEnterBack: function() {
        globalHeader.classList.add("global-header--over-hero");
      },
      onLeaveBack: function() {
        globalHeader.classList.remove("global-header--over-hero");
      }
    });

    // 돔(Dome) 사각형 모핑 애니메이션
    // .about 섹션이 뷰포트 하단에서 나타나기 시작할 때(start)부터 최상단에 닿을 때(end)까지 진행
    var aboutDome = document.querySelector(".about__dome");
    var goldBridge = document.querySelector(".hero-to-about-gold");

    if (aboutDome && goldBridge) {
      var stripeHost = goldBridge.querySelector(".hero-to-about-gold__stripes");
      var stripeCount = 56;
      var stripeWidth = 100 / stripeCount;

      if (stripeHost && !stripeHost.children.length) {
        Array.from({ length: stripeCount }).forEach(function(_, index) {
          var stripe = document.createElement("span");
          stripe.className = "hero-to-about-gold__stripe";
          stripe.style.setProperty("--stripe-left", (index * stripeWidth) + "%");
          stripe.style.setProperty("--stripe-width", (stripeWidth + 0.04) + "%");
          stripeHost.appendChild(stripe);
        });
      }

      var goldStripes = goldBridge.querySelectorAll(".hero-to-about-gold__stripe");
      var aboutTitleContrast = aboutHeaderFixed.querySelector(".about__title");
      var aboutBadgeContrast = aboutHeaderFixed.querySelector(".about__badge");
      var aboutTransition = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: ".about",
          start: "top bottom",
          end: "top top",
          scrub: true,
          invalidateOnRefresh: true
        }
      });

      ScrollTrigger.create({
        trigger: ".about",
        start: "top bottom",
        onEnter: function() {
          globalHeader.classList.remove("global-header--over-hero");
        },
        onLeaveBack: function() {
          globalHeader.classList.add("global-header--over-hero");
        }
      });

      gsap.set(aboutHeaderFixed, { yPercent: 0 });

      aboutTransition
        .fromTo(goldBridge, {
          autoAlpha: 0
        }, {
          autoAlpha: 1,
          duration: 0.05
        }, 0)
        .to(aboutHeaderFixed, {
          "--copy-contrast": 0,
          duration: 0.06,
          ease: "power1.out"
        }, 0)
        .to(aboutTitleContrast, {
          textShadow: "0 2px 4px rgba(0,0,0,0), 0 8px 26px rgba(0,0,0,0)",
          duration: 0.06,
          ease: "power1.out"
        }, 0)
        .to(aboutBadgeContrast, {
          backgroundColor: "rgba(0,0,0,0.08)",
          duration: 0.06,
          ease: "power1.out"
        }, 0)
        .fromTo(goldStripes, {
          scaleX: 0,
          autoAlpha: 0
        }, {
          scaleX: 1,
          autoAlpha: 1,
          duration: 0.32,
          stagger: 0.011,
          ease: "power2.out"
        }, 0)
        .fromTo(aboutHeaderFixed, {
          yPercent: 0
        }, {
          yPercent: -100,
          duration: 0.82,
          ease: "none"
        }, 0.08)
        .set(aboutDome, {
          yPercent: 14,
          "--dome-shape-progress": 0,
          "--dome-progress": 0
        }, 0)
        .to(aboutDome, {
          yPercent: 0,
          duration: 0.72,
          ease: "power2.out"
        }, 0.35)
        .to(aboutDome, {
          "--dome-shape-progress": 1,
          duration: 0.34,
          ease: "power2.inOut"
        }, 0.35)
        .to(aboutDome, {
          "--dome-progress": 1,
          duration: 0.35,
          ease: "power2.inOut"
        }, 0.7);

      var aboutSubtitle = aboutDome.querySelector(".about__subtitle");

      if (aboutSubtitle) {
        function resetAboutSubtitle() {
          gsap.set(aboutSubtitle, {
            clipPath: "inset(0 100% 0 0)",
            filter: "blur(5px)"
          });
        }

        function revealAboutSubtitle() {
          gsap.to(aboutSubtitle, {
            clipPath: "inset(0 0% 0 0)",
            filter: "blur(0px)",
            duration: 0.9,
            ease: "power2.out",
            overwrite: true
          });
        }

        resetAboutSubtitle();

        ScrollTrigger.create({
          trigger: ".about",
          start: "top 72%",
          onEnter: revealAboutSubtitle,
          onEnterBack: revealAboutSubtitle,
          onLeave: resetAboutSubtitle,
          onLeaveBack: resetAboutSubtitle
        });
      }

      var aboutPhoto = aboutDome.querySelector(".about__photo");
      var aboutPhotoImage = aboutPhoto && aboutPhoto.querySelector("img");

      if (aboutPhoto && aboutPhotoImage) {
        function resetAboutPhoto() {
          gsap.set(aboutPhoto, {
            clipPath: "inset(0 100% 100% 0)"
          });
          gsap.set(aboutPhotoImage, {
            filter: "blur(4px)",
            scale: 1.035,
            transformOrigin: "0% 0%"
          });
        }

        function revealAboutPhoto() {
          gsap.to(aboutPhoto, {
            clipPath: "inset(0 0% 0% 0)",
            duration: 1.15,
            ease: "power2.inOut",
            overwrite: true
          });
          gsap.to(aboutPhotoImage, {
            filter: "blur(0px)",
            scale: 1,
            duration: 1.15,
            ease: "power2.inOut",
            overwrite: true
          });
        }

        resetAboutPhoto();

        ScrollTrigger.create({
          trigger: ".about",
          start: "top 60%",
          onEnter: revealAboutPhoto,
          onEnterBack: revealAboutPhoto,
          onLeave: resetAboutPhoto,
          onLeaveBack: resetAboutPhoto
        });
      }

      function splitAboutText(element) {
        if (!element || element.dataset.revealSplit === "true") return [];

        var readableText = element.textContent.replace(/\s+/g, " ").trim();
        var walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        var textNodes = [];

        while (walker.nextNode()) {
          textNodes.push(walker.currentNode);
        }

        textNodes.forEach(function(textNode) {
          var normalized = textNode.nodeValue.replace(/\s+/g, " ").trim();

          if (!normalized) {
            textNode.remove();
            return;
          }

          var fragment = document.createDocumentFragment();
          Array.from(normalized).forEach(function(character) {
            var characterSpan = document.createElement("span");
            characterSpan.className = "about__char";
            characterSpan.setAttribute("aria-hidden", "true");
            characterSpan.textContent = character === " " ? "\u00a0" : character;
            fragment.appendChild(characterSpan);
          });
          textNode.replaceWith(fragment);
        });

        element.dataset.revealSplit = "true";
        element.setAttribute("aria-label", readableText);
        return element.querySelectorAll(".about__char");
      }

      function createCharacterReveal(element, startPosition, staggerAmount) {
        var characters = splitAboutText(element);
        if (!characters.length) return;

        function resetCharacters() {
          gsap.set(characters, {
            autoAlpha: 0,
            yPercent: 55,
            filter: "blur(4px)"
          });
        }

        function revealCharacters() {
          gsap.to(characters, {
            autoAlpha: 1,
            yPercent: 0,
            filter: "blur(0px)",
            duration: 0.5,
            stagger: staggerAmount,
            ease: "power2.out",
            overwrite: true
          });
        }

        resetCharacters();

        ScrollTrigger.create({
          trigger: element,
          start: startPosition,
          onEnter: revealCharacters,
          onEnterBack: revealCharacters,
          onLeave: resetCharacters,
          onLeaveBack: resetCharacters
        });
      }

      var aboutRoles = aboutDome.querySelector(".about__roles");
      var aboutDesc = aboutDome.querySelector(".about__desc");
      var aboutScrollBtn = aboutDome.querySelector(".about__scroll-btn");

      createCharacterReveal(aboutRoles, "top 82%", 0.025);
      createCharacterReveal(aboutDesc, "top 84%", 0.012);

      if (aboutScrollBtn) {
        function resetAboutButton() {
          gsap.set(aboutScrollBtn, {
            clipPath: "inset(0 100% 0 0)",
            filter: "blur(3px)"
          });
        }

        function revealAboutButton() {
          gsap.to(aboutScrollBtn, {
            clipPath: "inset(0 0% 0 0)",
            filter: "blur(0px)",
            duration: 0.75,
            ease: "power2.out",
            overwrite: true
          });
        }

        resetAboutButton();

        ScrollTrigger.create({
          trigger: aboutScrollBtn,
          start: "top 88%",
          onEnter: revealAboutButton,
          onEnterBack: revealAboutButton,
          onLeave: resetAboutButton,
          onLeaveBack: resetAboutButton
        });
      }

    }

    // =======================================================
    // Journey 가로 스크롤 및 메뉴 전환 애니메이션
    // =======================================================
    var journeySection = document.querySelector("#journey");
    var journeyTrack = document.querySelector("#journeyTrack");
    var globalMenuBtn = document.querySelector("#globalMenuBtn");

    if (journeySection && journeyTrack && globalMenuBtn) {
      var journeyTimelineText = journeySection.querySelector(".journey__timeline-text");
      var journeyInvertedBlock = journeySection.querySelector(".journey__inverted-block");

      function alignJourneyTypeAxis() {
        if (!journeyTimelineText || !journeyInvertedBlock) return;
        if (window.innerWidth <= 768) {
          gsap.set(journeyInvertedBlock, { x: 0 });
          return;
        }

        var timelineRight = journeyTimelineText.offsetLeft + journeyTimelineText.offsetWidth;
        var invertedRight = journeyInvertedBlock.offsetLeft + journeyInvertedBlock.offsetWidth;
        gsap.set(journeyInvertedBlock, { x: timelineRight - invertedRight });
      }

      alignJourneyTypeAxis();
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(alignJourneyTypeAxis);
      }
      ScrollTrigger.addEventListener("refreshInit", alignJourneyTypeAxis);
      // 1. 가로 스크롤 트랙 이동 거리 계산
      function getScrollAmount() {
        var trackWidth = journeyTrack.scrollWidth;
        var viewWidth = window.innerWidth;
        // 트랙 전체 길이를 끝까지 스크롤하도록 설정 (Scene 1 -> Scene 2 파노라마)
        return -(trackWidth - viewWidth);
      }

      // 가로 이동을 실행할 타임라인 생성
      function getJourneyMoveDistance() {
        return Math.max(1, journeyTrack.scrollWidth - window.innerWidth);
      }

      function getJourneyHoldDistance() {
        return Math.min(1400, Math.max(760, window.innerHeight * 1.15));
      }

      var tlJourney = gsap.timeline();
      var journeyBridge = journeySection.querySelector(".journey__bridge-img");

      if (journeyBridge) {
        gsap.set(journeyBridge, {
          clipPath: "inset(0 100% 0 0)",
          scale: 1.015,
          transformOrigin: "left center"
        });
      }

      tlJourney.to({}, { duration: 0.12 });
      
      // 트랙은 왼쪽 밀어냄
      tlJourney.to(journeyTrack, {
        x: getScrollAmount,
        duration: 0.88,
        ease: "none"
      }, 0.12);

      // journey2: the second artwork is revealed inside the same frame while
      // the horizontal journey keeps moving. Because this lives on the main
      // scrubbed timeline, reversing the scroll restores the first artwork.
      var journeyPastelsSwap = journeySection.querySelector(".journey__pastels-swap");
      if (journeyPastelsSwap) {
        gsap.set(journeyPastelsSwap, { yPercent: 8 });
        tlJourney.to(journeyPastelsSwap, {
          clipPath: "inset(0% 0 0 0)",
          yPercent: 0,
          duration: 0.055,
          ease: "power1.inOut"
        }, 0.24);
      }

      // I DESIGNED has one transform owner. Its exact stop is calculated from
      // the following image edge so it remains stable at every viewport size.
      var designedText = document.querySelector(".journey__huge-anim");
      var designedStopImage = document.querySelector(".journey__ending-img");
      function getDesignedStopX() {
        if (!designedText || !designedStopImage) return 0;

        var currentX = Number(gsap.getProperty(designedText, "x")) || 0;
        var textRect = designedText.getBoundingClientRect();
        var imageRect = designedStopImage.getBoundingClientRect();
        var gap = Math.min(Math.max(window.innerWidth * 0.002, 2), 3);
        var textBaseRight = textRect.right - currentX;

        return Math.max(0, imageRect.left - gap - textBaseRight);
      }

      if (designedText && designedStopImage) {
        tlJourney.to(designedText, {
          x: getDesignedStopX,
          duration: 0.48,
          ease: "none"
        }, 0.04);
      }



      // 가로 스크롤 트리거 및 상단 메뉴바 ↔ 둥근 메뉴 버튼(MENU) 전환 병합
      // Hold the completed mountain scene long enough for its image and copy
      // to be understood without changing the preceding horizontal pace.
      tlJourney.to({}, {
        duration: getJourneyHoldDistance() / getJourneyMoveDistance()
      });

      ScrollTrigger.create({
        trigger: journeySection,
        start: "top top",
        end: () => "+=" + (getJourneyMoveDistance() + getJourneyHoldDistance()),
        pin: true,
        animation: tlJourney,
        scrub: 1, // 스크롤 시 부드럽게(1초 지연) 따라오도록 설정
        invalidateOnRefresh: true, // 리사이즈 시 거리 재계산
        onEnter: function() {
          gsap.to(globalHeader, { autoAlpha: 0, duration: 0.3, ease: "power2.out", overwrite: "auto" });
          gsap.to(globalMenuBtn, { autoAlpha: 1, duration: 0.3, delay: 0.1, ease: "power2.out", overwrite: "auto" });
          if (journeyBridge) {
            gsap.to(journeyBridge, {
              clipPath: "inset(0 0% 0 0)",
              scale: 1,
              duration: 0.8,
              delay: 0.08,
              ease: "power2.inOut",
              overwrite: "auto"
            });
          }
        },
        onLeave: function() {
          gsap.to(globalHeader, { autoAlpha: 0, y: -10, duration: 0.24, ease: "power2.out", overwrite: "auto" });
          gsap.to(globalMenuBtn, { autoAlpha: 0, duration: 0.3, ease: "power2.out", overwrite: "auto" });
        },
        onEnterBack: function() {
          gsap.to(globalHeader, { autoAlpha: 0, duration: 0.3, ease: "power2.out", overwrite: "auto" });
          gsap.to(globalMenuBtn, { autoAlpha: 1, duration: 0.3, delay: 0.1, ease: "power2.out", overwrite: "auto" });
          if (journeyBridge) {
            gsap.to(journeyBridge, {
              clipPath: "inset(0 0% 0 0)",
              scale: 1,
              duration: 0.35,
              ease: "power2.out",
              overwrite: "auto"
            });
          }
        },
        onLeaveBack: function() { // 다시 위로 올라갈 때
          gsap.to(globalHeader, { autoAlpha: 1, duration: 0.3, delay: 0.1, ease: "power2.out", overwrite: "auto" });
          gsap.to(globalHeader, { autoAlpha: 1, duration: 0.3, delay: 0.1, ease: "power2.out", overwrite: "auto" });
          gsap.to(globalMenuBtn, { autoAlpha: 0, duration: 0.3, ease: "power2.out", overwrite: "auto" });
          if (journeyBridge) {
            gsap.to(journeyBridge, {
              clipPath: "inset(0 100% 0 0)",
              scale: 1.015,
              duration: 0.35,
              ease: "power2.in",
              overwrite: "auto"
            });
          }
        }
      });

      // 3. journey4 이미지 전환: 책상 이미지가 화면에 절반쯤 들어온 순간
      //    책상 → 유치원 단체사진, 우측 스케치북 → 유치원 아이들 사진으로 동시 크로스페이드.
      //    (containerAnimation: 가로로 움직이는 트랙 내부 요소의 위치를 기준으로 발동,
      //     역스크롤 시 원래 이미지로 자연 복귀)
      var swapImgs = gsap.utils.toArray(".journey__scene--3 .journey__swap");
      // 고정 My/JOURNEY — 트랙 밖(핀 섹션 직속)이라 화면 고정. journey4 진입과 함께 표시
      var fixedMy = gsap.utils.toArray([".journey__scene3-my", ".journey__scene3-journey"]);
      if (swapImgs.length) {
        var journey4LargeSwap = document.querySelector(".journey__ending-img .journey__swap");
        var journey4SmallSwap = document.querySelector(".journey__ending-sketch .journey__swap");

        gsap.set(journey4LargeSwap, {
          autoAlpha: 1,
          clipPath: "inset(0 100% 0 0)"
        });
        gsap.set(journey4SmallSwap, {
          autoAlpha: 1,
          clipPath: "inset(0 0 0 100%)"
        });

        var tlJourney4Swap = gsap.timeline();
        tlJourney4Swap
          .to(journey4LargeSwap, {
            clipPath: "inset(0 0% 0 0)",
            duration: 1,
            ease: "none"
          }, 0)
          .to(journey4SmallSwap, {
            clipPath: "inset(0 0 0 0%)",
            duration: 1,
            ease: "none"
          }, 0)
          .to(fixedMy, {
            autoAlpha: 1,
            duration: 0.65,
            ease: "none"
          }, 0.18);

        ScrollTrigger.create({
          trigger: ".journey__ending-img",
          containerAnimation: tlJourney,
          start: "left 12%",
          end: "left -5%",
          scrub: 0.65,
          animation: tlJourney4Swap,
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
          var journey5LargeSwap = document.querySelector(".journey__bouquet .journey__swap2");
          var journey5SmallSwap = document.querySelector(".journey__polaroid .journey__swap2");

          gsap.set(journey5LargeSwap, {
            autoAlpha: 1,
            clipPath: "inset(0 100% 0 0)"
          });
          gsap.set(journey5SmallSwap, {
            autoAlpha: 1,
            clipPath: "inset(0 0 0 100%)"
          });

          var tlJourney5Swap = gsap.timeline();
          tlJourney5Swap
            .to(journey5LargeSwap, {
              clipPath: "inset(0 0% 0 0)",
              duration: 1,
              ease: "none"
            }, 0)
            .to(journey5SmallSwap, {
              clipPath: "inset(0 0 0 0%)",
              duration: 1,
              ease: "none"
            }, 0);

          ScrollTrigger.create({
            trigger: ".journey__bouquet",
            containerAnimation: tlJourney,
            start: "left 60%",
            end: "left 38%",
            scrub: true,
            animation: tlJourney5Swap,
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
    var skillsAiCard = document.querySelector(".skills-intro__card--ai");

    // Reveal the fixed header only after the Skills chapter nearly fills the
    // viewport, rather than immediately when the horizontal Journey unpins.
    if (skillsIntro && globalHeader) {
      ScrollTrigger.create({
        trigger: skillsIntro,
        start: "top 18%",
        onEnter: function () {
          gsap.to(globalHeader, {
            autoAlpha: 1,
            y: 0,
            duration: 0.48,
            ease: "power2.out",
            overwrite: "auto",
          });
        },
        onLeaveBack: function () {
          gsap.to(globalHeader, {
            autoAlpha: 0,
            y: -10,
            duration: 0.28,
            ease: "power2.in",
            overwrite: "auto",
          });
        },
      });
    }

    if (skillsIntro && skillsInner && skillsDesignCard && skillsFrontendCard && skillsUxCard && skillsAiCard) {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set([skillsDesignCard, skillsFrontendCard, skillsUxCard, skillsAiCard], { y: 0 });
      } else {
        var cardEntryY = function (card) {
          return window.innerHeight - card.offsetTop + 24;
        };
        var cardExitY = function (card) {
          return -(card.offsetTop + card.offsetHeight + 24);
        };
        var cardTravelDuration = function (distance) {
          return Math.abs(distance) / window.innerHeight;
        };
        var skillsCards = [
          skillsDesignCard,
          skillsFrontendCard,
          skillsUxCard,
          skillsAiCard,
        ];
        // Figma 885:722 / 885:803의 동시 노출 위치를 시간축으로 환산한 값.
        // 모든 카드는 같은 픽셀 속도로 움직이고 시작 시점만 겹친다.
        var skillsCardStartUnits = [0, 0.395, 0.921, 1.399];
        var skillsTextHoldUnits = 0.75;
        var cardFullTravelDuration = function (card) {
          return cardTravelDuration(cardEntryY(card) - cardExitY(card));
        };
        var skillsScrollDistance = function () {
          var lastCardIndex = skillsCards.length - 1;
          var lastCardEnd =
            skillsCardStartUnits[lastCardIndex] +
            cardFullTravelDuration(skillsCards[lastCardIndex]);

          return "+=" + window.innerHeight * (lastCardEnd + skillsTextHoldUnits);
        };
        var skillsTimeline = gsap.timeline({
          scrollTrigger: {
            trigger: skillsIntro,
            start: "top top",
            end: skillsScrollDistance,
            pin: skillsInner,
            pinSpacing: true,
            scrub: 1.65,
            invalidateOnRefresh: true,
          },
        });

        skillsCards.forEach(function (card, index) {
          var cardStartUnit = skillsCardStartUnits[index];
          var cardDurationUnit = cardFullTravelDuration(card);
          var cardExpandStart = cardStartUnit + cardDurationUnit * 0.18;
          var cardExpandDuration = Math.min(0.38, cardDurationUnit * 0.27);
          var cardFace = card.querySelector(".skills-intro__card-face");
          var cardDetail = card.querySelector(".skills-intro__card-detail");

          skillsTimeline.fromTo(card, {
            y: function () {
              return cardEntryY(card);
            },
          }, {
            y: function () {
              return cardExitY(card);
            },
            duration: function () {
              return cardFullTravelDuration(card);
            },
            ease: "none",
          }, cardStartUnit);

          skillsTimeline.set(card, {
            zIndex: 5 + index,
          }, cardExpandStart);

          if (cardFace && cardDetail) {
            skillsTimeline
              .fromTo(cardFace, {
                autoAlpha: 1,
              }, {
                autoAlpha: 0,
                duration: cardExpandDuration,
                ease: "power1.out",
              }, cardExpandStart)
              .fromTo(cardDetail, {
                autoAlpha: 0,
                scale: 0.92,
              }, {
                autoAlpha: 1,
                scale: 1,
                duration: cardExpandDuration,
                ease: "power1.out",
              }, cardExpandStart);
          }
        });

        skillsTimeline.to({}, {
          duration: skillsTextHoldUnits,
        });
      }
    }

    // WORK: the project cards scroll vertically while the right-side index stays sticky.
    var workProjectCards = gsap.utils.toArray("[data-work-project]");
    var workIndexItems = gsap.utils.toArray("[data-work-index]");
    var workCategoryLabel = document.querySelector(".work-page__category-label");

    var activateWorkProject = function (card) {
      var projectName = card.getAttribute("data-work-project");
      var projectType = card.getAttribute("data-project-type") || "";

      workIndexItems.forEach(function (item) {
        item.classList.toggle(
          "is-active",
          item.getAttribute("data-work-index") === projectName
        );
      });

      if (workCategoryLabel) {
        workCategoryLabel.textContent = projectType;
      }
    };

    workProjectCards.forEach(function (card) {
      ScrollTrigger.create({
        trigger: card,
        start: "top 42%",
        end: "bottom 42%",
        onEnter: function () {
          activateWorkProject(card);
        },
        onEnterBack: function () {
          activateWorkProject(card);
        },
        onUpdate: function (self) {
          if (self.isActive) {
            activateWorkProject(card);
          }
        },
      });
    });

    var ilkwContributionVideo = document.querySelector(".work-page__ilkw-contribution-video");
    if (ilkwContributionVideo) {
      var playIlkwContributionVideo = function () {
        var playPromise = ilkwContributionVideo.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(function () {});
        }
      };

      ScrollTrigger.create({
        trigger: ilkwContributionVideo,
        start: "top bottom",
        end: "bottom top",
        onEnter: playIlkwContributionVideo,
        onEnterBack: playIlkwContributionVideo,
      });
    }

    var ilkwContributionLines = gsap.utils.toArray(".work-page__ilkw-contribution-line");
    var prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (ilkwContributionLines.length) {
      ilkwContributionLines.forEach(function (line) {
        var characters = Array.from(line.textContent);
        line.textContent = "";

        characters.forEach(function (character) {
          var characterSpan = document.createElement("span");
          characterSpan.className = "work-page__ilkw-contribution-char";
          characterSpan.textContent = character === " " ? "\u00a0" : character;
          line.appendChild(characterSpan);
        });
      });

      var ilkwContributionChars = gsap.utils.toArray(".work-page__ilkw-contribution-char");

      if (prefersReducedMotion) {
        gsap.set(ilkwContributionChars, { color: "#cfcfcf" });
      } else {
        gsap.set(ilkwContributionChars, { color: "#494949" });

        var getIlkwContributionHeaderOffset = function () {
          var globalHeader = document.querySelector(".global-header");
          return globalHeader ? Math.ceil(globalHeader.getBoundingClientRect().height) : 0;
        };

        gsap.timeline({
          scrollTrigger: {
            trigger: ".work-page__project--ilkw-contribution",
            start: function () {
              return "top " + getIlkwContributionHeaderOffset() + "px";
            },
            end: function () {
              return "+=" + Math.max(window.innerHeight * 2.8, ilkwContributionChars.length * 18);
            },
            pin: ".work-page__ilkw-contribution-scene",
            pinSpacing: true,
            scrub: 0.45,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        }).to(ilkwContributionChars, {
          color: "#cfcfcf",
          duration: 0.08,
          ease: "none",
          stagger: 0.08,
        });
      }
    }

    var wrunStoryScene = document.querySelector(".work-page__wrun-story-scene");
    var wrunStoryTrack = document.querySelector(".work-page__wrun-story-track");
    var wrunStoryCards = gsap.utils.toArray(".work-page__wrun-story-card");
    var wrunStoryShades = gsap.utils.toArray(".work-page__wrun-story-shade");
    var wrunStoryStatements = gsap.utils.toArray(".work-page__wrun-story-statement");

    if (
      wrunStoryScene &&
      wrunStoryTrack &&
      wrunStoryCards.length === 3 &&
      wrunStoryStatements.length === 3 &&
      !prefersReducedMotion
    ) {
      var getWrunStoryHeaderOffset = function () {
        var globalHeader = document.querySelector(".global-header");
        return globalHeader ? Math.ceil(globalHeader.getBoundingClientRect().height) : 0;
      };

      var getWrunStoryStep = function () {
        return wrunStoryCards[1].offsetTop - wrunStoryCards[0].offsetTop;
      };

      gsap.set(wrunStoryTrack, { y: 0 });
      gsap.set(wrunStoryShades, { opacity: 0.7 });
      gsap.set(wrunStoryShades[0], { opacity: 0 });
      gsap.set(wrunStoryStatements, { opacity: 0, y: 12 });
      gsap.set(wrunStoryStatements[0], { opacity: 1, y: 0 });

      var wrunStoryTimeline = gsap.timeline({
        scrollTrigger: {
          trigger: ".work-page__project--wrun-story",
          start: function () {
            return "top " + getWrunStoryHeaderOffset() + "px";
          },
          end: function () {
            return "+=" + Math.max(window.innerHeight * 2.7, 1700);
          },
          pin: wrunStoryScene,
          pinSpacing: true,
          scrub: 0.55,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onEnter: function () {
            activateWorkProject(document.querySelector(".work-page__project--wrun-story"));
          },
          onEnterBack: function () {
            activateWorkProject(document.querySelector(".work-page__project--wrun-story"));
          },
          onLeave: function () {
            activateWorkProject(document.querySelector(".work-page__project--jaran"));
          },
          onUpdate: function (self) {
            if (self.isActive) {
              activateWorkProject(document.querySelector(".work-page__project--wrun-story"));
            }
          },
        },
      });

      [1, 2].forEach(function (stateIndex) {
        var transitionLabel = "wrun-state-" + stateIndex;

        wrunStoryTimeline
          .to({}, { duration: 0.28 })
          .addLabel(transitionLabel)
          .to(
            wrunStoryTrack,
            {
              y: function () {
                return -getWrunStoryStep() * stateIndex;
              },
              duration: 0.9,
              ease: "power1.inOut",
            },
            transitionLabel
          )
          .to(
            wrunStoryShades[stateIndex - 1],
            { opacity: 0.7, duration: 0.55, ease: "none" },
            transitionLabel
          )
          .to(
            wrunStoryShades[stateIndex],
            { opacity: 0, duration: 0.55, ease: "none" },
            transitionLabel
          )
          .to(
            wrunStoryStatements[stateIndex - 1],
            { opacity: 0, y: -12, duration: 0.3, ease: "power1.out" },
            transitionLabel
          )
          .to(
            wrunStoryStatements[stateIndex],
            { opacity: 1, y: 0, duration: 0.35, ease: "power1.out" },
            transitionLabel + "+=0.28"
          );
      });

      wrunStoryTimeline.to({}, { duration: 0.38 });
    }

    var cloneCodingScene = document.querySelector(".clone-coding__scene");
    var cloneCodingViewport = document.querySelector(".clone-coding__viewport");
    var cloneCodingTrack = document.querySelector(".clone-coding__track");
    var cloneCodingCards = gsap.utils.toArray(".clone-coding__card");
    var cloneCodingIntro = document.querySelector(".clone-coding__intro");

    if (
      cloneCodingScene &&
      cloneCodingViewport &&
      cloneCodingTrack &&
      cloneCodingCards.length === 3
    ) {
      var getCloneCodingHeaderOffset = function () {
        var globalHeader = document.querySelector(".global-header");
        return globalHeader ? Math.ceil(globalHeader.getBoundingClientRect().height) : 0;
      };

      var getCloneCodingCardX = function (cardIndex) {
        var card = cloneCodingCards[cardIndex];
        return (
          cloneCodingViewport.clientWidth / 2 -
          (card.offsetLeft + card.offsetWidth / 2)
        );
      };

      gsap.set(cloneCodingTrack, {
        x: function () {
          return getCloneCodingCardX(1);
        },
      });

      if (!prefersReducedMotion) {
        var showCloneCodingHeader = function () {
          if (globalHeader) {
            gsap.to(globalHeader, {
              autoAlpha: 1,
              y: 0,
              duration: 0.35,
              ease: "power2.out",
              overwrite: "auto",
            });
          }

          if (globalMenuBtn) {
            gsap.to(globalMenuBtn, {
              autoAlpha: 0,
              duration: 0.25,
              ease: "power2.out",
              overwrite: "auto",
            });
          }
        };

        gsap.timeline({
          scrollTrigger: {
            trigger: ".clone-coding",
            start: function () {
              return "top " + getCloneCodingHeaderOffset() + "px";
            },
            end: function () {
              return "+=" + Math.max(window.innerHeight * 1.8, 1200);
            },
            pin: cloneCodingScene,
            pinSpacing: true,
            scrub: 0.6,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onEnter: showCloneCodingHeader,
            onEnterBack: showCloneCodingHeader,
            onUpdate: function (self) {
              if (self.isActive && globalHeader && gsap.getProperty(globalHeader, "opacity") < 1) {
                showCloneCodingHeader();
              }
            },
          },
        })
          .to({}, { duration: 0.2 })
          .to(
            cloneCodingTrack,
            {
              x: function () {
                return getCloneCodingCardX(2);
              },
              duration: 1,
              ease: "power1.inOut",
            }
          )
          .to(
            cloneCodingIntro,
            {
              y: -60,
              opacity: 0.45,
              duration: 0.5,
              ease: "power1.out",
            },
            0.7
          )
          .to({}, { duration: 0.25 });
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
