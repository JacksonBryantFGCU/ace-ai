"""Invalid lookalike retail demand pipeline implementation.

Structurally close to retail-alt-passing/demand_pipeline.py (same imports,
same helper shapes, same lag_1/lag_7 computation, same Pipeline) but with one
genuine behavioral bug: rolling_mean_7 is computed as a rolling mean over the
RAW (un-shifted) target series, so each row's rolling feature includes that
row's own units_sold - the exact leakage this scenario's rubric and hidden
tests explicitly guard against. Used as a behavioral-equivalence fixture in
server/scenarios/behavioral-equivalence-ml.test.ts - it must FAIL the
scenario's real authored pytest suite.
"""
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
REQUIRED_FORECAST_COLUMNS = [column for column in REQUIRED_TRAIN_COLUMNS if column != "units_sold"]

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


def _missing_columns(frame: pd.DataFrame, expected_columns: list[str]) -> list[str]:
    present = set(frame.columns)
    return [column for column in expected_columns if column not in present]


def _assert_columns_present(frame: pd.DataFrame, expected_columns: list[str], label: str) -> None:
    absent = _missing_columns(frame, expected_columns)
    if absent:
        raise ValueError(f"{label} is missing required column(s): {', '.join(absent)}")


def _assert_no_duplicate_entity_dates(frame: pd.DataFrame, label: str) -> None:
    key_columns = [*ENTITY_COLUMNS, DATE_COLUMN]
    if frame.duplicated(subset=key_columns).any():
        raise ValueError(f"{label} has duplicate (store_id, product_id, date) combinations")


def _assert_target_is_well_formed(frame: pd.DataFrame, label: str) -> None:
    if TARGET_COLUMN not in frame.columns:
        return
    target = frame[TARGET_COLUMN]
    if not pd.api.types.is_numeric_dtype(target):
        raise ValueError(f"{label} {TARGET_COLUMN} must be numeric")
    if target.isna().any():
        raise ValueError(f"{label} {TARGET_COLUMN} must not contain missing values")
    if (target < 0).any():
        raise ValueError(f"{label} {TARGET_COLUMN} must be non-negative")


def validate_data(df: pd.DataFrame, required_columns: list[str], label: str) -> None:
    """Validate schema, uniqueness, and (if present) the target column."""
    for check in (
        lambda: _assert_columns_present(df, required_columns, label),
        lambda: _assert_no_duplicate_entity_dates(df, label),
        lambda: _assert_target_is_well_formed(df, label),
    ):
        check()


def _parse_dates(frame: pd.DataFrame) -> pd.DataFrame:
    frame = frame.copy()
    try:
        frame[DATE_COLUMN] = pd.to_datetime(frame[DATE_COLUMN])
    except (ValueError, TypeError) as exc:
        raise ValueError(f"Could not parse {DATE_COLUMN} as a date: {exc}") from exc
    return frame


def load_datasets(train_path: str, forecast_path: str) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Load train.csv and forecast.csv, parse dates, and validate both."""
    train_df = _parse_dates(pd.read_csv(train_path))
    forecast_df = _parse_dates(pd.read_csv(forecast_path))

    validate_data(train_df, REQUIRED_TRAIN_COLUMNS, "Training data")
    validate_data(forecast_df, REQUIRED_FORECAST_COLUMNS, "Forecast data")
    return train_df, forecast_df


def create_time_features(df: pd.DataFrame) -> pd.DataFrame:
    """Return a copy of df with day_of_week/day_of_month/month/is_weekend added."""
    result = df.copy()
    parsed_dates = result[DATE_COLUMN].dt
    result["day_of_week"] = parsed_dates.dayofweek
    result["day_of_month"] = parsed_dates.day
    result["month"] = parsed_dates.month
    result["is_weekend"] = (result["day_of_week"] >= 5).astype(int)
    return result


def prepare_training_data(df: pd.DataFrame) -> pd.DataFrame:
    """Sort df chronologically within each (store_id, product_id) group."""
    sort_key = [*ENTITY_COLUMNS, DATE_COLUMN]
    return df.sort_values(sort_key).reset_index(drop=True)


def create_lag_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add lag_1, lag_7, and rolling_mean_7, grouped by (store_id, product_id)
    and computed using only strictly prior rows within each group.

    df must already be sorted chronologically within each group (see
    prepare_training_data) and contain TARGET_COLUMN.
    """
    result = df.copy()
    grouped = result.groupby(ENTITY_COLUMNS)[TARGET_COLUMN]

    for periods, feature_name in ((1, "lag_1"), (7, "lag_7")):
        result[feature_name] = grouped.shift(periods)

    def _rolling_mean(series: pd.Series) -> pd.Series:
        # BUG: no .shift(1) before .rolling() - each row's own current-day
        # units_sold is included in its own trailing 7-row window, leaking
        # the target directly into a feature used at both train and predict
        # time.
        return series.rolling(window=7).mean()

    result["rolling_mean_7"] = grouped.transform(_rolling_mean)
    return result


