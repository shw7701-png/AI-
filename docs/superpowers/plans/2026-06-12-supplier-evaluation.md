# 공급업체 평가 관리 시스템 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 공급업체 재평가 보고서 자동화 웹 시스템 — 실적 데이터 입력 후 평가·보고서·이메일 발송을 완전 자동화

**Architecture:** Flask 로컬 서버(localhost:5000)가 REST API와 SPA 프론트엔드를 제공. JSON 파일로 데이터 저장. Windows Task Scheduler가 `scheduler.py`를 매일 08:00에 실행하여 D-90/60/30 경고 이메일 발송 및 평가일 도래 시 자동 평가 처리.

**Tech Stack:** Python 3.11+, Flask 3.x, openpyxl, python-dateutil, Jinja2, Vanilla JS/CSS

---

## File Map

| 파일 | 역할 |
|------|------|
| `supplier-eval/scorer.py` | ISO/납기/부적합 점수 계산, 등급, 차기평가일 |
| `supplier-eval/data_store.py` | JSON 파일 CRUD |
| `supplier-eval/email_sender.py` | Gmail SMTP 발송 |
| `supplier-eval/scheduler.py` | D-day 체크, 자동 평가, 이메일 |
| `supplier-eval/app.py` | Flask API + 프론트엔드 서빙 |
| `supplier-eval/config.json` | 이메일 설정 템플릿 |
| `supplier-eval/requirements.txt` | Python 의존성 |
| `supplier-eval/data/suppliers.json` | 업체 마스터 |
| `supplier-eval/data/performance.json` | 납기율/부적합율 실적 |
| `supplier-eval/data/evaluations.json` | 평가 이력 |
| `supplier-eval/templates/report.html` | 보고서 Jinja2 템플릿 |
| `supplier-eval/templates/index.html` | SPA 메인 |
| `supplier-eval/static/style.css` | 전체 스타일 |
| `supplier-eval/static/app.js` | SPA 로직 |
| `supplier-eval/tests/test_scorer.py` | 점수 계산 단위 테스트 |
| `supplier-eval/tests/test_data_store.py` | 데이터 CRUD 단위 테스트 |
| `supplier-eval/tests/test_scheduler.py` | 스케줄러 단위 테스트 |

---

## Task 1: 프로젝트 셋업

**Files:**
- Create: `supplier-eval/requirements.txt`
- Create: `supplier-eval/config.json`
- Create: `supplier-eval/data/.gitkeep`
- Create: `supplier-eval/tests/__init__.py`

- [ ] **Step 1: 디렉토리 구조 생성**

```powershell
mkdir supplier-eval\data, supplier-eval\templates, supplier-eval\static, supplier-eval\tests
New-Item supplier-eval\tests\__init__.py -ItemType File
New-Item supplier-eval\data\.gitkeep -ItemType File
```

- [ ] **Step 2: requirements.txt 작성**

```
flask>=3.0.0
openpyxl>=3.1.0
python-dateutil>=2.9.0
pytest>=8.0.0
```

- [ ] **Step 3: config.json 작성**

```json
{
  "email": {
    "sender": "your_gmail@gmail.com",
    "app_password": "xxxx xxxx xxxx xxxx",
    "recipients": ["manager@company.com"],
    "alert_days": [90, 60, 30]
  }
}
```

- [ ] **Step 4: 의존성 설치**

```powershell
cd supplier-eval
pip install -r requirements.txt
```

Expected: Successfully installed flask openpyxl python-dateutil pytest

- [ ] **Step 5: 커밋**

```bash
git add supplier-eval/
git commit -m "feat: 프로젝트 구조 및 설정 파일 생성"
```

---

## Task 2: scorer.py (TDD)

**Files:**
- Create: `supplier-eval/scorer.py`
- Create: `supplier-eval/tests/test_scorer.py`

- [ ] **Step 1: 테스트 파일 작성**

`supplier-eval/tests/test_scorer.py`:
```python
import pytest
from unittest.mock import patch
from datetime import date
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import scorer

# --- calc_iso_score ---
def test_iso_held_valid():
    assert scorer.calc_iso_score(True, "2030-01-01") == 50

def test_iso_held_expired():
    assert scorer.calc_iso_score(True, "2020-01-01") == 0

def test_iso_not_held():
    assert scorer.calc_iso_score(False, "2030-01-01") == 0

def test_iso_no_expiry():
    assert scorer.calc_iso_score(True, "") == 0

# --- calc_delivery_score ---
def test_delivery_100pct():
    assert scorer.calc_delivery_score(100, 100) == 25.0

def test_delivery_99pct():
    assert scorer.calc_delivery_score(100, 99) == pytest.approx(24.75)

def test_delivery_over_100pct_capped():
    assert scorer.calc_delivery_score(100, 110) == 25.0

def test_delivery_zero_target():
    assert scorer.calc_delivery_score(0, 0) == 0.0

# --- calc_defect_score ---
def test_defect_zero_target_zero_actual():
    assert scorer.calc_defect_score(0, 0) == 25.0

def test_defect_zero_target_nonzero_actual():
    assert scorer.calc_defect_score(0, 1) == 0.0

def test_defect_half():
    assert scorer.calc_defect_score(2, 1) == pytest.approx(12.5)

def test_defect_floor_zero():
    assert scorer.calc_defect_score(1, 5) == 0.0

# --- calc_grade ---
def test_grade_A_boundary():
    assert scorer.calc_grade(100) == ("A", "승인")
    assert scorer.calc_grade(90) == ("A", "승인")

def test_grade_B_boundary():
    assert scorer.calc_grade(89) == ("B", "승인")
    assert scorer.calc_grade(70) == ("B", "승인")

def test_grade_C_boundary():
    assert scorer.calc_grade(69) == ("C", "조건부 승인")
    assert scorer.calc_grade(50) == ("C", "조건부 승인")

def test_grade_D_boundary():
    assert scorer.calc_grade(49) == ("D", "승인불가")
    assert scorer.calc_grade(0) == ("D", "승인불가")

# --- calc_next_eval_date ---
def test_next_eval_A():
    assert scorer.calc_next_eval_date("2025-09-25", "A") == "2028-09-25"

def test_next_eval_B():
    assert scorer.calc_next_eval_date("2025-09-25", "B") == "2027-09-25"

def test_next_eval_C():
    assert scorer.calc_next_eval_date("2025-09-25", "C") == "2026-09-25"

def test_next_eval_D():
    assert scorer.calc_next_eval_date("2025-09-25", "D") == "2025-09-25"

# --- score (통합) ---
def test_score_perfect():
    perf = {
        "isoHeld": True, "isoExpiry": "2030-01-01",
        "deliveryTarget": 100, "deliveryActual": 100,
        "defectTarget": 0, "defectActual": 0
    }
    result = scorer.score(perf, "2025-09-25")
    assert result["totalScore"] == 100.0
    assert result["grade"] == "A"
    assert result["nextEvalDate"] == "2028-09-25"

def test_score_no_iso():
    perf = {
        "isoHeld": False, "isoExpiry": "",
        "deliveryTarget": 100, "deliveryActual": 100,
        "defectTarget": 0, "defectActual": 0
    }
    result = scorer.score(perf, "2025-09-25")
    assert result["totalScore"] == 50.0
    assert result["grade"] == "C"
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```powershell
cd supplier-eval
pytest tests/test_scorer.py -v
```

Expected: `ModuleNotFoundError: No module named 'scorer'`

- [ ] **Step 3: scorer.py 구현**

`supplier-eval/scorer.py`:
```python
from datetime import datetime, date
from dateutil.relativedelta import relativedelta


def calc_iso_score(iso_held: bool, iso_expiry: str) -> int:
    if not iso_held or not iso_expiry:
        return 0
    try:
        expiry = datetime.strptime(iso_expiry, "%Y-%m-%d").date()
        return 50 if expiry >= date.today() else 0
    except ValueError:
        return 0


def calc_delivery_score(target: float, actual: float) -> float:
    if target <= 0:
        return 0.0
    return min((actual / target) * 25, 25.0)


