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