def build_pipeline(numeric_features: list[str], categorical_features: list[str]) -> Pipeline:
    """Build a leakage-safe preprocessing + regression Pipeline.

    Numeric columns are median-imputed (tree-based estimators don't need
    scaling); categorical columns are most-frequent-imputed and one-hot
    encoded with unknown categories ignored at prediction time. All fitting
    happens inside the Pipeline.
    """

    def _numeric_branch() -> Pipeline:
        return Pipeline(steps=[("impute", SimpleImputer(strategy="median"))])

    def _categorical_branch() -> Pipeline:
        return Pipeline(
            steps=[
                ("impute", SimpleImputer(strategy="most_frequent")),
                ("encode", OneHotEncoder(handle_unknown="ignore")),
            ]
        )

    preprocessor = ColumnTransformer(
        transformers=[
            ("numeric", _numeric_branch(), numeric_features),
            ("categorical", _categorical_branch(), categorical_features),
        ]
    )
    regressor = RandomForestRegressor(
        n_estimators=N_ESTIMATORS,
        random_state=RANDOM_STATE,
        n_jobs=1,
    )
    return Pipeline(steps=[("preprocess", preprocessor), ("regress", regressor)])


def _weighted_mape(actual: np.ndarray, predicted: np.ndarray) -> float:
    total_actual = float(np.sum(np.abs(actual)))
    if total_actual == 0.0:
        return 0.0
    return float(np.sum(np.abs(actual - predicted)) / total_actual)


def _score_regression(actual: np.ndarray, predicted: np.ndarray) -> dict:
    residuals = actual - predicted
    mae = float(np.mean(np.abs(residuals)))
    rmse = float(np.sqrt(np.mean(np.square(residuals))))
    total_variance = float(np.sum(np.square(actual - actual.mean())))
    residual_variance = float(np.sum(np.square(residuals)))
    r2 = float(1.0 - residual_variance / total_variance) if total_variance > 0 else 0.0
    return {"mae": mae, "rmse": rmse, "r2": r2, "wmape": _weighted_mape(actual, predicted)}


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
    latest_date = feature_df[DATE_COLUMN].max()
    cutoff_date = latest_date - pd.Timedelta(days=validation_days)
    is_training_row = feature_df[DATE_COLUMN] <= cutoff_date

    training_rows = feature_df.loc[is_training_row]
    validation_rows = feature_df.loc[~is_training_row]

    feature_columns = [*numeric_features, *categorical_features]
    pipeline.fit(training_rows[feature_columns], training_rows[TARGET_COLUMN].to_numpy(dtype=float))

    y_val = validation_rows[TARGET_COLUMN].to_numpy(dtype=float)
    model_predicted = np.clip(pipeline.predict(validation_rows[feature_columns]), 0.0, None)
    validation_metrics = _score_regression(y_val, model_predicted)
    validation_metrics["validation_rows"] = int(len(validation_rows))

    baseline_predicted = validation_rows["lag_7"].to_numpy(dtype=float)
    baseline_metrics = _score_regression(y_val, baseline_predicted)
    baseline_metrics["name"] = "seasonal_naive_lag_7"

    return {"validation": validation_metrics, "baseline": baseline_metrics}


def _seed_known_history(historical_df: pd.DataFrame) -> dict[tuple[str, str], dict[pd.Timestamp, float]]:
    history: dict[tuple[str, str], dict[pd.Timestamp, float]] = {}
    for entity_key, group in historical_df.groupby(ENTITY_COLUMNS):
        history[entity_key] = dict(zip(group[DATE_COLUMN], group[TARGET_COLUMN].astype(float)))
    return history


def _lag_features_from_history(series_history: dict[pd.Timestamp, float], as_of_date: pd.Timestamp) -> dict:
    lag_1 = series_history.get(as_of_date - pd.Timedelta(days=1))
    lag_7 = series_history.get(as_of_date - pd.Timedelta(days=7))
    trailing_values = [
        series_history.get(as_of_date - pd.Timedelta(days=offset)) for offset in range(1, 8)
    ]
    trailing_values = [value for value in trailing_values if value is not None]
    rolling_mean_7 = float(np.mean(trailing_values)) if trailing_values else None
    return {"lag_1": lag_1, "lag_7": lag_7, "rolling_mean_7": rolling_mean_7}


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
    feature_columns = [*numeric_features, *categorical_features]
    pipeline.fit(feature_df[feature_columns], feature_df[TARGET_COLUMN].to_numpy(dtype=float))

    history = _seed_known_history(historical_df)
    row_feature_columns = [
        "base_price", "current_price", "promotion", "holiday", "inventory_level", "days_since_restock",
        "day_of_week", "day_of_month", "month", "is_weekend", "store_id", "product_id", "category",
    ]

    predicted_by_index: dict[int, float] = {}
    ordered_forecast = forecast_df.sort_values([*ENTITY_COLUMNS, DATE_COLUMN])

    # Rows sharing a date are mutually independent (each depends only on
    # strictly-prior-date history), so one predict() call per forecast date
    # is enough - only the recursion ACROSS dates matters for correctness.
    for forecast_date, day_rows in ordered_forecast.groupby(DATE_COLUMN):
        assembled_rows = []
        for _, row in day_rows.iterrows():
            entity_key = (row["store_id"], row["product_id"])
            series_history = history.setdefault(entity_key, {})
            assembled_rows.append(
                {
                    **{column: row[column] for column in row_feature_columns},
                    **_lag_features_from_history(series_history, forecast_date),
                }
            )

        day_features = pd.DataFrame(assembled_rows)[feature_columns]
        day_predictions = np.clip(pipeline.predict(day_features), 0.0, None)

        for (row_index, row), predicted_value in zip(day_rows.iterrows(), day_predictions):
            entity_key = (row["store_id"], row["product_id"])
            value = float(predicted_value)
            predicted_by_index[row_index] = value
            history[entity_key][forecast_date] = value

    return [predicted_by_index[index] for index in forecast_df.index]


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
        "Retail Demand Forecaster Report (alt implementation)",
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
