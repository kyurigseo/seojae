"""Authentication and authorization routes (login, token issuance, user profile, EMR API Key test)."""
from __future__ import annotations

from datetime import timedelta
from fastapi import APIRouter, Depends, status

from app.config import ACCESS_TOKEN_EXPIRE_MINUTES
from app.core.exceptions import InvalidCredentialsException
from app.core.security import create_access_token, get_password_hash, verify_password
from app.api.deps import get_current_user, require_role, verify_api_key
from app.schemas.auth import LoginRequest, Token, UserResponse, TokenPayload

router = APIRouter(prefix="/api/auth", tags=["Authentication & Authorization"])

# Demo user database for Medisync MVP (password is 'password123' for all demo accounts)
# Hashed with bcrypt
DEMO_USERS = {
    "doc_kim": {
        "username": "doc_kim",
        "password_hash": get_password_hash("password123"),
        "name": "김의사",
        "role": "DOCTOR",
        "hospital_code": "H1234567",
        "license_no": "DOC99887",
    },
    "phar_lee": {
        "username": "phar_lee",
        "password_hash": get_password_hash("password123"),
        "name": "이약사",
        "role": "PHARMACIST",
        "hospital_code": "P7654321",
        "license_no": "PHA55443",
    },
    "admin_park": {
        "username": "admin_park",
        "password_hash": get_password_hash("password123"),
        "name": "박관리",
        "role": "ADMIN",
        "hospital_code": "H0000001",
        "license_no": "ADM11223",
    },
}


@router.post("/login", response_model=Token, summary="의료진 로그인 및 JWT 토큰 발급")
def login(payload: LoginRequest):
    """Authenticates doctor, pharmacist, or admin credentials and returns a JWT access token
    containing claims: sub (username), role, hospital_code, license_no, and name.
    """
    user = DEMO_USERS.get(payload.username)
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise InvalidCredentialsException(detail="아이디 또는 비밀번호가 올바르지 않습니다.")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    token_data = {
        "sub": user["username"],
        "role": user["role"],
        "hospital_code": user["hospital_code"],
        "license_no": user["license_no"],
        "name": user["name"],
    }
    access_token = create_access_token(data=token_data, expires_delta=access_token_expires)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@router.get("/me", response_model=UserResponse, summary="현재 로그인된 의료진 프로필 조회")
def get_my_profile(current_user: TokenPayload = Depends(get_current_user)):
    """Returns the profile and claims (role, hospital_code, license_no) of the currently authenticated user."""
    return {
        "username": current_user.sub,
        "name": current_user.name,
        "role": current_user.role,
        "hospital_code": current_user.hospital_code,
        "license_no": current_user.license_no,
    }


@router.post("/emr-gateway/test", summary="원내 EMR 연동 API Key 인가 테스트")
def test_emr_api_key(api_key: str = Depends(verify_api_key)):
    """Tests X-API-KEY header authorization for external EMR / pharmacy systems integration."""
    return {
        "status": "success",
        "message": "EMR API Key 인가에 성공했습니다.",
        "authorized_by_key_prefix": api_key[:8] + "..." if len(api_key) > 8 else "***",
    }


@router.get("/rbac-test/doctor-only", summary="의사(DOCTOR) 전용 RBAC 테스트")
def test_doctor_rbac(current_user: TokenPayload = Depends(require_role(["DOCTOR", "ADMIN"]))):
    """Test endpoint accessible only by DOCTOR or ADMIN role."""
    return {
        "status": "success",
        "message": f"안녕하세요 {current_user.name}님! 의사 전용 엔드포인트 접근 권한이 확인되었습니다.",
        "role": current_user.role,
    }


@router.get("/rbac-test/pharmacist-only", summary="약사(PHARMACIST) 전용 RBAC 테스트")
def test_pharmacist_rbac(current_user: TokenPayload = Depends(require_role(["PHARMACIST", "ADMIN"]))):
    """Test endpoint accessible only by PHARMACIST or ADMIN role."""
    return {
        "status": "success",
        "message": f"안녕하세요 {current_user.name}님! 약사 전용 엔드포인트 접근 권한이 확인되었습니다.",
        "role": current_user.role,
    }
