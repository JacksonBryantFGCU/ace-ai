"""Step 2 - Train and Evaluate Model."""
import sys
from pathlib import Path

import pandas as pd
import pytest
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.iris_pipeline import (  # noqa: E402
    evaluate_model,
    load_training_data,
    prepare_features,
    train_model,
)

TRAIN_PATH = str(ROOT / "data" / "train.csv")
ACCURACY_THRESHOLD = 0.85
VALID_SPECIES = {"setosa", "versicolor", "virginica"}


@pytest.fixture(scope="module")
def split():
    df = load_training_data(TRAIN_PATH)
    y = df["species"]
    X = prepare_features(df)
    return train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)


def test_prepare_features_is_model_ready(split):
    X_train, X_val, y_train, y_val = split
    for dtype in X_train.dtypes:
        assert pd.api.types.is_numeric_dtype(dtype)


def test_no_target_leakage_in_features(split):
    X_train, X_val, y_train, y_val = split
    assert "species" not in X_train.columns
    assert "species" not in X_val.columns


def test_model_trains_without_crashing(split):
    X_train, X_val, y_train, y_val = split
    model = train_model(X_train, y_train)
    assert model is not None


def test_model_predictions_are_valid_species(split):
    X_train, X_val, y_train, y_val = split
    model = train_model(X_train, y_train)
    predictions = model.predict(X_val)
    for prediction in predictions:
        assert prediction in VALID_SPECIES


def test_evaluate_model_returns_metric_dictionary(split):
    X_train, X_val, y_train, y_val = split
    model = train_model(X_train, y_train)
    metrics = evaluate_model(model, X_val, y_val)
    assert isinstance(metrics, dict)
    assert "accuracy" in metrics
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
