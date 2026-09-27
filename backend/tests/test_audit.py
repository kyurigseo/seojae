"""Unit tests for Issue 2: Hash-chain anti-tamper audit log system and integrity verification."""
from __future__ import annotations

from fastapi.testclient import TestClient
from app.main import app
from app.audit.logger import AuditLogStore
from app.api.deps import get_current_user
from app.schemas.auth import TokenPayload

client = TestClient(app)


def test_audit_hash_chain_creation():
    store = AuditLogStore()
    logs_before = store.get_all_logs()
    assert len(logs_before) == 1  # Genesis block

    # Record new entries
    entry1 = store.record(actor="doc_kim", ip_address="192.168.1.10", action="VIEW_PATIENT", subject_id="P001")
    entry2 = store.record(actor="phar_lee", ip_address="192.168.1.20", action="DISPENSE_HOLD", subject_id="P002")

    assert entry1.index == 1
    assert entry1.prev_hash == logs_before[0].current_hash
    assert entry2.index == 2
    assert entry2.prev_hash == entry1.current_hash

    # Verify integrity of untampered store
    verification = store.verify_integrity()
    assert verification["is_valid"] is True
    assert verification["checked_count"] == 3
    assert verification["tampered_at_index"] is None


def test_audit_tampering_detection():
    store = AuditLogStore()
    store.record(actor="doc_kim", ip_address="192.168.1.10", action="VIEW_PATIENT", subject_id="P001")
    store.record(actor="phar_lee", ip_address="192.168.1.20", action="DISPENSE_HOLD", subject_id="P002")

    logs = store.get_all_logs()
    assert len(logs) == 3

    # Tamper with log entry at index 1 (change action without updating hash)
    logs[1].action = "MALICIOUS_UNAUTHORIZED_ACCESS"

    # Verify integrity -> should detect tampering at index 1
    verification = store.verify_integrity()
    assert verification["is_valid"] is False
    assert verification["tampered_at_index"] == 1
    assert "tampered" in verification["message"] or "hash" in verification["message"]


def test_audit_chain_link_breaking_detection():
    store = AuditLogStore()
    store.record(actor="doc_kim", ip_address="192.168.1.10", action="VIEW_PATIENT", subject_id="P001")
    store.record(actor="phar_lee", ip_address="192.168.1.20", action="DISPENSE_HOLD", subject_id="P002")

    logs = store.get_all_logs()
    
    # Break the chain link by modifying prev_hash of entry 2
    logs[2].prev_hash = "f" * 64

    verification = store.verify_integrity()
    assert verification["is_valid"] is False
    assert verification["tampered_at_index"] == 2
    assert "broken" in verification["message"] or "prev_hash" in verification["message"]


def test_audit_api_endpoints():
    # Login as admin
    login_res = client.post("/api/auth/login", json={"username": "admin_park", "password": "password123"})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Record some action via log store directly or test endpoint
    store_test = AuditLogStore()
    store_test.record(actor="doc_kim", ip_address="10.0.0.1", action="TEST_ACTION", subject_id="PATIENT_X")

    # Call GET /api/audit/logs
    res_logs = client.get("/api/audit/logs", headers=headers)
    assert res_logs.status_code == 200
    assert isinstance(res_logs.json(), list)

    # Call GET /api/audit/verify
    res_verify = client.get("/api/audit/verify", headers=headers)
    assert res_verify.status_code == 200
    assert res_verify.json()["is_valid"] is True
