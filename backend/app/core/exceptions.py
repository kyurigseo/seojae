"""Custom exceptions and error response handlers for Medisync backend."""
from __future__ import annotations

from fastapi import HTTPException, status


class MedisyncException(HTTPException):
    """Base exception for Medisync application."""
    pass


class InvalidCredentialsException(MedisyncException):
    def __init__(self, detail: str = "아이디 또는 비밀번호가 올바르지 않습니다."):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class TokenExpiredException(MedisyncException):
    def __init__(self, detail: str = "인증 토큰이 만료되었습니다. 다시 로그인해주세요."):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class InvalidTokenException(MedisyncException):
    def __init__(self, detail: str = "유효하지 않은 인증 토큰입니다."):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class InsufficientPermissionsException(MedisyncException):
    def __init__(self, detail: str = "해당 리소스에 접근할 권한이 없습니다."):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
        )


class InvalidApiKeyException(MedisyncException):
    def __init__(self, detail: str = "유효하지 않거나 누락된 EMR API Key입니다."):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
        )
