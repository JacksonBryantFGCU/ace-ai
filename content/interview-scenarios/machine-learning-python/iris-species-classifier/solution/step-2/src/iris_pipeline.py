"""Iris species pipeline helpers (reference solution through Step 2)."""
from __future__ import annotations

import pandas as pd
from sklearn.metrics import accuracy_score
from sklearn.tree import DecisionTreeClassifier

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


def _require_columns(df: pd.DataFrame, required: list[str], label: str) -> None:
    missing = [column for column in required if column not in df.columns]
    if missing:
        raise ValueError(f"{label} is missing required column(s): {', '.join(missing)}")


def load_training_data(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    _require_columns(df, REQUIRED_TRAIN_COLUMNS, "Training data")
    return df


def load_test_data(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    _require_columns(df, REQUIRED_TEST_COLUMNS, "Test data")
    return df


def prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    drop_columns = [c for c in (ID_COLUMN, TARGET_COLUMN) if c in df.columns]
    return df.drop(columns=drop_columns).copy()


def train_model(X: pd.DataFrame, y: pd.Series) -> DecisionTreeClassifier:
    model = DecisionTreeClassifier(random_state=RANDOM_STATE, max_depth=4)
    model.fit(X, y)
    return model


def evaluate_model(model: DecisionTreeClassifier, X: pd.DataFrame, y: pd.Series) -> dict:
    predictions = model.predict(X)
    return {"accuracy": float(accuracy_score(y, predictions))}


def predict_species(model, X_test: pd.DataFrame):
    raise NotImplementedError("predict_species is not implemented yet")


def save_predictions(sample_ids, predictions, path: str) -> None:
    raise NotImplementedError("save_predictions is not implemented yet")
