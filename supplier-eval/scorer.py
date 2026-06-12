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
