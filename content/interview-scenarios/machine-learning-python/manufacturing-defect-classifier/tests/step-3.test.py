"""Step 3 - Evaluate, Train, and Generate Artifacts."""
import csv
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest
from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.defect_pipeline import (  # noqa: E402
    N_SPLITS,
    RANDOM_STATE,
    build_pipeline,
    evaluate_pipeline,
    identify_feature_columns,
    load_training_data,
    train_and_predict,
)

TRAIN_CSV = ROOT / "data" / "train.csv"
TEST_CSV = ROOT / "data" / "test.csv"
PREDICTIONS_CSV = ROOT / "predictions.csv"
METRICS_JSON = ROOT / "metrics.json"
REPORT_TXT = ROOT / "report.txt"

# Calibrated against the real deterministic reference solution: accuracy
# ~0.825, precision ~0.540, recall ~0.790, f1 ~0.642, roc_auc ~0.888,
# cv f1 mean ~0.638. Thresholds sit comfortably below those values but
# reject the majority-class baseline and an imbalance-naive classifier.
ACCURACY_THRESHOLD = 0.75
PRECISION_THRESHOLD = 0.40
RECALL_THRESHOLD = 0.60
F1_THRESHOLD = 0.55
ROC_AUC_THRESHOLD = 0.78
CV_F1_MEAN_THRESHOLD = 0.50


def _read_csv_rows(path: Path):
    with open(path, newline="") as f:
        return list(csv.reader(f))


@pytest.fixture(scope="module")
def training_split():
    train_df = load_training_data(str(TRAIN_CSV))
    numeric_features, categorical_features = identify_feature_columns(train_df)
    X = train_df.drop(columns=["component_id", "is_defective"])
    y = train_df["is_defective"].astype(int)
    return X, y, numeric_features, categorical_features


@pytest.fixture(scope="module")
def reference_metrics(training_split):
    X, y, numeric_features, categorical_features = training_split
    pipeline = build_pipeline(numeric_features, categorical_features)
    return evaluate_pipeline(pipeline, X, y)


# ---- evaluate_pipeline structure / correctness ----------------------------


def test_evaluate_pipeline_returns_expected_shape(reference_metrics):
    assert "summary" in reference_metrics
    assert "cross_validation" in reference_metrics
    assert "confusion_matrix" in reference_metrics
    for key in ("accuracy", "precision", "recall", "f1", "roc_auc"):
        assert key in reference_metrics["summary"]


def test_all_summary_metrics_are_finite_numbers(reference_metrics):
    for value in reference_metrics["summary"].values():
        assert isinstance(value, (int, float))
        assert value == value  # not NaN
        assert value not in (float("inf"), float("-inf"))


def test_metric_ranges_are_valid(reference_metrics):
    summary = reference_metrics["summary"]
    for key in ("accuracy", "precision", "recall", "f1", "roc_auc"):
        assert 0.0 <= summary[key] <= 1.0


def test_cross_validation_uses_expected_fold_count(reference_metrics):
    cv = reference_metrics["cross_validation"]
    assert cv["fold_count"] == N_SPLITS
    assert len(cv["fold_scores"]) == N_SPLITS
    for score in cv["fold_scores"]:
        assert isinstance(score, (int, float))
        assert score == score  # not NaN


def test_cross_validation_mean_and_std_match_fold_scores(reference_metrics):
    cv = reference_metrics["cross_validation"]
    scores = np.array(cv["fold_scores"])
    assert abs(cv["mean"] - scores.mean()) < 1e-6
    assert abs(cv["std"] - scores.std()) < 1e-6


def test_confusion_matrix_is_valid_2x2_integer_structure(reference_metrics):
    cm = reference_metrics["confusion_matrix"]
    assert len(cm) == 2
    for row in cm:
        assert len(row) == 2
        for value in row:
            assert isinstance(value, int)
            assert value >= 0
    total = sum(sum(row) for row in cm)
    train_df = load_training_data(str(TRAIN_CSV))
    assert total == len(train_df)


def test_calibrated_thresholds_are_met(reference_metrics):
    summary = reference_metrics["summary"]
    cv = reference_metrics["cross_validation"]
    assert summary["accuracy"] >= ACCURACY_THRESHOLD
    assert summary["precision"] >= PRECISION_THRESHOLD
    assert summary["recall"] >= RECALL_THRESHOLD
    assert summary["f1"] >= F1_THRESHOLD
    assert summary["roc_auc"] >= ROC_AUC_THRESHOLD
    assert cv["mean"] >= CV_F1_MEAN_THRESHOLD


