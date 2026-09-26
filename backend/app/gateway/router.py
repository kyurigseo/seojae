"""Real-time prescription reception gateway router with EMR API Key auth, SHA-256+Salt anonymization, scoring, and hash-chain audit logging."""
from __future__ import annotations

import hashlib
import os
from fastapi import APIRouter, Depends, Header, Request, status

from app.api.deps import verify_api_key
from app.audit.logger import audit_store
from app.gateway.schemas import GatewayPrescriptionRequest, GatewayPrescriptionResponse
from app import demo_data, store
from app.demo_data import Patient, Prescription, PrescriptionItem, INSTITUTIONS, MEDICINES
from app.scoring.engine import score_prescription

router = APIRouter(prefix="/api/gateway", tags=["EMR Prescription Gateway"])

# Salt for secure one-way anonymization of sensitive personal data (e.g. resident registration number)
ANONYMIZATION_SALT = os.getenv("MEDISYNC_ANON_SALT", "medisync_salt_secret_key_2026")


def anonymize_resident_id(resident_reg_no: Optional[str], patient_id: str) -> str:
    """Applies SHA-256 + Salt one-way hashing to sensitive patient identifiers (resident registration number)."""
    raw_target = resident_reg_no if resident_reg_no else f"patient_fallback_{patient_id}"
    salted_data = f"{raw_target}:{ANONYMIZATION_SALT}"
    return hashlib.sha256(salted_data.encode("utf-8")).hexdigest()


@router.post(
    "/prescriptions",
    response_model=GatewayPrescriptionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="실시간 처방전 수신 게이트웨이 (비식별화 + 스코어링 + 감사로그)",
)
def receive_prescription_gateway(
    payload: GatewayPrescriptionRequest,
    x_api_key: str = Depends(verify_api_key),
    request: Request = None,
):
    """Receives prescription data from EMR/pharmacy, anonymizes sensitive personal info via SHA-256 + Salt,
    evaluates risk scoring through Backend 1 scoring engine, and logs the transaction in the hash-chain audit store.
    """
    client_ip = request.client.host if request and request.client else "127.0.0.1"

    # 1. Apply SHA-256 + Salt anonymization to sensitive personal info
    anonymized_hash = anonymize_resident_id(payload.resident_reg_no, payload.patient_id)

    # 2. Construct Patient and Prescription domain models for scoring engine
    patient_obj = Patient(
        id=payload.patient_id,
        name=payload.patient_name,
        birth_date=payload.birth_date,
        gender=payload.gender,
    )
    demo_data.PATIENTS[payload.patient_id] = patient_obj

    rx_items = [
        PrescriptionItem(
            medicine_id=item.medicine_id,
            dose_mg=item.dose_mg,
            days_supply=item.days_supply,
            quantity=item.quantity,
        )
        for item in payload.items
    ]

    rx_obj = Prescription(
        id=payload.prescription_id,
        patient_id=payload.patient_id,
        institution_id=payload.institution_id,
        issued_at=payload.issued_at,
        items=rx_items,
    )
    demo_data.PRESCRIPTIONS[payload.prescription_id] = rx_obj

    # If institution not in DEMO INSTITUTIONS, add default mock institution
    if payload.institution_id not in INSTITUTIONS:
        from app.demo_data import Institution
        INSTITUTIONS[payload.institution_id] = Institution(
            id=payload.institution_id,
            name="연동병원 (Gateway)",
            region="서울",
        )

    # 3. Invoke scoring engine
    history = demo_data.patient_history(payload.patient_id)
    score_result = score_prescription(patient_obj, history, rx_obj, MEDICINES)
    store.save_score(score_result)

    # 4. Record transaction in hash-chain audit log (5 essential legal items)
    actor_identifier = f"EMR_GATEWAY_KEY:{x_api_key[:6]}..."
    audit_entry = audit_store.record(
        actor=actor_identifier,
        ip_address=client_ip,
        action="EMR_PRESCRIPTION_RECEIVE",
        subject_id=payload.patient_id,
        details={
            "prescription_id": payload.prescription_id,
            "institution_id": payload.institution_id,
            "anonymized_patient_hash": anonymized_hash,
            "risk_score": score_result.total_score,
            "risk_grade": score_result.grade,
        },
    )

    return GatewayPrescriptionResponse(
        status="success",
        prescription_id=payload.prescription_id,
        anonymized_patient_hash=anonymized_hash,
        risk_score=score_result.total_score,
        risk_grade=score_result.grade,
        explanation=score_result.explanation,
        audit_index=audit_entry.index,
    )
