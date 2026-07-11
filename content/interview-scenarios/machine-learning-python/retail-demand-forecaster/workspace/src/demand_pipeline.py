"""Retail demand pipeline helpers.

Implement these functions across the three interview steps:
  Step 1 - load_datasets / validate_data / create_time_features /
           prepare_training_data
  Step 2 - create_lag_features / build_pipeline
  Step 3 - evaluate_model / train_and_forecast / save_forecasts /
           write_artifacts
"""
from __future__ import annotations

import pandas as pd

REQUIRED_TRAIN_COLUMNS = [
    "date",
    "store_id",
    "product_id",
    "category",
    "base_price",
    "current_price",
    "promotion",
    "holiday",
    "inventory_level",
    "days_since_restock",
    "units_sold",
]
REQUIRED_FORECAST_COLUMNS = [c for c in REQUIRED_TRAIN_COLUMNS if c != "units_sold"]

TARGET_COLUMN = "units_sold"
DATE_COLUMN = "date"
ENTITY_COLUMNS = ["store_id", "product_id"]

NUMERIC_FEATURES = [
    "base_price",
    "current_price",
    "promotion",
    "holiday",
    "inventory_level",
    "days_since_restock",
    "day_of_week",
    "day_of_month",
    "month",
    "is_weekend",
    "lag_1",
    "lag_7",
    "rolling_mean_7",
]
CATEGORICAL_FEATURES = ["store_id", "product_id", "category"]

RANDOM_STATE = 42
N_ESTIMATORS = 60
VALIDATION_DAYS = 17
FORECAST_HORIZON_DAYS = 14


def validate_data(df: pd.DataFrame, required_columns: list[str], label: str) -> None:
    """Validate that df has every column in required_columns, that
    (store_id, product_id, date) is unique, and (if TARGET_COLUMN is
    present) that it is numeric, non-missing, and non-negative.

    TODO: raise ValueError with a clear message for each failure mode.
    """
    raise NotImplementedError("validate_data is not implemented yet")


def load_datasets(train_path: str, forecast_path: str) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Load workspace/data/train.csv and workspace/data/forecast.csv.

    TODO: read both CSVs with pandas, parse DATE_COLUMN as a real datetime
    (pd.to_datetime - not string slicing), validate each against
    validate_data using REQUIRED_TRAIN_COLUMNS / REQUIRED_FORECAST_COLUMNS,
    and return (train_df, forecast_df).
    """
    raise NotImplementedError("load_datasets is not implemented yet")


def create_time_features(df: pd.DataFrame) -> pd.DataFrame:
    """Return a copy of df with day_of_week, day_of_month, month, and
    is_weekend columns derived from DATE_COLUMN.

    TODO: use the datetime column's .dt accessor (e.g. df[DATE_COLUMN].dt.dayofweek)
    - do not derive these from string slicing.
    """
    raise NotImplementedError("create_time_features is not implemented yet")


def prepare_training_data(df: pd.DataFrame) -> pd.DataFrame:
    """Sort df chronologically within each (store_id, product_id) group.

    TODO: sort_values by ENTITY_COLUMNS + [DATE_COLUMN] and reset the index.
    """
    raise NotImplementedError("prepare_training_data is not implemented yet")


def create_lag_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add lag_1, lag_7, and rolling_mean_7, grouped by (store_id, product_id).

    TODO: for each (store_id, product_id) group (df must already be sorted
    chronologically within each group), compute:
      - lag_1: TARGET_COLUMN shifted 1 row within the group
      - lag_7: TARGET_COLUMN shifted 7 rows within the group
      - rolling_mean_7: the mean of the last 7 SHIFTED values within the
        group - the current row's own target must never be part of its own
        rolling window, and no value may ever cross a (store_id, product_id)
        boundary.
    Return a copy of df with the three new columns (NaN where there isn't
    enough history yet).
    """
    raise NotImplementedError("create_lag_features is not implemented yet")


