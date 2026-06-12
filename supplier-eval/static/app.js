// ── State ─────────────────────────────────────────────────────────────────────
let suppliers = [];
let evaluations = [];

// ── Bootstrap ─────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  await loadAll();
  renderDashboard();
});

async function loadAll() {
  [suppliers, evaluations] = await Promise.all([
    api("/api/suppliers"),
    api("/api/evaluations"),
  ]);
  populateSupplierSelects();
}

// ── API helper ────────────────────────────────────────────────────────────────
async function api(url, method = "GET", body = null) {
  const opts = { method, headers: {} };
  if (body) { opts.headers["Content-Type"] = "application/json"; opts.body = JSON.stringify(body); }
  const res = await fetch(url, opts);
  if (res.status === 204) return null;
  if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.error || "오류 발생"); throw new Error(); }
  return res.json().catch(() => null);
}

// ── View router ───────────────────────────────────────────────────────────────
function showView(name, btn) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("view-" + name).classList.add("active");
  if (btn) btn.classList.add("active");
  if (name === "dashboard") renderDashboard();
  if (name === "suppliers") renderSupplierTable();
  if (name === "history") renderHistoryTable();
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function renderDashboard() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = suppliers.map(s => {
    const latest = evaluations.filter(e => e.supplierId === s.id)[0];
    if (!latest) return { supplier: s, latest: null, days: null };
    const next = new Date(latest.nextEvalDate);
    const days = Math.ceil((next - today) / 86400000);
    return { supplier: s, latest, days };
  }).sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999));

  const total = suppliers.length;
  const approved = rows.filter(r => r.latest?.result === "승인").length;
  const urgent = rows.filter(r => r.days !== null && r.days <= 30).length;

  document.getElementById("dashboard-cards").innerHTML = `
    <div class="card green"><div class="label">전체 업체</div><div class="value">${total}</div></div>
    <div class="card"><div class="label">승인 업체</div><div class="value">${approved}</div></div>
    <div class="card red"><div class="label">재평가 임박 (D-30)</div><div class="value">${urgent}</div></div>
  `;

  document.getElementById("dashboard-table").innerHTML = rows.map(({ supplier, latest, days }) => {
    if (!latest) return `<tr><td>${supplier.name}</td><td>${supplier.category||''}</td><td colspan="4" style="color:#999;">평가 없음</td></tr>`;
    const alertClass = days <= 0 ? "alert-red" : days <= 30 ? "alert-red" : days <= 60 ? "alert-orange" : days <= 90 ? "alert-yellow" : "";
    const status = days <= 0 ? "⚠️ 즉시 필요" : days <= 30 ? "🔴 긴급" : days <= 60 ? "🟠 주의" : days <= 90 ? "🟡 예정" : "✅ 정상";
    return `<tr class="${alertClass}">
      <td>${supplier.name}</td>
      <td>${supplier.category||''}</td>
      <td><span class="badge badge-${latest.grade}">${latest.grade}</span></td>
      <td>${latest.nextEvalDate}</td>
      <td>${days}일</td>
      <td>${status}</td>
    </tr>`;
  }).join("");
}

// ── Suppliers ─────────────────────────────────────────────────────────────────
function renderSupplierTable() {
  const q = (document.getElementById("supplier-search").value || "").toLowerCase();
  const rows = suppliers.filter(s => !q || s.name.toLowerCase().includes(q));
  document.getElementById("supplier-table").innerHTML = rows.map(s => `
    <tr>
      <td>${s.name}</td>
      <td>${s.category||''}</td>
      <td>${s.contact||''}</td>
      <td>${s.phone||''}</td>
      <td>${s.isCritical ? "✅" : ""}</td>
      <td>${s.registeredDate||''}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="openSupplierModal('${s.id}')">수정</button>
        <button class="btn btn-danger btn-sm" onclick="deleteSupplier('${s.id}')">삭제</button>
      </td>
    </tr>`).join("");
}

