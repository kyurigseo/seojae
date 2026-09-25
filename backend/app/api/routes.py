from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app import demo_data, store
from app.demo_data import INSTITUTIONS, MEDICINES, PATIENTS, PRESCRIPTIONS
from app.integrations.mfds_client import MfdsClientError, search_drug_info
from app.scoring.engine import GRADE_LABELS, score_prescription

router = APIRouter(prefix="/api")

ALLOWED_ACTIONS = {"proceeded", "held", "justified", "reported"}
ACTION_LABELS = {
    "proceeded": "확인완료",
    "held": "보류",
    "justified": "사유기재",
    "reported": "신고",
}


@router.get("/patients")
def list_patients():
    return list(PATIENTS.values())


@router.get("/prescriptions")
def list_prescriptions():
    return [
        {
            "id": rx.id,
            "patient_id": rx.patient_id,
            "patient_name": PATIENTS[rx.patient_id].name,
            "institution": INSTITUTIONS[rx.institution_id].name,
            "issued_at": rx.issued_at,
            "medicines": [MEDICINES[i.medicine_id].name for i in rx.items],
            "items": [
                {
                    "medicine": MEDICINES[i.medicine_id].name,
                    "dose_mg": i.dose_mg,
                    "days_supply": i.days_supply,
                    "quantity": i.quantity,
                }
                for i in rx.items
            ],
        }
        for rx in sorted(PRESCRIPTIONS.values(), key=lambda r: r.issued_at)
    ]


@router.post("/prescriptions/{prescription_id}/score")
def score(prescription_id: str):
    target = PRESCRIPTIONS.get(prescription_id)
    if target is None:
        raise HTTPException(status_code=404, detail="prescription not found")

    patient = PATIENTS[target.patient_id]
    history = demo_data.patient_history(target.patient_id)

    result = score_prescription(patient, history, target, MEDICINES)
    store.save_score(result)
    return result


@router.get("/patients/{patient_id}/timeline")
def timeline(patient_id: str):
    if patient_id not in PATIENTS:
        raise HTTPException(status_code=404, detail="patient not found")

    history = demo_data.patient_history(patient_id)
    return [
        {
            "prescription_id": rx.id,
            "issued_at": rx.issued_at,
            "institution": INSTITUTIONS[rx.institution_id].name,
            "items": [
                {
                    "medicine": MEDICINES[i.medicine_id].name,
                    "dose_mg": i.dose_mg,
                    "days_supply": i.days_supply,
                }
                for i in rx.items
            ],
            "score": store.get_score(rx.id),
            "alert_action": store.get_action(rx.id),
        }
        for rx in history
    ]


@router.get("/dashboard/summary")
def dashboard_summary():
    scores = store.all_scores()
    by_grade = {"safe": 0, "caution": 0, "high_risk": 0}
    pending_high_risk = []
    for result in scores:
        by_grade[result.grade.value] += 1
        if result.grade.value == "high_risk" and store.get_action(result.prescription_id) is None:
            pending_high_risk.append(result)

    return {
        "scored_count": len(scores),
        "by_grade": by_grade,
        "pending_high_risk_alerts": pending_high_risk,
    }


class AlertActionRequest(BaseModel):
    action: str  # "proceeded" | "held" | "justified" | "reported"
    note: str | None = None


@router.post("/alerts/{prescription_id}/action")
def alert_action(prescription_id: str, body: AlertActionRequest):
    if prescription_id not in PRESCRIPTIONS:
        raise HTTPException(status_code=404, detail="prescription not found")
    if body.action not in ALLOWED_ACTIONS:
        raise HTTPException(
            status_code=400, detail=f"action must be one of {sorted(ALLOWED_ACTIONS)}"
        )

    store.record_action(prescription_id, body.action, body.note)
    return {"prescription_id": prescription_id, "action": body.action, "note": body.note}


@router.get("/audit-log")
def audit_log():
    entries = []
    for prescription_id, detail in store.all_actions().items():
        result = store.get_score(prescription_id)
        if result is None:
            continue
        rx = PRESCRIPTIONS.get(prescription_id)
        patient = PATIENTS.get(result.patient_id)
        entries.append(
            {
                "prescription_id": prescription_id,
                "date": detail["at"],
                "patient_name": patient.name if patient else result.patient_id,
                "age": (rx.issued_at.year - patient.birth_year) if patient and rx else None,
                "score": result.score,
                "grade": result.grade,
                "grade_label": GRADE_LABELS[result.grade],
                "action": detail["action"],
                "action_label": ACTION_LABELS.get(detail["action"], detail["action"]),
                "note": detail["note"],
            }
        )
    entries.sort(key=lambda e: e["date"], reverse=True)
    return entries


@router.get("/mfds/drug-info")
async def mfds_drug_info(item_name: str):
    """Live lookup against 식약처 의약품개요정보(e약은요). Needs MFDS_API_KEY in
    backend/.env — see backend/.env.example. Try item_name=타이레놀정500mg in
    /docs to test your key without it ever leaving your machine."""
    try:
        return await search_drug_info(item_name)
    except MfdsClientError as e:
        raise HTTPException(status_code=503, detail=str(e))


@router.post("/patients/{patient_id}/consent")
def set_consent(patient_id: str, consent: bool = True):
    patient = PATIENTS.get(patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="patient not found")
    patient.consent_given = consent
    return {"patient_id": patient_id, "consent_given": consent}