def build_pipeline(numeric_features: list[str], categorical_features: list[str]):
    """Build a leakage-safe preprocessing + regression Pipeline.

    TODO:
      - numeric branch: SimpleImputer(strategy="median")
      - categorical branch: SimpleImputer(strategy="most_frequent") ->
        OneHotEncoder(handle_unknown="ignore")
      - combine both branches with a ColumnTransformer
      - regressor: a deterministic, efficient scikit-learn regressor (e.g.
        RandomForestRegressor(n_estimators=N_ESTIMATORS,
        random_state=RANDOM_STATE, n_jobs=1))
      - combine preprocessing + regressor into ONE sklearn Pipeline and
        return it, UNFITTED. Preprocessing must only ever be fit inside this
        Pipeline.
    """
    raise NotImplementedError("build_pipeline is not implemented yet")


def evaluate_model(
    pipeline, feature_df: pd.DataFrame, numeric_features: list[str], categorical_features: list[str],
    validation_days: int = VALIDATION_DAYS,
) -> dict:
    """Leakage-safe CHRONOLOGICAL holdout evaluation of the whole pipeline.

    TODO:
      - feature_df already has calendar + lag/rolling features, with rows
        lacking sufficient lag history dropped
      - split by date: rows with date <= (max date - validation_days) are
        training, rows with date > that cutoff are validation - never a
        random or shuffled split
      - fit `pipeline` (not just the regressor) on the training rows only,
        predict on the validation rows, and compute MAE/RMSE/R2/WMAPE
      - also score a seasonal-naive baseline on the SAME validation rows by
        predicting each row's own lag_7 value directly (no model needed)
    Return a nested dict shaped like:
      {
        "validation": {"mae": ..., "rmse": ..., "r2": ..., "wmape": ...,
                         "validation_rows": ...},
        "baseline": {"name": "seasonal_naive_lag_7", "mae": ..., "rmse": ...,
                      "r2": ..., "wmape": ...},
      }
    All numeric values must be native Python floats/ints (not numpy scalars).
    """
    raise NotImplementedError("evaluate_model is not implemented yet")


def train_and_forecast(
    pipeline, historical_df: pd.DataFrame, feature_df: pd.DataFrame, forecast_df: pd.DataFrame,
    numeric_features: list[str], categorical_features: list[str],
) -> list[float]:
    """Fit `pipeline` on ALL of feature_df, then RECURSIVELY forecast every
    row of forecast_df, preserving forecast_df's row order.

    TODO: process forecast_df one date at a time, in chronological order.
    For each date, and for each (store_id, product_id) row on that date,
    build lag_1/lag_7/rolling_mean_7 from the combined history so far (real
    historical units_sold from historical_df, plus predictions you've
    already made earlier in this same recursive run) - never from a hidden
    future target. Predict, clamp negative predictions to 0.0, append the
    prediction to that series' history, and continue to the next date.
    Return the list of predicted values in forecast_df's original row order.
    """
    raise NotImplementedError("train_and_forecast is not implemented yet")


def save_forecasts(forecast_df: pd.DataFrame, predicted_units: list[float], path: str) -> None:
    """Write forecasts.csv with columns date,store_id,product_id,predicted_units.

    TODO: write one row per forecast_df row, in its original order, with
    that exact header and no pandas index column.
    """
    raise NotImplementedError("save_forecasts is not implemented yet")


def write_artifacts(**kwargs) -> None:
    """Write forecasts.csv, metrics.json, and report.txt next to main.py.

    TODO: call save_forecasts(...) for forecasts.csv, then write a
    metrics.json with "validation", "baseline", "improvement", "forecast",
    "dataset", and "model" sections, and a short human-readable report.txt
    summarizing the run. See main.py for the exact keyword arguments this
    is called with.
    """
    raise NotImplementedError("write_artifacts is not implemented yet")