function openSupplierModal(id) {
  const s = id ? suppliers.find(x => x.id === id) : null;
  document.getElementById("supplier-modal-title").textContent = s ? "업체 수정" : "업체 등록";
  document.getElementById("modal-supplier-id").value = s?.id || "";
  document.getElementById("modal-name").value = s?.name || "";
  document.getElementById("modal-category").value = s?.category || "";
  document.getElementById("modal-bizno").value = s?.businessNo || "";
  document.getElementById("modal-contact").value = s?.contact || "";
  document.getElementById("modal-phone").value = s?.phone || "";
  document.getElementById("modal-address").value = s?.address || "";
  document.getElementById("modal-reg-date").value = s?.registeredDate || new Date().toISOString().slice(0,10);
  document.getElementById("modal-critical").checked = s?.isCritical || false;
  document.getElementById("modal-memo").value = s?.memo || "";
  document.getElementById("supplier-modal").classList.add("open");
}

function closeSupplierModal() {
  document.getElementById("supplier-modal").classList.remove("open");
}

async function saveSupplier() {
  const id = document.getElementById("modal-supplier-id").value;
  const body = {
    name: document.getElementById("modal-name").value.trim(),
    category: document.getElementById("modal-category").value.trim(),
    businessNo: document.getElementById("modal-bizno").value.trim(),
    contact: document.getElementById("modal-contact").value.trim(),
    phone: document.getElementById("modal-phone").value.trim(),
    address: document.getElementById("modal-address").value.trim(),
    registeredDate: document.getElementById("modal-reg-date").value,
    isCritical: document.getElementById("modal-critical").checked,
    memo: document.getElementById("modal-memo").value.trim(),
  };
  if (!body.name) { alert("업체명을 입력하세요"); return; }
  if (id) { await api(`/api/suppliers/${id}`, "PUT", body); }
  else { await api("/api/suppliers", "POST", body); }
  closeSupplierModal();
  await loadAll();
  renderSupplierTable();
}

async function deleteSupplier(id) {
  if (!confirm("업체를 삭제하시겠습니까?")) return;
  await api(`/api/suppliers/${id}`, "DELETE");
  await loadAll();
  renderSupplierTable();
  renderDashboard();
}

// ── Performance ───────────────────────────────────────────────────────────────
function populateSupplierSelects() {
  const opts = suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
  const perfSel = document.getElementById("perf-supplier-select");
  const histSel = document.getElementById("history-supplier-filter");
  if (perfSel) perfSel.innerHTML = '<option value="">-- 업체 선택 --</option>' + opts;
  if (histSel) histSel.innerHTML = '<option value="">전체 업체</option>' + opts;
}

async function loadPerformance() {
  const sid = document.getElementById("perf-supplier-select").value;
  document.getElementById("perf-form-area").style.display = sid ? "block" : "none";
  if (!sid) return;

  const supplier = suppliers.find(s => s.id === sid);
  document.getElementById("risk-section").style.display = supplier?.isCritical ? "block" : "none";

  const data = await api(`/api/performance/${sid}`);
  const p = data?.performance;
  if (!p) { resetPerfForm(); return; }

  document.getElementById("perf-doc-no").value = "";
  document.getElementById("perf-eval-date").value = new Date().toISOString().slice(0, 10);
  document.getElementById("perf-iso-held").value = p.isoHeld ? "true" : "false";
  document.getElementById("perf-iso-expiry").value = p.isoExpiry || "";
  document.getElementById("perf-del-target").value = p.deliveryTarget ?? 100;
  document.getElementById("perf-del-actual").value = p.deliveryActual ?? 0;
  document.getElementById("perf-def-target").value = p.defectTarget ?? 0;
  document.getElementById("perf-def-actual").value = p.defectActual ?? 0;
  document.getElementById("risk-del-level").value = p.risk?.delivery?.level || "";
  document.getElementById("risk-del-occ").value = p.risk?.delivery?.occurrence || 1;
  document.getElementById("risk-del-sev").value = p.risk?.delivery?.severity || 1;
  document.getElementById("risk-del-vul").value = p.risk?.delivery?.vulnerability || 1;
  document.getElementById("risk-qua-level").value = p.risk?.quality?.level || "";
  document.getElementById("risk-qua-occ").value = p.risk?.quality?.occurrence || 1;
  document.getElementById("risk-qua-sev").value = p.risk?.quality?.severity || 1;
  document.getElementById("risk-qua-vul").value = p.risk?.quality?.vulnerability || 1;
  document.getElementById("risk-result").value = p.risk?.result || "해당사항 없음";
  document.getElementById("perf-self").value = p.selfAssessment || "해당사항 없음";
  document.getElementById("perf-chain").value = p.supplyChain || "해당사항 없음";
  document.getElementById("perf-product").value = p.productEval || "제품 검사서 참조";
  document.getElementById("perf-evaluator").value = p.evaluator || "";
  document.getElementById("perf-reviewer").value = p.reviewer || "";
  document.getElementById("perf-approver").value = p.approver || "";

  updateScorePreview();
}

