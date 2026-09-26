"""Security utilities: password hashing (bcrypt) and JWT encoding/decoding."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import JWT_ALGORITHM, JWT_SECRET_KEY

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    # 72바이트 초과 시 에러 방지
    if isinstance(password, str):
        password = password[:72]
    return pwd_context.hash(password)


def create_access_token(data: dict[str, Any], expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token containing medical staff claims (role, hospital_code, license_no, etc.)."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=60)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Decode and verify a JWT access token. Returns claims dict or None if invalid/expired."""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload
    except JWTError:
        return None