def calc_defect_score(target: float, actual: float) -> float:
    if target == 0:
        return 25.0 if actual == 0 else 0.0
    return max((1 - actual / target) * 25, 0.0)


def calc_grade(total: float) -> tuple:
    if total >= 90:
        return "A", "승인"
    elif total >= 70:
        return "B", "승인"
    elif total >= 50:
        return "C", "조건부 승인"
    return "D", "승인불가"


def calc_next_eval_date(eval_date: str, grade: str) -> str:
    years = {"A": 3, "B": 2, "C": 1, "D": 0}
    dt = datetime.strptime(eval_date, "%Y-%m-%d").date()
    if grade == "D":
        return eval_date
    return (dt + relativedelta(years=years[grade])).strftime("%Y-%m-%d")


def score(performance: dict, eval_date: str) -> dict:
    iso = calc_iso_score(performance["isoHeld"], performance.get("isoExpiry", ""))
    delivery = calc_delivery_score(
        performance["deliveryTarget"], performance["deliveryActual"]
    )
    defect = calc_defect_score(
        performance["defectTarget"], performance["defectActual"]
    )
    total = iso + delivery + defect
    grade, result = calc_grade(total)
    return {
        "isoScore": iso,
        "deliveryScore": round(delivery, 2),
        "defectScore": round(defect, 2),
        "totalScore": round(total, 2),
        "grade": grade,
        "result": result,
        "nextEvalDate": calc_next_eval_date(eval_date, grade),
    }
```

- [ ] **Step 4: 테스트 통과 확인**

```powershell
pytest tests/test_scorer.py -v
```

Expected: 모든 테스트 PASSED

- [ ] **Step 5: 커밋**

```bash
git add supplier-eval/scorer.py supplier-eval/tests/test_scorer.py
git commit -m "feat: scorer.py 점수 계산 로직 구현 (TDD)"
```

---

## Task 3: data_store.py (TDD)

**Files:**
- Create: `supplier-eval/data_store.py`
- Create: `supplier-eval/tests/test_data_store.py`

- [ ] **Step 1: 테스트 파일 작성**

`supplier-eval/tests/test_data_store.py`:
```python
import pytest
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import data_store

SAMPLE_SUPPLIER = {
    "name": "테스트업체", "category": "원자재", "businessNo": "000-00-00000",
    "address": "서울시", "contact": "홍길동", "phone": "010-0000-0000",
    "isCritical": False, "registeredDate": "2025-01-01", "memo": ""
}

SAMPLE_PERF = {
    "supplierId": "test-id", "updatedDate": "2025-01-01",
    "isoHeld": True, "isoExpiry": "2028-01-01",
    "deliveryTarget": 100.0, "deliveryActual": 99.0,
    "defectTarget": 0.0, "defectActual": 0.0,
    "selfAssessment": "", "supplyChain": "", "productEval": "",
    "risk": {"delivery": {}, "quality": {}, "result": ""},
    "evaluator": "평가자", "reviewer": "검토자", "approver": "승인자"
}

@pytest.fixture(autouse=True)
def tmp_data(tmp_path, monkeypatch):
    monkeypatch.setattr(data_store, "DATA_DIR", tmp_path)
    yield

def test_save_new_supplier_assigns_id():
    s = data_store.save_supplier(dict(SAMPLE_SUPPLIER))
    assert s["id"] != "" and s["id"] is not None

def test_get_suppliers_returns_saved():
    data_store.save_supplier(dict(SAMPLE_SUPPLIER))
    assert len(data_store.get_suppliers()) == 1

def test_update_supplier():
    s = data_store.save_supplier(dict(SAMPLE_SUPPLIER))
    s["name"] = "수정업체"
    data_store.save_supplier(s)
    assert data_store.get_supplier(s["id"])["name"] == "수정업체"
    assert len(data_store.get_suppliers()) == 1

def test_delete_supplier():
    s = data_store.save_supplier(dict(SAMPLE_SUPPLIER))
    assert data_store.delete_supplier(s["id"]) is True
    assert data_store.get_supplier(s["id"]) is None

def test_delete_nonexistent_returns_false():
    assert data_store.delete_supplier("nonexistent") is False

def test_save_and_get_performance():
    perf = dict(SAMPLE_PERF)
    data_store.save_performance(perf)
    result = data_store.get_performance("test-id")
    assert result["deliveryActual"] == 99.0

def test_update_performance_replaces():
    data_store.save_performance(dict(SAMPLE_PERF))
    updated = dict(SAMPLE_PERF)
    updated["deliveryActual"] = 95.0
    data_store.save_performance(updated)
    assert data_store.get_performance("test-id")["deliveryActual"] == 95.0

def test_get_performance_none_if_missing():
    assert data_store.get_performance("missing") is None

def test_save_evaluation_assigns_id():
    eval_data = {
        "supplierId": "abc", "docNo": "2025-1", "evalDate": "2025-09-25",
        "isoHeld": True, "isoExpiry": "2028-01-01",
        "deliveryTarget": 100.0, "deliveryActual": 100.0,
        "defectTarget": 0.0, "defectActual": 0.0,
        "risk": {}, "selfAssessment": "", "supplyChain": "", "productEval": "",
        "isoScore": 50, "deliveryScore": 25.0, "defectScore": 25.0,
        "totalScore": 100.0, "grade": "A", "result": "승인",
        "nextEvalDate": "2028-09-25", "isAutoGenerated": False,
        "evaluator": "", "reviewer": "", "approver": "", "memo": ""
    }
    saved = data_store.save_evaluation(eval_data)
    assert saved["id"] != ""

def test_get_latest_evaluation():
    for date_str in ["2024-01-01", "2025-09-25", "2023-06-01"]:
        e = {
            "supplierId": "abc", "docNo": "x", "evalDate": date_str,
            "isoHeld": True, "isoExpiry": "2030-01-01",
            "deliveryTarget": 100.0, "deliveryActual": 100.0,
            "defectTarget": 0.0, "defectActual": 0.0,
            "risk": {}, "selfAssessment": "", "supplyChain": "", "productEval": "",
            "isoScore": 50, "deliveryScore": 25.0, "defectScore": 25.0,
            "totalScore": 100.0, "grade": "A", "result": "승인",
            "nextEvalDate": "2028-09-25", "isAutoGenerated": False,
            "evaluator": "", "reviewer": "", "approver": "", "memo": ""
        }
        data_store.save_evaluation(e)
    latest = data_store.get_latest_evaluation("abc")
    assert latest["evalDate"] == "2025-09-25"

def test_delete_evaluation():
    e = data_store.save_evaluation({
        "supplierId": "abc", "docNo": "2025-1", "evalDate": "2025-09-25",
        "isoHeld": True, "isoExpiry": "2028-01-01",
        "deliveryTarget": 100.0, "deliveryActual": 100.0,
        "defectTarget": 0.0, "defectActual": 0.0,
        "risk": {}, "selfAssessment": "", "supplyChain": "", "productEval": "",
        "isoScore": 50, "deliveryScore": 25.0, "defectScore": 25.0,
        "totalScore": 100.0, "grade": "A", "result": "승인",
        "nextEvalDate": "2028-09-25", "isAutoGenerated": False,
        "evaluator": "", "reviewer": "", "approver": "", "memo": ""
    })
    assert data_store.delete_evaluation(e["id"]) is True
    assert data_store.get_evaluations("abc") == []
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```powershell
pytest tests/test_data_store.py -v
```

Expected: `ModuleNotFoundError: No module named 'data_store'`

- [ ] **Step 3: data_store.py 구현**