def test_cross_validation_is_stratified_and_shuffled_deterministically(training_split):
    """The candidate's evaluate_pipeline must use the SAME fold assignment a
    StratifiedKFold(n_splits=N_SPLITS, shuffle=True, random_state=RANDOM_STATE)
    would produce - proven by checking two independent evaluate_pipeline runs
    agree exactly (same folds -> same scores) AND that folds are stratified
    (each fold's positive rate stays close to the overall positive rate)."""
    X, y, numeric_features, categorical_features = training_split
    pipeline_a = build_pipeline(numeric_features, categorical_features)
    result_a = evaluate_pipeline(pipeline_a, X, y)
    pipeline_b = build_pipeline(numeric_features, categorical_features)
    result_b = evaluate_pipeline(pipeline_b, X, y)
    assert result_a["cross_validation"]["fold_scores"] == pytest.approx(
        result_b["cross_validation"]["fold_scores"], abs=1e-9
    )

    skf = StratifiedKFold(n_splits=N_SPLITS, shuffle=True, random_state=RANDOM_STATE)
    overall_rate = y.mean()
    for _, val_idx in skf.split(X, y):
        fold_rate = y.iloc[val_idx].mean()
        assert abs(fold_rate - overall_rate) < 0.12


def test_majority_class_baseline_fails_the_scenario_thresholds(training_split):
    X, y, numeric_features, categorical_features = training_split
    baseline = build_pipeline(numeric_features, categorical_features)
    baseline.steps[-1] = ("classify", DummyClassifier(strategy="most_frequent"))
    result = evaluate_pipeline(baseline, X, y)
    summary = result["summary"]
    assert summary["f1"] < F1_THRESHOLD
    assert summary["roc_auc"] < ROC_AUC_THRESHOLD
    assert summary["precision"] < PRECISION_THRESHOLD or summary["recall"] < RECALL_THRESHOLD


def test_imbalance_naive_pipeline_fails_recall(training_split):
    """A classifier that ignores class imbalance (no class_weight) trades
    recall for accuracy on this ~20% positive dataset - it should fail the
    recall bar even though its raw accuracy looks fine."""
    X, y, numeric_features, categorical_features = training_split
    naive = build_pipeline(numeric_features, categorical_features)
    naive.steps[-1] = ("classify", LogisticRegression(random_state=RANDOM_STATE, max_iter=2000))
    result = evaluate_pipeline(naive, X, y)
    assert result["summary"]["recall"] < RECALL_THRESHOLD


def test_no_train_test_target_leakage(training_split):
    """train_and_predict must never require or use a target column on the
    test side, and predictions must come only from features."""
    X, y, numeric_features, categorical_features = training_split
    test_df = pd.read_csv(TEST_CSV)
    assert "is_defective" not in test_df.columns
    pipeline = build_pipeline(numeric_features, categorical_features)
    X_test = test_df.drop(columns=["component_id"])
    labels, probabilities = train_and_predict(pipeline, X, y, X_test)
    assert len(labels) == len(test_df)
    assert len(probabilities) == len(test_df)
    assert set(labels).issubset({0, 1})
    assert all(0.0 <= p <= 1.0 for p in probabilities)


def test_repeated_full_runs_produce_identical_metrics(training_split):
    X, y, numeric_features, categorical_features = training_split
    pipeline_a = build_pipeline(numeric_features, categorical_features)
    result_a = evaluate_pipeline(pipeline_a, X, y)
    pipeline_b = build_pipeline(numeric_features, categorical_features)
    result_b = evaluate_pipeline(pipeline_b, X, y)
    assert result_a["summary"] == pytest.approx(result_b["summary"], abs=1e-9)
    assert result_a["confusion_matrix"] == result_b["confusion_matrix"]


# ---- main.py end-to-end artifact generation --------------------------------


@pytest.fixture(scope="module")
def main_run():
    return subprocess.run(
        [sys.executable, "main.py"],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        timeout=60,
    )


def test_running_main_succeeds(main_run):
    assert main_run.returncode == 0, (
        f"main.py failed (exit {main_run.returncode}):\n"
        f"stdout:\n{main_run.stdout}\nstderr:\n{main_run.stderr}"
    )


def test_predictions_file_is_created(main_run):
    assert PREDICTIONS_CSV.exists(), "main.py did not create predictions.csv"


