"""Support ticket pipeline helpers.

Implement these functions across the three interview steps:
  Step 1 - load_training_data / load_test_data / combine_text_fields
  Step 2 - prepare_features / train_model / evaluate_model
  Step 3 - predict_categories / save_predictions
"""
from __future__ import annotations

import pandas as pd

REQUIRED_TRAIN_COLUMNS = ["ticket_id", "subject", "message", "category"]
REQUIRED_TEST_COLUMNS = ["ticket_id", "subject", "message"]
TARGET_COLUMN = "category"
ID_COLUMN = "ticket_id"
VALID_CATEGORIES = ["billing", "technical", "account", "shipping"]
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
    REQUIRED_TEST_COLUMNS (test.csv has no `category` column).
    """
    raise NotImplementedError("load_test_data is not implemented yet")


def combine_text_fields(df: pd.DataFrame) -> pd.Series:
    """Combine `subject` and `message` into one text field per ticket.

    TODO: return a Series with one string per row, e.g.
    df["subject"] + " " + df["message"], preserving row order. Do not read
    `ticket_id` or `category` here - this is text-only.
    """
    raise NotImplementedError("combine_text_fields is not implemented yet")


def prepare_features(train_text: pd.Series, test_text: pd.Series | None = None):
    """Vectorize ticket text into model-ready numeric features.

    TODO: fit a TfidfVectorizer() on `train_text`. If `test_text` is given,
    also transform it with the SAME fitted vectorizer (never re-fit on test
    text) and return (X_train, X_test, vectorizer). If `test_text` is None,
    return (X_train, vectorizer).
    """
    raise NotImplementedError("prepare_features is not implemented yet")


def train_model(X, y: pd.Series):
    """Fit a deterministic text classifier on (X, y).

    TODO: train a LogisticRegression(random_state=RANDOM_STATE,
    max_iter=1000) (or an equivalently deterministic classifier) on the
    vectorized features and return the fitted model.
    """
    raise NotImplementedError("train_model is not implemented yet")


def evaluate_model(model, X, y: pd.Series) -> dict:
    """Evaluate `model` on a held-out split and return metrics.

    TODO: predict on X, compare against y, and return
    {"accuracy": <float>, "macro_f1": <float>}.
    """
    raise NotImplementedError("evaluate_model is not implemented yet")


def predict_categories(model, X_test):
    """Predict the category for every row of X_test, preserving row order.

    TODO: return model.predict(X_test) as a plain list of category strings.
    """
    raise NotImplementedError("predict_categories is not implemented yet")


def save_predictions(ticket_ids, predictions, path: str) -> None:
    """Write predictions.csv with columns ticket_id,predicted_category.

    TODO: write one row per (ticket_id, prediction) pair, in the given
    order, with the exact header `ticket_id,predicted_category`.
    """
    raise NotImplementedError("save_predictions is not implemented yet")