function resetPerfForm() {
  document.getElementById("perf-del-target").value = 100;
  document.getElementById("perf-del-actual").value = 0;
  document.getElementById("perf-def-target").value = 0;
  document.getElementById("perf-def-actual").value = 0;
  updateScorePreview();
}

async function updateScorePreview() {
  const body = getPerfBody();
  if (!body) return;
  try {
    const preview = await api("/api/score/preview", "POST", body);
    if (!preview) return;
    document.getElementById("prev-iso").textContent = preview.isoScore;
    document.getElementById("prev-del").textContent = preview.deliveryScore;
    document.getElementById("prev-def").textContent = preview.defectScore;
    document.getElementById("prev-total").textContent = preview.totalScore;
    document.getElementById("prev-grade").textContent = preview.grade;
    document.getElementById("prev-result").textContent = preview.result;
    document.getElementById("prev-next").textContent = preview.nextEvalDate;
  } catch(e) { /* ignore preview errors */ }
}

function getPerfBody() {
  const sid = document.getElementById("perf-supplier-select").value;
  if (!sid) return null;
  return {
    supplierId: sid,
    isoHeld: document.getElementById("perf-iso-held").value === "true",
    isoExpiry: document.getElementById("perf-iso-expiry").value,
    deliveryTarget: parseFloat(document.getElementById("perf-del-target").value) || 0,
    deliveryActual: parseFloat(document.getElementById("perf-del-actual").value) || 0,
    defectTarget: parseFloat(document.getElementById("perf-def-target").value) || 0,
    defectActual: parseFloat(document.getElementById("perf-def-actual").value) || 0,
    risk: {
      delivery: {
        level: document.getElementById("risk-del-level").value,
        occurrence: parseInt(document.getElementById("risk-del-occ").value) || 1,
        severity: parseInt(document.getElementById("risk-del-sev").value) || 1,
        vulnerability: parseInt(document.getElementById("risk-del-vul").value) || 1,
      },
      quality: {
        level: document.getElementById("risk-qua-level").value,
        occurrence: parseInt(document.getElementById("risk-qua-occ").value) || 1,
        severity: parseInt(document.getElementById("risk-qua-sev").value) || 1,
        vulnerability: parseInt(document.getElementById("risk-qua-vul").value) || 1,
      },
      result: document.getElementById("risk-result").value,
    },
    selfAssessment: document.getElementById("perf-self").value,
    supplyChain: document.getElementById("perf-chain").value,
    productEval: document.getElementById("perf-product").value,
    evaluator: document.getElementById("perf-evaluator").value,
    reviewer: document.getElementById("perf-reviewer").value,
    approver: document.getElementById("perf-approver").value,
  };
}

async function savePerformance() {
  const sid = document.getElementById("perf-supplier-select").value;
  if (!sid) { alert("업체를 선택하세요"); return; }
  const body = getPerfBody();
  await api(`/api/performance/${sid}`, "POST", body);
  alert("실적 데이터가 저장되었습니다.");
  await loadAll();
}