`supplier-eval/data_store.py`:
```python
import json
import uuid
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"


def _read(filename: str) -> list:
    path = DATA_DIR / filename
    if not path.exists():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def _write(filename: str, data: list) -> None:
    DATA_DIR.mkdir(exist_ok=True)
    (DATA_DIR / filename).write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )


# --- Suppliers ---

def get_suppliers() -> list:
    return _read("suppliers.json")


def get_supplier(supplier_id: str) -> dict | None:
    return next((s for s in get_suppliers() if s["id"] == supplier_id), None)


def save_supplier(supplier: dict) -> dict:
    suppliers = get_suppliers()
    if not supplier.get("id"):
        supplier["id"] = str(uuid.uuid4())
        suppliers.append(supplier)
    else:
        idx = next((i for i, s in enumerate(suppliers) if s["id"] == supplier["id"]), None)
        if idx is not None:
            suppliers[idx] = supplier
        else:
            suppliers.append(supplier)
    _write("suppliers.json", suppliers)
    return supplier


def delete_supplier(supplier_id: str) -> bool:
    suppliers = get_suppliers()
    new = [s for s in suppliers if s["id"] != supplier_id]
    if len(new) == len(suppliers):
        return False
    _write("suppliers.json", new)
    return True


# --- Performance ---

def get_performance(supplier_id: str) -> dict | None:
    return next((p for p in _read("performance.json") if p["supplierId"] == supplier_id), None)


def save_performance(perf: dict) -> dict:
    all_perf = _read("performance.json")
    idx = next((i for i, p in enumerate(all_perf) if p["supplierId"] == perf["supplierId"]), None)
    if idx is not None:
        all_perf[idx] = perf
    else:
        all_perf.append(perf)
    _write("performance.json", all_perf)
    return perf


# --- Evaluations ---

def get_evaluations(supplier_id: str = None) -> list:
    evals = _read("evaluations.json")
    if supplier_id:
        evals = [e for e in evals if e["supplierId"] == supplier_id]
    return sorted(evals, key=lambda e: e["evalDate"], reverse=True)


def get_latest_evaluation(supplier_id: str) -> dict | None:
    evals = get_evaluations(supplier_id)
    return evals[0] if evals else None


def save_evaluation(evaluation: dict) -> dict:
    evals = _read("evaluations.json")
    if not evaluation.get("id"):
        evaluation["id"] = str(uuid.uuid4())
    evals.append(evaluation)
    _write("evaluations.json", evals)
    return evaluation


def delete_evaluation(eval_id: str) -> bool:
    evals = _read("evaluations.json")
    new = [e for e in evals if e["id"] != eval_id]
    if len(new) == len(evals):
        return False
    _write("evaluations.json", new)
    return True


def get_all_evaluations() -> list:
    return get_evaluations()
```

- [ ] **Step 4: 테스트 통과 확인**

```powershell
pytest tests/test_data_store.py -v
```

Expected: 모든 테스트 PASSED

- [ ] **Step 5: 커밋**

```bash
git add supplier-eval/data_store.py supplier-eval/tests/test_data_store.py
git commit -m "feat: data_store.py JSON CRUD 구현 (TDD)"
```

---

## Task 4: email_sender.py

**Files:**
- Create: `supplier-eval/email_sender.py`

- [ ] **Step 1: email_sender.py 작성**

`supplier-eval/email_sender.py`:
```python
import smtplib
import json
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path


def load_config() -> dict:
    path = Path(__file__).parent / "config.json"
    return json.loads(path.read_text(encoding="utf-8"))["email"]


def send_email(subject: str, html_body: str, config: dict = None) -> None:
    if config is None:
        config = load_config()
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = config["sender"]
    msg["To"] = ", ".join(config["recipients"])
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(config["sender"], config["app_password"])
        server.sendmail(config["sender"], config["recipients"], msg.as_string())


def send_warning_email(
    supplier_name: str, days_left: int, next_eval_date: str, config: dict = None
) -> None:
    urgency = "긴급 " if days_left <= 30 else ""
    subject = f"[{urgency}공급업체 재평가 알림] {supplier_name} — D-{days_left}"
    body = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;">
      <h2 style="color:#c0392b;">공급업체 재평가 사전 알림</h2>
      <table style="border-collapse:collapse;width:100%;">
        <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;">업체명</td><td style="padding:8px;">{supplier_name}</td></tr>
        <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;">재평가 예정일</td><td style="padding:8px;">{next_eval_date}</td></tr>
        <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;">남은 기간</td><td style="padding:8px;color:#c0392b;font-weight:bold;">{days_left}일</td></tr>
      </table>
      <p style="margin-top:16px;">재평가 준비를 진행해 주세요.</p>
    </div>
    """
    send_email(subject, body, config)


def send_evaluation_email(
    supplier_name: str,
    report_html: str,
    grade: str,
    total_score: float,
    result: str,
    next_eval_date: str,
    config: dict = None,
) -> None:
    subject = f"[공급업체 자동 평가 완료] {supplier_name} — {grade}등급 ({total_score}점) {result}"
    body = f"""
    <div style="font-family:Arial,sans-serif;max-width:800px;margin:auto;">
      <h2>공급업체 자동 평가 완료</h2>
      <table style="border-collapse:collapse;width:100%;">
        <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;">업체명</td><td style="padding:8px;">{supplier_name}</td></tr>
        <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;">등급</td><td style="padding:8px;font-weight:bold;">{grade}등급 ({total_score}점)</td></tr>
        <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;">평가 결과</td><td style="padding:8px;">{result}</td></tr>
        <tr><td style="padding:8px;background:#f5f5f5;font-weight:bold;">차기 평가 예정일</td><td style="padding:8px;">{next_eval_date}</td></tr>
      </table>
      <hr style="margin:24px 0;">
      <h3>상세 보고서</h3>
      {report_html}
    </div>
    """
    send_email(subject, body, config)
```

- [ ] **Step 2: 커밋**

```bash
git add supplier-eval/email_sender.py
git commit -m "feat: email_sender.py Gmail SMTP 모듈 구현"
```

---

## Task 5: scheduler.py (TDD)

**Files:**
- Create: `supplier-eval/scheduler.py`
- Create: `supplier-eval/tests/test_scheduler.py`

- [ ] **Step 1: 테스트 파일 작성**

