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
            patient_summary="수술 후 통증, 암성 통증 등 심한 통증을 완화하기 위해 피부에 붙이는 마약성 진통제입니다.",
            common_side_effects="졸음, 어지러움, 변비, 구역감이 흔하며, 고용량에서는 호흡이 느려질 수 있습니다.",
            misuse_warning_signs=[
                "처방받은 것보다 자주 패치를 교체하는 경우",
                "통증이 없는데도 계속 사용하는 경우",
                "여러 병원에서 동시에 처방받는 경우",
                "음주나 수면제와 함께 사용하는 경우",
            ],
            non_drug_alternatives="물리치료, 온열 요법, 신경차단술, 비오피오이드 진통제 병행.",
        ),
        Medicine(
            id="oxycodone",
            name="옥시코돈",
            ingredient="oxycodone",
            drug_class=DrugClass.OPIOID,
            standard_interval_days=28,
            contraindicated_with=["zolpidem", "midazolam", "diazepam"],
            patient_summary="중등도 이상의 통증을 완화하는 마약성 진통제입니다.",
            common_side_effects="졸음, 변비, 구역, 구강 건조가 흔하며 고용량에서 호흡저하 위험이 있습니다.",
            misuse_warning_signs=[
                "처방된 양보다 많이 복용하는 경우",
                "조기 재처방을 반복적으로 요청하는 경우",
                "기분 전환 목적으로 복용하는 경우",
            ],
            non_drug_alternatives="물리치료, 비오피오이드 진통제, 침술, 마음챙김 기반 통증 관리.",
        ),
        Medicine(
            id="hydromorphone",
            name="하이드로모르폰",
            ingredient="hydromorphone",
            drug_class=DrugClass.OPIOID,
            standard_interval_days=28,
            contraindicated_with=["zolpidem", "midazolam", "diazepam"],
            patient_summary="옥시코돈보다 강한 효과의 마약성 진통제로, 심한 통증에 사용됩니다.",
            common_side_effects="졸음, 구역, 변비, 고용량에서 호흡저하 위험.",
            misuse_warning_signs=[
                "다른 오피오이드에서 최근 전환된 경우",
                "여러 병원을 거치며 약을 바꿔가며 처방받는 경우",
            ],
            non_drug_alternatives="완화의료팀 상담, 물리치료, 통증클리닉 연계.",
        ),
        Medicine(
            id="zolpidem",
            name="졸피뎀",
            ingredient="zolpidem",
            drug_class=DrugClass.SEDATIVE_HYPNOTIC,
            standard_interval_days=28,
            contraindicated_with=["fentanyl_patch", "oxycodone", "hydromorphone"],
            patient_summary="불면증 치료에 사용되는 단기 수면유도제입니다.",
            common_side_effects="졸음, 어지러움, 기억장애, 드물게 수면 중 이상행동(몽유 등).",
            misuse_warning_signs=[
                "처방받은 기간보다 일찍 재처방을 요청하는 경우",
                "여러 병원에서 동시에 처방받는 경우",
                "낮에도 복용하는 경우",
            ],
            non_drug_alternatives="수면 위생 교육, 불면증 인지행동치료, 카페인·야간 스크린 사용 줄이기.",
        ),
        Medicine(
            id="midazolam",
            name="미다졸람",
            ingredient="midazolam",
            drug_class=DrugClass.SEDATIVE_HYPNOTIC,
            standard_interval_days=28,
            contraindicated_with=["fentanyl_patch", "oxycodone", "hydromorphone"],
            patient_summary="불안 완화 및 수면 유도에 사용되는 진정제입니다.",
            common_side_effects="졸음, 근육 이완, 기억장애, 고용량·병용 시 호흡저하 위험.",
            misuse_warning_signs=[
                "오피오이드와 함께 복용하는 경우(호흡저하 위험)",
                "처방 없이 반복 사용하는 경우",
            ],
            non_drug_alternatives="이완요법, 인지행동치료, 수면습관 개선.",
        ),
        Medicine(
            id="methylphenidate",
            name="메틸페니데이트",
            ingredient="methylphenidate",
            drug_class=DrugClass.STIMULANT,
            standard_interval_days=30,
            patient_summary="ADHD(주의력결핍과잉행동장애) 치료에 사용되는 중추신경자극제입니다.",
            common_side_effects="식욕 감소, 불면, 두통, 심박수 증가.",
            misuse_warning_signs=[
                "집중력을 높이려고 처방량보다 많이 복용하는 경우",
                "시험 기간 등에 임시로 복용하는 경우",
                "타인에게 약을 나눠주는 경우",
            ],
            non_drug_alternatives="행동치료, 구조화된 일과 관리, 규칙적 운동, 수면 개선.",
        ),
        Medicine(
            id="propofol",
            name="프로포폴",
            ingredient="propofol",
            drug_class=DrugClass.ANESTHETIC,
            standard_interval_days=30,
            patient_summary="수면 마취나 진정 시술에 사용되는 정맥마취제입니다. 일반적으로 가정에서 복용하는 약이 아닙니다.",
            common_side_effects="주사 부위 통증, 혈압 저하, 호흡저하(의료진 감독 하에만 투여).",
            misuse_warning_signs=[
                "의료기관 외에서 사용된 기록이 있는 경우",
                "짧은 간격으로 반복 시술을 받는 경우",
            ],
            non_drug_alternatives="해당 없음 — 시술용 약물이므로 대체 방법은 담당 의료진과 상담하세요.",
        ),
    ]
}

MEDICINES["MED001"] = MEDICINES["fentanyl_patch"]
MEDICINES["MED002"] = MEDICINES["oxycodone"]
MEDICINES["MED003"] = MEDICINES["hydromorphone"]
MEDICINES["MED004"] = MEDICINES["zolpidem"]
MEDICINES["MED005"] = MEDICINES["midazolam"]

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
