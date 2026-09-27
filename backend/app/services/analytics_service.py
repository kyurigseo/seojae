"""Deep analytics service for aggregating dashboard statistics and metrics."""
from __future__ import annotations

from typing import Any, Dict, List
from app import demo_data, store
from app.demo_data import MEDICINES, PATIENTS


def get_deep_analytics() -> Dict[str, Any]:
    """Aggregates deep statistical metrics for dashboard charts (risk grade distribution,
    drug group risk frequency, daily misuse trends).
    """
    scores = store.all_scores()
    
    total_count = len(scores)
    grade_counts = {"safe": 0, "caution": 0, "high_risk": 0}
    drug_risk_frequency: Dict[str, int] = {}
    signal_type_counts: Dict[str, int] = {
        "multi_institution_shopping": 0,
        "early_refill": 0,
        "dose_frequency_surge": 0,
        "drug_conversion_pattern": 0,
        "contraindication_combo": 0,
    }

    for sc in scores:
        if sc.grade in grade_counts:
            grade_counts[sc.grade] += 1
        else:
            grade_counts["safe"] += 1

        # Tally signal triggers
        for sig in sc.signals_triggered:
            sig_name = sig.get("signal_name", "unknown")
            if sig_name in signal_type_counts:
                signal_type_counts[sig_name] += 1
            else:
                signal_type_counts[sig_name] = 1

        # Tally medicines involved in high risk / caution
        if sc.grade in ("high_risk", "caution"):
            rx = demo_data.PRESCRIPTIONS.get(sc.prescription_id)
            if rx:
                for item in rx.items:
                    med_name = MEDICINES.get(item.medicine_id).name if item.medicine_id in MEDICINES else item.medicine_id
                    drug_risk_frequency[med_name] = drug_risk_frequency.get(med_name, 0) + 1

    # Sort top risky drugs
    top_risky_drugs = sorted(
        [{"medicine_name": k, "count": v} for k, v in drug_risk_frequency.items()],
        key=lambda x: x["count"],
        reverse=True,
    )[:5]

    return {
        "summary": {
            "total_evaluated_prescriptions": total_count,
            "safe_count": grade_counts["safe"],
            "caution_count": grade_counts["caution"],
            "high_risk_count": grade_counts["high_risk"],
            "high_risk_ratio_percent": round((grade_counts["high_risk"] / total_count * 100) if total_count > 0 else 0.0, 1),
        },
        "signal_breakdown": signal_type_counts,
        "top_risky_drugs": top_risky_drugs,
    }
