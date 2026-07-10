"""Customer churn pipeline helpers.

Implement these functions across the three interview steps:
  Step 1 - load_training_data / load_test_data / prepare_features
  Step 2 - train_model / evaluate_model
  Step 3 - predict_churn / save_predictions
"""
from __future__ import annotations

import pandas as pd

REQUIRED_TRAIN_COLUMNS = [
    "customer_id",
    "tenure_months",
    "monthly_charges",
    "support_tickets",
    "contract_type",
    "auto_pay",
    "churned",
]
REQUIRED_TEST_COLUMNS = [
    "customer_id",
    "tenure_months",
    "monthly_charges",
    "support_tickets",
    "contract_type",
    "auto_pay",
]
TARGET_COLUMN = "churned"
ID_COLUMN = "customer_id"
CATEGORICAL_COLUMNS = ["contract_type", "auto_pay"]
CONTRACT_TYPES = ["monthly", "annual", "two_year"]
AUTO_PAY_VALUES = ["yes", "no"]
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
    REQUIRED_TEST_COLUMNS (test.csv has no `churned` column).
    """
    raise NotImplementedError("load_test_data is not implemented yet")


def prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    """Turn a raw customer DataFrame into model-ready numeric features.

    TODO:
      - drop `customer_id` (and `churned`, if present) - features only
      - one-hot encode CATEGORICAL_COLUMNS (contract_type, auto_pay)
      - use the FIXED CONTRACT_TYPES / AUTO_PAY_VALUES category lists (e.g.
        via pd.Categorical(..., categories=CONTRACT_TYPES)) so train and test
        always produce the exact same encoded columns, even if one split is
        missing a value the other has.
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
    {"accuracy": <float>, "f1": <float>}.
    """
    raise NotImplementedError("evaluate_model is not implemented yet")


def predict_churn(model, X_test: pd.DataFrame):
    """Predict churn (0/1) for every row of X_test, preserving row order.

    TODO: return model.predict(X_test) as a plain list of ints (0 or 1).
    """
    raise NotImplementedError("predict_churn is not implemented yet")


def save_predictions(customer_ids, predictions, path: str) -> None:
    """Write predictions.csv with columns customer_id,churn_prediction.

    TODO: write one row per (customer_id, prediction) pair, in the given
    order, with the exact header `customer_id,churn_prediction`.
    """
    raise NotImplementedError("save_predictions is not implemented yet")
