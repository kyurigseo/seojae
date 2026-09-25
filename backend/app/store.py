"""Runtime state for the MVP: computed scores and pharmacist actions on
alerts (section 6-1 step 5: "조제 진행" / "보류" / "사유기재" / "신고").

Separate from ``demo_data`` because this holds state that changes while the
service runs, not the seeded demo scenario data.
"""
from __future__ import annotations

from datetime import datetime, timezone

from app.schemas import RiskScoreResult

_score_cache: dict[str, RiskScoreResult] = {}
_alert_actions: dict[str, dict] = {}  # prescription_id -> {action, note, at}


def save_score(result: RiskScoreResult) -> None:
    _score_cache[result.prescription_id] = result


def get_score(prescription_id: str) -> RiskScoreResult | None:
    return _score_cache.get(prescription_id)


def all_scores() -> list[RiskScoreResult]:
    return list(_score_cache.values())


def record_action(prescription_id: str, action: str, note: str | None = None) -> None:
    _alert_actions[prescription_id] = {
        "action": action,
        "note": note,
        "at": datetime.now(timezone.utc),
    }


def get_action(prescription_id: str) -> str | None:
    entry = _alert_actions.get(prescription_id)
    return entry["action"] if entry else None


def get_action_detail(prescription_id: str) -> dict | None:
    return _alert_actions.get(prescription_id)


def all_actions() -> dict[str, dict]:
    return dict(_alert_actions)
