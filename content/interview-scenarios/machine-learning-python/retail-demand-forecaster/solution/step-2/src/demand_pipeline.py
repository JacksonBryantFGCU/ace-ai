"""Retail demand pipeline helpers (reference solution through Step 2)."""
from __future__ import annotations

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

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


def _require_columns(df: pd.DataFrame, required: list[str], label: str) -> None:
    missing = [column for column in required if column not in df.columns]
    if missing:
        raise ValueError(f"{label} is missing required column(s): {', '.join(missing)}")


def _require_unique_entity_dates(df: pd.DataFrame, label: str) -> None:
    key = ENTITY_COLUMNS + [DATE_COLUMN]
    duplicates = df.duplicated(subset=key)
    if duplicates.any():
        raise ValueError(f"{label} has duplicate (store_id, product_id, date) combinations")


def validate_data(df: pd.DataFrame, required_columns: list[str], label: str) -> None:
    """Validate schema, uniqueness, and (if present) the target column."""
    _require_columns(df, required_columns, label)
    _require_unique_entity_dates(df, label)
    if TARGET_COLUMN in df.columns:
        if df[TARGET_COLUMN].isna().any():
            raise ValueError(f"{label} {TARGET_COLUMN} must not contain missing values")
        if not pd.api.types.is_numeric_dtype(df[TARGET_COLUMN]):
            raise ValueError(f"{label} {TARGET_COLUMN} must be numeric")
        if (df[TARGET_COLUMN] < 0).any():
            raise ValueError(f"{label} {TARGET_COLUMN} must be non-negative")


def load_datasets(train_path: str, forecast_path: str) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Load train.csv and forecast.csv, parse dates, and validate both."""
    train_df = pd.read_csv(train_path)
    forecast_df = pd.read_csv(forecast_path)

    try:
        train_df[DATE_COLUMN] = pd.to_datetime(train_df[DATE_COLUMN])
        forecast_df[DATE_COLUMN] = pd.to_datetime(forecast_df[DATE_COLUMN])
    except (ValueError, TypeError) as exc:
        raise ValueError(f"Could not parse {DATE_COLUMN} as a date: {exc}") from exc

    validate_data(train_df, REQUIRED_TRAIN_COLUMNS, "Training data")
    validate_data(forecast_df, REQUIRED_FORECAST_COLUMNS, "Forecast data")
    return train_df, forecast_df


def create_time_features(df: pd.DataFrame) -> pd.DataFrame:
    """Return a copy of df with day_of_week/day_of_month/month/is_weekend added."""
    df = df.copy()
    df["day_of_week"] = df[DATE_COLUMN].dt.dayofweek
    df["day_of_month"] = df[DATE_COLUMN].dt.day
    df["month"] = df[DATE_COLUMN].dt.month
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)
    return df


def prepare_training_data(df: pd.DataFrame) -> pd.DataFrame:
    """Sort df chronologically within each (store_id, product_id) group."""
    return df.sort_values(ENTITY_COLUMNS + [DATE_COLUMN]).reset_index(drop=True)


def create_lag_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add lag_1, lag_7, and rolling_mean_7, grouped by (store_id, product_id)
    and computed using only strictly prior rows within each group.

    df must already be sorted chronologically within each group (see
    prepare_training_data) and contain TARGET_COLUMN.
    """
    df = df.copy()
    grouped_target = df.groupby(ENTITY_COLUMNS)[TARGET_COLUMN]
    df["lag_1"] = grouped_target.shift(1)
    df["lag_7"] = grouped_target.shift(7)
    df["rolling_mean_7"] = df.groupby(ENTITY_COLUMNS)[TARGET_COLUMN].transform(
        lambda s: s.shift(1).rolling(7).mean()
    )
    return df


def build_pipeline(numeric_features: list[str], categorical_features: list[str]) -> Pipeline:
    """Build a leakage-safe preprocessing + regression Pipeline.

    Numeric columns are median-imputed (tree-based estimators don't need
    scaling); categorical columns are most-frequent-imputed and one-hot
    encoded with unknown categories ignored at prediction time. All fitting
    happens inside the Pipeline.
    """
    numeric_transformer = Pipeline(steps=[("impute", SimpleImputer(strategy="median"))])
    categorical_transformer = Pipeline(
        steps=[
            ("impute", SimpleImputer(strategy="most_frequent")),
            ("encode", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    preprocessor = ColumnTransformer(
        transformers=[
            ("numeric", numeric_transformer, numeric_features),
            ("categorical", categorical_transformer, categorical_features),
        ]
    )
    regressor = RandomForestRegressor(
        n_estimators=N_ESTIMATORS,
        random_state=RANDOM_STATE,
        n_jobs=1,
    )
    return Pipeline(steps=[("preprocess", preprocessor), ("regress", regressor)])


def evaluate_model(pipeline, feature_df, numeric_features, categorical_features, validation_days: int = VALIDATION_DAYS) -> dict:
    raise NotImplementedError("evaluate_model is not implemented yet")


def train_and_forecast(pipeline, historical_df, feature_df, forecast_df, numeric_features, categorical_features):
    raise NotImplementedError("train_and_forecast is not implemented yet")


def save_forecasts(forecast_df, predicted_units, path: str) -> None:
    raise NotImplementedError("save_forecasts is not implemented yet")


def write_artifacts(**kwargs) -> None:
    raise NotImplementedError("write_artifacts is not implemented yet")
