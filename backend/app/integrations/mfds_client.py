"""Client for 식약처 의약품개요정보(e약은요) OpenAPI.

https://www.data.go.kr/data/15075057/openapi.do

Response fields worth reading for this project:
  - efcyQesitm         효능
  - useMethodQesitm    사용법
  - atpnWarnQesitm     경고
  - atpnQesitm         주의사항
  - intrcQesitm        상호작용 (drug_class 금기 조합 근거로 쓸 수 있음)
  - seQesitm           부작용
  - depositMethodQesitm 보관법
"""
from __future__ import annotations

import httpx

from app.config import MFDS_API_KEY

BASE_URL = "https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList"


class MfdsClientError(RuntimeError):
    pass


async def search_drug_info(item_name: str, num_of_rows: int = 5) -> list[dict]:
    """Look up a drug by product name (e.g. "타이레놀정500mg")."""
    if not MFDS_API_KEY:
        raise MfdsClientError(
            "MFDS_API_KEY가 설정되지 않았습니다. backend/.env.example을 backend/.env로 "
            "복사한 뒤 발급받은 키를 넣고 서버를 재시작하세요."
        )

    params = {
        "serviceKey": MFDS_API_KEY,
        "itemName": item_name,
        "type": "json",
        "numOfRows": num_of_rows,
        "pageNo": 1,
    }
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(BASE_URL, params=params)
        resp.raise_for_status()
        data = resp.json()

    body = data.get("body", {})
    items = body.get("items", [])
    # The API returns a bare dict instead of a list when there's exactly one result.
    if isinstance(items, dict):
        items = [items]
    return items
