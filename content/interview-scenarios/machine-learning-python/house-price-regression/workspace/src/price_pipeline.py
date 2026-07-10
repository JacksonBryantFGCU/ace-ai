"""House price pipeline helpers.

Implement these functions across the three interview steps:
  Step 1 - load_training_data / load_test_data / prepare_features
  Step 2 - train_model / evaluate_model
  Step 3 - predict_prices / save_predictions
"""
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
    REQUIRED_TEST_COLUMNS (test.csv has no `price` column).
    """
    raise NotImplementedError("load_test_data is not implemented yet")


def prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    """Turn a raw home DataFrame into a model-ready numeric feature matrix.

    TODO:
      - drop `home_id` (and `price`, if present) - features only
      - one-hot encode CATEGORICAL_COLUMNS (neighborhood, has_garage)
      - use the FIXED NEIGHBORHOODS / GARAGE_VALUES category lists (e.g. via
        pd.Categorical(..., categories=NEIGHBORHOODS)) so train and test
        always produce the exact same encoded columns, even if one split is
        missing a value the other has.
    Return the resulting DataFrame. Do not mutate `df` in place.
    """
    raise NotImplementedError("prepare_features is not implemented yet")


def train_model(X: pd.DataFrame, y: pd.Series):
    """Fit a deterministic regression model on (X, y).

    TODO: train a RandomForestRegressor(random_state=RANDOM_STATE,
    n_estimators=50, max_depth=6) (or an equivalently deterministic
    regressor) and return the fitted model.
    """
    raise NotImplementedError("train_model is not implemented yet")


def evaluate_model(model, X: pd.DataFrame, y: pd.Series) -> dict:
    """Evaluate `model` on a held-out split and return metrics.

    TODO: predict on X, compare against y, and return
    {"mae": <float>, "r2": <float>}.
    """
    raise NotImplementedError("evaluate_model is not implemented yet")


def predict_prices(model, X_test: pd.DataFrame):
    """Predict prices for every row of X_test, preserving row order.

    TODO: return model.predict(X_test) rounded to the nearest integer dollar.
    """
    raise NotImplementedError("predict_prices is not implemented yet")


def save_predictions(home_ids, predictions, path: str) -> None:
    """Write predictions.csv with columns home_id,predicted_price.

    TODO: write one row per (home_id, prediction) pair, in the given order,
    with the exact header `home_id,predicted_price`.
    """
    raise NotImplementedError("save_predictions is not implemented yet")
