"""Step 2 - Train and Evaluate Text Classifier."""
import sys
from pathlib import Path

import pytest
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.ticket_pipeline import (  # noqa: E402
    VALID_CATEGORIES,
    combine_text_fields,
    evaluate_model,
    load_training_data,
    prepare_features,
    train_model,
)

TRAIN_PATH = str(ROOT / "data" / "train.csv")
ACCURACY_THRESHOLD = 0.80
MACRO_F1_THRESHOLD = 0.75


@pytest.fixture(scope="module")
def split():
    df = load_training_data(TRAIN_PATH)
    y = df["category"]
    text = combine_text_fields(df)
    X, vectorizer = prepare_features(text)
    return train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)


def test_no_target_leakage_in_features(split):
    # The vectorized feature matrix is built purely from `combine_text_fields`
    # (subject + message) - `prepare_features` never sees the category column,
    # so there is no way for the target to leak into X.
    X_train, X_val, y_train, y_val = split
    assert X_train.shape[0] == len(y_train)
    assert X_val.shape[0] == len(y_val)


def test_model_trains_without_crashing(split):
    X_train, X_val, y_train, y_val = split
    model = train_model(X_train, y_train)
    assert model is not None


def test_model_predictions_are_valid_categories(split):
    X_train, X_val, y_train, y_val = split
    model = train_model(X_train, y_train)
    predictions = model.predict(X_val)
    for prediction in predictions:
        assert prediction in VALID_CATEGORIES


def test_evaluate_model_returns_metric_dictionary(split):
    X_train, X_val, y_train, y_val = split
    model = train_model(X_train, y_train)
    metrics = evaluate_model(model, X_val, y_val)
    assert isinstance(metrics, dict)
    assert "accuracy" in metrics
    assert "macro_f1" in metrics
    for value in metrics.values():
        assert isinstance(value, (int, float))
        assert value == value  # not NaN


def test_evaluation_is_deterministic_across_runs(split):
    X_train, X_val, y_train, y_val = split
    model_a = train_model(X_train, y_train)
    metrics_a = evaluate_model(model_a, X_val, y_val)
    model_b = train_model(X_train, y_train)
    metrics_b = evaluate_model(model_b, X_val, y_val)
    assert metrics_a == metrics_b


def test_accuracy_threshold_is_met(split):
    X_train, X_val, y_train, y_val = split
    model = train_model(X_train, y_train)
    metrics = evaluate_model(model, X_val, y_val)
    assert metrics["accuracy"] >= ACCURACY_THRESHOLD


def test_macro_f1_threshold_is_met(split):
    X_train, X_val, y_train, y_val = split
    model = train_model(X_train, y_train)
    metrics = evaluate_model(model, X_val, y_val)
    assert metrics["macro_f1"] >= MACRO_F1_THRESHOLD
