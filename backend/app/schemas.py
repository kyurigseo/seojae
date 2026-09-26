"""Pydantic domain models shared across the scoring service.

Mirrors the ERD in the proposal (section 8-2): patients, medicines,
institutions, prescriptions/items, dispensing events, and the risk
score/signal/alert entities produced by this service.
"""
from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class DrugClass(str, Enum):
    OPIOID = "opioid"
    BENZODIAZEPINE = "benzodiazepine"
    STIMULANT = "stimulant"
    SEDATIVE_HYPNOTIC = "sedative_hypnotic"
    ANESTHETIC = "anesthetic"


class InstitutionType(str, Enum):
    HOSPITAL = "hospital"
    PHARMACY = "pharmacy"
    CLINIC = "clinic"


class ContextFlag(str, Enum):
    """Legitimate clinical contexts that justify an otherwise risky pattern (5-2)."""

    CANCER_PAIN = "cancer_pain"
    PALLIATIVE_CARE = "palliative_care"
    POST_SURGERY = "post_surgery"
    ADHD_DIAGNOSED = "adhd_diagnosed"


class Medicine(BaseModel):
    id: str
    name: str
    ingredient: str
    drug_class: DrugClass
    is_narcotic: bool = True
    standard_interval_days: int = Field(
        description="정상 처방 간격(예: 펜타닐 패치 7일 주기)"
    )
    contraindicated_with: list[str] = Field(default_factory=list)

    # 환자용 복약 리터러시 앱 콘텐츠 (보고서 5번 기능 D)
    patient_summary: str = ""
    common_side_effects: str = ""
    misuse_warning_signs: list[str] = Field(default_factory=list)
    non_drug_alternatives: str = ""


class Institution(BaseModel):
    id: str
    name: str
    type: InstitutionType
    is_specialty_pain_clinic: bool = False


class Patient(BaseModel):
    id: str
    name: str
    birth_year: int
    consent_given: bool = True
    context_flags: list[ContextFlag] = Field(default_factory=list)


class PrescriptionItem(BaseModel):
    medicine_id: str
    dose_mg: float
    days_supply: int
    quantity: int


class Prescription(BaseModel):
    id: str
    patient_id: str
    institution_id: str
    doctor_id: str = "doc_default"
    issued_at: datetime
    items: list[PrescriptionItem]


class DispensingEvent(BaseModel):
    id: str
    prescription_id: str
    pharmacy_id: str
    dispensed_at: datetime


class RiskGrade(str, Enum):
    SAFE = "safe"
    CAUTION = "caution"
    HIGH_RISK = "high_risk"


class SignalHit(BaseModel):
    """One triggered detection rule and its contribution to the score (5-1)."""

    signal: str
    label: str
    raw_points: float
    detail: str


class RiskScoreResult(BaseModel):
    patient_id: str
    prescription_id: str
    score: int = Field(ge=0, le=100)
    grade: RiskGrade
    rule_score: float
    isolation_forest_score: float
    context_adjustment: float
    signals: list[SignalHit]
    explanation: str
    scored_at: datetime
