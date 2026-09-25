# Medisync — Backend 1 (스코어링 서비스)

처방 시계열 이상탐지 · 리스크 스코어링 · 설명가능한 AI(XAI) 서비스.
5일 MVP 범위이므로 **핵심 로직만** 구현하고, 실제 인프라(Kafka, LSTM, 실 환자
데이터)는 아래 "MVP 범위 밖" 항목으로 명시적으로 남겨두었습니다.

## 실행

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- Swagger UI: http://localhost:8000/docs
- Health check: http://localhost:8000/health

## 테스트

```bash
pytest -q
```

`tests/test_scoring_engine.py`는 보고서 6-2절의 가상 환자 A~E 시나리오를
그대로 시드 데이터로 넣고, 보고서가 주장한 등급(안전/주의/고위험)이 재현되는지
검증합니다.

## 아키텍처

```
app/
  schemas.py          # ERD(8-2)에 대응하는 Pydantic 도메인 모델
  demo_data.py         # 인메모리 시뮬레이터 데이터 (A~E 시나리오 포함)
  store.py             # 런타임 상태 (계산된 점수, 약사 액션)
  scoring/
    signals.py         # 5개 규칙 기반 시그널 탐지기 (5-1)
    isolation_model.py # Isolation Forest 이상치 보정 (5-1 1단계)
    explain.py         # 자연어 설명 생성 (5-3)
    engine.py           # 시그널 + 이상치 + 정당사유 보정 → 최종 점수 (5-2, 6-1)
  api/
    routes.py           # FastAPI 엔드포인트 (8-3)
```

## 스코어링 파이프라인

1. **규칙 기반 시그널 5종** (`signals.py`) — 각 시그널이 발동하면 가중치 점수 부여:
   - 다기관 동시처방(의사쇼핑) 40점
   - 조기 재처방 30점 (최초 1회는 15점으로 완화 — "1회는 미미함")
   - 용량·빈도 급상승 20점
   - 약물 전환 패턴 20점
   - 금기·상호작용 조합 10점
2. **Isolation Forest** (`isolation_model.py`) — 시그널 조합 벡터를 합성 데이터로 학습해
   2차 이상치 점수(0~100) 산출. `rule_score*0.75 + iso_score*0.25`로 결합.
   ⚠️ 이 머신의 Python 3.14 환경에서 scikit-learn 컴파일 확장(`_isfinite` 등)이
   DLL 로드 오류로 깨져 있어(ABI/버전 불일치), **numpy만으로 직접 구현한
   Isolation Forest**를 사용합니다. sklearn이 정상 동작하는 환경에서는
   `sklearn.ensemble.IsolationForest`로 그대로 교체 가능(인터페이스 동일).
3. **정당 사유 보정** (`engine.py`) — 환자의 진료 맥락(암성 통증 등)이 트리거된
   약물군과 맞으면 점수를 보고서 예시(100→47)와 동일한 비율로 하향 보정.
4. **등급 산출**: 0~59 안전 / 60~79 주의(대시보드 표시만) / 80~100 고위험(약사 팝업 + 환자 SMS 트리거 대상).
5. **설명 생성** (`explain.py`) — 발동한 시그널을 쉬운 문장으로 조합, 약사가
   조제 거부/보류 근거로 쓸 수 있는 형태.

## API

| Method | Endpoint | 설명 |
|---|---|---|
| GET | `/api/patients` | 데모 환자 목록 |
| GET | `/api/prescriptions` | 데모 처방 목록 |
| POST | `/api/prescriptions/{id}/score` | 리스크 점수 계산 |
| GET | `/api/patients/{id}/timeline` | 처방 이력 타임라인 + 점수 |
| GET | `/api/dashboard/summary` | 약국 대시보드 요약 (등급별 카운트, 미처리 고위험 알림) |
| POST | `/api/alerts/{id}/action` | 약사 액션 기록 (`ack`/`justify`/`report`) |
| POST | `/api/patients/{id}/consent` | 환자 동의 저장 |

## MVP 범위 밖 (의도적으로 생략)

- **Kafka 스트리밍**: 처방 접수 이벤트를 실시간 큐로 받는 대신, MVP에서는
  FastAPI 엔드포인트 동기 호출로 대체. 백엔드 2의 API 게이트웨이가 완성되면
  Kafka consumer만 얇게 얹으면 됨.
- **LSTM 시계열 정밀화**: 규칙 기반 시그널 + Isolation Forest까지만 구현.
  실제 다기관 처방 시계열 데이터(NIMS/DUR 제휴)가 없어 LSTM을 학습할
  데이터 자체가 없음 — 데이터 제휴 확보 후 2단계로 추가.
- **실 환자 데이터/DB**: 보고서 8-4/9-4가 MVP 단계에서 시뮬레이터·데모
  데이터 사용을 명시하므로, PostgreSQL 대신 인메모리 딕셔너리로 시드.
- **가중치 정밀 튜닝**: 보고서 자체가 "가중치 합계는 ... 재조정 가능함"이라고
  명시하므로, 5개 시그널 점수·정당사유 보정 비율은 `signals.py`/`engine.py`
  상단 상수로 분리해두었습니다. 오탐률(FPR) 데이터가 쌓이면 그 값으로
  재보정하면 됩니다.
