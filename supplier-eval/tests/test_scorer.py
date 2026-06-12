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
