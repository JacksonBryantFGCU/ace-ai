import { beforeAll, describe, expect, it } from "vitest";
import { loadScenario } from "@/server/scenarios/load";
import { verifyFinalOnServer, verifyStepOnServer } from "@/server/scenarios/verification-service";
import { resolvePythonCommand, runProcessWithTimeout } from "@/server/scenarios/python-runtime";
import type { LoadedScenario } from "@/lib/scenarios/types";
import type { SnapshotFile } from "@/lib/scenarios/verification";

/**
 * Proves that ML candidate verification is BEHAVIORAL (checks against the
 * documented methodology contract in scenario.md / tests/step-N.test.py)
 * and NOT coupled to the literal text of `solution/`. For both public ML
 * scenarios (iris-species-classifier: classification,
 * retail-demand-forecaster: temporal/forecasting), this file:
 *
 *   1. Runs an ALTERNATIVE VALID implementation (different helper layout,
 *      different equivalent classifier/metric-computation style, different
 *      artifact-writing mechanism) through the REAL production verification
 *      path (verifyStepOnServer / verifyFinalOnServer -> real pytest
 *      subprocess) and asserts it PASSES.
 *   2. Runs several INVALID lookalikes, each broken for exactly ONE
 *      documented-methodology reason (target leakage, wrong row order,
 *      missing artifact, unshifted rolling feature, random/non-chronological
 *      temporal split), and asserts each FAILS, with the failure
 *      attributable to the specific defect (the relevant pytest test name
 *      appears in the failure output) rather than an unrelated crash.
 *
 * This is a test fixture, not a new scenario: nothing here touches
 * `content/interview-scenarios/`, registers a new scenario, or modifies any
 * reference solution or existing scenario test file.
 */

function buildFixtureFiles(loaded: LoadedScenario, overrides: Record<string, string>): SnapshotFile[] {
  return loaded.files.map((file) => ({
    path: file.path,
    role: file.role,
    content: overrides[file.path] ?? file.content,
  }));
}

let pytestAvailable = false;

beforeAll(async () => {
  try {
    const python = await resolvePythonCommand();
    const probe = await runProcessWithTimeout({
      cwd: process.cwd(),
      command: python,
      args: ["-m", "pytest", "--version"],
      timeoutMs: 5_000,
    });
    pytestAvailable = probe.exitCode === 0;
  } catch {
    pytestAvailable = false;
  }
}, 15_000);

// ─────────────────────────────────────────────────────────────────────────
// iris-species-classifier fixtures
// ─────────────────────────────────────────────────────────────────────────

const IRIS_SLUG = "iris-species-classifier";
const IRIS_STEP_ID = "generate-predictions";

/**
 * ALT-VALID: satisfies every documented requirement (fixed-random-state
 * deterministic classifier, no target leakage, exact predictions.csv shape
 * and order, metrics.json/report.txt contract) but differs from
 * `solution/step-3/` in real, substantive ways:
 *   - RandomForestClassifier instead of DecisionTreeClassifier (scenario.md
 *     step 2 explicitly allows "an equivalently deterministic classifier").
 *   - prepare_features SELECTS the known measurement columns instead of
 *     DROPPING id/target columns.
 *   - save_predictions writes via the stdlib `csv` module instead of
 *     `DataFrame.to_csv`.
 */
const IRIS_ALT_VALID_PIPELINE = `"""Iris species pipeline helpers (alternative valid solution - forest variant)."""
from __future__ import annotations

import csv
from typing import Iterable, Sequence

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

REQUIRED_TRAIN_COLUMNS = [
    "sample_id",
    "sepal_length",
    "sepal_width",
    "petal_length",
    "petal_width",
    "species",
]
REQUIRED_TEST_COLUMNS = [c for c in REQUIRED_TRAIN_COLUMNS if c != "species"]

TARGET_COLUMN = "species"
ID_COLUMN = "sample_id"
FEATURE_COLUMNS = ["sepal_length", "sepal_width", "petal_length", "petal_width"]
RANDOM_STATE = 42


def _validate_columns(df: pd.DataFrame, required: Sequence[str], label: str) -> None:
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"{label} is missing required column(s): {', '.join(missing)}")


def load_training_data(path: str) -> pd.DataFrame:
    frame = pd.read_csv(path)
    _validate_columns(frame, REQUIRED_TRAIN_COLUMNS, "Training data")
    return frame


def load_test_data(path: str) -> pd.DataFrame:
    frame = pd.read_csv(path)
    _validate_columns(frame, REQUIRED_TEST_COLUMNS, "Test data")
    return frame


def prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    # Select the known measurement columns explicitly rather than dropping
    # id/target columns - an equivalent, order-preserving way to reach the
    # same model-ready numeric matrix without ever touching sample_id/species.
    present = [c for c in FEATURE_COLUMNS if c in df.columns]
    return df.loc[:, present].astype(float).copy()


def train_model(X: pd.DataFrame, y: pd.Series) -> RandomForestClassifier:
    model = RandomForestClassifier(n_estimators=100, random_state=RANDOM_STATE, n_jobs=1)
    model.fit(X, y)
    return model


def evaluate_model(model: RandomForestClassifier, X: pd.DataFrame, y: pd.Series) -> dict:
    predicted = model.predict(X)
    return {"accuracy": float(accuracy_score(y, predicted))}


def predict_species(model: RandomForestClassifier, X_test: pd.DataFrame) -> list[str]:
    return [str(v) for v in model.predict(X_test)]


def save_predictions(sample_ids: Iterable[str], predictions: Iterable[str], path: str) -> None:
    with open(path, "w", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["sample_id", "predicted_species"])
        for sample_id, prediction in zip(sample_ids, predictions):
            writer.writerow([sample_id, prediction])
`;

