"""Model quality gates and operational metrics.

Defines baseline quality metrics that each AI module must meet before
deployment and provides evaluation logic for continuous quality monitoring.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Optional


class QualityStatus(str, Enum):
    PASS = "pass"
    FAIL = "fail"
    DEGRADED = "degraded"


@dataclass
class QualityMetric:
    id: str
    name: str
    description: str
    baseline_threshold: float
    unit: str
    module: str


# ── Quality Baselines ────────────────────────────────────────────────────

QUALITY_BASELINES: list[QualityMetric] = [
    QualityMetric(
        id="conversation_completion_rate",
        name="Conversation Completion Rate",
        description="Percentage of sessions that reach summary generation",
        baseline_threshold=0.85,
        unit="ratio",
        module="conversation",
    ),
    QualityMetric(
        id="red_flag_sensitivity",
        name="Red Flag Sensitivity",
        description="True positive rate for red-flag detection on test suite",
        baseline_threshold=0.95,
        unit="ratio",
        module="red_flag",
    ),
    QualityMetric(
        id="red_flag_specificity",
        name="Red Flag Specificity",
        description="True negative rate for red-flag detection (avoid false alarms)",
        baseline_threshold=0.90,
        unit="ratio",
        module="red_flag",
    ),
    QualityMetric(
        id="entity_extraction_f1",
        name="Entity Extraction F1",
        description="F1 score for clinical entity extraction from documents",
        baseline_threshold=0.80,
        unit="ratio",
        module="document",
    ),
    QualityMetric(
        id="ocr_accuracy",
        name="OCR Accuracy",
        description="Character-level accuracy on test document corpus",
        baseline_threshold=0.90,
        unit="ratio",
        module="document",
    ),
    QualityMetric(
        id="summary_clinician_acceptance",
        name="Summary Clinician Acceptance Rate",
        description="Rate at which generated summaries are accepted without major edits",
        baseline_threshold=0.75,
        unit="ratio",
        module="summary",
    ),
    QualityMetric(
        id="asr_word_error_rate",
        name="ASR Word Error Rate",
        description="Word error rate for speech transcription (lower is better)",
        baseline_threshold=0.15,
        unit="ratio_inverse",
        module="conversation",
    ),
    QualityMetric(
        id="fhir_validation_rate",
        name="FHIR Validation Rate",
        description="Percentage of generated FHIR bundles passing R4 validation",
        baseline_threshold=0.95,
        unit="ratio",
        module="fhir",
    ),
    QualityMetric(
        id="p95_latency_conversation",
        name="P95 Latency — Conversation Turn",
        description="95th percentile latency for a conversation turn (ms)",
        baseline_threshold=3000.0,
        unit="ms_max",
        module="conversation",
    ),
    QualityMetric(
        id="p95_latency_document",
        name="P95 Latency — Document Processing",
        description="95th percentile latency for document upload+process (ms)",
        baseline_threshold=10000.0,
        unit="ms_max",
        module="document",
    ),
]


@dataclass
class MetricResult:
    metric_id: str
    measured_value: float
    status: QualityStatus
    measured_at: datetime
    details: Optional[str] = None


def evaluate_metric(metric: QualityMetric, measured: float) -> MetricResult:
    """Evaluate a single metric against its threshold."""
    if metric.unit == "ratio_inverse":
        # Lower is better (e.g., WER)
        status = QualityStatus.PASS if measured <= metric.baseline_threshold else QualityStatus.FAIL
    elif metric.unit == "ms_max":
        # Lower is better (latency)
        status = QualityStatus.PASS if measured <= metric.baseline_threshold else QualityStatus.FAIL
    else:
        # Higher is better (e.g., accuracy, F1)
        status = QualityStatus.PASS if measured >= metric.baseline_threshold else QualityStatus.FAIL

    return MetricResult(
        metric_id=metric.id,
        measured_value=measured,
        status=status,
        measured_at=datetime.utcnow(),
    )


def evaluate_release(measurements: dict[str, float]) -> dict:
    """Evaluate all metrics for a release gate decision.

    Returns a dict with 'pass', 'results', and any 'blockers'.
    """
    results: list[MetricResult] = []
    blockers: list[str] = []

    for metric in QUALITY_BASELINES:
        if metric.id in measurements:
            result = evaluate_metric(metric, measurements[metric.id])
            results.append(result)
            if result.status == QualityStatus.FAIL:
                blockers.append(
                    f"{metric.name}: {result.measured_value:.3f} "
                    f"(threshold: {metric.baseline_threshold:.3f})"
                )

    return {
        "pass": len(blockers) == 0,
        "results": [
            {
                "metric_id": r.metric_id,
                "value": r.measured_value,
                "status": r.status.value,
            }
            for r in results
        ],
        "blockers": blockers,
    }
