(function () {
  "use strict";

  var root = document.documentElement;
  var tab = document.getElementById("chatbotTab");
  var panel = document.getElementById("chatbotPanel");
  var closeButton = panel && panel.querySelector(".chatbot-panel__close");
  var homeButton = panel && panel.querySelector(".chatbot-panel__home");
  var form = document.getElementById("chatbotForm");
  var input = document.getElementById("chatbotInput");
  var body = document.getElementById("chatbotMessages");
  var intro = panel && panel.querySelector(".chatbot-panel__intro");
  var conversation = document.getElementById("chatbotConversation");
  var time = document.getElementById("chatbotTime");

  if (!tab || !panel || !form || !input || !conversation) return;

  var answers = [
    {
      keywords: ["대표 프로젝트", "프로젝트 소개", "프로젝트 요약", "어떤 프로젝트"],
      text: "김가영의 대표 작업은 PUMTO·품토, 일광전구 브랜드 웹사이트, W:RUN·위런, 자란그림입니다. 품토는 아동 미술학원 탐색부터 성장 기록까지 연결한 서비스이고, 일광전구는 브랜드의 역사와 빛의 철학을 디지털 경험으로 풀어낸 프로젝트입니다. 위런은 초보 러너의 코스 탐색과 커뮤니티 참여를 연결했으며, 자란그림은 아이의 작품과 성장 과정을 기록하는 경험을 설계했습니다."
    },
    {
      keywords: ["강점", "장점", "잘하는"],
      text: "김가영의 가장 큰 강점은 관찰한 문제를 이해하기 쉬운 구조로 바꾸는 능력입니다. 아동미술 교육에서는 대상에 따라 설명과 진행 방식을 조정했고, 콘텐츠 운영에서는 복잡한 정보를 독자의 관점에서 재구성했습니다. UX/UI 프로젝트에서도 화면을 만들기 전에 사용자 흐름과 정보의 우선순위를 먼저 정리합니다."
    },
    {
      keywords: ["팀 프로젝트", "역할", "기여", "담당"],
      text: "팀 프로젝트에서는 목표와 사용자 문제를 먼저 정리하고, 여러 아이디어가 하나의 경험으로 이어지도록 조율하는 역할을 맡았습니다. 일광전구에서는 기획과 브랜드 스토리 흐름, 주요 비주얼 방향을 구성했고, 위런에서는 러너 관점의 서비스 방향과 초보 러너 시나리오, 주요 기능 화면을 설계했습니다. 개별 화면보다 전체 사용자 흐름을 연결하는 데 집중했습니다."
    },
    {
      keywords: ["왜 ux", "지원 동기", "디자이너가 되고", "ux/ui 디자이너"],
      text: "김가영은 미술과 교육 현장에서 사람의 반응과 표현을 관찰해 왔습니다. 이후 콘텐츠를 기획하고 디지털 결과물을 만들며, 사용자의 불편을 실제 서비스 흐름으로 해결하는 UX/UI 디자인에 관심을 갖게 됐습니다. 보기 좋은 화면을 넘어 사용자가 서비스를 이해하고 행동하는 과정까지 설계하는 디자이너를 지향합니다."
    },
    {
      keywords: ["협업", "작업 스타일", "어떻게 작업", "갈등"],
      text: "협업할 때는 목표와 사용자 문제를 먼저 명확히 정리합니다. 의견이 다를 때는 개인의 취향보다 프로젝트 목적, 사용자 경험과 구현 가능성을 기준으로 방향을 조율합니다. 다른 의견도 근거가 분명하면 유연하게 반영하며, 결정된 내용은 문서와 화면 흐름으로 구체화합니다."
    },
    {
      keywords: ["도구", "툴", "figma", "피그마"],
      text: "Figma를 중심으로 Photoshop, Illustrator를 사용하며, UX Research·User Flow·IA·Wireframe·Persona·Journey Map 작업이 가능합니다. 프로토타입과 인터랙션 구현에는 HTML, CSS, JavaScript, React, GSAP과 ScrollTrigger를 활용합니다. GitHub와 Vercel을 이용한 버전 관리와 배포 경험도 있습니다."
    },
    {
      keywords: ["개발", "코딩", "react", "프론트"],
      text: "HTML, CSS, JavaScript와 React를 사용해 디자인을 직접 구현할 수 있습니다. GSAP과 ScrollTrigger를 활용한 인터랙션 작업 경험도 있습니다. 전문 프론트엔드 개발자라고 과장하기보다, 구현 가능성을 이해하고 개발자와 원활하게 소통할 수 있는 디자이너를 지향합니다."
    },
    {
      keywords: ["ai", "인공지능", "codex", "챗지피티"],
      text: "AI는 리서치 정리, 아이디어 확장, UX 문구 검토, 이미지 제작, 코드 초안과 오류 탐색처럼 반복 작업을 줄이는 데 활용합니다. 생성 결과를 그대로 사용하지 않고 프로젝트 목적과 사용자 맥락, 정확성을 기준으로 검토하고 수정합니다. AI를 판단의 대체재가 아니라 빠르게 탐색하고 실행하기 위한 작업 도구로 사용합니다."
    },
    {
      keywords: ["아동미술", "강사", "교육"],
      text: "김가영은 약 4년 동안 5세부터 7세 아동을 대상으로 미술 수업을 진행했습니다. 아이의 연령과 반응에 따라 설명과 수업 흐름을 조정하고 보호자와 작품 및 성장 과정을 소통했습니다. 이 경험은 사용자의 맥락을 고려한 문구, 정보량과 직관적인 흐름을 설계하는 데 연결됐습니다."
    },
    {
      keywords: ["블로그", "콘텐츠", "경제"],
      text: "경제·정책처럼 복잡한 정보를 일반 독자가 이해하기 쉬운 형태로 전달하기 위해 1년 이상 블로그를 운영했습니다. 200개 이상의 글과 80건 이상의 카드뉴스를 제작하며 리서치, 정보 구조화, 콘텐츠 기획과 시각적 전달 역량을 길렀습니다. 이 경험은 사용자 관점에서 정보의 순서와 위계를 설계하는 UX 업무와 연결됩니다."
    },
    {
      keywords: ["채용", "뽑", "왜 김가영", "어떤 사람"],
      text: "김가영은 관찰, 정보 구조화, 시각 디자인과 구현 경험을 하나의 문제 해결 과정으로 연결할 수 있습니다. 사용자의 상황을 세심하게 살피고 복잡한 정보를 이해하기 쉬운 흐름으로 정리하며, 아이디어를 화면과 프로토타입으로 구체화합니다. 새로운 도구를 꾸준히 학습하고 맡은 일을 끝까지 개선하는 실행력도 갖추고 있습니다."
    },
    {
      keywords: ["연락", "이메일", "contact"],
      text: "연락을 원하시면 포트폴리오의 Contact 섹션에 공개된 연락 수단을 이용해 주세요. 공개되지 않은 개인 연락처는 챗봇에서 안내하지 않습니다."
    }
  ];

  var fallback = "현재 포트폴리오에 제공된 정보만으로는 정확히 안내하기 어렵습니다. 프로젝트, 강점, 협업 방식, 사용 도구 또는 경험에 관해 질문해 주세요. 더 자세한 내용은 포트폴리오의 Contact 섹션을 통해 김가영에게 문의하실 수 있습니다.";

  function setTime() {
    time.textContent = new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  }

  function setOpen(open) {
    root.classList.toggle("is-chatbot-open", open);
    tab.setAttribute("aria-expanded", String(open));
    panel.setAttribute("aria-hidden", String(!open));
    if (open) {
      setTime();
      window.setTimeout(function () { input.focus(); }, 360);
    } else {
      tab.focus();
    }
  }

  function findAnswer(question) {
    var normalized = question.toLowerCase().replace(/\s+/g, " ");
    var best = null;
    var bestScore = 0;
    answers.forEach(function (item) {
      var score = item.keywords.reduce(function (total, keyword) {
        return total + (normalized.includes(keyword.toLowerCase()) ? keyword.length : 0);
      }, 0);
      if (score > bestScore) { best = item; bestScore = score; }
    });
    return best ? best.text : fallback;
  }

  function addMessage(text, type) {
    var message = document.createElement("p");
    message.className = "chatbot-message chatbot-message--" + type;
    message.textContent = text;
    conversation.appendChild(message);
    body.scrollTo({ top: body.scrollHeight, behavior: "smooth" });
  }

  function ask(question) {
    var value = question.trim();
    if (!value) return;
    intro.hidden = true;
    addMessage(value, "user");
    window.setTimeout(function () { addMessage(findAnswer(value), "bot"); }, 260);
    input.value = "";
  }

  tab.setAttribute("aria-controls", "chatbotPanel");
  tab.setAttribute("aria-expanded", "false");
  tab.addEventListener("click", function () { setOpen(!root.classList.contains("is-chatbot-open")); });
  closeButton.addEventListener("click", function () { setOpen(false); });
  homeButton.addEventListener("click", function () {
    conversation.replaceChildren();
    intro.hidden = false;
    body.scrollTop = 0;
    input.focus();
  });
  panel.querySelectorAll(".chatbot-panel__suggestions button").forEach(function (button) {
    button.addEventListener("click", function () { ask(button.textContent); });
  });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    ask(input.value);
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && root.classList.contains("is-chatbot-open")) setOpen(false);
  });
  setTime();
})();
