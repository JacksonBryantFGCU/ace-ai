"""Support ticket pipeline helpers (reference solution through Step 1)."""
from __future__ import annotations

import pandas as pd

REQUIRED_TRAIN_COLUMNS = ["ticket_id", "subject", "message", "category"]
REQUIRED_TEST_COLUMNS = ["ticket_id", "subject", "message"]
TARGET_COLUMN = "category"
ID_COLUMN = "ticket_id"
VALID_CATEGORIES = ["billing", "technical", "account", "shipping"]
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


def combine_text_fields(df: pd.DataFrame) -> pd.Series:
    return df["subject"].astype(str) + " " + df["message"].astype(str)


def prepare_features(train_text: pd.Series, test_text: pd.Series | None = None):
    raise NotImplementedError("prepare_features is not implemented yet")


def train_model(X, y: pd.Series):
    raise NotImplementedError("train_model is not implemented yet")


def evaluate_model(model, X, y: pd.Series) -> dict:
    raise NotImplementedError("evaluate_model is not implemented yet")


def predict_categories(model, X_test):
    raise NotImplementedError("predict_categories is not implemented yet")


def save_predictions(ticket_ids, predictions, path: str) -> None:
    raise NotImplementedError("save_predictions is not implemented yet")