async function saveAndEvaluate() {
  const sid = document.getElementById("perf-supplier-select").value;
  if (!sid) { alert("업체를 선택하세요"); return; }
  const body = getPerfBody();
  await api(`/api/performance/${sid}`, "POST", body);
  const evalDate = document.getElementById("perf-eval-date").value || new Date().toISOString().slice(0, 10);
  const docNo = document.getElementById("perf-doc-no").value.trim();
  const evalBody = { ...body, supplierId: sid, evalDate };
  if (docNo) evalBody.docNo = docNo;
  await api("/api/evaluations", "POST", evalBody);
  alert("실적이 저장되고 평가이력에 추가되었습니다.");
  await loadAll();
  showView("history", document.querySelectorAll(".nav-btn")[3]);
}

async function uploadPerformanceFile(input) {
  const file = input.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/performance/parse-file", { method: "POST", body: fd });
  input.value = "";
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    alert(e.error || "파일 파싱 오류");
    return;
  }
  const p = await res.json();
  document.getElementById("perf-iso-held").value = p.isoHeld ? "true" : "false";
  document.getElementById("perf-iso-expiry").value = p.isoExpiry || "";
  document.getElementById("perf-del-target").value = p.deliveryTarget ?? 100;
  document.getElementById("perf-del-actual").value = p.deliveryActual ?? 0;
  document.getElementById("perf-def-target").value = p.defectTarget ?? 0;
  document.getElementById("perf-def-actual").value = p.defectActual ?? 0;
  document.getElementById("perf-self").value = p.selfAssessment || "해당사항 없음";
  document.getElementById("perf-chain").value = p.supplyChain || "해당사항 없음";
  document.getElementById("perf-product").value = p.productEval || "제품 검사서 참조";
  if (p.evaluator) document.getElementById("perf-evaluator").value = p.evaluator;
  if (p.reviewer) document.getElementById("perf-reviewer").value = p.reviewer;
  if (p.approver) document.getElementById("perf-approver").value = p.approver;
  updateScorePreview();
  alert("파일에서 데이터를 불러왔습니다. 내용 확인 후 저장하세요.");
}

// ── History ───────────────────────────────────────────────────────────────────
function renderHistoryTable() {
  const sid = document.getElementById("history-supplier-filter").value;
  const rows = sid ? evaluations.filter(e => e.supplierId === sid) : evaluations;
  const supMap = Object.fromEntries(suppliers.map(s => [s.id, s]));
  document.getElementById("history-table").innerHTML = rows.map(e => `
    <tr>
      <td>${e.docNo}</td>
      <td>${supMap[e.supplierId]?.name || ""}</td>
      <td>${e.evalDate}</td>
      <td>${e.totalScore}</td>
      <td><span class="badge badge-${e.grade}">${e.grade}</span></td>
      <td>${e.result}</td>
      <td>${e.nextEvalDate}</td>
      <td>${e.isAutoGenerated ? "🤖 자동" : "✍️ 수동"}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="viewReport('${e.id}')">보고서</button>
        <button class="btn btn-danger btn-sm" onclick="deleteEval('${e.id}')">삭제</button>
      </td>
    </tr>`).join("");
}

function viewReport(evalId) {
  window.open(`/api/evaluations/${evalId}/report`, "_blank");
}

async function deleteEval(evalId) {
  if (!confirm("평가 기록을 삭제하시겠습니까?")) return;
  await api(`/api/evaluations/${evalId}`, "DELETE");
  await loadAll();
  renderHistoryTable();
  renderDashboard();
}

// ── Export ────────────────────────────────────────────────────────────────────
function exportCSV() { window.location.href = "/api/export/csv"; }
function exportExcel() { window.location.href = "/api/export/excel"; }
function exportBackup() { window.location.href = "/api/export/backup"; }

async function importBackup(input) {
  const file = input.files[0];
  if (!file) return;
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/import/backup", { method: "POST", body: fd });
  if (res.ok) { alert("복원 완료. 새로고침합니다."); location.reload(); }
  else alert("복원 실패");
  input.value = "";
}
