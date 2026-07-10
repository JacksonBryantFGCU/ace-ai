"""Iris species pipeline helpers.

Implement these functions across the three interview steps:
  Step 1 - load_training_data / load_test_data / prepare_features
  Step 2 - train_model / evaluate_model
  Step 3 - predict_species / save_predictions
"""
from __future__ import annotations

import pandas as pd

REQUIRED_TRAIN_COLUMNS = [
    "sample_id",
    "sepal_length",
    "sepal_width",
    "petal_length",
    "petal_width",
    "species",
]
REQUIRED_TEST_COLUMNS = [
    "sample_id",
    "sepal_length",
    "sepal_width",
    "petal_length",
    "petal_width",
]
TARGET_COLUMN = "species"
ID_COLUMN = "sample_id"
RANDOM_STATE = 42


def load_training_data(path: str) -> pd.DataFrame:
    """Load workspace/data/train.csv and validate its shape.

    TODO: read the CSV at `path` with pandas, then validate that every column
    in REQUIRED_TRAIN_COLUMNS is present - raise ValueError with a clear
    message listing the missing column(s) if not. Return the DataFrame.
    """
    raise NotImplementedError("load_training_data is not implemented yet")


def load_test_data(path: str) -> pd.DataFrame:
    """Load workspace/data/test.csv and validate its shape.

    TODO: same as load_training_data, but validate against
    REQUIRED_TEST_COLUMNS (test.csv has no `species` column).
    """
    raise NotImplementedError("load_test_data is not implemented yet")


def prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    """Turn a raw sample DataFrame into a model-ready numeric feature matrix.

    TODO:
      - drop `sample_id` (and `species`, if present) - features only
      - the remaining columns (sepal_length, sepal_width, petal_length,
        petal_width) are already numeric, so no encoding is needed here
    Return the resulting DataFrame. Do not mutate `df` in place.
    """
    raise NotImplementedError("prepare_features is not implemented yet")


def train_model(X: pd.DataFrame, y: pd.Series):
    """Fit a deterministic classifier on (X, y).

    TODO: train a DecisionTreeClassifier(random_state=RANDOM_STATE,
    max_depth=4) (or an equivalently deterministic classifier) and return the
    fitted model.
    """
    raise NotImplementedError("train_model is not implemented yet")


def evaluate_model(model, X: pd.DataFrame, y: pd.Series) -> dict:
    """Evaluate `model` on a held-out split and return metrics.

    TODO: predict on X, compare against y, and return
    {"accuracy": <float>}.
    """
    raise NotImplementedError("evaluate_model is not implemented yet")


def predict_species(model, X_test: pd.DataFrame):
    """Predict species for every row of X_test, preserving row order.

    TODO: return model.predict(X_test) as a plain list of species strings.
    """
    raise NotImplementedError("predict_species is not implemented yet")


def save_predictions(sample_ids, predictions, path: str) -> None:
    """Write predictions.csv with columns sample_id,predicted_species.

    TODO: write one row per (sample_id, prediction) pair, in the given
    order, with the exact header `sample_id,predicted_species`.
    """
    raise NotImplementedError("save_predictions is not implemented yet")
