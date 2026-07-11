"""Retail demand pipeline helpers (reference solution, all steps)."""
from __future__ import annotations

import json

import numpy as np
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


def _wmape(actual: np.ndarray, predicted: np.ndarray) -> float:
    denominator = float(np.sum(np.abs(actual)))
    if denominator == 0.0:
        return 0.0
    return float(np.sum(np.abs(actual - predicted)) / denominator)


def _regression_metrics(actual: np.ndarray, predicted: np.ndarray) -> dict:
    errors = actual - predicted
    mae = float(np.mean(np.abs(errors)))
    rmse = float(np.sqrt(np.mean(errors**2)))
    ss_res = float(np.sum(errors**2))
    ss_tot = float(np.sum((actual - actual.mean()) ** 2))
    r2 = float(1.0 - ss_res / ss_tot) if ss_tot > 0 else 0.0
    wmape = _wmape(actual, predicted)
    return {"mae": mae, "rmse": rmse, "r2": r2, "wmape": wmape}


def evaluate_model(
    pipeline: Pipeline,
    feature_df: pd.DataFrame,
    numeric_features: list[str],
    categorical_features: list[str],
    validation_days: int = VALIDATION_DAYS,
) -> dict:
    """Leakage-safe chronological holdout evaluation of the whole pipeline.

    `feature_df` must already have calendar + lag/rolling features and rows
    without sufficient lag history dropped. Trains on dates <= cutoff,
    validates on dates > cutoff (never a random/shuffled split), and also
    scores a seasonal-naive (lag_7) baseline on the same validation rows.
    """
    cutoff = feature_df[DATE_COLUMN].max() - pd.Timedelta(days=validation_days)
    train_part = feature_df[feature_df[DATE_COLUMN] <= cutoff]
    val_part = feature_df[feature_df[DATE_COLUMN] > cutoff]

    feature_columns = numeric_features + categorical_features
    X_train, y_train = train_part[feature_columns], train_part[TARGET_COLUMN].to_numpy(dtype=float)
    X_val, y_val = val_part[feature_columns], val_part[TARGET_COLUMN].to_numpy(dtype=float)

    pipeline.fit(X_train, y_train)
    predicted = np.clip(pipeline.predict(X_val), 0.0, None)
    validation_metrics = _regression_metrics(y_val, predicted)
    validation_metrics["validation_rows"] = int(len(val_part))

    baseline_predicted = val_part["lag_7"].to_numpy(dtype=float)
    baseline_metrics = _regression_metrics(y_val, baseline_predicted)
    baseline_metrics["name"] = "seasonal_naive_lag_7"

    return {"validation": validation_metrics, "baseline": baseline_metrics}


def train_and_forecast(
    pipeline: Pipeline,
    historical_df: pd.DataFrame,
    feature_df: pd.DataFrame,
    forecast_df: pd.DataFrame,
    numeric_features: list[str],
    categorical_features: list[str],
) -> list[float]:
    """Fit `pipeline` on all engineered historical rows, then recursively
    forecast every row of `forecast_df`, preserving its row order.

    `historical_df` is the raw (post calendar-feature, pre lag-feature,
    chronologically sorted) training data - used to seed each
    (store_id, product_id) series' known-history for the recursive lag
    computation. `feature_df` is the lag-engineered, history-complete rows
    used to fit the final model.
    """
    feature_columns = numeric_features + categorical_features
    pipeline.fit(feature_df[feature_columns], feature_df[TARGET_COLUMN].to_numpy(dtype=float))

    # seed per-series known demand history (real actuals only, so far)
    history: dict[tuple[str, str], dict[pd.Timestamp, float]] = {}
    for (store, product), group in historical_df.groupby(ENTITY_COLUMNS):
        history[(store, product)] = dict(zip(group[DATE_COLUMN], group[TARGET_COLUMN].astype(float)))

    forecast_sorted = forecast_df.sort_values(ENTITY_COLUMNS + [DATE_COLUMN])
    predictions_by_index: dict[int, float] = {}
    row_feature_columns = [
        "base_price", "current_price", "promotion", "holiday", "inventory_level", "days_since_restock",
        "day_of_week", "day_of_month", "month", "is_weekend", "store_id", "product_id", "category",
    ]

    # Rows within the SAME date are independent of one another (each only
    # depends on strictly-prior-date history), so they can be batched into
    # one pipeline.predict() call per forecast date - only the recursion
    # ACROSS dates matters for correctness, not the within-date order.
    for date, day_rows in forecast_sorted.groupby(DATE_COLUMN):
        feature_rows = []
        for _, row in day_rows.iterrows():
            key = (row["store_id"], row["product_id"])
            series = history.setdefault(key, {})
            lag_1 = series.get(date - pd.Timedelta(days=1))
            lag_7 = series.get(date - pd.Timedelta(days=7))
            window_values = [series.get(date - pd.Timedelta(days=d)) for d in range(1, 8)]
            window_values = [v for v in window_values if v is not None]
            rolling_mean_7 = float(np.mean(window_values)) if window_values else None

            feature_rows.append(
                {
                    **{col: row[col] for col in row_feature_columns},
                    "lag_1": lag_1,
                    "lag_7": lag_7,
                    "rolling_mean_7": rolling_mean_7,
                }
            )

        X_day = pd.DataFrame(feature_rows)[feature_columns]
        predicted_day = np.clip(pipeline.predict(X_day), 0.0, None)

        for (row_index, row), predicted in zip(day_rows.iterrows(), predicted_day):
            key = (row["store_id"], row["product_id"])
            predicted_value = float(predicted)
            predictions_by_index[row_index] = predicted_value
            history[key][date] = predicted_value

    return [predictions_by_index[idx] for idx in forecast_df.index]


