"""Template-based natural-language explanation generation (section 5-3).

The proposal explicitly asks for plain, non-clinical wording ("너무 딱딱한
말투나 어려운 전문 용어는 최소화") so a pharmacist can act on it without a
data-science background, and for the resulting text to double as the legal
basis a pharmacist can cite when refusing/holding a dispense (section 5,
row A).
"""
from __future__ import annotations

from app.schemas import SignalHit

_NO_SIGNAL_TEXT = "최근 처방 이력에서 특이 위험 신호가 발견되지 않았어요."


def generate_explanation(
    signals: list[SignalHit], context_adjusted: bool, grade_label: str
) -> str:
    if not signals:
        return _NO_SIGNAL_TEXT

    sentences = [f"{hit.label}: {hit.detail}." for hit in sorted(
        signals, key=lambda h: h.raw_points, reverse=True
    )]
    body = " ".join(sentences)

    if context_adjusted:
        body += (
            " 다만 등록된 진료 맥락(암성 통증 등 정당 사유)이 확인되어 위험도가 하향 "
            "보정되었어요."
        )

    body += f" 종합 판정: {grade_label}."
    return body
