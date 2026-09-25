"""Combines rule-based signals + Isolation Forest + context correction into
the final 0-100 risk score (proposal sections 5-1, 5-2, 6-1 step 3-4).
"""
from __future__ import annotations

from datetime import datetime, timezone

from app.schemas import (
    ContextFlag,
    DrugClass,
    Medicine,
    Patient,
    Prescription,
    RiskGrade,
    RiskScoreResult,
)
from app.scoring.explain import generate_explanation
from app.scoring.isolation_model import get_scorer
from app.scoring.signals import run_all_signals

ISOLATION_MAX_BONUS = 10.0  # iso score can nudge the rule score by at most this many points

CAUTION_THRESHOLD = 60
HIGH_RISK_THRESHOLD = 80

# Which context flags justify which drug classes (section 5-2).
CONTEXT_JUSTIFIES: dict[ContextFlag, set[DrugClass]] = {
    # Cancer-pain patients are commonly co-prescribed sedative-hypnotics for
    # comorbid insomnia, not just opioids for the pain itself.
    ContextFlag.CANCER_PAIN: {DrugClass.OPIOID, DrugClass.SEDATIVE_HYPNOTIC},
    ContextFlag.PALLIATIVE_CARE: {DrugClass.OPIOID, DrugClass.SEDATIVE_HYPNOTIC},
    ContextFlag.POST_SURGERY: {DrugClass.OPIOID},
    ContextFlag.ADHD_DIAGNOSED: {DrugClass.STIMULANT},
}
CONTEXT_ADJUSTMENT_FACTOR = 0.47  # matches the proposal's worked example (100 -> 47)

GRADE_LABELS = {
    RiskGrade.SAFE: "안전",
    RiskGrade.CAUTION: "주의",
    RiskGrade.HIGH_RISK: "고위험",
}


def _context_applies(patient: Patient, target: Prescription, medicines: dict[str, Medicine]) -> bool:
    target_classes = {medicines[i.medicine_id].drug_class for i in target.items}
    for flag in patient.context_flags:
        if target_classes & CONTEXT_JUSTIFIES.get(flag, set()):
            return True
    return False


def score_prescription(
    patient: Patient,
    history: list[Prescription],
    target: Prescription,
    medicines: dict[str, Medicine],
) -> RiskScoreResult:
    signals = run_all_signals(history, target, medicines)
    rule_score = min(100.0, sum(s.raw_points for s in signals))

    iso_score = get_scorer().score(signals)

    # Rule-based signals are the primary, explainable driver of the score;
    # the Isolation Forest only nudges it (proposal 5-1 step 1: "결합").
    combined = min(100.0, rule_score + (iso_score / 100) * ISOLATION_MAX_BONUS)

    context_adjusted = _context_applies(patient, target, medicines)
    context_adjustment = 1.0
    if context_adjusted and combined > 0:
        context_adjustment = CONTEXT_ADJUSTMENT_FACTOR
        combined *= context_adjustment

    final_score = int(round(min(100.0, max(0.0, combined))))

    if final_score >= HIGH_RISK_THRESHOLD:
        grade = RiskGrade.HIGH_RISK
    elif final_score >= CAUTION_THRESHOLD:
        grade = RiskGrade.CAUTION
    else:
        grade = RiskGrade.SAFE

    explanation = generate_explanation(signals, context_adjusted, GRADE_LABELS[grade])

    return RiskScoreResult(
        patient_id=patient.id,
        prescription_id=target.id,
        score=final_score,
        grade=grade,
        rule_score=rule_score,
        isolation_forest_score=round(iso_score, 1),
        context_adjustment=context_adjustment,
        signals=signals,
        explanation=explanation,
        scored_at=datetime.now(timezone.utc),
    )
