"""Unit tests for Issue 6: Dashboard deep analytics and EMR prescription simulator."""
from __future__ import annotations

from fastapi.testclient import TestClient
from app.main import app
from app.config import EMR_API_KEYS

client = TestClient(app)


def test_deep_analytics_endpoint():
    # Login as admin or doctor to get JWT token
    login_res = client.post("/api/auth/login", json={"username": "doc_kim", "password": "password123"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    response = client.get("/api/dashboard/deep-analytics", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert "signal_breakdown" in data
    assert "top_risky_drugs" in data
    assert "total_evaluated_prescriptions" in data["summary"]


def test_emr_simulator_endpoint():
    valid_key = EMR_API_KEYS[0] if EMR_API_KEYS else "medisync-demo-emr-key-2026"

    # Test running doctor_shopping simulation scenario
    response = client.post(
        "/api/gateway/simulate",
        json={"scenario": "doctor_shopping"},
        headers={"X-API-KEY": valid_key},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["scenario"] == "doctor_shopping"
    assert "prescription_id" in data
    assert "risk_score" in data
    assert "risk_grade" in data
    assert data["audit_index"] > 0
