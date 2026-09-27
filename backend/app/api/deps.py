"""FastAPI dependencies for JWT authentication, RBAC authorization, and EMR API Key verification."""
from __future__ import annotations

from typing import Callable, List

from fastapi import Depends, Header, Security
from fastapi.security import APIKeyHeader, HTTPBearer

from app.config import EMR_API_KEYS
from app.core.exceptions import (
    InsufficientPermissionsException,
    InvalidApiKeyException,
    InvalidTokenException,
    TokenExpiredException,
)
from app.core.security import decode_access_token
from app.schemas.auth import TokenPayload

# OAuth2 / Bearer token security scheme for Swagger UI
security_bearer = HTTPBearer(auto_error=False)

# Header scheme for EMR API Key
api_key_header_scheme = APIKeyHeader(name="X-API-KEY", auto_error=False)


def get_current_user(token_bearer = Security(security_bearer)) -> TokenPayload:
    """Extracts and verifies JWT token from Authorization Bearer header.
    Returns user claims including role, hospital_code, and license_no.
    """
    if not token_bearer or not token_bearer.credentials:
        raise InvalidTokenException(detail="인증 토큰(Bearer Token)이 누락되었습니다.")
    
    token = token_bearer.credentials
    payload_dict = decode_access_token(token)
    
    if payload_dict is None:
        raise InvalidTokenException(detail="유효하지 않거나 만료된 인증 토큰입니다.")
    
    try:
        user_payload = TokenPayload(
            sub=payload_dict.get("sub", ""),
            role=payload_dict.get("role", ""),
            hospital_code=payload_dict.get("hospital_code", ""),
            license_no=payload_dict.get("license_no", ""),
            name=payload_dict.get("name", ""),
        )
    except Exception:
        raise InvalidTokenException(detail="토큰 클레임 구조가 잘못되었습니다.")
    
    return user_payload


def require_role(allowed_roles: List[str]) -> Callable:
    """Role-Based Access Control (RBAC) dependency factory.
    Verifies that the current authenticated user possesses one of the allowed roles
    (e.g., ['DOCTOR'], ['PHARMACIST'], ['ADMIN'], or combinations).
    """
    def role_dependency(current_user: TokenPayload = Depends(get_current_user)) -> TokenPayload:
        if current_user.role not in allowed_roles:
            raise InsufficientPermissionsException(
                detail=f"권한이 부족합니다. 요구되는 역할: {allowed_roles}, 현재 역할: {current_user.role}"
            )
        return current_user
    return role_dependency


def verify_api_key(x_api_key: str | None = Header(None, alias="X-API-KEY")) -> str:
    """Verifies X-API-KEY header for EMR systems, pharmacies, or external gateway integrations."""
    if not x_api_key:
        raise InvalidApiKeyException(detail="X-API-KEY 헤더가 누락되었습니다.")
    
    if x_api_key not in EMR_API_KEYS:
        raise InvalidApiKeyException(detail="등록되지 않았거나 유효하지 않은 EMR API Key입니다.")
    
    return x_api_key
