"""Loads secrets/config from backend/.env (gitignored — see .env.example)."""
from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()

MFDS_API_KEY = os.getenv("MFDS_API_KEY", "")

# JWT Configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "medisync_super_secret_jwt_key_2026_change_in_production")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# EMR Integration API Keys (Comma separated list or single key)
# e.g., EMR_API_KEYS="emr_key_hospital_a_12345,emr_key_hospital_b_67890"
_raw_emr_keys = os.getenv("EMR_API_KEYS", "medisync-demo-emr-key-2026")
EMR_API_KEYS = [k.strip() for k in _raw_emr_keys.split(",") if k.strip()]
