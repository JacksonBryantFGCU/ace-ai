"""House price pipeline helpers (reference solution through Step 1)."""
from __future__ import annotations

import pandas as pd

REQUIRED_TRAIN_COLUMNS = [
    "home_id",
    "square_feet",
    "bedrooms",
    "bathrooms",
    "year_built",
    "neighborhood",
    "has_garage",
    "price",
]
REQUIRED_TEST_COLUMNS = [
    "home_id",
    "square_feet",
    "bedrooms",
    "bathrooms",
    "year_built",
    "neighborhood",
    "has_garage",
]
TARGET_COLUMN = "price"
ID_COLUMN = "home_id"
CATEGORICAL_COLUMNS = ["neighborhood", "has_garage"]
NEIGHBORHOODS = ["downtown", "suburban", "lakeside", "rural"]
GARAGE_VALUES = ["yes", "no"]
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
    features = df.drop(columns=drop_columns).copy()
    features["neighborhood"] = pd.Categorical(features["neighborhood"], categories=NEIGHBORHOODS)
    features["has_garage"] = pd.Categorical(features["has_garage"], categories=GARAGE_VALUES)
    features = pd.get_dummies(features, columns=CATEGORICAL_COLUMNS)
    return features


def train_model(X: pd.DataFrame, y: pd.Series):
    raise NotImplementedError("train_model is not implemented yet")


def evaluate_model(model, X: pd.DataFrame, y: pd.Series) -> dict:
    raise NotImplementedError("evaluate_model is not implemented yet")


def predict_prices(model, X_test: pd.DataFrame):
    raise NotImplementedError("predict_prices is not implemented yet")


def save_predictions(home_ids, predictions, path: str) -> None:
    raise NotImplementedError("save_predictions is not implemented yet")
