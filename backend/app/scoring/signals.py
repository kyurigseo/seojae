"""Rule-based abuse signal detectors (proposal section 5-1).

Each detector inspects one patient's prescription history up to and
including the prescription being scored, and returns a ``SignalHit`` if it
fires. Weights follow the proposal's default split (40/30/20/20/10 = 100)
but are kept as module-level constants so they can be re-tuned later, as
the proposal itself notes ("가중치 합계는 ... 재조정 가능함").
"""
from __future__ import annotations

from datetime import timedelta

from app.schemas import Medicine, Prescription, SignalHit

MULTI_INSTITUTION_WINDOW_DAYS = 30
MULTI_INSTITUTION_POINTS = 40

EARLY_REFILL_WINDOW_DAYS = 90
EARLY_REFILL_RATIO_THRESHOLD = 0.6
EARLY_REFILL_FULL_POINTS = 30
EARLY_REFILL_FIRST_OFFENSE_POINTS = 15

DOSE_SPIKE_MULTIPLIER = 1.8
DOSE_SPIKE_POINTS = 20

DRUG_SWITCH_WINDOW_DAYS = 45
DRUG_SWITCH_CHAIN_POINTS = 20
DRUG_SWITCH_PARTIAL_POINTS = 10

CONTRAINDICATION_OVERLAP_POINTS = 10


def _prior(history: list[Prescription], target: Prescription) -> list[Prescription]:
    return [rx for rx in history if rx.issued_at <= target.issued_at and rx.id != target.id]


def detect_multi_institution_shopping(
    history: list[Prescription], target: Prescription, medicines: dict[str, Medicine]
) -> SignalHit | None:
    target_classes = {medicines[i.medicine_id].drug_class for i in target.items}
    window_start = target.issued_at - timedelta(days=MULTI_INSTITUTION_WINDOW_DAYS)

    institutions: set[str] = set()
    matches: list[str] = []
    for rx in history:
        if not (window_start <= rx.issued_at <= target.issued_at):
            continue
        if any(medicines[i.medicine_id].drug_class in target_classes for i in rx.items):
            institutions.add(rx.institution_id)
            matches.append(f"{rx.institution_id}({rx.issued_at.date()})")

    if len(institutions) < 2:
        return None

    return SignalHit(
        signal="multi_institution_shopping",
        label="다기관 동시 처방(의사쇼핑)",
        raw_points=MULTI_INSTITUTION_POINTS,
        detail=(
            f"최근 {MULTI_INSTITUTION_WINDOW_DAYS}일 내 서로 다른 {len(institutions)}개 기관에서 "
            f"동일/유사 계열 약물 수령: {', '.join(matches)}"
        ),
    )


def detect_early_refill(
    history: list[Prescription], target: Prescription, medicines: dict[str, Medicine]
) -> SignalHit | None:
    best_hit: SignalHit | None = None
    for item in target.items:
        same_med_prior = sorted(
            (
                rx
                for rx in _prior(history, target)
                if any(i.medicine_id == item.medicine_id for i in rx.items)
                and rx.issued_at >= target.issued_at - timedelta(days=EARLY_REFILL_WINDOW_DAYS)
            ),
            key=lambda rx: rx.issued_at,
        )
        if not same_med_prior:
            continue

        previous = same_med_prior[-1]
        prev_item = next(i for i in previous.items if i.medicine_id == item.medicine_id)
        actual_interval = (target.issued_at - previous.issued_at).days
        if prev_item.days_supply <= 0:
            continue
        ratio = actual_interval / prev_item.days_supply
        if ratio >= EARLY_REFILL_RATIO_THRESHOLD:
            continue

        # count consecutive early refills ending at target (severity escalates with repetition)
        chain = same_med_prior + [target]
        occurrences = 0
        for i in range(len(chain) - 1, 0, -1):
            cur, prev = chain[i], chain[i - 1]
            prev_supply = next(
                (pi.days_supply for pi in prev.items if pi.medicine_id == item.medicine_id), None
            )
            if prev_supply is None or prev_supply <= 0:
                break
            interval = (cur.issued_at - prev.issued_at).days
            if interval / prev_supply < EARLY_REFILL_RATIO_THRESHOLD:
                occurrences += 1
            else:
                break

        points = (
            EARLY_REFILL_FULL_POINTS
            if occurrences >= 2
            else EARLY_REFILL_FIRST_OFFENSE_POINTS
        )
        med = medicines[item.medicine_id]
        hit = SignalHit(
            signal="early_refill",
            label="조기 재처방",
            raw_points=points,
            detail=(
                f"{med.name} 표준 처방 간격 {prev_item.days_supply}일 대비 실제 간격 "
                f"{actual_interval}일({round(ratio * 100)}%, {occurrences}회 연속)"
            ),
        )
        if best_hit is None or hit.raw_points > best_hit.raw_points:
            best_hit = hit
    return best_hit


