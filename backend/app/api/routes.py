from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app import demo_data, store
from app.demo_data import INSTITUTIONS, MEDICINES, PATIENTS, PRESCRIPTIONS
from app.scoring.engine import score_prescription

router = APIRouter(prefix="/api")


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
    action: str  # "ack" | "justify" | "report"
    note: str | None = None


@router.post("/alerts/{prescription_id}/action")
def alert_action(prescription_id: str, body: AlertActionRequest):
    if prescription_id not in PRESCRIPTIONS:
        raise HTTPException(status_code=404, detail="prescription not found")
    if body.action not in {"ack", "justify", "report"}:
        raise HTTPException(status_code=400, detail="action must be ack, justify, or report")

    store.record_action(prescription_id, body.action)
    return {"prescription_id": prescription_id, "action": body.action, "note": body.note}


@router.post("/patients/{patient_id}/consent")
def set_consent(patient_id: str, consent: bool = True):
    patient = PATIENTS.get(patient_id)
    if patient is None:
        raise HTTPException(status_code=404, detail="patient not found")
    patient.consent_given = consent
    return {"patient_id": patient_id, "consent_given": consent}
