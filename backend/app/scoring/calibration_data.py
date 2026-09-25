"""Synthetic labeled dataset for threshold/weight calibration.

There's no real false-positive-rate (FPR) data yet — that only exists once
the service is live and pharmacists are giving feedback (proposal 5-2: "약사가
소명·무시 버튼으로 피드백"). Until then, this module stands in with scenarios
built to have an unambiguous *intended* grade:

  - "safe"      — normal refill behavior, or a single minor incident
  - "caution"   — a moderate, single-signal pattern (e.g. one drug switch)
  - "high_risk" — a clear multi-signal abuse pattern
  - "safe" (again) — the SAME high-risk pattern, but with a legitimate
    clinical context attached (cancer pain etc.) — this is the specific
    case the 5-2 false-positive correction exists to handle, so it's the
    most important category to check.

This is a stand-in for real FPR data, not a replacement — see
calibration.py and the README's "가중치·컷라인 재보정" section.
"""
from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import timedelta

from app.demo_data import INSTITUTIONS, MEDICINES, NOW
from app.schemas import (
    ContextFlag,
    DrugClass,
    InstitutionType,
    Patient,
    Prescription,
    PrescriptionItem,
)

_PRESCRIBING_INSTITUTION_IDS = [
    i.id for i in INSTITUTIONS.values() if i.type in (InstitutionType.HOSPITAL, InstitutionType.CLINIC)
]
_SEDATIVE_IDS = [m.id for m in MEDICINES.values() if m.drug_class == DrugClass.SEDATIVE_HYPNOTIC]
_OPIOID_IDS = [m.id for m in MEDICINES.values() if m.drug_class == DrugClass.OPIOID]

_CONTEXT_FOR_CLASS = {
    DrugClass.OPIOID: ContextFlag.CANCER_PAIN,
    DrugClass.SEDATIVE_HYPNOTIC: ContextFlag.CANCER_PAIN,
}


@dataclass
class LabeledCase:
    label: str  # intended ground truth: "safe" | "caution" | "high_risk"
    category: str  # which generator produced it, for reporting
    patient: Patient
    history: list[Prescription]
    target: Prescription


def _item(medicine_id: str, dose_mg: float, days_supply: int = 28, quantity: int | None = None) -> PrescriptionItem:
    return PrescriptionItem(
        medicine_id=medicine_id, dose_mg=dose_mg, days_supply=days_supply, quantity=quantity or int(dose_mg)
    )


def _rx(rx_id: str, patient_id: str, institution_id: str, days_ago: int, items: list[PrescriptionItem]) -> Prescription:
    return Prescription(
        id=rx_id,
        patient_id=patient_id,
        institution_id=institution_id,
        doctor_id=f"doc_{institution_id}",
        issued_at=NOW - timedelta(days=days_ago),
        items=items,
    )


def _gen_normal(rng: random.Random, idx: int) -> LabeledCase:
    pid = f"calib_normal_{idx}"
    inst = rng.choice(_PRESCRIBING_INSTITUTION_IDS)
    med = rng.choice(_SEDATIVE_IDS + _OPIOID_IDS)
    dose = rng.choice([10, 20, 25])
    history = [
        _rx(f"{pid}_rx1", pid, inst, 56, [_item(med, dose)]),
        _rx(f"{pid}_rx2", pid, inst, 28, [_item(med, dose)]),
    ]
    target = _rx(f"{pid}_rx3", pid, inst, 0, [_item(med, dose)])
    history.append(target)
    return LabeledCase("safe", "normal", Patient(id=pid, name=pid, birth_year=1980), history, target)


def _gen_mild_single_incident(rng: random.Random, idx: int) -> LabeledCase:
    pid = f"calib_mild_{idx}"
    inst = rng.choice(_PRESCRIBING_INSTITUTION_IDS)
    med = rng.choice(_SEDATIVE_IDS)
    history = [_rx(f"{pid}_rx1", pid, inst, 18, [_item(med, 10, days_supply=28)])]
    target = _rx(f"{pid}_rx2", pid, inst, 0, [_item(med, 10, days_supply=28)])
    history.append(target)
    return LabeledCase("safe", "mild_single_incident", Patient(id=pid, name=pid, birth_year=1975), history, target)


def _gen_clear_abuse_high(rng: random.Random, idx) -> LabeledCase:
    pid = f"calib_abuse_{idx}"
    insts = rng.sample(_PRESCRIBING_INSTITUTION_IDS, 3)
    med = rng.choice(_SEDATIVE_IDS)
    offsets_doses = [(27, 10), (19, 10), (11, 20), (3, 20)]
    history = []
    for i, (days_ago, dose) in enumerate(offsets_doses):
        inst = insts[i % len(insts)]
        history.append(_rx(f"{pid}_rx{i}", pid, inst, days_ago, [_item(med, dose, days_supply=28)]))
    target = history[-1]
    return LabeledCase("high_risk", "clear_abuse_high", Patient(id=pid, name=pid, birth_year=1980), history, target)


def _gen_moderate_switching(rng: random.Random, idx: int) -> LabeledCase:
    pid = f"calib_switch_{idx}"
    n = min(3, len(_OPIOID_IDS), len(_PRESCRIBING_INSTITUTION_IDS))
    meds = rng.sample(_OPIOID_IDS, n)
    insts = rng.sample(_PRESCRIBING_INSTITUTION_IDS, n)
    offsets = [40, 20, 2][:n]
    history = []
    for i, (med, days_ago) in enumerate(zip(meds, offsets)):
        history.append(_rx(f"{pid}_rx{i}", pid, insts[i], days_ago, [_item(med, 25, days_supply=28, quantity=4)]))
    target = history[-1]
    return LabeledCase("caution", "moderate_switching", Patient(id=pid, name=pid, birth_year=1980), history, target)


def _gen_legitimate_high_pattern(rng: random.Random, idx: int) -> LabeledCase:
    base = _gen_clear_abuse_high(rng, f"ctx{idx}")
    med_class = MEDICINES[base.target.items[0].medicine_id].drug_class
    flag = _CONTEXT_FOR_CLASS.get(med_class, ContextFlag.CANCER_PAIN)
    patient = base.patient.model_copy(update={"context_flags": [flag]})
    return LabeledCase("safe", "legitimate_high_pattern", patient, base.history, base.target)


_GENERATORS = [
    (_gen_normal, 40),
    (_gen_mild_single_incident, 40),
    (_gen_clear_abuse_high, 40),
    (_gen_moderate_switching, 40),
    (_gen_legitimate_high_pattern, 40),
]


def build_labeled_dataset(seed: int = 7) -> list[LabeledCase]:
    rng = random.Random(seed)
    cases: list[LabeledCase] = []
    for generator, count in _GENERATORS:
        for i in range(count):
            cases.append(generator(rng, i))
    return cases
