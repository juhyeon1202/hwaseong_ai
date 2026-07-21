const state = {
  points: 315,
  tickets: 1,
  selectedCategory: "출근",
  selectedScore: "만족",
  routeMode: "추천",
  reports: {
    "만차 통과": 7,
    "배차 지연": 4,
    "환승 실패": 2
  },
  journals: [],
  requests: [
    { name: "병점-동탄 출근 급행", stops: ["병점역 환승센터", "진안동", "동탄역"], votes: 128 },
    { name: "남양-봉담 마을 순환", stops: ["남양읍", "팔탄면", "봉담읍"], votes: 74 }
  ],
  rewards: ["교통일지 작성 +10P", "출석 체크 +5P", "희망노선 공감 +2P"]
};

const seed = JSON.parse(localStorage.getItem("hwaseongTrafficState") || "null");
if (seed) {
  Object.assign(state, seed);
}

const views = {
  home: document.querySelector("#homeView"),
  directions: document.querySelector("#directionsView"),
  journal: document.querySelector("#journalView"),
  routes: document.querySelector("#routesView"),
  report: document.querySelector("#reportView"),
  rewards: document.querySelector("#rewardsView"),
  admin: document.querySelector("#adminView")
};

const routeOptions = [
  {
    minutes: 33,
    label: "추천",
    wait: "5분 대기",
    steps: ["도보 10분", "56번 버스 10분", "200번 10분", "도보 3분"]
  },
  {
    minutes: 28,
    label: "최소시간",
    wait: "환승 1회",
    steps: ["도보 6분", "100번 버스 14분", "동탄역 도보 8분"]
  },
  {
    minutes: 41,
    label: "최소환승",
    wait: "환승 없음",
    steps: ["도보 5분", "H2 마을버스 31분", "도보 5분"]
  }
];

function save() {
  localStorage.setItem("hwaseongTrafficState", JSON.stringify(state));
}

function toast(message) {
  const element = document.querySelector("#toast");
  element.textContent = message;
  element.classList.add("show");
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => element.classList.remove("show"), 1800);
}

function setView(name) {
  Object.entries(views).forEach(([key, view]) => view.classList.toggle("active", key === name));
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === name);
  });
  document.querySelector("#viewTitle").textContent = views[name].dataset.title;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderRankings() {
  const rankings = [
    ["1", "동탄1동", 72],
    ["2", "동탄2동", 61],
    ["3", "병점2동", 55],
    ["4", "병점1동", 48],
    ["5", "봉담읍", 42],
    ["6", "진안동", 33]
  ];

  document.querySelector("#rankList").innerHTML = rankings.map(([rank, name, rate]) => `
    <div class="rank-row">
      <b>${rank}</b>
      <div>
        <strong>${name}</strong>
        <div class="progress" style="--value:${rate}%"><span></span></div>
      </div>
      <b>${rate}%</b>
    </div>
  `).join("");
}

function renderRoutes(selectedIndex = 0) {
  document.querySelector("#routeResults").innerHTML = routeOptions.map((route, index) => `
    <article class="route-card ${index === selectedIndex ? "selected" : ""}">
      <header>
        <div>
          <h2>${route.minutes}분</h2>
          <span>${route.label} · ${route.wait}</span>
        </div>
        <button class="${index === selectedIndex ? "primary" : "secondary"}" data-save-route="${index}" type="button">
          ${index === selectedIndex ? "선택됨" : "선택"}
        </button>
      </header>
      <div class="route-steps">
        ${route.steps.map((step) => `<span>${step}</span>`).join("")}
      </div>
      <button class="secondary wide" data-route-journal="${index}" type="button">이 경로로 일지 기록</button>
    </article>
  `).join("");
}