const IRIS_ALT_VALID_MAIN = `"""Iris Species Classifier - alternative valid entrypoint (RandomForest variant)."""
from __future__ import annotations

import json
from pathlib import Path

from sklearn.model_selection import train_test_split

from src.iris_pipeline import (
    evaluate_model,
    load_test_data,
    load_training_data,
    predict_species,
    prepare_features,
    save_predictions,
    train_model,
)

DATA_DIR = Path(__file__).parent / "data"
PREDICTIONS_PATH = Path(__file__).parent / "predictions.csv"
METRICS_PATH = Path(__file__).parent / "metrics.json"
REPORT_PATH = Path(__file__).parent / "report.txt"
MODEL_NAME = "RandomForestClassifier"


def _write_report(train_rows: int, test_rows: int, accuracy: float, predicted_count: int) -> None:
    lines = [
        "Iris Species Classifier Report",
        f"Training rows: {train_rows}",
        f"Test rows: {test_rows}",
        f"Validation accuracy: {accuracy:.2f}",
        f"Generated predictions: {predicted_count}",
        f"Model: {MODEL_NAME}",
    ]
    REPORT_PATH.write_text("\\n".join(lines) + "\\n")


def main() -> None:
    train_df = load_training_data(str(DATA_DIR / "train.csv"))
    test_df = load_test_data(str(DATA_DIR / "test.csv"))
    print(f"Loaded training rows: {len(train_df)}")
    print(f"Loaded test rows: {len(test_df)}")

    features = prepare_features(train_df)
    target = train_df["species"]
    print(f"Prepared {features.shape[1]} model-ready feature columns.")

    X_train, X_val, y_train, y_val = train_test_split(
        features, target, test_size=0.25, random_state=42, stratify=target
    )
    model = train_model(X_train, y_train)
    metrics = evaluate_model(model, X_val, y_val)
    accuracy = metrics["accuracy"]
    print(f"Validation accuracy: {accuracy:.2f}")

    test_features = prepare_features(test_df).reindex(columns=features.columns, fill_value=0)
    predictions = predict_species(model, test_features)
    save_predictions(test_df["sample_id"], predictions, str(PREDICTIONS_PATH))
    print("Saved predictions.csv.")

    METRICS_PATH.write_text(
        json.dumps(
            {
                "accuracy": round(accuracy, 4),
                "train_rows": len(train_df),
                "test_rows": len(test_df),
                "model": MODEL_NAME,
            },
            indent=2,
        )
        + "\\n"
    )
    print("Saved metrics.json.")

    _write_report(len(train_df), len(test_df), accuracy, len(predictions))
    print("Saved report.txt.")


if __name__ == "__main__":
    main()
`;

/** Reference-derived base (matches solution/step-3/src/iris_pipeline.py exactly)
 *  used as the starting point for each invalid fixture, so exactly one
 *  documented-methodology defect is introduced per fixture. */
const IRIS_REFERENCE_PIPELINE = `"""Iris species pipeline helpers (reference solution, all steps)."""
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


def predict_species(model: DecisionTreeClassifier, X_test: pd.DataFrame) -> list[str]:
    return [str(value) for value in model.predict(X_test)]


def save_predictions(sample_ids, predictions, path: str) -> None:
    output = pd.DataFrame({"sample_id": list(sample_ids), "predicted_species": list(predictions)})
    output.to_csv(path, index=False)
`;

const IRIS_REFERENCE_MAIN = `"""Iris Species Classifier - entrypoint (reference solution, all steps)."""
from __future__ import annotations

import json
from pathlib import Path

from sklearn.model_selection import train_test_split

from src.iris_pipeline import (
    evaluate_model,
    load_test_data,
    load_training_data,
    predict_species,
    prepare_features,
    save_predictions,
    train_model,
)

DATA_DIR = Path(__file__).parent / "data"
PREDICTIONS_PATH = Path(__file__).parent / "predictions.csv"
METRICS_PATH = Path(__file__).parent / "metrics.json"
REPORT_PATH = Path(__file__).parent / "report.txt"
MODEL_NAME = "DecisionTreeClassifier"


def main() -> None:
    train_df = load_training_data(str(DATA_DIR / "train.csv"))
    test_df = load_test_data(str(DATA_DIR / "test.csv"))
    print(f"Loaded training rows: {len(train_df)}")
    print(f"Loaded test rows: {len(test_df)}")

    y = train_df["species"]
    X = prepare_features(train_df)
    print(f"Prepared {X.shape[1]} model-ready feature columns.")
    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)

    model = train_model(X_train, y_train)
    metrics = evaluate_model(model, X_val, y_val)
    accuracy = metrics["accuracy"]
    print(f"Validation accuracy: {accuracy:.2f}")

    X_test = prepare_features(test_df).reindex(columns=X.columns, fill_value=0)
    predictions = predict_species(model, X_test)
    save_predictions(test_df["sample_id"], predictions, str(PREDICTIONS_PATH))
    print("Saved predictions.csv.")

    metrics_payload = {
        "accuracy": round(accuracy, 4),
        "train_rows": len(train_df),
        "test_rows": len(test_df),
        "model": MODEL_NAME,
    }
    METRICS_PATH.write_text(json.dumps(metrics_payload, indent=2) + "\\n")
    print("Saved metrics.json.")

    report_lines = [
        "Iris Species Classifier Report",
        f"Training rows: {len(train_df)}",
        f"Test rows: {len(test_df)}",
        f"Validation accuracy: {accuracy:.2f}",
        f"Generated predictions: {len(predictions)}",
    ]
    REPORT_PATH.write_text("\\n".join(report_lines) + "\\n")
    print("Saved report.txt.")


if __name__ == "__main__":
    main()
`;

