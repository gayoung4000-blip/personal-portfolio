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
  var chatbotTab = document.querySelector(".chatbot-tab");

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
    document.documentElement.classList.add("is-vlogo");
    if (chatbotTab) {
      chatbotTab.style.opacity = "1";
      chatbotTab.style.visibility = "visible";
      chatbotTab.style.transform = "translate3d(0, -50%, 0)";
    }
  }

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced || !window.gsap || !window.flubber) {
    showFinal();
    return;
  }

  // 리사이즈 자동 복구(vlogo.js)로 재진입한 경우: 인트로를 건너뛰고 최종 상태로 시작
  // (스크롤 중간 지점으로 복귀하므로 점 morph를 다시 재생하면 어색함)
  if (document.documentElement.classList.contains("is-vlogo")) {
    showFinal();
    return;
  }

  var navItems = gsap.utils.toArray(".hero2__nav a");

  // 초기 상태: UI 숨김 (스크립트가 body 끝에서 첫 페인트 전에 실행되므로 깜빡임 없음)
  gsap.set(".hero2__logo", { autoAlpha: 0, y: -16 });
  gsap.set(navItems, { autoAlpha: 0, y: -12 });
  gsap.set([".hero2__credit", ".hero2__scroll"], { autoAlpha: 0, y: 20 });
  if (chatbotTab) {
    gsap.set(chatbotTab, { autoAlpha: 0, xPercent: 100 });
  }

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
  });

  if (chatbotTab) {
    tl.to(chatbotTab, { autoAlpha: 1, xPercent: 0, duration: 0.55, ease: "power3.out" }, 0.05);
  }

  tl.add(morphTween(morph.g, START.g, TARGET.g, 0.65, "power3.inOut"), 0.05)
    .add(morphTween(morph.hole, START.hole, TARGET.hole, 0.65, "power3.inOut"), 0.05)

    .set(morph.y, { opacity: 1 }, 0.5)
    .add(morphTween(morph.y, START.y, TARGET.y, 0.5, "power3.out"), 0.5)
    .set(morph.acc, { opacity: 1 }, 0.65)
    .add(morphTween(morph.acc, START.acc, TARGET.acc, 0.45, "power3.out"), 0.65)

    .to(morphLayer, { opacity: 0, duration: 0.12, ease: "none" }, 1.1)
    .to(finalPath, { opacity: 1, duration: 0.12, ease: "none" }, 1.1)
    .call(function () {
      // 원본 로고 크로스페이드가 끝난 직후 영상 마스크를 노출한다.
      document.documentElement.classList.add("is-vlogo");
    }, null, 1.22)

    .to(".hero2__logo", { autoAlpha: 1, y: 0, duration: 0.5 }, 0.8)
    .to(navItems, { autoAlpha: 1, y: 0, duration: 0.4, stagger: 0.05 }, 0.85)
    .to(".hero2__credit", { autoAlpha: 1, y: 0, duration: 0.5 }, 1.0)
    .to(".hero2__scroll", { autoAlpha: 1, y: 0, duration: 0.5 }, 1.2);
})();

