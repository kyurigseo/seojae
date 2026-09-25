"""Regression guard for the calibration report (see app/scoring/calibration.py).

If a future change to signals.py/engine.py breaks the current 60/80 cutline's
separation on the synthetic labeled dataset, this should fail — re-run
`python -m app.scoring.calibration` to see exactly which category moved.
"""
from __future__ import annotations

from app.demo_data import MEDICINES
from app.scoring.calibration_data import build_labeled_dataset
from app.scoring.engine import score_prescription


def test_labeled_dataset_has_zero_misclassification_at_current_thresholds():
    cases = build_labeled_dataset()
    mismatches = []
    for case in cases:
        result = score_prescription(case.patient, case.history, case.target, MEDICINES)
        if result.grade.value != case.label:
            mismatches.append((case.category, case.label, result.grade.value, result.score))

    assert not mismatches, f"Misclassified cases (category, expected, got, score): {mismatches}"
