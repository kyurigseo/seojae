const API = "/api";

const GRADE_LABEL = { safe: "안전", caution: "주의", high_risk: "고위험" };
const ACTION_LABEL = { ack: "확인 처리됨", justify: "소명 처리됨", report: "신고 접수됨" };

let prescriptions = [];
let activeId = null;

async function loadPrescriptions() {
  const res = await fetch(`${API}/prescriptions`);
  prescriptions = await res.json();
  renderList();
}

async function loadSummary() {
  const res = await fetch(`${API}/dashboard/summary`);
  const summary = await res.json();
  const el = document.getElementById("summary");
  el.innerHTML = `
    <span class="pill safe">안전 ${summary.by_grade.safe}</span>
    <span class="pill caution">주의 ${summary.by_grade.caution}</span>
    <span class="pill high_risk">고위험 ${summary.by_grade.high_risk}</span>
  `;
}

function renderList() {
  const ul = document.getElementById("rxList");
  ul.innerHTML = "";
  for (const rx of prescriptions) {
    const li = document.createElement("li");
    li.className = "rx-item" + (rx.id === activeId ? " active" : "");
    li.innerHTML = `
      <div class="name">${rx.patient_name}</div>
      <div class="meta">${rx.institution} · ${formatDate(rx.issued_at)}</div>
      <div class="meta">${rx.medicines.join(", ")}</div>
    `;
    li.onclick = () => selectPrescription(rx.id);
    ul.appendChild(li);
  }
}

function formatDate(iso) {
  return iso.slice(0, 10);
}

async function selectPrescription(id) {
  activeId = id;
  renderList();
  const detail = document.getElementById("detail");
  detail.innerHTML = `<p class="placeholder">리스크 스코어 계산 중...</p>`;

  const rx = prescriptions.find((p) => p.id === id);
  const scoreRes = await fetch(`${API}/prescriptions/${id}/score`, { method: "POST" });
  const score = await scoreRes.json();
  const timelineRes = await fetch(`${API}/patients/${rx.patient_id}/timeline`);
  const timeline = await timelineRes.json();

  renderDetail(rx, score, timeline);
  loadSummary();
}

function renderDetail(rx, score, timeline) {
  const detail = document.getElementById("detail");

  const signalRows = score.signals.length
    ? score.signals
        .map(
          (s) => `
      <div class="signal-row">
        <div>
          <div class="label">${s.label}</div>
          <div class="detail">${s.detail}</div>
        </div>
        <div class="points">+${s.raw_points}</div>
      </div>`
        )
        .join("")
    : `<p class="placeholder">발동된 시그널이 없어요.</p>`;

  const timelineRows = timeline
    .map(
      (t) => `
    <div class="timeline-item">
      <div>
        <div class="meds">${t.items.map((i) => i.medicine).join(", ")}</div>
        <div class="meta">${t.institution} · ${formatDate(t.issued_at)}</div>
      </div>
      <div class="meta">${t.score ? `${t.score.score}점 (${GRADE_LABEL[t.score.grade]})` : "-"}</div>
    </div>`
    )
    .join("");

  detail.innerHTML = `
    <div class="detail-header">
      <div>
        <h1>${rx.patient_name} · ${rx.medicines.join(", ")}</h1>
        <div class="institution">${rx.institution} · 처방일 ${formatDate(rx.issued_at)}</div>
      </div>
    </div>

    <div class="score-card">
      <div class="score-ring ${score.grade}">${score.score}</div>
      <div>
        <div class="grade-label ${score.grade}">${GRADE_LABEL[score.grade]}</div>
        <div class="explanation">${score.explanation}</div>
      </div>
    </div>

    <div class="signals">
      <h3>발동된 리스크 시그널</h3>
      ${signalRows}
    </div>

    <div class="actions" id="actions">
      <button class="ack" onclick="doAction('${rx.id}', 'ack')">✓ 확인</button>
      <button class="justify" onclick="doAction('${rx.id}', 'justify')">소명 등록</button>
      <button class="report" onclick="doAction('${rx.id}', 'report')">신고 연동</button>
      <span class="action-status" id="actionStatus"></span>
    </div>

    <div class="timeline">
      <h3>환자 처방 타임라인</h3>
      ${timelineRows}
    </div>
  `;
}

async function doAction(prescriptionId, action) {
  await fetch(`${API}/alerts/${prescriptionId}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action }),
  });
  document.getElementById("actionStatus").textContent = ACTION_LABEL[action];
  loadSummary();
}

loadPrescriptions();
loadSummary();