/** INVALID #1: target leakage - species is kept as a numeric-coded feature
 *  instead of being dropped, so the model can see the label directly. */
const IRIS_INVALID_LEAKAGE_PIPELINE = IRIS_REFERENCE_PIPELINE.replace(
  `def prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    drop_columns = [c for c in (ID_COLUMN, TARGET_COLUMN) if c in df.columns]
    return df.drop(columns=drop_columns).copy()`,
  `def prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    out = df.drop(columns=[ID_COLUMN]) if ID_COLUMN in df.columns else df.copy()
    if TARGET_COLUMN in out.columns:
        # BUG (target leakage): keep species around as a numeric code instead
        # of dropping it - the model can now see the label directly.
        out[TARGET_COLUMN] = out[TARGET_COLUMN].astype("category").cat.codes
    return out`,
);

/** INVALID #2: wrong row order - predictions are sorted by predicted species
 *  before being written, instead of preserving data/test.csv's row order. */
const IRIS_INVALID_ROW_ORDER_MAIN = IRIS_REFERENCE_MAIN.replace(
  `    X_test = prepare_features(test_df).reindex(columns=X.columns, fill_value=0)
    predictions = predict_species(model, X_test)
    save_predictions(test_df["sample_id"], predictions, str(PREDICTIONS_PATH))
    print("Saved predictions.csv.")`,
  `    X_test = prepare_features(test_df).reindex(columns=X.columns, fill_value=0)
    predictions = predict_species(model, X_test)
    # BUG (wrong row order): sort by predicted species instead of preserving
    # data/test.csv's row order.
    sorted_pairs = sorted(zip(test_df["sample_id"], predictions), key=lambda pair: pair[1])
    sorted_ids = [pair[0] for pair in sorted_pairs]
    sorted_predictions = [pair[1] for pair in sorted_pairs]
    save_predictions(sorted_ids, sorted_predictions, str(PREDICTIONS_PATH))
    print("Saved predictions.csv.")`,
);

/** INVALID #3: missing required artifact - report.txt is never written. */
const IRIS_INVALID_MISSING_ARTIFACT_MAIN = IRIS_REFERENCE_MAIN.replace(
  `    report_lines = [
        "Iris Species Classifier Report",
        f"Training rows: {len(train_df)}",
        f"Test rows: {len(test_df)}",
        f"Validation accuracy: {accuracy:.2f}",
        f"Generated predictions: {len(predictions)}",
    ]
    REPORT_PATH.write_text("\\n".join(report_lines) + "\\n")
    print("Saved report.txt.")`,
  `    # BUG (missing artifact): report.txt is never written.`,
);

// ─────────────────────────────────────────────────────────────────────────
// retail-demand-forecaster fixtures
// ─────────────────────────────────────────────────────────────────────────

const RETAIL_SLUG = "retail-demand-forecaster";
const RETAIL_STEP_ID = "evaluate-forecast-and-generate-artifacts";

