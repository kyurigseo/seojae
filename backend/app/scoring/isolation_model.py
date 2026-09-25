"""Isolation Forest anomaly refinement layer (proposal section 5-1, step 1).

The proposal's 3-step scoring pipeline is:
  1. rule-based signal weighted sum + Isolation Forest anomaly score
  2. LSTM time-series refinement
  3. false-positive-rate based cutoff calibration

Step 2 (LSTM) is out of scope for a 5-day MVP and is left as a documented
follow-up (see README). This module implements step 1's Isolation Forest
half: it operates on the *signal contribution vector* (how many points each
of the 5 rule-based detectors would award) rather than raw clinical
features, since real prescription history isn't available yet (section
8-4/9-4 mandate simulator-only data for the MVP) — training instead on
synthetic combinations that are sparse in the same way real abuse patterns
would be (0-1 active signals = normal, 3+ = anomalous).

Implementation note: this is a small from-scratch Isolation Forest (numpy
only), not scikit-learn's. On this machine scikit-learn's compiled Cython
extensions (``sklearn.utils._isfinite`` etc.) fail to load under the
installed Python 3.14 ("DLL load failed" / side-by-side configuration
error) — a local binary-wheel/ABI mismatch, not a modeling limitation. The
algorithm (Liu et al., 2008) is simple enough that a pure-numpy
implementation is a reasonable MVP substitute and drops a fragile compiled
dependency; swap back to ``sklearn.ensemble.IsolationForest`` (same
interface: fit on a matrix, score new rows) once deploying to an
environment where the wheel loads cleanly.
"""
from __future__ import annotations

import math

import numpy as np

from app.schemas import SignalHit

FEATURE_ORDER = [
    "multi_institution_shopping",
    "early_refill",
    "dose_spike",
    "drug_switching",
    "contraindicated_combo",
]
MAX_POINTS = {
    "multi_institution_shopping": 40,
    "early_refill": 30,
    "dose_spike": 20,
    "drug_switching": 20,
    "contraindicated_combo": 10,
}

EULER_MASCHERONI = 0.5772156649015329


def signals_to_vector(hits: list[SignalHit]) -> np.ndarray:
    by_signal = {h.signal: h.raw_points for h in hits}
    return np.array([by_signal.get(s, 0.0) for s in FEATURE_ORDER], dtype=float)


def _synthetic_training_set(n_samples: int = 800, seed: int = 42) -> np.ndarray:
    rng = np.random.default_rng(seed)
    rows = []
    for _ in range(n_samples):
        active_count = rng.choice([0, 1, 2, 3, 4, 5], p=[0.45, 0.30, 0.15, 0.06, 0.03, 0.01])
        active_signals = rng.choice(FEATURE_ORDER, size=active_count, replace=False)
        row = []
        for signal in FEATURE_ORDER:
            if signal in active_signals:
                row.append(rng.uniform(0.4, 1.0) * MAX_POINTS[signal])
            else:
                row.append(0.0)
        rows.append(row)
    return np.array(rows)


def _average_path_length_norm(n: int) -> float:
    """c(n): expected path length of an unsuccessful BST search, used to
    normalize raw path lengths into a bounded anomaly score."""
    if n <= 1:
        return 0.0
    harmonic = math.log(n - 1) + EULER_MASCHERONI
    return 2 * harmonic - (2 * (n - 1) / n)


class _Node:
    __slots__ = ("feature", "split", "left", "right", "size")

    def __init__(self, feature=None, split=None, left=None, right=None, size=0):
        self.feature = feature
        self.split = split
        self.left = left
        self.right = right
        self.size = size

    @property
    def is_leaf(self) -> bool:
        return self.left is None and self.right is None


def _build_tree(data: np.ndarray, depth: int, max_depth: int, rng: np.random.Generator) -> _Node:
    n = len(data)
    if depth >= max_depth or n <= 1:
        return _Node(size=n)

    feature = int(rng.integers(0, data.shape[1]))
    column = data[:, feature]
    lo, hi = column.min(), column.max()
    if lo == hi:
        return _Node(size=n)

    split = float(rng.uniform(lo, hi))
    left_mask = column < split
    left = _build_tree(data[left_mask], depth + 1, max_depth, rng)
    right = _build_tree(data[~left_mask], depth + 1, max_depth, rng)
    return _Node(feature=feature, split=split, left=left, right=right)


def _path_length(x: np.ndarray, node: _Node, depth: int) -> float:
    if node.is_leaf:
        return depth + _average_path_length_norm(node.size)
    branch = node.left if x[node.feature] < node.split else node.right
    return _path_length(x, branch, depth + 1)


class ScratchIsolationForest:
    """Minimal Isolation Forest: random trees that isolate points via random
    feature/threshold splits; points with short average path length across
    trees are the easiest to isolate, i.e. the most anomalous."""

    def __init__(self, n_estimators: int = 200, sample_size: int = 256, seed: int = 42):
        self.n_estimators = n_estimators
        self.sample_size = sample_size
        self.seed = seed
        self._trees: list[_Node] = []
        self._effective_sample_size = sample_size

    def fit(self, data: np.ndarray) -> "ScratchIsolationForest":
        rng = np.random.default_rng(self.seed)
        n = len(data)
        self._effective_sample_size = min(self.sample_size, n)
        max_depth = int(math.ceil(math.log2(max(self._effective_sample_size, 2))))

        self._trees = []
        for _ in range(self.n_estimators):
            idx = rng.choice(n, size=self._effective_sample_size, replace=False)
            sample = data[idx]
            self._trees.append(_build_tree(sample, 0, max_depth, rng))
        return self

    def anomaly_score(self, x: np.ndarray) -> float:
        """Returns a score in [0, 1]; closer to 1 = more anomalous."""
        avg_path = float(np.mean([_path_length(x, tree, 0) for tree in self._trees]))
        norm = _average_path_length_norm(self._effective_sample_size)
        if norm <= 0:
            return 0.0
        return 2 ** (-avg_path / norm)


class IsolationScorer:
    def __init__(self) -> None:
        training_data = _synthetic_training_set()
        self._forest = ScratchIsolationForest(n_estimators=200, sample_size=256, seed=42)
        self._forest.fit(training_data)

        train_scores = np.array([self._forest.anomaly_score(row) for row in training_data])
        self._train_min = float(train_scores.min())
        self._train_max = float(train_scores.max())

    def score(self, hits: list[SignalHit]) -> float:
        """Returns a 0-100 anomaly score (100 = most anomalous)."""
        vector = signals_to_vector(hits)
        raw = self._forest.anomaly_score(vector)
        span = self._train_max - self._train_min
        if span <= 0:
            return 0.0
        normalized = (raw - self._train_min) / span
        return float(np.clip(normalized * 100, 0, 100))


_scorer: IsolationScorer | None = None


def get_scorer() -> IsolationScorer:
    global _scorer
    if _scorer is None:
        _scorer = IsolationScorer()
    return _scorer