def detect_dose_spike(
    history: list[Prescription], target: Prescription, medicines: dict[str, Medicine]
) -> SignalHit | None:
    for item in target.items:
        prior_rx_sorted = sorted(
            (
                rx
                for rx in _prior(history, target)
                if any(i.medicine_id == item.medicine_id for i in rx.items)
            ),
            key=lambda rx: rx.issued_at,
        )
        if not prior_rx_sorted:
            continue
        # Baseline = patient's earliest observed dose for this medicine, not a
        # rolling average — averaging in already-escalated doses would mask
        # the very spike we're trying to detect.
        baseline = next(
            i.dose_mg for i in prior_rx_sorted[0].items if i.medicine_id == item.medicine_id
        )
        if baseline <= 0:
            continue
        if item.dose_mg >= baseline * DOSE_SPIKE_MULTIPLIER:
            med = medicines[item.medicine_id]
            return SignalHit(
                signal="dose_spike",
                label="용량·빈도 급상승",
                raw_points=DOSE_SPIKE_POINTS,
                detail=(
                    f"{med.name} 최초 처방 용량 {baseline:.1f}mg 대비 이번 처방 {item.dose_mg:.1f}mg "
                    f"({item.dose_mg / baseline:.1f}배)"
                ),
            )
    return None


def detect_drug_switching(
    history: list[Prescription], target: Prescription, medicines: dict[str, Medicine]
) -> SignalHit | None:
    target_classes = {medicines[i.medicine_id].drug_class for i in target.items}
    window_start = target.issued_at - timedelta(days=DRUG_SWITCH_WINDOW_DAYS)

    chain: list[Prescription] = sorted(
        (
            rx
            for rx in history
            if window_start <= rx.issued_at <= target.issued_at
            and any(medicines[i.medicine_id].drug_class in target_classes for i in rx.items)
        ),
        key=lambda rx: rx.issued_at,
    )
    if len(chain) < 2:
        return None

    distinct_meds: list[str] = []
    distinct_institutions: set[str] = set()
    for rx in chain:
        for i in rx.items:
            if medicines[i.medicine_id].drug_class in target_classes:
                if not distinct_meds or distinct_meds[-1] != i.medicine_id:
                    distinct_meds.append(i.medicine_id)
        distinct_institutions.add(rx.institution_id)

    unique_meds = list(dict.fromkeys(distinct_meds))
    if len(unique_meds) < 2 or len(distinct_institutions) < 2:
        return None

    names = [medicines[m].name for m in unique_meds]
    points = DRUG_SWITCH_CHAIN_POINTS if len(unique_meds) >= 3 else DRUG_SWITCH_PARTIAL_POINTS
    return SignalHit(
        signal="drug_switching",
        label="약물 전환 패턴",
        raw_points=points,
        detail=f"{len(distinct_institutions)}개 기관을 거치며 {' → '.join(names)} 순으로 연쇄 전환",
    )


def detect_contraindicated_combo(
    history: list[Prescription], target: Prescription, medicines: dict[str, Medicine]
) -> SignalHit | None:
    def active_window(rx: Prescription, item) -> tuple:
        return rx.issued_at, rx.issued_at + timedelta(days=item.days_supply)

    target_windows = [(i, *active_window(target, i)) for i in target.items]

    for rx in _prior(history, target):
        for other_item in rx.items:
            other_start, other_end = active_window(rx, other_item)
            for item, start, end in target_windows:
                med = medicines[item.medicine_id]
                if other_item.medicine_id not in med.contraindicated_with:
                    continue
                if start <= other_end and other_start <= end:
                    other_med = medicines[other_item.medicine_id]
                    return SignalHit(
                        signal="contraindicated_combo",
                        label="금기·상호작용 조합",
                        raw_points=CONTRAINDICATION_OVERLAP_POINTS,
                        detail=(
                            f"{med.name}과(와) {other_med.name}의 복용 기간이 겹침 "
                            f"({other_start.date()}~{other_end.date()})"
                        ),
                    )
    return None


ALL_DETECTORS = [
    detect_multi_institution_shopping,
    detect_early_refill,
    detect_dose_spike,
    detect_drug_switching,
    detect_contraindicated_combo,
]


def run_all_signals(
    history: list[Prescription], target: Prescription, medicines: dict[str, Medicine]
) -> list[SignalHit]:
    hits = []
    for detector in ALL_DETECTORS:
        hit = detector(history, target, medicines)
        if hit is not None:
            hits.append(hit)
    return hits
