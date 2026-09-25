"""Validates the scoring engine against the proposal's own worked examples
(section 6-2, patients A-E). Exact point values in the report are
illustrative (weights are explicitly re-tunable), so these tests assert the
*grade bucket* the report claims for each patient rather than the exact
integer score.
"""
from __future__ import annotations

from app import demo_data
from app.demo_data import MEDICINES, PATIENTS, PRESCRIPTIONS, SCENARIO_LATEST_RX
from app.schemas import RiskGrade
from app.scoring.engine import score_prescription


def _score_for(patient_id: str):
    target = PRESCRIPTIONS[SCENARIO_LATEST_RX[patient_id]]
    patient = PATIENTS[patient_id]
    history = demo_data.patient_history(patient_id)
    return score_prescription(patient, history, target, MEDICINES)


def test_patient_a_normal_single_institution_is_safe():
    result = _score_for("patient_a")
    assert result.grade == RiskGrade.SAFE
    assert result.score < 60


def test_patient_b_single_early_refill_is_still_safe():
    result = _score_for("patient_b")
    assert result.grade == RiskGrade.SAFE
    assert result.score < 60


def test_patient_c_multi_institution_dose_spike_is_high_risk():
    result = _score_for("patient_c")
    assert result.grade == RiskGrade.HIGH_RISK
    assert result.score >= 80
    signal_names = {s.signal for s in result.signals}
    assert "multi_institution_shopping" in signal_names


def test_patient_d_same_pattern_with_cancer_context_is_downgraded():
    high_risk_pattern = _score_for("patient_c")
    downgraded = _score_for("patient_d")

    assert downgraded.score < high_risk_pattern.score
    assert downgraded.grade != RiskGrade.HIGH_RISK
    assert "정당" in downgraded.explanation or downgraded.context_adjustment < 1.0


def test_patient_e_drug_switching_triggers_at_least_caution():
    result = _score_for("patient_e")
    assert result.grade in (RiskGrade.CAUTION, RiskGrade.HIGH_RISK)
    signal_names = {s.signal for s in result.signals}
    assert "drug_switching" in signal_names


def test_explanation_is_non_empty_and_mentions_grade():
    result = _score_for("patient_c")
    assert len(result.explanation) > 0
    assert "고위험" in result.explanation