def save_forecasts(forecast_df: pd.DataFrame, predicted_units: list[float], path: str) -> None:
    """Write forecasts.csv with columns date,store_id,product_id,predicted_units."""
    output = pd.DataFrame(
        {
            "date": forecast_df[DATE_COLUMN].dt.strftime("%Y-%m-%d"),
            "store_id": forecast_df["store_id"].to_numpy(),
            "product_id": forecast_df["product_id"].to_numpy(),
            "predicted_units": predicted_units,
        }
    )
    output.to_csv(path, index=False)


def write_artifacts(
    *,
    evaluation: dict,
    forecast_df: pd.DataFrame,
    predicted_units: list[float],
    forecasts_path: str,
    metrics_path: str,
    report_path: str,
    training_rows: int,
    historical_days: int,
    store_count: int,
    product_count: int,
    model_name: str,
) -> None:
    """Write forecasts.csv, metrics.json, and report.txt next to main.py."""
    save_forecasts(forecast_df, predicted_units, forecasts_path)

    validation = evaluation["validation"]
    baseline = evaluation["baseline"]
    predicted_array = np.array(predicted_units, dtype=float)

    metrics_payload = {
        "validation": {
            "mae": round(validation["mae"], 4),
            "rmse": round(validation["rmse"], 4),
            "r2": round(validation["r2"], 4),
            "wmape": round(validation["wmape"], 4),
            "validation_rows": validation["validation_rows"],
        },
        "baseline": {
            "name": baseline["name"],
            "mae": round(baseline["mae"], 4),
            "rmse": round(baseline["rmse"], 4),
            "r2": round(baseline["r2"], 4),
            "wmape": round(baseline["wmape"], 4),
        },
        "improvement": {
            "mae_reduction": round(baseline["mae"] - validation["mae"], 4),
            "rmse_reduction": round(baseline["rmse"] - validation["rmse"], 4),
            "wmape_reduction": round(baseline["wmape"] - validation["wmape"], 4),
        },
        "forecast": {
            "rows": len(predicted_units),
            "horizon_days": FORECAST_HORIZON_DAYS,
            "minimum_prediction": round(float(predicted_array.min()), 4),
            "maximum_prediction": round(float(predicted_array.max()), 4),
            "mean_prediction": round(float(predicted_array.mean()), 4),
        },
        "dataset": {
            "training_rows": training_rows,
            "stores": store_count,
            "products": product_count,
            "historical_days": historical_days,
        },
        "model": {
            "name": model_name,
            "validation_strategy": "chronological_holdout",
        },
    }

    with open(metrics_path, "w") as f:
        json.dump(metrics_payload, f, indent=2)

    report_lines = [
        "Retail Demand Forecaster Report",
        f"Historical rows: {training_rows}",
        f"Forecast rows: {len(predicted_units)}",
        f"Stores: {store_count}",
        f"Products: {product_count}",
        f"Historical days: {historical_days}",
        f"Forecast horizon (days): {FORECAST_HORIZON_DAYS}",
        f"Model: {model_name}",
        "Validation strategy: chronological_holdout",
        f"Validation MAE: {metrics_payload['validation']['mae']:.4f}",
        f"Validation RMSE: {metrics_payload['validation']['rmse']:.4f}",
        f"Validation R2: {metrics_payload['validation']['r2']:.4f}",
        f"Validation WMAPE: {metrics_payload['validation']['wmape']:.4f}",
        f"Baseline ({baseline['name']}) MAE: {metrics_payload['baseline']['mae']:.4f}",
        f"Baseline ({baseline['name']}) RMSE: {metrics_payload['baseline']['rmse']:.4f}",
        f"Baseline ({baseline['name']}) WMAPE: {metrics_payload['baseline']['wmape']:.4f}",
        f"MAE reduction vs baseline: {metrics_payload['improvement']['mae_reduction']:.4f}",
        f"WMAPE reduction vs baseline: {metrics_payload['improvement']['wmape_reduction']:.4f}",
        f"Generated forecasts: {len(predicted_units)}",
    ]
    with open(report_path, "w") as f:
        f.write("\n".join(report_lines) + "\n")