`supplier-eval/tests/test_scheduler.py`:
```python
import pytest
from unittest.mock import patch, MagicMock, call
from datetime import date
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
import scheduler

def test_days_until_future():
    with patch("scheduler.date") as mock_date:
        mock_date.today.return_value = date(2025, 9, 25)
        mock_date.strptime = __import__("datetime").datetime.strptime
        result = scheduler.days_until("2025-10-25")
    assert result == 30

def test_days_until_past():
    with patch("scheduler.date") as mock_date:
        mock_date.today.return_value = date(2025, 9, 25)
        mock_date.strptime = __import__("datetime").datetime.strptime
        result = scheduler.days_until("2025-09-24")
    assert result == -1

def test_generate_doc_no_first_of_year():
    with patch("scheduler.data_store") as mock_ds, \
         patch("scheduler.date") as mock_date:
        mock_date.today.return_value = date(2025, 9, 25)
        mock_ds.get_evaluations.return_value = []
        assert scheduler.generate_doc_no("abc") == "2025-1"

def test_generate_doc_no_second():
    with patch("scheduler.data_store") as mock_ds, \
         patch("scheduler.date") as mock_date:
        mock_date.today.return_value = date(2025, 9, 25)
        mock_ds.get_evaluations.return_value = [
            {"evalDate": "2025-03-01"},
            {"evalDate": "2024-12-01"},
        ]
        assert scheduler.generate_doc_no("abc") == "2025-2"

def test_run_sends_warning_on_alert_day():
    config = {"sender": "a@b.com", "app_password": "x", "recipients": ["m@c.com"], "alert_days": [30]}
    supplier = {"id": "s1", "name": "테스트업체"}
    latest_eval = {"nextEvalDate": "2025-10-25"}

    with patch("scheduler.data_store") as mock_ds, \
         patch("scheduler.email_sender") as mock_email, \
         patch("scheduler.date") as mock_date:
        mock_date.today.return_value = date(2025, 9, 25)
        mock_date.strptime = __import__("datetime").datetime.strptime
        mock_ds.get_suppliers.return_value = [supplier]
        mock_ds.get_latest_evaluation.return_value = latest_eval
        mock_email.load_config.return_value = config

        scheduler.run()

        mock_email.send_warning_email.assert_called_once_with(
            "테스트업체", 30, "2025-10-25", config
        )

def test_run_auto_evaluates_on_due_date():
    config = {"sender": "a@b.com", "app_password": "x", "recipients": ["m@c.com"], "alert_days": [30]}
    supplier = {"id": "s1", "name": "테스트업체", "isCritical": False}
    latest_eval = {"nextEvalDate": "2025-09-25"}
    perf = {
        "supplierId": "s1", "isoHeld": True, "isoExpiry": "2030-01-01",
        "deliveryTarget": 100.0, "deliveryActual": 100.0,
        "defectTarget": 0.0, "defectActual": 0.0,
        "selfAssessment": "", "supplyChain": "", "productEval": "",
        "risk": {"delivery": {}, "quality": {}, "result": ""},
        "evaluator": "평가자", "reviewer": "검토자", "approver": "승인자"
    }

    with patch("scheduler.data_store") as mock_ds, \
         patch("scheduler.email_sender") as mock_email, \
         patch("scheduler.scorer") as mock_scorer, \
         patch("scheduler.render_report", return_value="<html>report</html>"), \
         patch("scheduler.date") as mock_date:
        mock_date.today.return_value = date(2025, 9, 25)
        mock_date.strptime = __import__("datetime").datetime.strptime
        mock_ds.get_suppliers.return_value = [supplier]
        mock_ds.get_latest_evaluation.return_value = latest_eval
        mock_ds.get_performance.return_value = perf
        mock_ds.get_evaluations.return_value = []
        mock_email.load_config.return_value = config
        mock_scorer.score.return_value = {
            "isoScore": 50, "deliveryScore": 25.0, "defectScore": 25.0,
            "totalScore": 100.0, "grade": "A", "result": "승인",
            "nextEvalDate": "2028-09-25"
        }

        scheduler.run()

        mock_ds.save_evaluation.assert_called_once()
        mock_email.send_evaluation_email.assert_called_once()
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```powershell
pytest tests/test_scheduler.py -v
```

Expected: `ModuleNotFoundError: No module named 'scheduler'`

- [ ] **Step 3: scheduler.py 구현**

`supplier-eval/scheduler.py`:
```python
from datetime import datetime, date
from pathlib import Path
from jinja2 import Template
import data_store
import scorer
import email_sender


def days_until(date_str: str) -> int:
    target = datetime.strptime(date_str, "%Y-%m-%d").date()
    return (target - date.today()).days


def generate_doc_no(supplier_id: str) -> str:
    year = date.today().year
    evals = data_store.get_evaluations(supplier_id)
    count = sum(1 for e in evals if e["evalDate"].startswith(str(year))) + 1
    return f"{year}-{count}"


def render_report(supplier: dict, perf: dict, score_result: dict, eval_date: str, doc_no: str) -> str:
    template_path = Path(__file__).parent / "templates" / "report.html"
    template = Template(template_path.read_text(encoding="utf-8"))
    return template.render(
        supplier=supplier,
        perf=perf,
        score=score_result,
        eval_date=eval_date,
        doc_no=doc_no,
        is_email=True,
    )


def run() -> None:
    config = email_sender.load_config()
    alert_days = config.get("alert_days", [90, 60, 30])
    today_str = date.today().strftime("%Y-%m-%d")

    for supplier in data_store.get_suppliers():
        latest = data_store.get_latest_evaluation(supplier["id"])
        if not latest:
            continue

        days_left = days_until(latest["nextEvalDate"])

        if days_left in alert_days:
            email_sender.send_warning_email(
                supplier["name"], days_left, latest["nextEvalDate"], config
            )
        elif days_left <= 0:
            perf = data_store.get_performance(supplier["id"])
            if not perf:
                continue
            score_result = scorer.score(perf, today_str)
            doc_no = generate_doc_no(supplier["id"])
            report_html = render_report(supplier, perf, score_result, today_str, doc_no)
            evaluation = {
                "id": "",
                "supplierId": supplier["id"],
                "docNo": doc_no,
                "evalDate": today_str,
                "isoHeld": perf["isoHeld"],
                "isoExpiry": perf.get("isoExpiry", ""),
                "deliveryTarget": perf["deliveryTarget"],
                "deliveryActual": perf["deliveryActual"],
                "defectTarget": perf["defectTarget"],
                "defectActual": perf["defectActual"],
                "risk": perf.get("risk", {}),
                "selfAssessment": perf.get("selfAssessment", ""),
                "supplyChain": perf.get("supplyChain", ""),
                "productEval": perf.get("productEval", ""),
                "evaluator": perf.get("evaluator", ""),
                "reviewer": perf.get("reviewer", ""),
                "approver": perf.get("approver", ""),
                **score_result,
                "isAutoGenerated": True,
                "memo": "자동 생성",
            }
            data_store.save_evaluation(evaluation)
            email_sender.send_evaluation_email(
                supplier["name"],
                report_html,
                score_result["grade"],
                score_result["totalScore"],
                score_result["result"],
                score_result["nextEvalDate"],
                config,
            )


if __name__ == "__main__":
    run()
```

- [ ] **Step 4: 테스트 통과 확인**

```powershell
pytest tests/test_scheduler.py -v
```

Expected: 모든 테스트 PASSED

- [ ] **Step 5: 전체 테스트 통과 확인**

```powershell
pytest tests/ -v
```

Expected: 전체 PASSED

- [ ] **Step 6: 커밋**

```bash
git add supplier-eval/scheduler.py supplier-eval/tests/test_scheduler.py
git commit -m "feat: scheduler.py 자동화 스케줄러 구현 (TDD)"
```

---

## Task 6: app.py Flask 서버

**Files:**
- Create: `supplier-eval/app.py`

- [ ] **Step 1: app.py 작성**

`supplier-eval/app.py`:
```python
import io
import csv
import json
import zipfile
from datetime import date
from pathlib import Path

from flask import Flask, request, jsonify, render_template, send_file

import data_store
import scorer

app = Flask(__name__)


# ── Suppliers ────────────────────────────────────────────────────────────────

@app.get("/api/suppliers")
def list_suppliers():
    return jsonify(data_store.get_suppliers())


@app.post("/api/suppliers")
def create_supplier():
    s = request.get_json()
    s.pop("id", None)
    return jsonify(data_store.save_supplier(s)), 201


@app.put("/api/suppliers/<supplier_id>")
def update_supplier(supplier_id):
    s = request.get_json()
    s["id"] = supplier_id
    return jsonify(data_store.save_supplier(s))


@app.delete("/api/suppliers/<supplier_id>")
def delete_supplier(supplier_id):
    if data_store.delete_supplier(supplier_id):
        return "", 204
    return jsonify({"error": "not found"}), 404


# ── Performance ───────────────────────────────────────────────────────────────

@app.get("/api/performance/<supplier_id>")
def get_performance(supplier_id):
    perf = data_store.get_performance(supplier_id)
    if perf:
        # 점수 미리보기 포함
        preview = scorer.score(perf, date.today().strftime("%Y-%m-%d"))
        return jsonify({"performance": perf, "scorePreview": preview})
    return jsonify({"performance": None, "scorePreview": None})


@app.route("/api/performance/<supplier_id>", methods=["POST", "PUT"])
def save_performance(supplier_id):
    perf = request.get_json()
    perf["supplierId"] = supplier_id
    perf["updatedDate"] = date.today().strftime("%Y-%m-%d")
    eval_date = perf.get("evalDate", perf["updatedDate"])
    data_store.save_performance(perf)
    preview = scorer.score(perf, eval_date)
    return jsonify({"performance": perf, "scorePreview": preview})


# ── Evaluations ───────────────────────────────────────────────────────────────

@app.get("/api/evaluations")
def list_evaluations():
    supplier_id = request.args.get("supplierId")
    return jsonify(data_store.get_evaluations(supplier_id))


