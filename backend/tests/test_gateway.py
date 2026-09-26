"""Unit and integration tests for Issue 3: Real-time prescription gateway, anonymization, and scoring engine integration."""
from __future__ import annotations

from fastapi.testclient import TestClient
from app.main import app
from app.config import EMR_API_KEYS
from app.audit.logger import audit_store

client = TestClient(app)


def test_gateway_prescription_reception_success():
    valid_key = EMR_API_KEYS[0] if EMR_API_KEYS else "medisync-demo-emr-key-2026"

    payload = {
        "prescription_id": "RX_TEST_001",
        "patient_id": "PAT_TEST_999",
        "resident_reg_no": "900101-1234567",
        "patient_name": "홍길동",
        "birth_date": "19900101",
        "gender": "M",
        "institution_id": "INST_TEST_01",
        "issued_at": "2026-09-26 14:00:00",
        "items": [
            {
                "medicine_id": "MED001",  # Assuming MED001 exists or valid code
                "dose_mg": 10.0,
                "days_supply": 30,
                "quantity": 30,
                "instructions": "1일 1회 복용",
            }
        ],
    }

    response = client.post(
        "/api/gateway/prescriptions",
        json=payload,
        headers={"X-API-KEY": valid_key},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "success"
    assert data["prescription_id"] == "RX_TEST_001"
    assert "anonymized_patient_hash" in data
    assert len(data["anonymized_patient_hash"]) == 64  # SHA-256 hex length
    assert "risk_score" in data
    assert "risk_grade" in data
    assert data["audit_index"] > 0

    # Verify that an audit log entry was automatically recorded for this gateway call
    logs = audit_store.get_all_logs()
    last_log = logs[-1]
    assert last_log.action == "EMR_PRESCRIPTION_RECEIVE"
    assert last_log.details["prescription_id"] == "RX_TEST_001"


def test_gateway_unauthorized_missing_api_key():
    payload = {
        "prescription_id": "RX_TEST_002",
        "patient_id": "PAT_TEST_998",
        "patient_name": "김철수",
        "birth_date": "19850505",
        "gender": "M",
        "institution_id": "INST_TEST_01",
        "issued_at": "2026-09-26 14:30:00",
        "items": [],
    }

    # Request without X-API-KEY header
    response = client.post("/api/gateway/prescriptions", json=payload)
    assert response.status_code == 401
    assert "API Key" in response.json()["detail"]