// JARAN transition — step 1: move the project image into the viewport center.
(function () {
  "use strict";

  if (!window.gsap || !window.ScrollTrigger) return;

  var jaranVisual = document.querySelector(".work-page__visual--jaran");
  var jaranVisualImage = document.querySelector(".work-page__visual--jaran img");
  var anySizeStage = document.querySelector(".work-page__jaran-any-size");
  var anySizeCard = document.querySelector(".work-page__jaran-any-size-card");
  var anySizeImage = document.querySelector(".work-page__jaran-any-size-image");
  var anySizeFade = document.querySelector(".work-page__jaran-any-size-fade");
  var anyWord = document.querySelector(".work-page__jaran-any-size-word--any");
  var sizeWord = document.querySelector(".work-page__jaran-any-size-word--size");
  var workIndex = document.querySelector(".work-page__index");
  // JARAN 라이브 데모 (실제 배포 앱 iframe + 체험 버튼)
  var tabletApp = document.querySelector(".work-page__jaran-any-size-app--tablet");
  var phoneApp = document.querySelector(".work-page__jaran-any-size-app--phone");
  var phoneButtonMask = document.querySelector(".work-page__jaran-mobile-button-mask");
  var tryBtn = document.querySelector(".work-page__jaran-any-size-try");
  var exitBtn = document.querySelector(".work-page__jaran-any-size-exit");
  if (!jaranVisual || !jaranVisualImage || !anySizeStage || !anySizeCard || !anySizeImage || !anySizeFade || !anyWord || !sizeWord) return;

  gsap.registerPlugin(ScrollTrigger);

  ScrollTrigger.matchMedia({
    "(min-width: 761px) and (prefers-reduced-motion: no-preference)": function () {
      var initialRect = jaranVisual.getBoundingClientRect();
      var coverRadius = Math.hypot(initialRect.width, initialRect.height) / 2;
      gsap.set(jaranVisual, {
        clipPath: "circle(" + coverRadius + "px at 50% 50%)",
      });
      gsap.set(anySizeCard, { autoAlpha: 0 });
      gsap.set(anySizeImage, { autoAlpha: 0 });
      if (tabletApp) gsap.set(tabletApp, { autoAlpha: 0 });
      if (phoneApp) gsap.set(phoneApp, { autoAlpha: 0 });
      if (phoneButtonMask) gsap.set(phoneButtonMask, { autoAlpha: 0 });
      if (tryBtn) gsap.set(tryBtn, { autoAlpha: 0 });

      // 카드 크기가 애니메이션되는 동안 iframe 축소 배율을 실시간 갱신
      // (앱은 원본 해상도로 렌더 → scale로 카드에 맞춤. 내부 미디어쿼리 보존 목적)
      function updateAppScale() {
        var w = anySizeCard.offsetWidth;
        var h = anySizeCard.offsetHeight;
        if (!w || !h) return;
        anySizeCard.style.setProperty(
          "--jaran-tablet-scale",
          String(Math.max(w / 1194, h / 753))
        );
        anySizeCard.style.setProperty(
          "--jaran-phone-scale",
          String(Math.max(w / 390, h / 844))
        );
      }
      updateAppScale();
      // 스크럽 프레임마다 갱신(타임라인이 카드 크기를 트윈) + 리사이즈 대비 관찰자 병행
      var appScaleObserver = null;
      if (tabletApp || phoneApp) {
        appScaleObserver = new ResizeObserver(updateAppScale);
        appScaleObserver.observe(anySizeCard);
      }

      // 체험 모드: 클릭 전에는 iframe이 마우스를 받지 않아 휠 스크롤이 페이지에 흐른다
      function activateLive() {
        anySizeCard.classList.add("is-live");
        if (exitBtn) exitBtn.hidden = false;
      }
      function deactivateLive() {
        anySizeCard.classList.remove("is-live");
        if (exitBtn) exitBtn.hidden = true;
      }
      function restartPhonePreview() {
        if (!phoneApp) return;
        var previewSrc = phoneApp.getAttribute("src");
        phoneApp.removeAttribute("src");
        phoneApp.setAttribute("src", previewSrc);
      }
      function onCardActivate(event) {
        if (exitBtn && (event.target === exitBtn || exitBtn.contains(event.target))) return;
        // 모바일은 온보딩 연출만 보여주는 프리뷰이므로 체험 모드로 전환하지 않는다.
        if (phoneApp && Number(gsap.getProperty(phoneApp, "opacity")) > 0.5) return;
        if (!anySizeCard.classList.contains("is-live")) activateLive();
      }
      function onExitClick(event) {
        event.stopPropagation();
        deactivateLive();
      }
      anySizeCard.addEventListener("click", onCardActivate);
      if (exitBtn) exitBtn.addEventListener("click", onExitClick);

      function getCircleDiameter() {
        return Math.min(220, Math.max(160, window.innerWidth * 0.14));
      }

      function getMobileWidth() {
        return Math.min(360, Math.max(280, window.innerWidth * 0.2));
      }

      function getMobileHeight() {
        return Math.min(660, Math.max(500, window.innerHeight * 0.72));
      }

      function getTabletExpandDistance() {
        return Math.max(480, window.innerHeight * 0.68);
      }

      function getTabletHoldDistance() {
        return Math.min(360, Math.max(270, window.innerHeight * 0.34));
      }

      function getMobileMorphDistance() {
        return Math.max(520, window.innerHeight * 0.72);
      }

      function getMobileHoldDistance() {
        return Math.min(320, Math.max(220, window.innerHeight * 0.28));
      }

      function syncWorkIndex(scrollTrigger) {
        if (!workIndex) return;
        var scrollDistance = Math.max(0, scrollTrigger.scroll() - scrollTrigger.start);
        gsap.set(workIndex, { y: -scrollDistance });
      }

      function resetWorkIndex() {
        if (workIndex) gsap.set(workIndex, { clearProps: "transform" });
      }

      var moveToCenter = gsap.timeline({
        scrollTrigger: {
          id: "jaran-center-step",
          trigger: jaranVisual,
          start: function () {
            var wheelPauseDistance = Math.min(260, Math.max(180, window.innerHeight * 0.24));
            return "center+=" + wheelPauseDistance + " center";
          },
          endTrigger: anySizeStage,
          end: "center center",
          pin: true,
          pinSpacing: false,
          scrub: 0.65,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          onEnter: function (self) {
            syncWorkIndex(self);
          },
          onUpdate: function (self) {
            if (self.isActive) syncWorkIndex(self);
          },
          onLeave: function (self) {
            syncWorkIndex(self);
            gsap.set(jaranVisual, { autoAlpha: 0 });
          },
          onEnterBack: function (self) {
            gsap.set(jaranVisual, { autoAlpha: 1 });
            syncWorkIndex(self);
          },
          onLeaveBack: function () {
            resetWorkIndex();
          },
        },
      });

      moveToCenter
        .to(jaranVisual, {
          x: function () {
            var rect = jaranVisual.getBoundingClientRect();
            return window.innerWidth / 2 - (rect.left + rect.width / 2);
          },
          y: function () {
            var visualRect = jaranVisual.getBoundingClientRect();
            return window.innerHeight / 2 - (visualRect.top + visualRect.height / 2);
          },
          scale: function () {
            var rect = jaranVisual.getBoundingClientRect();
            return getCircleDiameter() / Math.min(rect.width, rect.height);
          },
          clipPath: function () {
            var rect = jaranVisual.getBoundingClientRect();
            return "circle(" + Math.min(rect.width, rect.height) / 2 + "px at 50% 50%)";
          },
          duration: 1,
          ease: "power1.inOut",
        })
        .to(jaranVisualImage, {
          autoAlpha: 0,
          duration: 0.48,
          ease: "power2.inOut",
        }, 0.46);

      var expandTablet = gsap.timeline({
        scrollTrigger: {
          id: "jaran-tablet-expand",
          trigger: anySizeStage,
          start: "center center",
          end: function () {
            return "+=" + (
              getTabletExpandDistance() +
              getTabletHoldDistance() +
              getMobileMorphDistance() +
              getMobileHoldDistance()
            );
          },
          pin: true,
          pinSpacing: true,
          scrub: 0.65,
          invalidateOnRefresh: true,
          anticipatePin: 1,
          onEnter: function () {
            gsap.set(anySizeCard, { autoAlpha: 1 });
            gsap.set(jaranVisual, { autoAlpha: 0 });
            updateAppScale();
          },
          onEnterBack: function () {
            gsap.set(anySizeCard, { autoAlpha: 1 });
            gsap.set(jaranVisual, { autoAlpha: 0 });
            updateAppScale();
          },
          onLeaveBack: function () {
            gsap.set(anySizeCard, { autoAlpha: 0 });
            gsap.set(jaranVisual, { autoAlpha: 1 });
          },
          onUpdate: updateAppScale,
          onRefresh: updateAppScale,
        },
      });

      expandTablet
        .from(anySizeCard, {
          width: function () { return getCircleDiameter(); },
          height: function () { return getCircleDiameter(); },
          borderRadius: "50%",
          duration: 0.75,
          ease: "none",
        }, 0.25)
        .fromTo(anyWord, {
          x: function () {
            return anySizeStage.clientWidth * 0.24 - getCircleDiameter() / 2;
          },
          autoAlpha: 0,
        }, {
          x: function () {
            return anySizeStage.clientWidth * 0.24 - getCircleDiameter() / 2;
          },
          autoAlpha: 1,
          duration: 0.15,
          ease: "none",
        }, 0)
        .to(anyWord, {
          x: 0,
          duration: 0.75,
          ease: "none",
        }, 0.25)
        .fromTo(sizeWord, {
          x: function () {
            return -(anySizeStage.clientWidth * 0.24 - getCircleDiameter() / 2);
          },
          autoAlpha: 0,
        }, {
          x: function () {
            return -(anySizeStage.clientWidth * 0.24 - getCircleDiameter() / 2);
          },
          autoAlpha: 1,
          duration: 0.15,
          ease: "none",
        }, 0)
        .to(sizeWord, {
          x: 0,
          duration: 0.75,
          ease: "none",
        }, 0.25)
        // 원형 단계는 흰색으로 유지하고, 태블릿 상자가 완성된 뒤 앱을 표시한다.
        .set(tabletApp, {
          autoAlpha: 1,
        }, 1.0)
        .to(tryBtn, {
          autoAlpha: 1,
          duration: 0.08,
          ease: "none",
        }, 1.0)
        .to({}, {
          duration: function () {
            return getTabletHoldDistance() / getTabletExpandDistance();
          },
        })
        .to(tryBtn, {
          autoAlpha: 0,
          duration: 0.08,
          ease: "none",
        })
        .to(anySizeCard, {
          width: getMobileWidth,
          height: getMobileHeight,
          borderRadius: "30px",
          duration: function () {
            return getMobileMorphDistance() / getTabletExpandDistance();
          },
          ease: "power2.inOut",
        })
        .to(anyWord, {
          x: function () {
            return anySizeStage.clientWidth * 0.24 - getMobileWidth() / 2;
          },
          duration: function () {
            return getMobileMorphDistance() / getTabletExpandDistance();
          },
          ease: "power2.inOut",
        }, "<")
        .to(sizeWord, {
          x: function () {
            return -(anySizeStage.clientWidth * 0.24 - getMobileWidth() / 2);
          },
          duration: function () {
            return getMobileMorphDistance() / getTabletExpandDistance();
          },
          ease: "power2.inOut",
        }, "<")
        .to(anySizeFade, {
          opacity: 1,
          duration: function () {
            return getMobileMorphDistance() / getTabletExpandDistance() * 0.72;
          },
          ease: "power2.inOut",
        }, "<+=0.12")
        // 흰 커버 아래에서 태블릿 → 모바일 앱으로 교체
        .call(function () {
          deactivateLive();
          restartPhonePreview();
        })
        .set(tabletApp, { autoAlpha: 0 })
        .set(phoneApp, { autoAlpha: 1 })
        .set(phoneButtonMask, { autoAlpha: 1 })
        .to(anySizeFade, {
          opacity: 0,
          duration: 0.2,
          ease: "power2.out",
        })
        .to({}, {
          duration: function () {
            return getMobileHoldDistance() / getTabletExpandDistance();
          },
        });

      return function () {
        moveToCenter.scrollTrigger.kill();
        moveToCenter.kill();
        expandTablet.scrollTrigger.kill();
        expandTablet.kill();
        gsap.set(jaranVisual, { clearProps: "transform,clipPath" });
        gsap.set(jaranVisualImage, { clearProps: "opacity,visibility" });
        resetWorkIndex();
        gsap.set([anySizeCard, anySizeImage, anySizeFade, anyWord, sizeWord], { clearProps: "all" });
        if (appScaleObserver) appScaleObserver.disconnect();
        anySizeCard.removeEventListener("click", onCardActivate);
        if (exitBtn) exitBtn.removeEventListener("click", onExitClick);
        deactivateLive();
        gsap.set([tabletApp, phoneApp, phoneButtonMask, tryBtn].filter(Boolean), { clearProps: "all" });
      };
    },
  });
})();