@app.post("/api/evaluations")
def create_evaluation():
    e = request.get_json()
    e.pop("id", None)
    e["isAutoGenerated"] = False
    eval_date = e.get("evalDate", date.today().strftime("%Y-%m-%d"))
    e.update(scorer.score(e, eval_date))
    return jsonify(data_store.save_evaluation(e)), 201


@app.delete("/api/evaluations/<eval_id>")
def delete_evaluation(eval_id):
    if data_store.delete_evaluation(eval_id):
        return "", 204
    return jsonify({"error": "not found"}), 404


@app.get("/api/evaluations/<eval_id>/report")
def evaluation_report(eval_id):
    evals = data_store.get_all_evaluations()
    ev = next((e for e in evals if e["id"] == eval_id), None)
    if not ev:
        return "not found", 404
    supplier = data_store.get_supplier(ev["supplierId"])
    return render_template("report.html", evaluation=ev, supplier=supplier, is_email=False)


# ── Score preview ─────────────────────────────────────────────────────────────

@app.post("/api/score/preview")
def score_preview():
    data = request.get_json()
    eval_date = data.get("evalDate", date.today().strftime("%Y-%m-%d"))
    return jsonify(scorer.score(data, eval_date))


# ── Export ────────────────────────────────────────────────────────────────────

@app.get("/api/export/csv")
def export_csv():
    evals = data_store.get_all_evaluations()
    sup_map = {s["id"]: s for s in data_store.get_suppliers()}
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["평가서No", "업체명", "평가일자", "ISO점수", "납기점수", "부적합점수",
                "총점", "등급", "결과", "차기평가일", "자동생성여부"])
    for e in evals:
        s = sup_map.get(e["supplierId"], {})
        w.writerow([e["docNo"], s.get("name", ""), e["evalDate"],
                    e["isoScore"], e["deliveryScore"], e["defectScore"],
                    e["totalScore"], e["grade"], e["result"],
                    e["nextEvalDate"], "Y" if e.get("isAutoGenerated") else "N"])
    out.seek(0)
    return send_file(
        io.BytesIO(out.getvalue().encode("utf-8-sig")),
        mimetype="text/csv",
        as_attachment=True,
        download_name="평가이력.csv",
    )


@app.get("/api/export/excel")
def export_excel():
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment

    evals = data_store.get_all_evaluations()
    sup_map = {s["id"]: s for s in data_store.get_suppliers()}
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "평가이력"
    headers = ["평가서No", "업체명", "평가일자", "ISO점수", "납기점수", "부적합점수",
               "총점", "등급", "결과", "차기평가일", "자동생성여부"]
    ws.append(headers)
    for cell in ws[1]:
        cell.font = Font(bold=True)
        cell.fill = PatternFill(fill_type="solid", fgColor="D9E1F2")
        cell.alignment = Alignment(horizontal="center")
    for e in evals:
        s = sup_map.get(e["supplierId"], {})
        ws.append([e["docNo"], s.get("name", ""), e["evalDate"],
                   e["isoScore"], e["deliveryScore"], e["defectScore"],
                   e["totalScore"], e["grade"], e["result"],
                   e["nextEvalDate"], "Y" if e.get("isAutoGenerated") else "N"])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return send_file(
        buf,
        mimetype="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        as_attachment=True,
        download_name="평가이력.xlsx",
    )


@app.get("/api/export/backup")
def export_backup():
    data_dir = Path(__file__).parent / "data"
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for f in data_dir.glob("*.json"):
            zf.write(f, f.name)
    buf.seek(0)
    return send_file(buf, mimetype="application/zip",
                     as_attachment=True, download_name="backup.zip")


@app.post("/api/import/backup")
def import_backup():
    file = request.files.get("file")
    if not file:
        return jsonify({"error": "파일이 없습니다"}), 400
    data_dir = Path(__file__).parent / "data"
    data_dir.mkdir(exist_ok=True)
    with zipfile.ZipFile(io.BytesIO(file.read())) as zf:
        zf.extractall(data_dir)
    return jsonify({"message": "복원 완료"})


# ── Frontend ──────────────────────────────────────────────────────────────────

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    return render_template("index.html")


if __name__ == "__main__":
    app.run(debug=True, port=5000)
