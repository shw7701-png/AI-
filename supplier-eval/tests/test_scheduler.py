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

def test_generate_doc_no_no_first_of_year():
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