const RETAIL_ALT_VALID_PIPELINE = `"""Retail demand pipeline helpers (alternative valid solution - restructured)."""
from __future__ import annotations

import csv
import json

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
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


def _missing_columns(df: pd.DataFrame, required) -> list:
    return [c for c in required if c not in df.columns]


def _require_columns(df: pd.DataFrame, required, label: str) -> None:
    missing = _missing_columns(df, required)
    if missing:
        raise ValueError(f"{label} is missing required column(s): {', '.join(missing)}")


def _require_unique_entity_dates(df: pd.DataFrame, label: str) -> None:
    key = [*ENTITY_COLUMNS, DATE_COLUMN]
    if df.duplicated(subset=key).any():
        raise ValueError(f"{label} has duplicate (store_id, product_id, date) combinations")


def _validate_target(df: pd.DataFrame, label: str) -> None:
    if TARGET_COLUMN not in df.columns:
        return
    column = df[TARGET_COLUMN]
    if column.isna().any():
        raise ValueError(f"{label} {TARGET_COLUMN} must not contain missing values")
    if not pd.api.types.is_numeric_dtype(column):
        raise ValueError(f"{label} {TARGET_COLUMN} must be numeric")
    if (column < 0).any():
        raise ValueError(f"{label} {TARGET_COLUMN} must be non-negative")


def validate_data(df: pd.DataFrame, required_columns, label: str) -> None:
    """Validate schema, uniqueness, and (if present) the target column."""
    _require_columns(df, required_columns, label)
    _require_unique_entity_dates(df, label)
    _validate_target(df, label)


def _parse_date_column(df: pd.DataFrame, label: str) -> pd.DataFrame:
    df = df.copy()
    try:
        df[DATE_COLUMN] = pd.to_datetime(df[DATE_COLUMN])
    except (ValueError, TypeError) as exc:
        raise ValueError(f"Could not parse {DATE_COLUMN} as a date: {exc}") from exc
    return df


def load_datasets(train_path: str, forecast_path: str):
    """Load train.csv and forecast.csv, parse dates, and validate both."""
    train_df = _parse_date_column(pd.read_csv(train_path), "Training data")
    forecast_df = _parse_date_column(pd.read_csv(forecast_path), "Forecast data")

    validate_data(train_df, REQUIRED_TRAIN_COLUMNS, "Training data")
    validate_data(forecast_df, REQUIRED_FORECAST_COLUMNS, "Forecast data")
    return train_df, forecast_df


def create_time_features(df: pd.DataFrame) -> pd.DataFrame:
    """Return a copy of df with day_of_week/day_of_month/month/is_weekend added."""
    out = df.copy()
    dt = out[DATE_COLUMN].dt
    out["day_of_week"] = dt.dayofweek
    out["day_of_month"] = dt.day
    out["month"] = dt.month
    out["is_weekend"] = np.where(out["day_of_week"] >= 5, 1, 0)
    return out


def prepare_training_data(df: pd.DataFrame) -> pd.DataFrame:
    """Sort df chronologically within each (store_id, product_id) group."""
    sort_keys = [*ENTITY_COLUMNS, DATE_COLUMN]
    return df.sort_values(sort_keys).reset_index(drop=True)


def create_lag_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add lag_1, lag_7, and rolling_mean_7, grouped by (store_id, product_id),
    using only strictly prior rows within each group.

    df must already be sorted chronologically within each group and contain
    TARGET_COLUMN.
    """
    out = df.copy()
    by_entity = out.groupby(ENTITY_COLUMNS)[TARGET_COLUMN]
    out["lag_1"] = by_entity.shift(1)
    out["lag_7"] = by_entity.shift(7)
    out["rolling_mean_7"] = out.groupby(ENTITY_COLUMNS)[TARGET_COLUMN].transform(
        lambda series: series.shift(1).rolling(window=7, min_periods=7).mean()
    )
    return out


def _numeric_branch() -> Pipeline:
    return Pipeline(steps=[("impute", SimpleImputer(strategy="median"))])


def _categorical_branch() -> Pipeline:
    return Pipeline(
        steps=[
            ("impute", SimpleImputer(strategy="most_frequent")),
            ("encode", OneHotEncoder(handle_unknown="ignore")),
        ]
    )


def build_pipeline(numeric_features, categorical_features) -> Pipeline:
    """Build a leakage-safe preprocessing + regression Pipeline (unfitted)."""
    preprocessor = ColumnTransformer(
        transformers=[
            ("numeric", _numeric_branch(), numeric_features),
            ("categorical", _categorical_branch(), categorical_features),
        ]
    )
    regressor = RandomForestRegressor(n_estimators=N_ESTIMATORS, random_state=RANDOM_STATE, n_jobs=1)
    return Pipeline(steps=[("preprocess", preprocessor), ("regress", regressor)])


def _wmape(actual: np.ndarray, predicted: np.ndarray) -> float:
    denom = float(np.sum(np.abs(actual)))
    if denom == 0.0:
        return 0.0
    return float(np.sum(np.abs(actual - predicted)) / denom)


def _regression_metrics(actual: np.ndarray, predicted: np.ndarray) -> dict:
    mae = float(mean_absolute_error(actual, predicted))
    rmse = float(np.sqrt(mean_squared_error(actual, predicted)))
    ss_tot = float(np.sum((actual - actual.mean()) ** 2))
    r2 = float(r2_score(actual, predicted)) if ss_tot > 0 else 0.0
    return {"mae": mae, "rmse": rmse, "r2": r2, "wmape": _wmape(actual, predicted)}


def evaluate_model(
    pipeline: Pipeline,
    feature_df: pd.DataFrame,
    numeric_features,
    categorical_features,
    validation_days: int = VALIDATION_DAYS,
) -> dict:
    """Leakage-safe chronological holdout evaluation vs a seasonal-naive baseline."""
    cutoff = feature_df[DATE_COLUMN].max() - pd.Timedelta(days=validation_days)
    train_part = feature_df[feature_df[DATE_COLUMN] <= cutoff]
    val_part = feature_df[feature_df[DATE_COLUMN] > cutoff]

    feature_columns = [*numeric_features, *categorical_features]
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


def _seed_history(historical_df: pd.DataFrame) -> dict:
    history: dict = {}
    for key, group in historical_df.groupby(ENTITY_COLUMNS):
        history[key] = dict(zip(group[DATE_COLUMN], group[TARGET_COLUMN].astype(float)))
    return history


_ROW_FEATURE_COLUMNS = [
    "base_price", "current_price", "promotion", "holiday", "inventory_level", "days_since_restock",
    "day_of_week", "day_of_month", "month", "is_weekend", "store_id", "product_id", "category",
]


def train_and_forecast(
    pipeline: Pipeline,
    historical_df: pd.DataFrame,
    feature_df: pd.DataFrame,
    forecast_df: pd.DataFrame,
    numeric_features,
    categorical_features,
) -> list:
    """Fit pipeline on all engineered historical rows, then recursively forecast
    every row of forecast_df, preserving its row order."""
    feature_columns = [*numeric_features, *categorical_features]
    pipeline.fit(feature_df[feature_columns], feature_df[TARGET_COLUMN].to_numpy(dtype=float))

    history = _seed_history(historical_df)
    forecast_sorted = forecast_df.sort_values([*ENTITY_COLUMNS, DATE_COLUMN])
    predictions_by_index: dict = {}

    for current_date, day_rows in forecast_sorted.groupby(DATE_COLUMN):
        rows = []
        for _, row in day_rows.iterrows():
            key = (row["store_id"], row["product_id"])
            series = history.setdefault(key, {})
            lag_1 = series.get(current_date - pd.Timedelta(days=1))
            lag_7 = series.get(current_date - pd.Timedelta(days=7))
            window = [series.get(current_date - pd.Timedelta(days=d)) for d in range(1, 8)]
            window = [v for v in window if v is not None]
            rolling_mean_7 = float(np.mean(window)) if window else None
            rows.append(
                {
                    **{col: row[col] for col in _ROW_FEATURE_COLUMNS},
                    "lag_1": lag_1,
                    "lag_7": lag_7,
                    "rolling_mean_7": rolling_mean_7,
                }
            )

        X_day = pd.DataFrame(rows)[feature_columns]
        predicted_day = np.clip(pipeline.predict(X_day), 0.0, None)

        for (row_index, row), predicted in zip(day_rows.iterrows(), predicted_day):
            key = (row["store_id"], row["product_id"])
            value = float(predicted)
            predictions_by_index[row_index] = value
            history[key][current_date] = value

    return [predictions_by_index[idx] for idx in forecast_df.index]


def save_forecasts(forecast_df: pd.DataFrame, predicted_units, path: str) -> None:
    """Write forecasts.csv with columns date,store_id,product_id,predicted_units."""
    dates = forecast_df[DATE_COLUMN].dt.strftime("%Y-%m-%d").tolist()
    stores = forecast_df["store_id"].tolist()
    products = forecast_df["product_id"].tolist()
    with open(path, "w", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["date", "store_id", "product_id", "predicted_units"])
        for date, store, product, value in zip(dates, stores, products, predicted_units):
            writer.writerow([date, store, product, value])


def write_artifacts(
    *,
    evaluation: dict,
    forecast_df: pd.DataFrame,
    predicted_units,
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

    with open(metrics_path, "w") as handle:
        json.dump(metrics_payload, handle, indent=2)

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
    with open(report_path, "w") as handle:
        handle.write("\\n".join(report_lines) + "\\n")
`;