```

- [ ] **Step 2: 커밋**

```bash
git add supplier-eval/app.py
git commit -m "feat: app.py Flask API 구현 (공급업체/실적/평가/내보내기)"
```

---

## Task 7: report.html 보고서 템플릿

**Files:**
- Create: `supplier-eval/templates/report.html`

- [ ] **Step 1: report.html 작성**

`supplier-eval/templates/report.html`:
```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: '맑은 고딕', Arial, sans-serif; font-size: 11px; margin: 0; padding: 20px; color: #000; }
  .report-wrap { max-width: 800px; margin: auto; }
  h1 { text-align: center; font-size: 18px; margin-bottom: 4px; }
  h2 { text-align: center; font-size: 14px; margin-top: 0; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 12px; }
  th, td { border: 1px solid #555; padding: 5px 8px; }
  th { background: #d9e1f2; text-align: center; }
  .section-header { background: #bdd7ee; font-weight: bold; text-align: center; }
  .grade-table td { text-align: center; font-size: 14px; font-weight: bold; }
  .selected-grade { background: #ffd700; }
  .sign-table td { height: 40px; text-align: center; }
  .note-list { font-size: 10px; }
  .note-list li { margin-bottom: 2px; }
  @media print {
    body { padding: 0; }
    @page { margin: 15mm; }
  }
</style>
</head>
<body>
<div class="report-wrap">
  <h1>공급업체 재평가 보고서</h1>
  <h2>(Supplier Re-evaluation Report)</h2>

  <!-- 헤더 -->
  <table>
    <tr>
      <th>평가서 No.</th><td>{{ evaluation.docNo }}</td>
      <th>공급업체 명</th><td>{{ supplier.name }}</td>
      <th>평가 일자</th><td>{{ evaluation.evalDate }}</td>
    </tr>
  </table>

  <!-- Risk 평가 -->
  <table>
    <tr><td colspan="7" class="section-header">Risk 평가 결과 (Critical Supplier만 해당)</td></tr>
    {% if supplier.isCritical %}
    <tr>
      <th rowspan="2">Risk 식별</th>
      <th rowspan="2">현 관리 수준</th>
      <th colspan="3" style="text-align:center;">위험도</th>
    </tr>
    <tr><th>발생도</th><th>심각도</th><th>취약성</th></tr>
    <tr>
      <td>납기 관리</td>
      <td>{{ evaluation.risk.delivery.level or '-' }}</td>
      <td style="text-align:center;">{{ evaluation.risk.delivery.occurrence or '-' }}</td>
      <td style="text-align:center;">{{ evaluation.risk.delivery.severity or '-' }}</td>
      <td style="text-align:center;">{{ evaluation.risk.delivery.vulnerability or '-' }}</td>
    </tr>
    <tr>
      <td>품질 관리</td>
      <td>{{ evaluation.risk.quality.level or '-' }}</td>
      <td style="text-align:center;">{{ evaluation.risk.quality.occurrence or '-' }}</td>
      <td style="text-align:center;">{{ evaluation.risk.quality.severity or '-' }}</td>
      <td style="text-align:center;">{{ evaluation.risk.quality.vulnerability or '-' }}</td>
    </tr>
    {% else %}
    <tr><td colspan="7" style="text-align:center;">해당사항 없음 (Critical Supplier 미해당)</td></tr>
    {% endif %}
    <tr>
      <th colspan="2">Risk 평가 결과</th>
      <td colspan="5">{{ evaluation.risk.result or '해당사항 없음' }}</td>
    </tr>
  </table>

  <!-- 평가 항목 -->
  <table>
    <tr><td colspan="4" class="section-header">평가 항목</td></tr>
    <tr>
      <th style="width:25%;">항 목</th>
      <th></th>
      <th style="width:35%;">평가 결과</th>
      <th style="width:10%;">평가 점수</th>
    </tr>
    <tr>
      <td colspan="2">ISO 9001:2015 보유 유무</td>
      <td>
        {% if evaluation.isoHeld %}
          ISO 9001:2015 인증보유<br>(유효일정: {{ evaluation.isoExpiry }})
        {% else %}
          미보유
        {% endif %}
      </td>
      <td style="text-align:center;">{{ evaluation.isoScore }}</td>
    </tr>
    <tr>
      <td colspan="2">Self Assessment 평가</td>
      <td>{{ evaluation.selfAssessment or '해당사항 없음' }}</td>
      <td style="text-align:center;">-</td>
    </tr>
    <tr>
      <td rowspan="2">Critical Supplier 해당</td>
      <td>Supplier Chain 검증</td>
      <td>{{ evaluation.supplyChain or '해당사항 없음' }}</td>
      <td style="text-align:center;">-</td>
    </tr>
    <tr>
      <td>제품 평가</td>
      <td>{{ evaluation.productEval or '-' }}</td>
      <td style="text-align:center;">-</td>
    </tr>
    <tr>
      <td rowspan="2">전년도 공급자 성과</td>
      <td>납기율</td>
      <td>목표 {{ evaluation.deliveryTarget }}% 대비 실적 {{ evaluation.deliveryActual }}% 달성</td>
      <td style="text-align:center;">{{ evaluation.deliveryScore }}</td>
    </tr>
    <tr>
      <td>부적합율</td>
      <td>목표 {{ evaluation.defectTarget }}% 대비 실적 {{ evaluation.defectActual }}% 달성</td>
      <td style="text-align:center;">{{ evaluation.defectScore }}</td>
    </tr>
    <tr>
      <th colspan="3" style="text-align:right;">총 점</th>
      <th style="text-align:center;">{{ evaluation.totalScore }}</th>
    </tr>
  </table>

  <!-- 참고 사항 -->
  <table>
    <tr><td class="section-header">평가 시 참고 사항</td></tr>
    <tr>
      <td>
        <ol class="note-list">
          <li>ISO 9001:2015 인증서 보유 공급협력업체 경우 인증서 유효기간을 평가결과에 기입한다.</li>
          <li>ISO 9001:2015 인증 보유 공급협력업체는 Self Assessment 평가를 제외한다.</li>
          <li>Critical Supplier 평가는 해당된다.</li>
          <li>제품 품질에 영향을 주는 원재료 공급협력업체(Critical)인 당사는 Direct로 구매를 진행하기 때문에 Supply Chain 검증은 공급자 평가 항목에서 제외한다.</li>
          <li>평가 결과에 대한 Grade는 아래 평가 결과 및 항목에 Check하고 승인/재승인 여부를 결정한다.</li>
          <li>평가에 사용된 문서는 (ISO 9001:2015 인증서, 전년도 공급자 성과 등) 보고서에 첨부하여야 한다.</li>
          <li>현장평가를 시행하지 않은 공급협력업체 중 식별된 Risk의 심각도가 4 이상 존재할 경우 원격심사 및 제품 심사를 수행하여야 한다.</li>
        </ol>
      </td>
    </tr>
  </table>

  <!-- 평가 결과 -->
  <table class="grade-table">
    <tr><td colspan="4" class="section-header">평가 결과</td></tr>
    <tr>
      <td class="{{ 'selected-grade' if evaluation.grade == 'A' else '' }}">A</td>
      <td class="{{ 'selected-grade' if evaluation.grade == 'B' else '' }}">B</td>
      <td class="{{ 'selected-grade' if evaluation.grade == 'C' else '' }}">C</td>
      <td class="{{ 'selected-grade' if evaluation.grade == 'D' else '' }}">D</td>
    </tr>
    <tr>
      <td>{{ '▼' if evaluation.grade == 'A' else '' }}</td>
      <td>{{ '▼' if evaluation.grade == 'B' else '' }}</td>
      <td>{{ '▼' if evaluation.grade == 'C' else '' }}</td>
      <td>{{ '▼' if evaluation.grade == 'D' else '' }}</td>
    </tr>
    <tr>
      <td colspan="2">승인</td>
      <td colspan="2">승인 불가</td>
    </tr>
    <tr>
      <td colspan="4" style="text-align:center; font-size:13px;">
        {{ evaluation.result }}
        &nbsp;|&nbsp; 차기 평가 예정일: {{ evaluation.nextEvalDate }}
        {% if evaluation.isAutoGenerated %}&nbsp;[자동 생성]{% endif %}
      </td>
    </tr>
  </table>

  <!-- 결재 -->
  <table class="sign-table">
    <tr><td colspan="3" class="section-header">결토 및 승인</td></tr>
    <tr>
      <th style="width:33%;">평가자</th>
      <th style="width:34%;">검토자</th>
      <th style="width:33%;">승인자</th>
    </tr>
    <tr>
      <td>{{ evaluation.evaluator }}</td>
      <td>{{ evaluation.reviewer }}</td>
      <td>{{ evaluation.approver }}</td>
    </tr>
  </table>
</div>
</body>
</html>
```

- [ ] **Step 2: 커밋**

```bash
git add supplier-eval/templates/report.html
git commit -m "feat: report.html 보고서 템플릿 구현 (원본 양식 기반)"
```

---

## Task 8: index.html + style.css (레이아웃)

**Files:**
- Create: `supplier-eval/templates/index.html`
- Create: `supplier-eval/static/style.css`

- [ ] **Step 1: style.css 작성**

`supplier-eval/static/style.css`:
```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: '맑은 고딕', Arial, sans-serif; font-size: 14px; background: #f0f4f8; color: #222; }

/* Nav */
.navbar { background: #1a3a5c; color: #fff; display: flex; align-items: center; padding: 0 24px; height: 56px; gap: 8px; }
.navbar h1 { font-size: 17px; margin-right: auto; }
.nav-btn { background: none; border: none; color: #cce; padding: 10px 16px; cursor: pointer; border-radius: 4px; font-size: 14px; }
.nav-btn:hover, .nav-btn.active { background: #2a5080; color: #fff; }
.nav-actions { display: flex; gap: 8px; }
.btn { padding: 7px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600; }
.btn-primary { background: #2563eb; color: #fff; }
.btn-primary:hover { background: #1d4ed8; }
.btn-secondary { background: #64748b; color: #fff; }
.btn-secondary:hover { background: #475569; }
.btn-danger { background: #dc2626; color: #fff; }
.btn-danger:hover { background: #b91c1c; }
.btn-sm { padding: 4px 10px; font-size: 12px; }

/* Views */
.view { display: none; padding: 24px; }
.view.active { display: block; }

/* Cards */
.card-row { display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
.card { background: #fff; border-radius: 8px; padding: 20px 24px; box-shadow: 0 1px 4px rgba(0,0,0,.1); min-width: 160px; }
.card .label { font-size: 12px; color: #64748b; margin-bottom: 6px; }
.card .value { font-size: 28px; font-weight: 700; }
.card.red .value { color: #dc2626; }
.card.orange .value { color: #ea580c; }
.card.green .value { color: #16a34a; }

/* Table */
.table-wrap { background: #fff; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.1); overflow: hidden; }
.table-toolbar { display: flex; gap: 8px; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; align-items: center; }
.table-toolbar input { padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 13px; }
table { width: 100%; border-collapse: collapse; }
th { background: #f1f5f9; font-size: 12px; font-weight: 600; padding: 10px 12px; text-align: left; border-bottom: 2px solid #e2e8f0; }
td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
tr:hover td { background: #f8fafc; }

/* Grade badges */
.badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 700; }
.badge-A { background: #dcfce7; color: #15803d; }
.badge-B { background: #dbeafe; color: #1d4ed8; }
.badge-C { background: #fef9c3; color: #a16207; }
.badge-D { background: #fee2e2; color: #b91c1c; }

/* Alert rows */
.alert-red td { background: #fff1f2 !important; }
.alert-orange td { background: #fff7ed !important; }
.alert-yellow td { background: #fefce8 !important; }

/* Form */
.form-section { background: #fff; border-radius: 8px; padding: 20px 24px; box-shadow: 0 1px 4px rgba(0,0,0,.1); margin-bottom: 16px; }
.form-section h3 { font-size: 14px; font-weight: 700; color: #1a3a5c; border-bottom: 2px solid #dbeafe; padding-bottom: 8px; margin-bottom: 16px; }
.form-row { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 12px; }
.form-group { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 160px; }
.form-group label { font-size: 12px; color: #475569; font-weight: 600; }
.form-group input, .form-group select, .form-group textarea {
  padding: 7px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 13px; font-family: inherit;
}
.form-group input:focus, .form-group select:focus { outline: none; border-color: #2563eb; }
.form-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }

/* Score preview */
.score-preview { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 16px 20px; }
.score-row { display: flex; gap: 24px; align-items: center; flex-wrap: wrap; }
.score-item { text-align: center; }
.score-item .s-label { font-size: 11px; color: #64748b; }
.score-item .s-val { font-size: 22px; font-weight: 700; color: #1a3a5c; }
.score-item .s-total { font-size: 28px; color: #2563eb; }
.score-item .s-grade { font-size: 28px; font-weight: 900; }

/* Modal */
.modal-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 1000; align-items: center; justify-content: center; }
.modal-overlay.open { display: flex; }
.modal { background: #fff; border-radius: 10px; padding: 24px; width: 500px; max-width: 95vw; max-height: 90vh; overflow-y: auto; }
.modal h2 { font-size: 16px; margin-bottom: 16px; }
```

- [ ] **Step 2: index.html 기본 구조 작성**

`supplier-eval/templates/index.html`:
```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>공급업체 평가 관리 시스템</title>
<link rel="stylesheet" href="/static/style.css">
</head>
<body>

<nav class="navbar">
  <h1>🏭 공급업체 평가 관리</h1>
  <button class="nav-btn active" onclick="showView('dashboard')">대시보드</button>
  <button class="nav-btn" onclick="showView('suppliers')">업체관리</button>
  <button class="nav-btn" onclick="showView('performance')">실적입력</button>
  <button class="nav-btn" onclick="showView('history')">평가이력</button>
  <div class="nav-actions">
    <button class="btn btn-secondary btn-sm" onclick="exportCSV()">CSV</button>
    <button class="btn btn-secondary btn-sm" onclick="exportExcel()">Excel</button>
    <button class="btn btn-secondary btn-sm" onclick="exportBackup()">백업</button>
    <button class="btn btn-secondary btn-sm" onclick="document.getElementById('restoreInput').click()">복원</button>
    <input type="file" id="restoreInput" accept=".zip" style="display:none" onchange="importBackup(this)">
  </div>
</nav>

<!-- 대시보드 -->
<div id="view-dashboard" class="view active">
  <div class="card-row" id="dashboard-cards"></div>
  <div class="table-wrap">
    <div class="table-toolbar"><strong>재평가 예정 목록</strong></div>
    <table>
      <thead><tr><th>업체명</th><th>카테고리</th><th>최근 등급</th><th>차기 평가일</th><th>D-day</th><th>상태</th></tr></thead>
      <tbody id="dashboard-table"></tbody>
    </table>
  </div>
</div>

<!-- 업체관리 -->
<div id="view-suppliers" class="view">
  <div class="table-wrap">
    <div class="table-toolbar">
      <input type="text" id="supplier-search" placeholder="업체명 검색..." oninput="renderSupplierTable()">
      <button class="btn btn-primary btn-sm" onclick="openSupplierModal(null)">+ 업체 등록</button>
    </div>
    <table>
      <thead><tr><th>업체명</th><th>카테고리</th><th>담당자</th><th>연락처</th><th>Critical</th><th>등록일</th><th>관리</th></tr></thead>
      <tbody id="supplier-table"></tbody>
    </table>
  </div>
</div>

<!-- 실적입력 -->
<div id="view-performance" class="view">
  <div class="form-section">
    <h3>업체 선택</h3>
    <div class="form-row">
      <div class="form-group">
        <label>공급업체</label>
        <select id="perf-supplier-select" onchange="loadPerformance()">
          <option value="">-- 업체 선택 --</option>
        </select>
      </div>
    </div>
  </div>
  <div id="perf-form-area" style="display:none;">
    <!-- ISO -->
    <div class="form-section">
      <h3>ISO 9001:2015</h3>
      <div class="form-row">
        <div class="form-group">
          <label>보유 여부</label>
          <select id="perf-iso-held" onchange="updateScorePreview()">
            <option value="true">보유</option>
            <option value="false">미보유</option>
          </select>
        </div>
        <div class="form-group">
          <label>유효기간</label>
          <input type="date" id="perf-iso-expiry" oninput="updateScorePreview()">
        </div>
      </div>
    </div>
    <!-- 납기/부적합 -->
    <div class="form-section">
      <h3>전년도 공급자 성과</h3>
      <div class="form-row">
        <div class="form-group"><label>납기율 목표 (%)</label><input type="number" id="perf-del-target" value="100" min="0" max="100" oninput="updateScorePreview()"></div>
        <div class="form-group"><label>납기율 실적 (%)</label><input type="number" id="perf-del-actual" value="0" min="0" max="100" oninput="updateScorePreview()"></div>
        <div class="form-group"><label>부적합율 목표 (%)</label><input type="number" id="perf-def-target" value="0" min="0" oninput="updateScorePreview()"></div>
        <div class="form-group"><label>부적합율 실적 (%)</label><input type="number" id="perf-def-actual" value="0" min="0" oninput="updateScorePreview()"></div>
      </div>
    </div>
    <!-- Risk (Critical만) -->
    <div class="form-section" id="risk-section" style="display:none;">
      <h3>Risk 평가 (Critical Supplier)</h3>
      <div class="form-row">
        <div class="form-group" style="flex:2;"><label>납기 관리 수준</label><input type="text" id="risk-del-level" placeholder="예: 발주 시 발품 관리"></div>
        <div class="form-group"><label>발생도</label><input type="number" id="risk-del-occ" min="1" max="5" value="1"></div>
        <div class="form-group"><label>심각도</label><input type="number" id="risk-del-sev" min="1" max="5" value="1"></div>
        <div class="form-group"><label>취약성</label><input type="number" id="risk-del-vul" min="1" max="5" value="1"></div>
      </div>
      <div class="form-row">
        <div class="form-group" style="flex:2;"><label>품질 관리 수준</label><input type="text" id="risk-qua-level" placeholder="예: 입고 시 검사 관리"></div>
        <div class="form-group"><label>발생도</label><input type="number" id="risk-qua-occ" min="1" max="5" value="1"></div>
        <div class="form-group"><label>심각도</label><input type="number" id="risk-qua-sev" min="1" max="5" value="1"></div>
        <div class="form-group"><label>취약성</label><input type="number" id="risk-qua-vul" min="1" max="5" value="1"></div>
      </div>
      <div class="form-row">
        <div class="form-group" style="flex:3;"><label>Risk 평가 결과</label><input type="text" id="risk-result" value="해당사항 없음"></div>
      </div>
    </div>
    <!-- Critical 부가항목 -->
    <div class="form-section">
      <h3>부가 평가 항목</h3>
      <div class="form-row">
        <div class="form-group"><label>Self Assessment</label><input type="text" id="perf-self" value="해당사항 없음"></div>
        <div class="form-group"><label>Supply Chain 검증</label><input type="text" id="perf-chain" value="해당사항 없음"></div>
        <div class="form-group"><label>제품 평가</label><input type="text" id="perf-product" value="제품 검사서 참조"></div>
      </div>
    </div>
    <!-- 결재 -->
    <div class="form-section">
      <h3>결재</h3>
      <div class="form-row">
        <div class="form-group"><label>평가자</label><input type="text" id="perf-evaluator"></div>
        <div class="form-group"><label>검토자</label><input type="text" id="perf-reviewer"></div>
        <div class="form-group"><label>승인자</label><input type="text" id="perf-approver"></div>
      </div>
    </div>
    <!-- 점수 미리보기 -->
    <div class="form-section">
      <h3>점수 미리보기</h3>
      <div class="score-preview">
        <div class="score-row">
          <div class="score-item"><div class="s-label">ISO 9001</div><div class="s-val" id="prev-iso">-</div></div>
          <div class="score-item"><div class="s-label">납기율</div><div class="s-val" id="prev-del">-</div></div>
          <div class="score-item"><div class="s-label">부적합율</div><div class="s-val" id="prev-def">-</div></div>
          <div class="score-item"><div class="s-label">총점</div><div class="s-val s-total" id="prev-total">-</div></div>
          <div class="score-item"><div class="s-label">등급</div><div class="s-val s-grade" id="prev-grade">-</div></div>
          <div class="score-item"><div class="s-label">결과</div><div class="s-val" id="prev-result">-</div></div>
          <div class="score-item"><div class="s-label">차기평가일</div><div class="s-val" style="font-size:14px;" id="prev-next">-</div></div>
        </div>
      </div>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" onclick="savePerformance()">저장</button>
    </div>
  </div>
</div>

<!-- 평가이력 -->
<div id="view-history" class="view">
  <div class="table-wrap">
    <div class="table-toolbar">
      <select id="history-supplier-filter" onchange="renderHistoryTable()">
        <option value="">전체 업체</option>
      </select>
    </div>
    <table>
      <thead><tr><th>평가서No</th><th>업체명</th><th>평가일자</th><th>총점</th><th>등급</th><th>결과</th><th>차기평가일</th><th>생성</th><th>관리</th></tr></thead>
      <tbody id="history-table"></tbody>
    </table>
  </div>
</div>

<!-- 업체 등록/수정 모달 -->
<div class="modal-overlay" id="supplier-modal">
  <div class="modal">
    <h2 id="supplier-modal-title">업체 등록</h2>
    <input type="hidden" id="modal-supplier-id">
    <div class="form-row">
      <div class="form-group"><label>업체명 *</label><input type="text" id="modal-name"></div>
      <div class="form-group"><label>카테고리</label><input type="text" id="modal-category"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>사업자번호</label><input type="text" id="modal-bizno"></div>
      <div class="form-group"><label>담당자</label><input type="text" id="modal-contact"></div>
      <div class="form-group"><label>연락처</label><input type="text" id="modal-phone"></div>
    </div>
    <div class="form-row">
      <div class="form-group" style="flex:2;"><label>주소</label><input type="text" id="modal-address"></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>등록일</label><input type="date" id="modal-reg-date"></div>
      <div class="form-group" style="flex-direction:row;align-items:center;gap:8px;padding-top:20px;">
        <input type="checkbox" id="modal-critical">
        <label for="modal-critical">Critical Supplier</label>
      </div>
    </div>
    <div class="form-row">
      <div class="form-group" style="flex:1;"><label>비고</label><textarea id="modal-memo" rows="2"></textarea></div>
    </div>
    <div class="form-actions">
      <button class="btn btn-secondary" onclick="closeSupplierModal()">취소</button>
      <button class="btn btn-primary" onclick="saveSupplier()">저장</button>
    </div>
  </div>
</div>

<script src="/static/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: 커밋**

```bash
git add supplier-eval/templates/index.html supplier-eval/static/style.css
git commit -m "feat: index.html SPA 레이아웃 및 style.css 구현"
```

---

## Task 9: app.js — 전체 SPA 로직

**Files:**
- Create: `supplier-eval/static/app.js`

- [ ] **Step 1: app.js 작성**

`supplier-eval/static/app.js`:
```javascript
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
function showView(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("view-" + name).classList.add("active");
  event.target.classList.add("active");
  if (name === "dashboard") renderDashboard();
  if (name === "suppliers") renderSupplierTable();
  if (name === "history") renderHistoryTable();
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function renderDashboard() {
  const today = new Date();
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
  const q = document.getElementById("supplier-search").value.toLowerCase();
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
  ["perf-supplier-select", "history-supplier-filter"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const prefix = id === "history-supplier-filter" ? '<option value="">전체 업체</option>' : '<option value="">-- 업체 선택 --</option>';
    el.innerHTML = prefix + opts;
  });
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
  ["perf-del-target","perf-del-actual","perf-def-target","perf-def-actual"].forEach(id => {
    document.getElementById(id).value = id.includes("target") && id.includes("del") ? 100 : 0;
  });
  updateScorePreview();
}

async function updateScorePreview() {
  const body = getPerfBody();
  if (!body) return;
  const preview = await api("/api/score/preview", "POST", body);
  document.getElementById("prev-iso").textContent = preview.isoScore;
  document.getElementById("prev-del").textContent = preview.deliveryScore;
  document.getElementById("prev-def").textContent = preview.defectScore;
  document.getElementById("prev-total").textContent = preview.totalScore;
  document.getElementById("prev-grade").textContent = preview.grade;
  document.getElementById("prev-result").textContent = preview.result;
  document.getElementById("prev-next").textContent = preview.nextEvalDate;
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
  alert("저장되었습니다.");
  await loadAll();
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
```

- [ ] **Step 2: 커밋**

```bash
git add supplier-eval/static/app.js
git commit -m "feat: app.js SPA 전체 로직 구현 (대시보드/업체/실적/이력)"
```

---

## Task 10: 통합 실행 테스트

**Files:** 없음 (기존 파일 실행 테스트)

- [ ] **Step 1: 전체 단위 테스트 통과 확인**

```powershell
cd supplier-eval
pytest tests/ -v
```

Expected: 전체 PASSED

- [ ] **Step 2: Flask 서버 실행**

```powershell
python app.py
```

Expected: `Running on http://127.0.0.1:5000`

- [ ] **Step 3: 브라우저에서 확인**

http://localhost:5000 접속 후:
1. 업체관리 → 업체 등록 (정도강철, Critical 체크 해제)
2. 실적입력 → 업체 선택 → ISO 보유, 납기율 100%, 부적합율 0% 입력 → 점수 100점/A등급 확인
3. 저장 후 대시보드에서 업체 목록 확인
4. 평가이력 → 보고서 버튼 → 원본 양식과 동일한 레이아웃 확인
5. CSV/Excel 내보내기 확인

- [ ] **Step 4: 커밋**

```bash
git add -A
git commit -m "feat: 공급업체 평가 관리 시스템 완성"
```

---

## Task 11: Windows Task Scheduler 등록

**Files:** 없음 (시스템 설정)

- [ ] **Step 1: Gmail 앱 비밀번호 발급**

1. https://myaccount.google.com → 보안 → 2단계 인증 활성화
2. 앱 비밀번호 → 앱: 메일, 기기: Windows → 16자리 비밀번호 복사
3. `supplier-eval/config.json`의 `app_password`에 입력

- [ ] **Step 2: config.json 수신자 설정**

`supplier-eval/config.json`에서 `recipients` 배열에 알림 받을 이메일 주소 입력:
```json
"recipients": ["your_email@company.com"]
```

- [ ] **Step 3: scheduler.py 수동 테스트**

```powershell
cd supplier-eval
python scheduler.py
```

Expected: 오류 없이 완료. 평가일 도래 업체가 있으면 이메일 발송됨.

- [ ] **Step 4: Task Scheduler 등록**

PowerShell 관리자 권한으로 실행:
```powershell
$action = New-ScheduledTaskAction -Execute "python" -Argument "C:\path\to\supplier-eval\scheduler.py" -WorkingDirectory "C:\path\to\supplier-eval"
$trigger = New-ScheduledTaskTrigger -Daily -At "08:00AM"
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable
Register-ScheduledTask -TaskName "SupplierEvalScheduler" -Action $action -Trigger $trigger -Settings $settings -RunLevel Highest
```

`C:\path\to\supplier-eval`을 실제 경로로 변경.

- [ ] **Step 5: 최종 커밋**

```bash
git add supplier-eval/
git commit -m "docs: Task Scheduler 설정 완료 — 자동화 시스템 구축 완성"
```