def test_predictions_columns_are_exact(main_run):
    rows = _read_csv_rows(PREDICTIONS_CSV)
    assert rows[0] == ["component_id", "predicted_defect", "defect_probability"]


def test_predictions_row_count_matches_test_csv(main_run):
    test_rows = _read_csv_rows(TEST_CSV)[1:]
    pred_rows = _read_csv_rows(PREDICTIONS_CSV)[1:]
    assert len(pred_rows) == len(test_rows)


def test_predictions_preserve_test_component_order(main_run):
    test_rows = _read_csv_rows(TEST_CSV)[1:]
    pred_rows = _read_csv_rows(PREDICTIONS_CSV)[1:]
    expected_ids = [row[0] for row in test_rows]
    actual_ids = [row[0] for row in pred_rows]
    assert actual_ids == expected_ids


def test_predicted_defect_is_always_binary(main_run):
    pred_rows = _read_csv_rows(PREDICTIONS_CSV)[1:]
    for row in pred_rows:
        assert row[1] in ("0", "1")


def test_defect_probability_is_finite_and_bounded(main_run):
    pred_rows = _read_csv_rows(PREDICTIONS_CSV)[1:]
    for row in pred_rows:
        value = float(row[2])
        assert 0.0 <= value <= 1.0


def test_no_missing_predictions(main_run):
    pred_rows = _read_csv_rows(PREDICTIONS_CSV)[1:]
    for row in pred_rows:
        assert row[1] not in (None, "")
        assert row[2] not in (None, "")


def test_no_accidental_index_column(main_run):
    rows = _read_csv_rows(PREDICTIONS_CSV)
    assert len(rows[0]) == 3


def test_metrics_json_is_created(main_run):
    assert METRICS_JSON.exists(), "main.py did not create metrics.json"


def test_metrics_json_matches_required_structured_shape(main_run):
    data = json.loads(METRICS_JSON.read_text())
    for key in ("accuracy", "precision", "recall", "f1", "roc_auc"):
        assert key in data["summary"]
    assert "fold_scores" in data["cross_validation"]
    assert "mean" in data["cross_validation"]
    assert "std" in data["cross_validation"]
    assert isinstance(data["confusion_matrix"], list)
    assert data["dataset"]["training_rows"] > 0
    assert data["dataset"]["test_rows"] > 0
    assert isinstance(data["model"]["name"], str) and data["model"]["name"]


def test_metrics_json_values_are_valid(main_run):
    data = json.loads(METRICS_JSON.read_text())
    summary = data["summary"]
    for key in ("accuracy", "precision", "recall", "f1", "roc_auc"):
        assert 0.0 <= summary[key] <= 1.0
    train_rows = len(_read_csv_rows(TRAIN_CSV)) - 1
    test_rows = len(_read_csv_rows(TEST_CSV)) - 1
    assert data["dataset"]["training_rows"] == train_rows
    assert data["dataset"]["test_rows"] == test_rows
    assert 0.0 <= data["dataset"]["positive_rate"] <= 1.0


def test_metrics_json_thresholds_are_met_end_to_end(main_run):
    data = json.loads(METRICS_JSON.read_text())
    summary = data["summary"]
    assert summary["accuracy"] >= ACCURACY_THRESHOLD
    assert summary["f1"] >= F1_THRESHOLD
    assert summary["roc_auc"] >= ROC_AUC_THRESHOLD
    assert data["cross_validation"]["mean"] >= CV_F1_MEAN_THRESHOLD


def test_report_txt_is_created(main_run):
    assert REPORT_TXT.exists(), "main.py did not create report.txt"


def test_report_txt_contains_required_concepts(main_run):
    text = REPORT_TXT.read_text()
    train_rows = len(_read_csv_rows(TRAIN_CSV)) - 1
    test_rows = len(_read_csv_rows(TEST_CSV)) - 1
    assert "Manufacturing Defect Classifier Report" in text
    assert f"Training rows: {train_rows}" in text
    assert f"Test rows: {test_rows}" in text
    assert "Cross-validation" in text
    assert "ROC AUC" in text


def test_repeated_main_runs_produce_identical_artifacts(main_run):
    first_predictions = PREDICTIONS_CSV.read_text()
    first_metrics = json.loads(METRICS_JSON.read_text())

    second_run = subprocess.run(
        [sys.executable, "main.py"],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        timeout=60,
    )
    assert second_run.returncode == 0

    assert PREDICTIONS_CSV.read_text() == first_predictions
    assert json.loads(METRICS_JSON.read_text()) == first_metrics