const RETAIL_ALT_VALID_MAIN = `"""Retail Demand Forecaster - alternative valid entrypoint (restructured)."""
from __future__ import annotations

from pathlib import Path

from src.demand_pipeline import (
    CATEGORICAL_FEATURES,
    NUMERIC_FEATURES,
    build_pipeline,
    create_lag_features,
    create_time_features,
    evaluate_model,
    load_datasets,
    prepare_training_data,
    train_and_forecast,
    write_artifacts,
)

DATA_DIR = Path(__file__).parent / "data"
FORECASTS_PATH = Path(__file__).parent / "forecasts.csv"
METRICS_PATH = Path(__file__).parent / "metrics.json"
REPORT_PATH = Path(__file__).parent / "report.txt"
MODEL_NAME = "RandomForestRegressor"


def _load_and_engineer():
    train_df, forecast_df = load_datasets(str(DATA_DIR / "train.csv"), str(DATA_DIR / "forecast.csv"))
    print(f"Loaded historical rows: {len(train_df)}")
    print(f"Loaded forecast rows: {len(forecast_df)}")

    train_df = create_time_features(train_df)
    forecast_df = create_time_features(forecast_df)
    train_df = prepare_training_data(train_df)
    print("Created calendar features and sorted historical data chronologically.")

    feature_df = create_lag_features(train_df)
    feature_df = feature_df.dropna(subset=["lag_1", "lag_7", "rolling_mean_7"]).reset_index(drop=True)
    print(f"Engineered lag/rolling features ({len(feature_df)} rows with sufficient history).")
    return train_df, forecast_df, feature_df


def main() -> None:
    train_df, forecast_df, feature_df = _load_and_engineer()

    evaluation = evaluate_model(
        build_pipeline(NUMERIC_FEATURES, CATEGORICAL_FEATURES), feature_df, NUMERIC_FEATURES, CATEGORICAL_FEATURES
    )
    validation, baseline = evaluation["validation"], evaluation["baseline"]
    print(f"Chronological validation MAE: {validation['mae']:.4f} (baseline {baseline['mae']:.4f})")
    print(f"Chronological validation WMAPE: {validation['wmape']:.4f} (baseline {baseline['wmape']:.4f})")
    print(f"Chronological validation R2: {validation['r2']:.4f}")

    predicted_units = train_and_forecast(
        build_pipeline(NUMERIC_FEATURES, CATEGORICAL_FEATURES),
        train_df,
        feature_df,
        forecast_df,
        NUMERIC_FEATURES,
        CATEGORICAL_FEATURES,
    )
    print("Trained final pipeline on all historical data and generated a recursive 14-day forecast.")

    write_artifacts(
        evaluation=evaluation,
        forecast_df=forecast_df,
        predicted_units=predicted_units,
        forecasts_path=str(FORECASTS_PATH),
        metrics_path=str(METRICS_PATH),
        report_path=str(REPORT_PATH),
        training_rows=len(train_df),
        historical_days=int(train_df["date"].nunique()),
        store_count=int(train_df["store_id"].nunique()),
        product_count=int(train_df["product_id"].nunique()),
        model_name=MODEL_NAME,
    )
    print("Saved forecasts.csv.")
    print("Saved metrics.json.")
    print("Saved report.txt.")


if __name__ == "__main__":
    main()
`;

/** Reference-derived base (matches solution/step-3/src/demand_pipeline.py
 *  exactly) used as the starting point for each invalid fixture. */
const RETAIL_REFERENCE_PIPELINE = `"""Retail demand pipeline helpers (reference solution, all steps)."""
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
    """Leakage-safe chronological holdout evaluation of the whole pipeline."""
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
    """Fit pipeline on all engineered historical rows, then recursively
    forecast every row of forecast_df, preserving its row order."""
    feature_columns = numeric_features + categorical_features
    pipeline.fit(feature_df[feature_columns], feature_df[TARGET_COLUMN].to_numpy(dtype=float))

    history: dict[tuple[str, str], dict[pd.Timestamp, float]] = {}
    for (store, product), group in historical_df.groupby(ENTITY_COLUMNS):
        history[(store, product)] = dict(zip(group[DATE_COLUMN], group[TARGET_COLUMN].astype(float)))

    forecast_sorted = forecast_df.sort_values(ENTITY_COLUMNS + [DATE_COLUMN])
    predictions_by_index: dict[int, float] = {}
    row_feature_columns = [
        "base_price", "current_price", "promotion", "holiday", "inventory_level", "days_since_restock",
        "day_of_week", "day_of_month", "month", "is_weekend", "store_id", "product_id", "category",
    ]

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
        f.write("\\n".join(report_lines) + "\\n")
`;

