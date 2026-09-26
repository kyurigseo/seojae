"""Deep analytics endpoints and demo EMR prescription simulator for presentations and judge evaluations."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal, Optional
from fastapi import APIRouter, Depends, Request, status
from pydantic import BaseModel, Field

from app.api.deps import verify_api_key, require_role
from app.audit.logger import audit_store
from app.notifications.queue import notification_manager
from app.services.analytics_service import get_deep_analytics
from app import demo_data, store
from app.demo_data import Patient, Prescription, PrescriptionItem, INSTITUTIONS, MEDICINES
from app.scoring.engine import score_prescription
from app.schemas.auth import TokenPayload

router = APIRouter(prefix="/api", tags=["Analytics & EMR Simulator"])


@router.get("/dashboard/deep-analytics", summary="대시보드 심층 통계 및 시각화 지표 조회")
def get_dashboard_analytics(
    current_user: TokenPayload = Depends(require_role(["ADMIN", "DOCTOR", "PHARMACIST"]))
):
    """Returns deep statistical metrics including risk grade distribution, signal frequency breakdown,
    and top risky drugs for dashboard chart visualization.
    """
    return get_deep_analytics()


class SimulatorRequest(BaseModel):
    scenario: Literal["normal", "doctor_shopping", "over_dose", "early_refill"] = Field(
        "doctor_shopping", description="시연 시나리오 선택 (normal / doctor_shopping / over_dose / early_refill)"
    )
    patient_id: Optional[str] = Field(None, description="지정할 환자 ID (미지정시 자동 생성)")


@router.post("/gateway/simulate", summary="시연용 EMR 가상 처방전 자동 발송 시뮬레이터")
async def simulate_emr_prescription(
    payload: SimulatorRequest,
    x_api_key: str = Depends(verify_api_key),
    request: Request = None,
):
    """Generates and dispatches a simulated prescription from an external EMR system based on the selected scenario.
    Runs the scoring engine, records an immutable audit log entry, and broadcasts real-time SSE alerts if high-risk.
    """
    client_ip = request.client.host if request and request.client else "127.0.0.1"
    timestamp_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    # Select target patient & mock scenario items
    if payload.scenario == "normal":
        p_id = payload.patient_id or "PAT_SIM_NORMAL"
        patient = Patient(id=p_id, name="안정환 (시뮬레이션)", birth_year=1992, consent_given=True)
        items = [PrescriptionItem(medicine_id="MED001", dose_mg=5.0, days_supply=7, quantity=7)]
    elif payload.scenario == "doctor_shopping":
        p_id = payload.patient_id or "PAT_SIM_SHOPPING"
        patient = Patient(id=p_id, name="주의환 (의사쇼핑)", birth_year=1985, consent_given=True)
        items = [
            PrescriptionItem(medicine_id="MED003", dose_mg=20.0, days_supply=14, quantity=28),
            PrescriptionItem(medicine_id="MED004", dose_mg=10.0, days_supply=14, quantity=14),
        ]
    elif payload.scenario == "over_dose":
        p_id = payload.patient_id or "PAT_SIM_OVER"
        patient = Patient(id=p_id, name="위험환 (과다처방)", birth_year=1978, consent_given=True)
        items = [
            PrescriptionItem(medicine_id="MED002", dose_mg=50.0, days_supply=30, quantity=90),
            PrescriptionItem(medicine_id="MED005", dose_mg=30.0, days_supply=30, quantity=60),
        ]
    else:  # early_refill
        p_id = payload.patient_id or "PAT_SIM_REFILL"
        patient = Patient(id=p_id, name="조기환 (조기재처방)", birth_year=1995, consent_given=True)
        items = [
            PrescriptionItem(medicine_id="MED001", dose_mg=10.0, days_supply=3, quantity=3),
        ]

    rx_id = f"RX_SIM_{datetime.now(timezone.utc).strftime('%H%M%S_%f')[:8]}"
    institution_id = "INST_SIM_01"

    demo_data.PATIENTS[p_id] = patient
    if institution_id not in INSTITUTIONS:
        from app.demo_data import Institution, InstitutionType
        INSTITUTIONS[institution_id] = Institution(
            id=institution_id,
            name="시연용 스마트병원",
            type=InstitutionType.HOSPITAL,
            is_specialty_pain_clinic=False,
        )

    rx = Prescription(
        id=rx_id,
        patient_id=p_id,
        institution_id=institution_id,
        doctor_id="doc_simulator",
        issued_at=datetime.now(timezone.utc),
        items=items,
    )
    demo_data.PRESCRIPTIONS[rx_id] = rx

    # Execute scoring
    history = demo_data.patient_history(p_id)
    score_result = score_prescription(patient, history, rx, MEDICINES)
    store.save_score(score_result)

    # Record audit log
    actor_identifier = f"EMR_SIMULATOR_KEY:{x_api_key[:6]}..."
    audit_entry = audit_store.record(
        actor=actor_identifier,
        ip_address=client_ip,
        action="SIMULATE_EMR_PRESCRIPTION",
        subject_id=p_id,
        details={
            "scenario": payload.scenario,
            "prescription_id": rx_id,
            "risk_score": score_result.score,
            "risk_grade": score_result.grade,
        },
    )

    # Broadcast SSE alert if high-risk or caution
    if score_result.score >= 50:
        alert_payload = {
            "prescription_id": rx_id,
            "patient_name": patient.name,
            "anonymized_patient_hash": f"simulated_hash_{p_id}",
            "institution_id": institution_id,
            "total_score": score_result.score,
            "grade": score_result.grade,
            "explanation": score_result.explanation,
            "issued_at": timestamp_str,
        }
        await notification_manager.broadcast(alert_payload)

    return {
        "status": "success",
        "scenario": payload.scenario,
        "prescription_id": rx_id,
        "patient_name": patient.name,
        "risk_score": score_result.score,
        "risk_grade": score_result.grade,
        "explanation": score_result.explanation,
        "audit_index": audit_entry.index,
    }
