"""Runtime state for the MVP: computed scores and pharmacist actions on
alerts (section 6-1 step 5: "확인" 1-click / 소명 / 신고).

Separate from ``demo_data`` because this holds state that changes while the
service runs, not the seeded demo scenario data.
"""
from __future__ import annotations

from app.schemas import RiskScoreResult

_score_cache: dict[str, RiskScoreResult] = {}
_alert_actions: dict[str, str] = {}


def save_score(result: RiskScoreResult) -> None:
    _score_cache[result.prescription_id] = result


def get_score(prescription_id: str) -> RiskScoreResult | None:
    return _score_cache.get(prescription_id)


def all_scores() -> list[RiskScoreResult]:
    return list(_score_cache.values())


def record_action(prescription_id: str, action: str) -> None:
    _alert_actions[prescription_id] = action


def get_action(prescription_id: str) -> str | None:
    return _alert_actions.get(prescription_id)