const RETAIL_REFERENCE_MAIN = `"""Retail Demand Forecaster - entrypoint (reference solution, all steps)."""
from __future__ import annotations

from pathlib import Path

from src.demand_pipeline import (
    CATEGORICAL_FEATURES,
    NUMERIC_FEATURES,
    build_pipeline,
    create_lag_features,
    create_time_features,
    evaluate_model,
    load_datasets,
    prepare_training_data,
    train_and_forecast,
    write_artifacts,
)

DATA_DIR = Path(__file__).parent / "data"
FORECASTS_PATH = Path(__file__).parent / "forecasts.csv"
METRICS_PATH = Path(__file__).parent / "metrics.json"
REPORT_PATH = Path(__file__).parent / "report.txt"
MODEL_NAME = "RandomForestRegressor"


def main() -> None:
    train_df, forecast_df = load_datasets(str(DATA_DIR / "train.csv"), str(DATA_DIR / "forecast.csv"))
    print(f"Loaded historical rows: {len(train_df)}")
    print(f"Loaded forecast rows: {len(forecast_df)}")

    train_df = create_time_features(train_df)
    forecast_df = create_time_features(forecast_df)
    train_df = prepare_training_data(train_df)
    print("Created calendar features and sorted historical data chronologically.")

    feature_df = create_lag_features(train_df)
    feature_df = feature_df.dropna(subset=["lag_1", "lag_7", "rolling_mean_7"]).reset_index(drop=True)
    print(f"Engineered lag/rolling features ({len(feature_df)} rows with sufficient history).")

    pipeline = build_pipeline(NUMERIC_FEATURES, CATEGORICAL_FEATURES)
    evaluation = evaluate_model(pipeline, feature_df, NUMERIC_FEATURES, CATEGORICAL_FEATURES)
    validation = evaluation["validation"]
    baseline = evaluation["baseline"]
    print(f"Chronological validation MAE: {validation['mae']:.4f} (baseline {baseline['mae']:.4f})")
    print(f"Chronological validation WMAPE: {validation['wmape']:.4f} (baseline {baseline['wmape']:.4f})")
    print(f"Chronological validation R2: {validation['r2']:.4f}")

    final_pipeline = build_pipeline(NUMERIC_FEATURES, CATEGORICAL_FEATURES)
    predicted_units = train_and_forecast(
        final_pipeline, train_df, feature_df, forecast_df, NUMERIC_FEATURES, CATEGORICAL_FEATURES
    )
    print("Trained final pipeline on all historical data and generated a recursive 14-day forecast.")

    write_artifacts(
        evaluation=evaluation,
        forecast_df=forecast_df,
        predicted_units=predicted_units,
        forecasts_path=str(FORECASTS_PATH),
        metrics_path=str(METRICS_PATH),
        report_path=str(REPORT_PATH),
        training_rows=len(train_df),
        historical_days=int(train_df["date"].nunique()),
        store_count=int(train_df["store_id"].nunique()),
        product_count=int(train_df["product_id"].nunique()),
        model_name=MODEL_NAME,
    )
    print("Saved forecasts.csv.")
    print("Saved metrics.json.")
    print("Saved report.txt.")


if __name__ == "__main__":
    main()
`;

/** INVALID #1: target leakage via an unshifted lag_1 - it equals the current
 *  row's own target instead of the prior row's, so the model can see the
 *  answer directly through a feature. */
const RETAIL_INVALID_LAG_LEAKAGE_PIPELINE = RETAIL_REFERENCE_PIPELINE.replace(
  `    df["lag_1"] = grouped_target.shift(1)`,
  `    df["lag_1"] = grouped_target.shift(0)  # BUG (target leakage): no shift -> leaks the current row's own target`,
);

/** INVALID #2: rolling_mean_7 is computed WITHOUT shifting first, so it
 *  includes the current day's own demand in its own feature window. */
const RETAIL_INVALID_UNSHIFTED_ROLLING_PIPELINE = RETAIL_REFERENCE_PIPELINE.replace(
  `    df["rolling_mean_7"] = df.groupby(ENTITY_COLUMNS)[TARGET_COLUMN].transform(
        lambda s: s.shift(1).rolling(7).mean()
    )`,
  `    # BUG (unshifted rolling feature): rolling directly over the target
    # includes the current day's own demand in its own feature window.
    df["rolling_mean_7"] = df.groupby(ENTITY_COLUMNS)[TARGET_COLUMN].transform(
        lambda s: s.rolling(7).mean()
    )`,
);

/** INVALID #3: evaluate_model uses a random (shuffled) train/validation
 *  split instead of a chronological holdout. */
const RETAIL_INVALID_RANDOM_SPLIT_PIPELINE = RETAIL_REFERENCE_PIPELINE.replace(
  `from sklearn.pipeline import Pipeline`,
  `from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline`,
).replace(
  `    cutoff = feature_df[DATE_COLUMN].max() - pd.Timedelta(days=validation_days)
    train_part = feature_df[feature_df[DATE_COLUMN] <= cutoff]
    val_part = feature_df[feature_df[DATE_COLUMN] > cutoff]

    feature_columns = numeric_features + categorical_features
    X_train, y_train = train_part[feature_columns], train_part[TARGET_COLUMN].to_numpy(dtype=float)
    X_val, y_val = val_part[feature_columns], val_part[TARGET_COLUMN].to_numpy(dtype=float)`,
  `    # BUG (non-chronological split): a random/shuffled split instead of a
    # chronological holdout - dates in "train_part" and "val_part" interleave.
    train_part, val_part = train_test_split(feature_df, test_size=0.15, random_state=42)

    feature_columns = numeric_features + categorical_features
    X_train, y_train = train_part[feature_columns], train_part[TARGET_COLUMN].to_numpy(dtype=float)
    X_val, y_val = val_part[feature_columns], val_part[TARGET_COLUMN].to_numpy(dtype=float)`,
);

