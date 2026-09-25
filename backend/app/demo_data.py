"""In-memory demo/simulator data.

Section 8-4 / 9-4 of the proposal explicitly require the MVP to avoid real
patient data and use a simulator instead, so the whole "database" here is a
handful of Python dicts seeded at startup. Includes the five reference
patients (A-E) from section 6-2 so the scoring engine's output can be sanity
checked against the proposal's own worked examples.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.schemas import (
    ContextFlag,
    DispensingEvent,
    DrugClass,
    Institution,
    InstitutionType,
    Medicine,
    Patient,
    Prescription,
    PrescriptionItem,
)

NOW = datetime(2026, 9, 22, tzinfo=timezone.utc)


def _days_ago(n: int) -> datetime:
    return NOW - timedelta(days=n)


MEDICINES: dict[str, Medicine] = {
    m.id: m
    for m in [
        Medicine(
            id="fentanyl_patch",
            name="펜타닐 패치",
            ingredient="fentanyl",
            drug_class=DrugClass.OPIOID,
            standard_interval_days=7,
            contraindicated_with=["zolpidem", "midazolam", "diazepam"],
        ),
        Medicine(
            id="oxycodone",
            name="옥시코돈",
            ingredient="oxycodone",
            drug_class=DrugClass.OPIOID,
            standard_interval_days=28,
            contraindicated_with=["zolpidem", "midazolam", "diazepam"],
        ),
        Medicine(
            id="hydromorphone",
            name="하이드로모르폰",
            ingredient="hydromorphone",
            drug_class=DrugClass.OPIOID,
            standard_interval_days=28,
            contraindicated_with=["zolpidem", "midazolam", "diazepam"],
        ),
        Medicine(
            id="zolpidem",
            name="졸피뎀",
            ingredient="zolpidem",
            drug_class=DrugClass.SEDATIVE_HYPNOTIC,
            standard_interval_days=28,
            contraindicated_with=["fentanyl_patch", "oxycodone", "hydromorphone"],
        ),
        Medicine(
            id="midazolam",
            name="미다졸람",
            ingredient="midazolam",
            drug_class=DrugClass.SEDATIVE_HYPNOTIC,
            standard_interval_days=28,
            contraindicated_with=["fentanyl_patch", "oxycodone", "hydromorphone"],
        ),
        Medicine(
            id="methylphenidate",
            name="메틸페니데이트",
            ingredient="methylphenidate",
            drug_class=DrugClass.STIMULANT,
            standard_interval_days=30,
        ),
        Medicine(
            id="propofol",
            name="프로포폴",
            ingredient="propofol",
            drug_class=DrugClass.ANESTHETIC,
            standard_interval_days=30,
        ),
    ]
}

INSTITUTIONS: dict[str, Institution] = {
    i.id: i
    for i in [
        Institution(id="hosp_a", name="A병원", type=InstitutionType.HOSPITAL),
        Institution(id="hosp_b", name="B병원", type=InstitutionType.HOSPITAL),
        Institution(id="clinic_c", name="C의원", type=InstitutionType.CLINIC),
        Institution(
            id="pain_clinic",
            name="행복 통증클리닉",
            type=InstitutionType.CLINIC,
            is_specialty_pain_clinic=True,
        ),
        Institution(id="pharmacy_1", name="온누리약국", type=InstitutionType.PHARMACY),
        Institution(id="pharmacy_2", name="행복약국", type=InstitutionType.PHARMACY),
    ]
}

PATIENTS: dict[str, Patient] = {
    p.id: p
    for p in [
        Patient(id="patient_a", name="환자 A", birth_year=1985),
        Patient(id="patient_b", name="환자 B", birth_year=1990),
        Patient(id="patient_c", name="환자 C", birth_year=1978),
        Patient(
            id="patient_d",
            name="환자 D",
            birth_year=1965,
            context_flags=[ContextFlag.CANCER_PAIN],
        ),
        Patient(id="patient_e", name="환자 E", birth_year=1972),
    ]
}

PRESCRIPTIONS: dict[str, Prescription] = {}
DISPENSING_EVENTS: dict[str, DispensingEvent] = {}


def _add(rx: Prescription) -> None:
    PRESCRIPTIONS[rx.id] = rx
    DISPENSING_EVENTS[f"disp_{rx.id}"] = DispensingEvent(
        id=f"disp_{rx.id}",
        prescription_id=rx.id,
        pharmacy_id="pharmacy_1",
        dispensed_at=rx.issued_at,
    )


# --- Patient A: 동네 한 곳에서 정상 처방 -> 안전(0점) -------------------------
_add(
    Prescription(
        id="rx_a1",
        patient_id="patient_a",
        institution_id="clinic_c",
        doctor_id="doc_1",
        issued_at=_days_ago(28),
        items=[PrescriptionItem(medicine_id="zolpidem", dose_mg=10, days_supply=28, quantity=28)],
    )
)
_add(
    Prescription(
        id="rx_a2",
        patient_id="patient_a",
        institution_id="clinic_c",
        doctor_id="doc_1",
        issued_at=NOW,
        items=[PrescriptionItem(medicine_id="zolpidem", dose_mg=10, days_supply=28, quantity=28)],
    )
)

# --- Patient B: 28일치 수면제를 10일 만에 재처방(1회) -> 안전(1회는 미미함) ---
_add(
    Prescription(
        id="rx_b1",
        patient_id="patient_b",
        institution_id="clinic_c",
        doctor_id="doc_1",
        issued_at=_days_ago(10),
        items=[PrescriptionItem(medicine_id="zolpidem", dose_mg=10, days_supply=28, quantity=28)],
    )
)
_add(
    Prescription(
        id="rx_b2",
        patient_id="patient_b",
        institution_id="clinic_c",
        doctor_id="doc_1",
        issued_at=NOW,
        items=[PrescriptionItem(medicine_id="zolpidem", dose_mg=10, days_supply=28, quantity=28)],
    )
)

# --- Patient C: 30일 안에 병원 3곳에서 같은 수면제 4번+ 용량 2배 -> 고위험(100) -
_c_institutions = ["hosp_a", "hosp_b", "clinic_c"]
for idx, (days_ago, inst, dose) in enumerate(
    [(27, "hosp_a", 10), (19, "hosp_b", 10), (11, "clinic_c", 20), (3, "hosp_a", 20)]
):
    _add(
        Prescription(
            id=f"rx_c{idx + 1}",
            patient_id="patient_c",
            institution_id=inst,
            doctor_id=f"doc_{inst}",
            issued_at=_days_ago(days_ago),
            items=[
                PrescriptionItem(
                    medicine_id="zolpidem", dose_mg=dose, days_supply=28, quantity=dose
                )
            ],
        )
    )

# --- Patient D: C와 동일 패턴이지만 암성 통증 환자 -> 정당사유 보정 (안전 47점) -
for idx, (days_ago, inst, dose) in enumerate(
    [(27, "hosp_a", 10), (19, "hosp_b", 10), (11, "pain_clinic", 20), (3, "hosp_a", 20)]
):
    _add(
        Prescription(
            id=f"rx_d{idx + 1}",
            patient_id="patient_d",
            institution_id=inst,
            doctor_id=f"doc_{inst}",
            issued_at=_days_ago(days_ago),
            items=[
                PrescriptionItem(
                    medicine_id="zolpidem", dose_mg=dose, days_supply=28, quantity=dose
                )
            ],
        )
    )

# --- Patient E: 펜타닐 -> 옥시코돈 -> 하이드로모르폰 연쇄 전환 -> 주의(75) -----
for idx, (days_ago, inst, med) in enumerate(
    [
        (40, "hosp_a", "fentanyl_patch"),
        (20, "hosp_b", "oxycodone"),
        (2, "clinic_c", "hydromorphone"),
    ]
):
    _add(
        Prescription(
            id=f"rx_e{idx + 1}",
            patient_id="patient_e",
            institution_id=inst,
            doctor_id=f"doc_{inst}",
            issued_at=_days_ago(days_ago),
            items=[
                PrescriptionItem(medicine_id=med, dose_mg=25, days_supply=28, quantity=4)
            ],
        )
    )


def patient_history(patient_id: str) -> list[Prescription]:
    return sorted(
        (rx for rx in PRESCRIPTIONS.values() if rx.patient_id == patient_id),
        key=lambda rx: rx.issued_at,
    )


SCENARIO_LATEST_RX: dict[str, str] = {
    "patient_a": "rx_a2",
    "patient_b": "rx_b2",
    "patient_c": "rx_c4",
    "patient_d": "rx_d4",
    "patient_e": "rx_e3",
}