function renderJournals() {
  const list = document.querySelector("#journalList");
  document.querySelector("#savedCount").textContent = `${state.journals.length}개 이동`;
  document.querySelector("#journalCount").textContent = state.journals.length;
  document.querySelector("#todayCount").textContent = `${state.journals.length + totalReports()}건`;

  if (!state.journals.length) {
    list.innerHTML = `<p class="empty">아직 저장된 교통일지가 없습니다.</p>`;
    return;
  }

  list.innerHTML = state.journals.map((journal) => `
    <article class="journal-row">
      <strong>${journal.category} · ${journal.line}</strong>
      <p>${journal.memo || "메모 없음"}</p>
      <div>
        <span>${journal.score}</span>
        <span>${journal.time}</span>
      </div>
    </article>
  `).join("");
}

function renderRequests() {
  document.querySelector("#routeCount").textContent = state.requests.length;
  document.querySelector("#requestList").innerHTML = state.requests.map((request, index) => `
    <article class="request-card">
      <strong>${request.name}</strong>
      <p>${request.stops.join(" → ")}</p>
      <span>공감 ${request.votes}</span>
      <footer>
        <button class="primary" data-vote="${index}" type="button">투표하기</button>
        <button class="secondary" data-share="${index}" type="button">공유</button>
      </footer>
    </article>
  `).join("");
}

function renderReports() {
  const max = Math.max(...Object.values(state.reports), 1);
  const color = { "만차 통과": "red", "배차 지연": "yellow", "환승 실패": "green" };

  document.querySelector("#reportCount").textContent = totalReports();
  document.querySelector("#reportBars").innerHTML = Object.entries(state.reports).map(([name, count]) => `
    <div class="bar-row">
      <strong>${name}</strong>
      <div class="progress" style="--value:${Math.round(count / max * 100)}%">
        <span class="${color[name]}"></span>
      </div>
      <b>${count}</b>
    </div>
  `).join("");

  const top = Object.entries(state.reports).sort((a, b) => b[1] - a[1])[0];
  document.querySelector("#aiNotice").textContent = `${top[0]} 신고가 가장 많습니다. 혼잡 시간대 우회 알림과 증차 검토가 필요합니다.`;
}

function renderRewards() {
  document.querySelector("#userPoints").textContent = `${state.points}P`;
  document.querySelector("#rewardPoint").textContent = `${state.points}P`;
  document.querySelector("#ticketCount").textContent = state.tickets;
  document.querySelector("#rewardLog").innerHTML = state.rewards.map((item) => `
    <article class="journal-row"><strong>${item}</strong><span>${new Date().toLocaleDateString("ko-KR")}</span></article>
  `).join("");
}

function renderAdmin() {
  const reportTotal = totalReports();
  const journalTotal = state.journals.length;
  document.querySelector("#insightList").innerHTML = [
    `익명 신고 ${reportTotal}건 중 만차 통과 비중이 높습니다.`,
    `오늘 교통일지 ${journalTotal}건이 만족도 분석에 반영됐습니다.`,
    `희망노선 ${state.requests.length}건이 관리자 검토 대기 중입니다.`
  ].map((text) => `<article class="insight">${text}</article>`).join("");
}

function totalReports() {
  return Object.values(state.reports).reduce((sum, count) => sum + count, 0);
}

function renderAll() {
  renderRankings();
  renderRoutes();
  renderJournals();
  renderRequests();
  renderReports();
  renderRewards();
  renderAdmin();
}

document.querySelectorAll("[data-view], [data-view-link]").forEach((button) => {
  button.addEventListener("click", () => setView(button.dataset.view || button.dataset.viewLink));
});

document.querySelector("#quickJournal").addEventListener("click", () => setView("journal"));

document.querySelector("#placeSearch").addEventListener("input", (event) => {
  const value = event.target.value.trim();
  document.querySelectorAll(".marker").forEach((marker) => {
    const match = !value || marker.dataset.name.includes(value);
    marker.style.opacity = match ? "1" : ".25";
  });
});

document.querySelectorAll(".marker").forEach((marker) => {
  marker.addEventListener("click", () => {
    toast(`${marker.dataset.name} 참여율 ${marker.dataset.rate}%`);
  });
});

document.querySelector("#routeForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const selectedIndex = Math.max(0, routeOptions.findIndex((route) => route.label === state.routeMode));
  renderRoutes(selectedIndex);
  toast(`${state.routeMode} 기준 경로를 찾았습니다.`);
});