// ─────────────────────────────────────────────────────────────────────────
// Test suites
// ─────────────────────────────────────────────────────────────────────────

function pythonGroupOf(result: { groups?: readonly { name: string; ok: boolean; output?: string; reason?: string }[] }) {
  return result.groups?.find((g) => g.name === "python");
}

describe("iris-species-classifier: verification is behavioral, not reference-source-coupled", () => {
  it(
    "ALT-VALID (RandomForestClassifier, select-based feature prep, csv-module writer) PASSES step and final verification",
    async () => {
      if (!pytestAvailable) return;
      const loaded = await loadScenario(IRIS_SLUG, { includeAuthorOnly: true });
      const step3 = loaded.scenario.steps.find((s) => s.id === IRIS_STEP_ID)!;
      const files = buildFixtureFiles(loaded, {
        "main.py": IRIS_ALT_VALID_MAIN,
        "src/iris_pipeline.py": IRIS_ALT_VALID_PIPELINE,
      });

      const stepResult = await verifyStepOnServer({
        scenarioSlug: IRIS_SLUG,
        step: {
          id: step3.id,
          harness: step3.verify.harness,
          functionName: step3.verify.functionName,
          tests: step3.verify.tests,
          timeoutMs: step3.verify.timeoutMs,
        },
        files,
      });
      expect(stepResult.status, pythonGroupOf(stepResult)?.output ?? pythonGroupOf(stepResult)?.reason).toBe("passed");

      const finalResult = await verifyFinalOnServer({ scenarioSlug: IRIS_SLUG, files });
      expect(finalResult.status, pythonGroupOf(finalResult)?.output ?? pythonGroupOf(finalResult)?.reason).toBe(
        "passed",
      );
    },
    120_000,
  );

  it(
    "INVALID (target leakage: species kept as a numeric-coded feature) FAILS, attributable to the leakage-specific test",
    async () => {
      if (!pytestAvailable) return;
      const loaded = await loadScenario(IRIS_SLUG, { includeAuthorOnly: true });
      const step3 = loaded.scenario.steps.find((s) => s.id === IRIS_STEP_ID)!;
      const files = buildFixtureFiles(loaded, {
        "main.py": IRIS_REFERENCE_MAIN,
        "src/iris_pipeline.py": IRIS_INVALID_LEAKAGE_PIPELINE,
      });

      const result = await verifyStepOnServer({
        scenarioSlug: IRIS_SLUG,
        step: {
          id: step3.id,
          harness: step3.verify.harness,
          functionName: step3.verify.functionName,
          tests: step3.verify.tests,
          timeoutMs: step3.verify.timeoutMs,
        },
        files,
      });

      expect(result.status).not.toBe("passed");
      const output = pythonGroupOf(result)?.output ?? "";
      expect(output).toContain("test_no_target_leakage_in_features");
      expect(output).toContain("FAILED");
      expect(output).not.toContain("SyntaxError");
      expect(output).not.toContain("ModuleNotFoundError");
    },
    60_000,
  );

  it(
    "INVALID (wrong row order: predictions sorted by species instead of preserving test.csv order) FAILS, attributable to the row-order test",
    async () => {
      if (!pytestAvailable) return;
      const loaded = await loadScenario(IRIS_SLUG, { includeAuthorOnly: true });
      const step3 = loaded.scenario.steps.find((s) => s.id === IRIS_STEP_ID)!;
      const files = buildFixtureFiles(loaded, {
        "main.py": IRIS_INVALID_ROW_ORDER_MAIN,
        "src/iris_pipeline.py": IRIS_REFERENCE_PIPELINE,
      });

      const result = await verifyStepOnServer({
        scenarioSlug: IRIS_SLUG,
        step: {
          id: step3.id,
          harness: step3.verify.harness,
          functionName: step3.verify.functionName,
          tests: step3.verify.tests,
          timeoutMs: step3.verify.timeoutMs,
        },
        files,
      });

      expect(result.status).not.toBe("passed");
      const output = pythonGroupOf(result)?.output ?? "";
      expect(output).toContain("test_predictions_preserve_test_sample_order");
      expect(output).toContain("FAILED");
      expect(output).not.toContain("SyntaxError");
      expect(output).not.toContain("ModuleNotFoundError");
    },
    60_000,
  );

  it(
    "INVALID (missing artifact: report.txt is never written) FAILS, attributable to the report.txt tests only",
    async () => {
      if (!pytestAvailable) return;
      const loaded = await loadScenario(IRIS_SLUG, { includeAuthorOnly: true });
      const step3 = loaded.scenario.steps.find((s) => s.id === IRIS_STEP_ID)!;
      const files = buildFixtureFiles(loaded, {
        "main.py": IRIS_INVALID_MISSING_ARTIFACT_MAIN,
        "src/iris_pipeline.py": IRIS_REFERENCE_PIPELINE,
      });

      const result = await verifyStepOnServer({
        scenarioSlug: IRIS_SLUG,
        step: {
          id: step3.id,
          harness: step3.verify.harness,
          functionName: step3.verify.functionName,
          tests: step3.verify.tests,
          timeoutMs: step3.verify.timeoutMs,
        },
        files,
      });

      expect(result.status).not.toBe("passed");
      const output = pythonGroupOf(result)?.output ?? "";
      expect(output).toContain("test_report_txt_is_created");
      expect(output).toContain("FAILED");
      // predictions/metrics artifacts were unaffected by this defect.
      expect(output).not.toContain("test_predictions_file_is_created FAILED");
      expect(output).not.toContain("test_metrics_json_is_created FAILED");
      expect(output).not.toContain("SyntaxError");
      expect(output).not.toContain("ModuleNotFoundError");
    },
    60_000,
  );
});

