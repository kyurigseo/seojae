"""Hash-chain based anti-tamper audit log system meeting medical legal compliance (5 essential items)."""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, List, Optional
from pydantic import BaseModel, Field


class AuditLogEntry(BaseModel):
    index: int
    timestamp: str
    actor: str  # 접속자 (ID, 면허번호, 요양기관기호)
    ip_address: str  # 접속 IP 주소
    action: str  # 수행 업무 (예: PRESCRIPTION_RECEIVE, RISK_SCORE_CALC, ALERT_ACTION_HOLD)
    subject_hash: str  # 정보주체 식별 해시 (환자 ID/주민번호 단방향 해시)
    details: dict[str, Any] = Field(default_factory=dict)  # 상세 메타데이터
    prev_hash: str  # 이전 로그의 SHA-256 해시
    current_hash: str  # 현재 로그의 SHA-256 해시 (prev_hash + fields)


class AuditLogStore:
    """In-memory append-only log store maintaining a cryptographic hash chain.
    In production, this can be backed by an immutable database table or WORM storage.
    """
    def __init__(self) -> None:
        self._logs: List[AuditLogEntry] = []
        # Initialize Genesis Log
        self._append_genesis()

    def _append_genesis(self) -> None:
        if self._logs:
            return
        genesis_time = datetime.now(timezone.utc).isoformat()
        genesis_actor = "SYSTEM_GENESIS"
        genesis_ip = "127.0.0.1"
        genesis_action = "INITIALIZE_AUDIT_CHAIN"
        genesis_subject = hashlib.sha256(b"genesis_subject").hexdigest()
        genesis_details = {"message": "Medisync Hash-Chain Audit Genesis"}
        prev_hash = "0" * 64

        raw_content = f"0|{genesis_time}|{genesis_actor}|{genesis_ip}|{genesis_action}|{genesis_subject}|{json.dumps(genesis_details, sort_keys=True)}|{prev_hash}"
        current_hash = hashlib.sha256(raw_content.encode("utf-8")).hexdigest()

        entry = AuditLogEntry(
            index=0,
            timestamp=genesis_time,
            actor=genesis_actor,
            ip_address=genesis_ip,
            action=genesis_action,
            subject_hash=genesis_subject,
            details=genesis_details,
            prev_hash=prev_hash,
            current_hash=current_hash,
        )
        self._logs.append(entry)

    def record(
        self,
        actor: str,
        ip_address: str,
        action: str,
        subject_id: str,
        details: Optional[dict[str, Any]] = None,
    ) -> AuditLogEntry:
        """Records a new audit log entry, securely linking it to the previous hash."""
        if details is None:
            details = {}

        last_entry = self._logs[-1]
        prev_hash = last_entry.current_hash
        index = last_entry.index + 1
        timestamp = datetime.now(timezone.utc).isoformat()
        
        # Hash the subject ID for privacy compliance
        subject_hash = hashlib.sha256(subject_id.encode("utf-8")).hexdigest()

        # Construct canonical string representation for hashing
        details_str = json.dumps(details, sort_keys=True)
        raw_content = f"{index}|{timestamp}|{actor}|{ip_address}|{action}|{subject_hash}|{details_str}|{prev_hash}"
        current_hash = hashlib.sha256(raw_content.encode("utf-8")).hexdigest()

        entry = AuditLogEntry(
            index=index,
            timestamp=timestamp,
            actor=actor,
            ip_address=ip_address,
            action=action,
            subject_hash=subject_hash,
            details=details,
            prev_hash=prev_hash,
            current_hash=current_hash,
        )
        self._logs.append(entry)
        return entry

    def get_all_logs(self) -> List[AuditLogEntry]:
        return list(self._logs)

    def verify_integrity(self) -> dict[str, Any]:
        """Sequentially validates the hash chain from genesis to the latest log.
        Detects any tampering with previous logs, modified payload, or broken chain links.
        """
        if not self._logs:
            return {"is_valid": True, "checked_count": 0, "tampered_at_index": None, "message": "Log store is empty."}

        for i, entry in enumerate(self._logs):
            # 1. Verify genesis block
            if i == 0:
                if entry.prev_hash != "0" * 64:
                    return {
                        "is_valid": False,
                        "checked_count": i + 1,
                        "tampered_at_index": 0,
                        "message": "Genesis block prev_hash is invalid.",
                    }
            else:
                # 2. Verify chain linkage
                prev_entry = self._logs[i - 1]
                if entry.prev_hash != prev_entry.current_hash:
                    return {
                        "is_valid": False,
                        "checked_count": i + 1,
                        "tampered_at_index": i,
                        "message": f"Hash chain broken at index {i}: prev_hash does not match previous entry's current_hash.",
                    }

            # 3. Recalculate hash and verify current_hash integrity
            details_str = json.dumps(entry.details, sort_keys=True)
            raw_content = f"{entry.index}|{entry.timestamp}|{entry.actor}|{entry.ip_address}|{entry.action}|{entry.subject_hash}|{details_str}|{entry.prev_hash}"
            recalculated_hash = hashlib.sha256(raw_content.encode("utf-8")).hexdigest()

            if recalculated_hash != entry.current_hash:
                return {
                    "is_valid": False,
                    "checked_count": i + 1,
                    "tampered_at_index": i,
                    "message": f"Log content tampered at index {i}: recalculated hash does not match stored current_hash.",
                }

        return {
            "is_valid": True,
            "checked_count": len(self._logs),
            "tampered_at_index": None,
            "message": "Audit log hash chain integrity verified successfully. No tampering detected.",
        }


# Global singleton instance for the MVP runtime
audit_store = AuditLogStore()
