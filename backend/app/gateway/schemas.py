"""DTO schemas for EMR/pharmacy real-time prescription reception gateway."""
from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, Field


class GatewayPrescriptionItem(BaseModel):
    medicine_id: str = Field(..., description="약품 코드 (예: MED001)")
    dose_mg: float = Field(..., description="1회 투여량 (mg)")
    days_supply: int = Field(..., description="투약 일수")
    quantity: int = Field(..., description="총 수량")
    instructions: Optional[str] = Field(None, description="용법 및 특이사항")


class GatewayPrescriptionRequest(BaseModel):
    prescription_id: str = Field(..., description="처방전 고유 ID (예: RX_999)")
    patient_id: str = Field(..., description="환자 환자번호 또는 식별자")
    resident_reg_no: Optional[str] = Field(
        None, description="주민등록번호 또는 외국인등록번호 (비식별화 대상)"
    )
    patient_name: str = Field(..., description="환자 성명")
    birth_date: str = Field(..., description="생년월일 (YYYYMMDD)")
    gender: str = Field(..., description="성별 (M / F)")
    institution_id: str = Field(..., description="요양기관 ID")
    issued_at: str = Field(..., description="처방 일시 (ISO 8601 또는 YYYY-MM-DD HH:MM:SS)")
    items: List[GatewayPrescriptionItem] = Field(..., description="처방 약품 목록")


class GatewayPrescriptionResponse(BaseModel):
    status: str = Field("success", description="처리 상태")
    prescription_id: str
    anonymized_patient_hash: str = Field(..., description="SHA-256 + Salt 단방향 비식별화된 환자 해시")
    risk_score: float = Field(..., description="산출된 리스크 점수 (0~100)")
    risk_grade: str = Field(..., description="위험도 등급 (safe / caution / high_risk)")
    explanation: List[str] = Field(default_factory=list, description="위험 사유 설명")
    audit_index: int = Field(..., description="해시체인 감사로그 기록 인덱스")
