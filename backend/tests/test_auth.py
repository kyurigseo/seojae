"""Tests for Issue 1: Medical Staff Authentication, JWT Claims, RBAC, and EMR API Key Authorization."""
from __future__ import annotations

from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token, verify_password, get_password_hash
from app.config import EMR_API_KEYS

client = TestClient(app)


def test_login_success():
    response = client.post(
        "/api/auth/login",
        json={"username": "doc_kim", "password": "password123"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] > 0


def test_login_invalid_credentials():
    response = client.post(
        "/api/auth/login",
        json={"username": "doc_kim", "password": "wrongpassword"}
    )
    assert response.status_code == 401
    assert "아이디 또는 비밀번호" in response.json()["detail"]


def test_get_my_profile_with_jwt():
    # 1. Login to get token
    login_res = client.post(
        "/api/auth/login",
        json={"username": "doc_kim", "password": "password123"}
    )
    token = login_res.json()["access_token"]

    # 2. Get profile with Authorization Bearer header
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 200
    user_data = response.json()
    assert user_data["username"] == "doc_kim"
    assert user_data["role"] == "DOCTOR"
    assert user_data["hospital_code"] == "H1234567"
    assert user_data["license_no"] == "DOC99887"
    assert user_data["name"] == "김의사"


def test_rbac_doctor_access():
    # Login as doctor
    doc_login = client.post("/api/auth/login", json={"username": "doc_kim", "password": "password123"})
    doc_token = doc_login.json()["access_token"]

    # Doctor accessing doctor-only endpoint -> should succeed
    res1 = client.get("/api/auth/rbac-test/doctor-only", headers={"Authorization": f"Bearer {doc_token}"})
    assert res1.status_code == 200

    # Doctor accessing pharmacist-only endpoint -> should fail (403 Forbidden)
    res2 = client.get("/api/auth/rbac-test/pharmacist-only", headers={"Authorization": f"Bearer {doc_token}"})
    assert res2.status_code == 403


def test_rbac_pharmacist_access():
    # Login as pharmacist
    phar_login = client.post("/api/auth/login", json={"username": "phar_lee", "password": "password123"})
    phar_token = phar_login.json()["access_token"]

    # Pharmacist accessing pharmacist-only endpoint -> should succeed
    res1 = client.get("/api/auth/rbac-test/pharmacist-only", headers={"Authorization": f"Bearer {phar_token}"})
    assert res1.status_code == 200

    # Pharmacist accessing doctor-only endpoint -> should fail (403 Forbidden)
    res2 = client.get("/api/auth/rbac-test/doctor-only", headers={"Authorization": f"Bearer {phar_token}"})
    assert res2.status_code == 403


def test_emr_api_key_auth():
    valid_key = EMR_API_KEYS[0] if EMR_API_KEYS else "medisync-demo-emr-key-2026"

    # With valid X-API-KEY header
    res_valid = client.post(
        "/api/auth/emr-gateway/test",
        headers={"X-API-KEY": valid_key}
    )
    assert res_valid.status_code == 200
    assert res_valid.json()["status"] == "success"

    # With invalid X-API-KEY header
    res_invalid = client.post(
        "/api/auth/emr-gateway/test",
        headers={"X-API-KEY": "invalid-api-key-999"}
    )
    assert res_invalid.status_code == 401
    assert "API Key" in res_invalid.json()["detail"]

    # Without X-API-KEY header
    res_missing = client.post("/api/auth/emr-gateway/test")
    assert res_missing.status_code == 401
