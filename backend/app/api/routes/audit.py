"""Audit log management and cryptographic integrity verification endpoints."""
from __future__ import annotations

from typing import List, Any
from fastapi import APIRouter, Depends, Request

from app.audit.logger import audit_store, AuditLogEntry
from app.api.deps import get_current_user, require_role
from app.schemas.auth import TokenPayload

router = APIRouter(prefix="/api/audit", tags=["Audit Log & Hash Chain"])


@router.get("/logs", response_model=List[AuditLogEntry], summary="감사로그 전체 조회 (해시체인 포함)")
def get_audit_logs(
    current_user: TokenPayload = Depends(require_role(["ADMIN", "DOCTOR", "PHARMACIST"]))
):
    """Retrieves all hash-chained audit log entries meeting the 5 essential legal requirements."""
    return audit_store.get_all_logs()


@router.get("/verify", summary="감사로그 해시체인 무결성 검증 (위변조 탐지)")
def verify_audit_integrity(
    current_user: TokenPayload = Depends(require_role(["ADMIN", "DOCTOR"]))
):
    """Sequentially verifies the cryptographic hash chain of all audit logs.
    Detects any retroactive tampering with log entries or broken hash links.
    """
    return audit_store.verify_integrity()
