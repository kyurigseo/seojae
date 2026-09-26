"""Pydantic schemas for authentication, token, and user claims."""
from __future__ import annotations

from pydantic import BaseModel, Field


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenPayload(BaseModel):
    sub: str  # username or user_id
    role: str  # DOCTOR, PHARMACIST, ADMIN
    hospital_code: str  # 요양기관기호 (e.g., H1234567)
    license_no: str  # 면허번호 (e.g., DOC99887)
    name: str


class LoginRequest(BaseModel):
    username: str = Field(..., description="사용자 아이디 (예: doc_kim)")
    password: str = Field(..., description="비밀번호")


class UserResponse(BaseModel):
    username: str
    name: str
    role: str
    hospital_code: str
    license_no: str
