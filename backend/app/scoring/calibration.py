"""Weight/cutline calibration report (proposal 5-1 step 3: "오탐률(FPR)
데이터로 커트라인 보정").

Run it:
    python -m app.scoring.calibration

There's no real FPR data yet (see calibration_data.py's docstring for why),
so this scores app/scoring/calibration_data.py's synthetic labeled dataset
against the *current* CAUTION/HIGH_RISK thresholds, reports how well they
separate the categories, and sweeps alternate threshold pairs so you can see
the tradeoff before touching anything in engine.py. It does not change any
constants itself — recalibration is a judgment call, not something to
automate silently.
"""
from __future__ import annotations

from collections import Counter, defaultdict
from itertools import combinations

from app.demo_data import MEDICINES
from app.scoring.calibration_data import LabeledCase, build_labeled_dataset
from app.scoring.engine import CAUTION_THRESHOLD, HIGH_RISK_THRESHOLD, score_prescription
from app.scoring.isolation_model import FEATURE_ORDER, MAX_POINTS

GRADES = ["safe", "caution", "high_risk"]

_SIGNAL_SHORT_LABEL = {
    "multi_institution_shopping": "다기관",
    "early_refill": "조기재처방",
    "dose_spike": "용량급상승",
    "drug_switching": "약물전환",
    "contraindicated_combo": "금기조합",
}


def _grade_for(score: int, caution: int, high_risk: int) -> str:
    if score >= high_risk:
        return "high_risk"
    if score >= caution:
        return "caution"
    return "safe"


def _run_dataset(cases: list[LabeledCase]) -> list[tuple[LabeledCase, int]]:
    results = []
    for case in cases:
        result = score_prescription(case.patient, case.history, case.target, MEDICINES)
        results.append((case, result.score))
    return results


def _print_confusion_matrix(scored: list[tuple[LabeledCase, int]], caution: int, high_risk: int) -> None:
    matrix: dict[str, Counter] = {label: Counter() for label in GRADES}
    for case, score in scored:
        predicted = _grade_for(score, caution, high_risk)
        matrix[case.label][predicted] += 1

    header = f"{'실제 \\ 예측':<14}" + "".join(f"{g:>12}" for g in GRADES)
    print(header)
    for true_label in GRADES:
        row = "".join(f"{matrix[true_label][g]:>12}" for g in GRADES)
        print(f"{true_label:<14}{row}")


def _print_category_breakdown(scored: list[tuple[LabeledCase, int]], caution: int, high_risk: int) -> None:
    by_category: dict[str, list[tuple[LabeledCase, int]]] = defaultdict(list)
    for case, score in scored:
        by_category[case.category].append((case, score))

    print(f"\n{'카테고리':<26}{'의도한 등급':<12}{'평균점수':>8}{'일치율':>10}")
    for category, items in by_category.items():
        intended = items[0][0].label
        avg_score = sum(s for _, s in items) / len(items)
        match_rate = sum(1 for c, s in items if _grade_for(s, caution, high_risk) == intended) / len(items)
        print(f"{category:<26}{intended:<12}{avg_score:>8.1f}{match_rate:>9.0%}")


def _sweep_thresholds(scored: list[tuple[LabeledCase, int]]) -> None:
    print("\n=== 컷라인 스윕 (주의/고위험 임계값 조합별 오분류 수) ===")
    print(f"{'주의≥':>6}{'고위험≥':>8}{'안전 오탐':>10}{'고위험 놓침':>12}{'총 오분류':>10}")

    rows = []
    for caution in range(45, 75, 5):
        for high_risk in range(caution + 10, 100, 5):
            safe_false_positive = sum(
                1 for c, s in scored if c.label == "safe" and _grade_for(s, caution, high_risk) != "safe"
            )
            high_risk_false_negative = sum(
                1 for c, s in scored if c.label == "high_risk" and _grade_for(s, caution, high_risk) != "high_risk"
            )
            total = safe_false_positive + high_risk_false_negative
            rows.append((caution, high_risk, safe_false_positive, high_risk_false_negative, total))

    rows.sort(key=lambda r: r[4])
    for caution, high_risk, fp, fn, total in rows[:8]:
        marker = " ← 현재값" if (caution, high_risk) == (CAUTION_THRESHOLD, HIGH_RISK_THRESHOLD) else ""
        print(f"{caution:>6}{high_risk:>8}{fp:>10}{fn:>12}{total:>10}{marker}")


def _print_signal_combination_table(caution: int, high_risk: int) -> None:
    """Every signal combo's raw rule score is a fixed sum of flat weights
    (proposal 5-1's 40/30/20/20/10), so the scoring space is discrete — only
    2^5=32 possible rule-score values exist, not a continuum. Enumerating
    them all is a more direct check on where the 60/80 cutlines actually
    bite than randomly sampled scenarios (which tend to cluster at a handful
    of those 32 values anyway). Isolation Forest can add up to +10 on top —
    not shown here, so a combo within 10 points of a boundary is worth a
    second look.
    """
    print("\n=== 시그널 조합 전수 조사 (규칙 점수만, Isolation Forest 보정 +0~10 별도) ===")
    rows = []
    for r in range(len(FEATURE_ORDER) + 1):
        for combo in combinations(FEATURE_ORDER, r):
            total = sum(MAX_POINTS[s] for s in combo)
            rows.append((total, combo))
    rows.sort(key=lambda x: x[0])

    for total, combo in rows:
        grade = _grade_for(total, caution, high_risk)
        near_boundary = abs(total - caution) <= 10 or abs(total - high_risk) <= 10
        label = "+".join(_SIGNAL_SHORT_LABEL[s] for s in combo) or "(없음)"
        flag = "  ⚠ 경계 근접 (Isolation Forest 보정에 따라 등급 뒤집힐 수 있음)" if near_boundary else ""
        print(f"{total:>4}점  {grade:<10} {label}{flag}")


def main() -> None:
    cases = build_labeled_dataset()
    scored = _run_dataset(cases)

    print(f"=== 합성 라벨 데이터셋: {len(cases)}건 (카테고리 5종 × 40건) ===")
    print(f"현재 임계값: 주의 ≥ {CAUTION_THRESHOLD}, 고위험 ≥ {HIGH_RISK_THRESHOLD}\n")

    print("=== 혼동 행렬 (현재 임계값 기준) ===")
    _print_confusion_matrix(scored, CAUTION_THRESHOLD, HIGH_RISK_THRESHOLD)

    _print_category_breakdown(scored, CAUTION_THRESHOLD, HIGH_RISK_THRESHOLD)

    _print_signal_combination_table(CAUTION_THRESHOLD, HIGH_RISK_THRESHOLD)

    _sweep_thresholds(scored)

    print(
        "\n주의: 이 결과는 실제 오탐 데이터가 아니라 합성 라벨 데이터셋 기준입니다. "
        "실서비스 피드백(약사 소명·무시 버튼)이 쌓이면 calibration_data.py의 카테고리 비율을 "
        "실측 분포로 교체해서 다시 돌리세요."
    )


if __name__ == "__main__":
    main()