describe("retail-demand-forecaster: verification is behavioral, not reference-source-coupled", () => {
  it(
    "ALT-VALID (sklearn.metrics-based scoring, restructured lag/forecast helpers, csv-module writer) PASSES step and final verification",
    async () => {
      if (!pytestAvailable) return;
      const loaded = await loadScenario(RETAIL_SLUG, { includeAuthorOnly: true });
      const step3 = loaded.scenario.steps.find((s) => s.id === RETAIL_STEP_ID)!;
      const files = buildFixtureFiles(loaded, {
        "main.py": RETAIL_ALT_VALID_MAIN,
        "src/demand_pipeline.py": RETAIL_ALT_VALID_PIPELINE,
      });

      const stepResult = await verifyStepOnServer({
        scenarioSlug: RETAIL_SLUG,
        step: {
          id: step3.id,
          harness: step3.verify.harness,
          functionName: step3.verify.functionName,
          tests: step3.verify.tests,
          timeoutMs: step3.verify.timeoutMs,
        },
        files,
      });
      expect(stepResult.status, pythonGroupOf(stepResult)?.output ?? pythonGroupOf(stepResult)?.reason).toBe(
        "passed",
      );

      const finalResult = await verifyFinalOnServer({ scenarioSlug: RETAIL_SLUG, files });
      expect(finalResult.status, pythonGroupOf(finalResult)?.output ?? pythonGroupOf(finalResult)?.reason).toBe(
        "passed",
      );
      const metricsGroup = finalResult.groups?.find((g) => g.name === "metrics");
      expect(metricsGroup?.ok, metricsGroup?.reason).toBe(true);
    },
    300_000,
  );

  it(
    "INVALID (target leakage: lag_1 unshifted, equals the current row's own target) FAILS, attributable to the lag-recomputation test",
    async () => {
      if (!pytestAvailable) return;
      const loaded = await loadScenario(RETAIL_SLUG, { includeAuthorOnly: true });
      const step3 = loaded.scenario.steps.find((s) => s.id === RETAIL_STEP_ID)!;
      const files = buildFixtureFiles(loaded, {
        "main.py": RETAIL_REFERENCE_MAIN,
        "src/demand_pipeline.py": RETAIL_INVALID_LAG_LEAKAGE_PIPELINE,
      });

      const result = await verifyStepOnServer({
        scenarioSlug: RETAIL_SLUG,
        step: {
          id: step3.id,
          harness: step3.verify.harness,
          functionName: step3.verify.functionName,
          tests: step3.verify.tests,
          timeoutMs: step3.verify.timeoutMs,
        },
        files,
      });

      expect(result.status).not.toBe("passed");
      const output = pythonGroupOf(result)?.output ?? "";
      expect(output).toContain("test_lag_1_matches_independent_recomputation");
      expect(output).toContain("FAILED");
      expect(output).not.toContain("SyntaxError");
      expect(output).not.toContain("ModuleNotFoundError");
    },
    180_000,
  );

  it(
    "INVALID (unshifted rolling_mean_7: includes the current day's own demand) FAILS, attributable to the rolling-shift-specific test",
    async () => {
      if (!pytestAvailable) return;
      const loaded = await loadScenario(RETAIL_SLUG, { includeAuthorOnly: true });
      const step3 = loaded.scenario.steps.find((s) => s.id === RETAIL_STEP_ID)!;
      const files = buildFixtureFiles(loaded, {
        "main.py": RETAIL_REFERENCE_MAIN,
        "src/demand_pipeline.py": RETAIL_INVALID_UNSHIFTED_ROLLING_PIPELINE,
      });

      const result = await verifyStepOnServer({
        scenarioSlug: RETAIL_SLUG,
        step: {
          id: step3.id,
          harness: step3.verify.harness,
          functionName: step3.verify.functionName,
          tests: step3.verify.tests,
          timeoutMs: step3.verify.timeoutMs,
        },
        files,
      });

      expect(result.status).not.toBe("passed");
      const output = pythonGroupOf(result)?.output ?? "";
      expect(output).toContain("test_rolling_mean_7_never_includes_the_current_rows_own_target");
      expect(output).toContain("FAILED");
      expect(output).not.toContain("SyntaxError");
      expect(output).not.toContain("ModuleNotFoundError");
    },
    180_000,
  );

  it(
    "INVALID (random/shuffled temporal split instead of chronological holdout) FAILS, attributable to the baseline-reproducibility test",
    async () => {
      if (!pytestAvailable) return;
      const loaded = await loadScenario(RETAIL_SLUG, { includeAuthorOnly: true });
      const step3 = loaded.scenario.steps.find((s) => s.id === RETAIL_STEP_ID)!;
      const files = buildFixtureFiles(loaded, {
        "main.py": RETAIL_REFERENCE_MAIN,
        "src/demand_pipeline.py": RETAIL_INVALID_RANDOM_SPLIT_PIPELINE,
      });

      const result = await verifyStepOnServer({
        scenarioSlug: RETAIL_SLUG,
        step: {
          id: step3.id,
          harness: step3.verify.harness,
          functionName: step3.verify.functionName,
          tests: step3.verify.tests,
          timeoutMs: step3.verify.timeoutMs,
        },
        files,
      });

      expect(result.status).not.toBe("passed");
      const output = pythonGroupOf(result)?.output ?? "";
      // The random split makes evaluate_model's internal val_part diverge from
      // the date-cutoff-based val_part the test independently recomputes, so
      // the baseline metric it recomputes no longer matches - proving the
      // split is not chronological without relying on any specific mae value.
      expect(output).toContain("test_baseline_metrics_are_independently_reproducible");
      expect(output).toContain("FAILED");
      expect(output).not.toContain("SyntaxError");
      expect(output).not.toContain("ModuleNotFoundError");
    },
    180_000,
  );
});
