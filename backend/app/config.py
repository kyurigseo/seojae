"""Loads secrets/config from backend/.env (gitignored — see .env.example)."""
from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()

MFDS_API_KEY = os.getenv("MFDS_API_KEY", "")
