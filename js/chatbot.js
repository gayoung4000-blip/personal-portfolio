(function () {
  "use strict";

  var root = document.documentElement;
  var tab = document.getElementById("chatbotTab");
  var panel = document.getElementById("chatbotPanel");
  var closeButton = panel && panel.querySelector(".chatbot-panel__close");
  var backButton = panel && panel.querySelector(".chatbot-panel__back");
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
      keywords: ["이름", "성함", "누구인가요", "누구야", "자기소개", "본인 소개"],
      text: "UX/UI 디자이너 김가영입니다."
    },
    {
      keywords: ["전공", "학력", "대학교", "대학", "졸업", "아트앤웹툰", "서양화", "교직", "정교사", "교원 자격"],
      text: "아트앤웹툰학과 서양화를 전공했으며, 4년제 대학교를 졸업했습니다. 전공을 통해 시각 표현과 스토리텔링 역량을 키웠고, 교직 이수를 통해 중등 정교사 2급 미술 자격도 취득했습니다."
    },
    {
      keywords: ["신입", "경력직", "지원 직무", "지원 분야", "어떤 직무", "무슨 직무", "직무 전환", "커리어 전환", "현재 경력"],
      text: "UX/UI 디자이너 신입으로 지원하고 있습니다. 약 4년간 유아 미술 강사로 근무하고, 블로그 콘텐츠와 카드뉴스를 80건 이상 제작한 경험이 있습니다. 현재는 이러한 경험을 바탕으로 사용자의 요구를 파악하고 서비스의 흐름과 화면을 설계하는 UX/UI 직무로 전환하고 있습니다."
    },
    {
      keywords: ["성격 장점", "성격의 장점", "성격 단점", "성격의 단점", "장단점", "보완할 점", "보완 중", "단점", "책임감", "꾸준함"],
      text: "장점은 책임감과 꾸준함입니다. 맡은 일은 끝까지 완성하려고 하며, 피드백을 방어적으로 받아들이기보다 결과물을 개선하는 자료로 활용합니다. 반면 완성도에 대한 기준이 높아 초반 의사결정에 시간이 걸릴 때가 있습니다. 이를 보완하기 위해 우선순위를 정하고, 초안을 빠르게 공유한 뒤 피드백을 통해 발전시키는 방식으로 작업하고 있습니다."
    },
    {
      keywords: ["자신 있는 업무", "자신있는 업무", "잘하는 업무", "가장 자신", "업무 역량", "디자인 역량", "핵심 역량", "오토레이아웃", "컴포넌트", "프로토타입"],
      text: "기획 의도를 시각적으로 구조화하고, 사용자가 이해하기 쉬운 흐름과 화면으로 만드는 업무에 가장 자신 있습니다. UX 리서치와 사용자 흐름 설계, UI 디자인을 함께 수행할 수 있으며, Figma를 활용한 컴포넌트·오토레이아웃·프로토타입 제작도 가능합니다. 또한 카드뉴스를 80건 이상 제작한 경험이 있어 핵심 정보를 선별하고 콘텐츠로 시각화하는 역량도 갖추고 있습니다."
    },
    {
      keywords: ["어려웠던 프로젝트", "힘들었던 프로젝트", "가장 어려운", "문제 해결 경험", "어려움 해결", "위기", "6명", "일광전구 어려움"],
      text: "가장 어려웠던 프로젝트는 6명이 함께 진행한 일광전구 웹사이트 리디자인 프로젝트였습니다. 여러 팀원의 아이디어를 하나의 사용자 경험과 시각적 방향으로 통합해야 한다는 점이 어려웠습니다. 저는 사용자에게 전달할 핵심 메시지와 스토리 흐름을 먼저 정리하고, 레퍼런스와 화면 구성을 시각적으로 공유해 팀의 기준을 맞췄습니다. 이후 히어로·브랜드 스토리·쇼룸 영역을 중심으로 디자인하고 GSAP 인터랙션을 적용했습니다. 그 결과 팀의 의견을 하나의 결과물로 정리하고 최종 발표도 대표로 진행할 수 있었습니다."
    },
    {
      keywords: ["입사 후", "입사하면", "입사 포부", "성장 방향", "성장 목표", "커리어 목표", "장기 목표", "앞으로의 목표", "어떤 디자이너"],
      text: "입사 초기에는 다양한 프로젝트를 경험하며 실무 속도와 디자인 완성도를 높이고 싶습니다. 단순히 보기 좋은 화면을 만드는 데 그치지 않고, 사용자의 문제와 비즈니스 목표를 함께 이해하는 디자이너로 성장하는 것이 목표입니다. 장기적으로는 리서치와 데이터, 기획 역량까지 갖춰 서비스의 방향을 제안할 수 있는 UX/UI 디자이너가 되고 싶습니다."
    },
    {
      keywords: ["선호하는 환경", "업무 환경", "근무 환경", "협업 방식", "선호하는 협업", "피드백 방식", "팀 문화", "의견 공유"],
      text: "역할과 목표를 명확하게 공유하면서도 자유롭게 의견을 제안할 수 있는 환경을 선호합니다. 혼자 오래 고민하기보다 초안을 빠르게 공유하고, 구체적인 피드백을 주고받으며 함께 완성도를 높이는 방식이 효율적이라고 생각합니다. 서로의 전문성을 존중하면서 결정한 내용은 책임감 있게 실행하는 협업을 중요하게 생각합니다."
    },
    {
      keywords: ["취미", "여가", "쉬는 날", "운동", "독서", "독서모임", "평소 활동"],
      text: "취미는 다양한 운동과 독서, 블로그 콘텐츠를 정리하는 것입니다. 운동을 통해 체력과 꾸준함을 관리하고 있으며, 독서모임에 참여해 다른 사람의 관점을 듣고 생각을 확장하고 있습니다. 또한 경제 개념을 공부한 뒤 블로그와 카드뉴스로 쉽게 정리하는 활동을 꾸준히 하고 있습니다."
    },
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

  var fallback = "현재 포트폴리오에 제공된 정보만으로는 정확히 안내하기 어렵습니다. 이름, 전공과 학력, 지원 직무, 장단점, 프로젝트, 디자인 역량, 협업 방식, 사용 도구, 성장 목표 또는 취미에 관해 질문해 주세요. 더 자세한 내용은 포트폴리오의 Contact 섹션을 통해 김가영에게 문의하실 수 있습니다.";

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
    var normalized = question.toLowerCase().replace(/[?？!！.,。·/\\]/g, " ").replace(/\s+/g, " ").trim();
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

  function formatBotAnswer(text) {
    if (text.length < 150) return text;

    var sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
    if (!sentences || sentences.length < 3) return text;

    var paragraphs = [];
    for (var index = 0; index < sentences.length; index += 2) {
      paragraphs.push(sentences.slice(index, index + 2).join("").trim());
    }
    return paragraphs.join("\n\n");
  }

  function addMessage(text, type) {
    var message = document.createElement("p");
    message.className = "chatbot-message chatbot-message--" + type;
    message.textContent = type === "bot" ? formatBotAnswer(text) : text;
    conversation.appendChild(message);
    body.scrollTo({ top: body.scrollHeight, behavior: "smooth" });
  }

  function ask(question) {
    var value = question.trim();
    if (!value) return;
    intro.hidden = true;
    panel.classList.add("is-conversation-active");
    addMessage(value, "user");
    window.setTimeout(function () { addMessage(findAnswer(value), "bot"); }, 260);
    input.value = "";
  }

  function resetConversation() {
    conversation.replaceChildren();
    intro.hidden = false;
    panel.classList.remove("is-conversation-active");
    body.scrollTop = 0;
    input.value = "";
    input.focus();
  }

  tab.setAttribute("aria-controls", "chatbotPanel");
  tab.setAttribute("aria-expanded", "false");
  tab.addEventListener("click", function () { setOpen(!root.classList.contains("is-chatbot-open")); });
  closeButton.addEventListener("click", function () { setOpen(false); });
  backButton.addEventListener("click", resetConversation);
  homeButton.addEventListener("click", resetConversation);
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