document.querySelectorAll("[data-route-mode]").forEach((button) => {
  button.addEventListener("click", () => {
    state.routeMode = button.dataset.routeMode;
    document.querySelectorAll("[data-route-mode]").forEach((item) => item.classList.toggle("selected", item === button));
  });
});

document.querySelector("#routeResults").addEventListener("click", (event) => {
  const saveButton = event.target.closest("[data-save-route]");
  const journalButton = event.target.closest("[data-route-journal]");

  if (saveButton) {
    renderRoutes(Number(saveButton.dataset.saveRoute));
    toast("선택한 경로를 고정했습니다.");
  }

  if (journalButton) {
    setView("journal");
    toast("선택한 경로로 일지를 작성해 주세요.");
  }
});

document.querySelectorAll("#categorySelect button").forEach((button) => {
  button.addEventListener("click", () => {
    state.selectedCategory = button.dataset.category;
    document.querySelectorAll("#categorySelect button").forEach((item) => item.classList.toggle("selected", item === button));
  });
});

document.querySelectorAll("#satisfaction button").forEach((button) => {
  button.addEventListener("click", () => {
    state.selectedScore = button.dataset.score;
    document.querySelectorAll("#satisfaction button").forEach((item) => item.classList.toggle("selected", item === button));
  });
});

document.querySelector("#journalForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  state.journals.unshift({
    category: state.selectedCategory,
    score: state.selectedScore,
    line: form.get("line") || "노선 미입력",
    memo: form.get("memo") || "",
    time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
  });
  state.points += 10;
  state.tickets += 1;
  state.rewards.unshift("교통일지 작성 +10P, 응모권 +1");
  save();
  renderAll();
  toast("교통일지가 저장됐습니다.");
});

document.querySelector("#aiSuggest").addEventListener("click", () => {
  document.querySelector("#requestForm textarea").value = "병점역 환승센터, 안화초교, 진안동 행정복지센터, 동탄역";
  toast("AI가 중간 정류장을 추천했습니다.");
});

document.querySelector("#requestForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  state.requests.unshift({
    name: form.get("name") || "새 희망노선",
    stops: String(form.get("stops") || "").split(",").map((stop) => stop.trim()).filter(Boolean),
    votes: 1
  });
  state.points += 5;
  state.rewards.unshift("희망노선 제출 +5P");
  save();
  renderAll();
  toast("희망노선이 등록됐습니다.");
});

document.querySelector("#requestList").addEventListener("click", (event) => {
  const voteButton = event.target.closest("[data-vote]");
  const shareButton = event.target.closest("[data-share]");

  if (voteButton) {
    state.requests[Number(voteButton.dataset.vote)].votes += 1;
    state.points += 2;
    state.rewards.unshift("희망노선 공감 +2P");
    save();
    renderAll();
    toast("공감이 반영됐습니다.");
  }

  if (shareButton) {
    toast("공유 링크가 준비됐습니다.");
  }
});

document.querySelectorAll("[data-report]").forEach((button) => {
  button.addEventListener("click", () => {
    const reportName = button.dataset.report;
    state.reports[reportName] += 1;
    save();
    renderAll();
    toast(`${reportName} 신고가 익명 접수됐습니다.`);
  });
});

document.querySelector("#checkIn").addEventListener("click", () => {
  state.points += 5;
  state.rewards.unshift("출석 체크 +5P");
  save();
  renderAll();
  toast("출석 포인트가 적립됐습니다.");
});

document.querySelector("#convertTicket").addEventListener("click", () => {
  if (state.points < 300) {
    toast("응모권 전환에는 300P가 필요합니다.");
    return;
  }
  state.points -= 300;
  state.tickets += 1;
  state.rewards.unshift("300P 응모권 전환");
  save();
  renderAll();
  toast("응모권 1장이 추가됐습니다.");
});

document.querySelector("#sendReply").addEventListener("click", () => {
  toast("AI 답변 초안이 검토 완료 처리됐습니다.");
});

document.querySelector("#loginButton").addEventListener("click", () => {
  toast("카카오 간편 로그인 상태로 전환했습니다.");
});

renderAll();
