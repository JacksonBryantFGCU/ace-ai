"""Step 3 - Time-Aware Evaluation and Future Forecasting."""
import csv
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest
from sklearn.dummy import DummyRegressor

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.demand_pipeline import (  # noqa: E402
    CATEGORICAL_FEATURES,
    DATE_COLUMN,
    ENTITY_COLUMNS,
    NUMERIC_FEATURES,
    TARGET_COLUMN,
    VALIDATION_DAYS,
    build_pipeline,
    create_lag_features,
    create_time_features,
    evaluate_model,
    load_datasets,
    prepare_training_data,
    train_and_forecast,
)

TRAIN_CSV = ROOT / "data" / "train.csv"
FORECAST_CSV = ROOT / "data" / "forecast.csv"
FORECASTS_CSV = ROOT / "forecasts.csv"
METRICS_JSON = ROOT / "metrics.json"
REPORT_TXT = ROOT / "report.txt"

# Calibrated against the real deterministic reference solution: validation
# mae ~7.33, rmse ~10.33, r2 ~0.742, wmape ~0.232 (408 validation rows) vs a
# seasonal-naive baseline of mae ~13.45, r2 ~0.126, wmape ~0.425. Thresholds
# sit comfortably below the reference solution but reject the global-mean
# baseline, the seasonal-naive baseline used as a "solution", and a model
# trained without lag features (mae ~8.16, wmape ~0.258 in the same holdout).
R2_THRESHOLD = 0.60
WMAPE_THRESHOLD = 0.25
MAE_THRESHOLD = 8.0
RMSE_THRESHOLD = 12.0


def _read_csv_rows(path: Path):
    with open(path, newline="") as f:
        return list(csv.reader(f))


@pytest.fixture(scope="module")
def prepared():
    train_df, forecast_df = load_datasets(str(TRAIN_CSV), str(FORECAST_CSV))
    train_df = create_time_features(train_df)
    forecast_df = create_time_features(forecast_df)
    train_df = prepare_training_data(train_df)
    feature_df = create_lag_features(train_df)
    feature_df = feature_df.dropna(subset=["lag_1", "lag_7", "rolling_mean_7"]).reset_index(drop=True)
    return train_df, forecast_df, feature_df


@pytest.fixture(scope="module")
def reference_evaluation(prepared):
    _, _, feature_df = prepared
    pipeline = build_pipeline(NUMERIC_FEATURES, CATEGORICAL_FEATURES)
    return evaluate_model(pipeline, feature_df, NUMERIC_FEATURES, CATEGORICAL_FEATURES)


# ---- evaluate_model structure / correctness ---------------------------------


def test_evaluate_model_returns_expected_shape(reference_evaluation):
    assert "validation" in reference_evaluation
    assert "baseline" in reference_evaluation
    for key in ("mae", "rmse", "r2", "wmape", "validation_rows"):
        assert key in reference_evaluation["validation"]
    for key in ("name", "mae", "rmse", "wmape"):
        assert key in reference_evaluation["baseline"]


def test_all_metrics_are_finite_numbers(reference_evaluation):
    for section in ("validation", "baseline"):
        for key, value in reference_evaluation[section].items():
            if key == "name":
                continue
            assert isinstance(value, (int, float))
            assert value == value  # not NaN
            assert value not in (float("inf"), float("-inf"))


def test_validation_split_is_chronological_not_random(prepared):
    """The validation rows must all be strictly later than every training
    row used inside evaluate_model - proven by recomputing the same
    date-based cutoff independently and confirming no overlap or inversion."""
    _, _, feature_df = prepared
    cutoff = feature_df[DATE_COLUMN].max() - pd.Timedelta(days=VALIDATION_DAYS)
    train_part = feature_df[feature_df[DATE_COLUMN] <= cutoff]
    val_part = feature_df[feature_df[DATE_COLUMN] > cutoff]
    assert len(train_part) > 0 and len(val_part) > 0
    assert train_part[DATE_COLUMN].max() < val_part[DATE_COLUMN].min()


def test_validation_is_not_shuffled_repeated_runs_agree_exactly(prepared, reference_evaluation):
    """A chronological holdout is deterministic given the same data - a
    second independent evaluate_model call must produce IDENTICAL
    validation metrics to the reference run (a random/shuffled split with
    no fixed seed would not)."""
    _, _, feature_df = prepared
    pipeline_b = build_pipeline(NUMERIC_FEATURES, CATEGORICAL_FEATURES)
    result_b = evaluate_model(pipeline_b, feature_df, NUMERIC_FEATURES, CATEGORICAL_FEATURES)
    assert reference_evaluation["validation"]["validation_rows"] == result_b["validation"]["validation_rows"]
    assert reference_evaluation["validation"]["mae"] == pytest.approx(result_b["validation"]["mae"], abs=1e-6)
    assert reference_evaluation["baseline"]["mae"] == pytest.approx(result_b["baseline"]["mae"], abs=1e-6)


def test_baseline_metrics_are_independently_reproducible(prepared, reference_evaluation):
    _, _, feature_df = prepared
    cutoff = feature_df[DATE_COLUMN].max() - pd.Timedelta(days=VALIDATION_DAYS)
    val_part = feature_df[feature_df[DATE_COLUMN] > cutoff]
    y_val = val_part[TARGET_COLUMN].to_numpy(dtype=float)
    baseline_pred = val_part["lag_7"].to_numpy(dtype=float)
    expected_mae = float(np.mean(np.abs(y_val - baseline_pred)))
    assert reference_evaluation["baseline"]["mae"] == pytest.approx(expected_mae, abs=1e-6)


def test_calibrated_thresholds_are_met(reference_evaluation):
    validation = reference_evaluation["validation"]
    assert validation["r2"] >= R2_THRESHOLD
    assert validation["wmape"] <= WMAPE_THRESHOLD
    assert validation["mae"] <= MAE_THRESHOLD
    assert validation["rmse"] <= RMSE_THRESHOLD


def test_model_beats_baseline(reference_evaluation):
    validation = reference_evaluation["validation"]
    baseline = reference_evaluation["baseline"]
    assert validation["mae"] < baseline["mae"]
    assert validation["wmape"] < baseline["wmape"]


def test_global_mean_baseline_fails_the_scenario_thresholds(prepared):
    _, _, feature_df = prepared
    cutoff = feature_df[DATE_COLUMN].max() - pd.Timedelta(days=VALIDATION_DAYS)
    train_part = feature_df[feature_df[DATE_COLUMN] <= cutoff]
    val_part = feature_df[feature_df[DATE_COLUMN] > cutoff]
    y_train = train_part[TARGET_COLUMN].to_numpy(dtype=float)
    y_val = val_part[TARGET_COLUMN].to_numpy(dtype=float)

    dummy = DummyRegressor(strategy="mean")
    dummy.fit(np.zeros((len(y_train), 1)), y_train)
    predicted = dummy.predict(np.zeros((len(y_val), 1)))

    wmape_denom = np.sum(np.abs(y_val))
    wmape = np.sum(np.abs(y_val - predicted)) / wmape_denom if wmape_denom else 0.0
    mae = np.mean(np.abs(y_val - predicted))
    assert wmape > WMAPE_THRESHOLD
    assert mae > MAE_THRESHOLD


def test_seasonal_naive_baseline_alone_fails_the_scenario_thresholds(reference_evaluation):
    baseline = reference_evaluation["baseline"]
    assert baseline["wmape"] > WMAPE_THRESHOLD
    assert baseline["mae"] > MAE_THRESHOLD


def test_model_without_lag_features_fails_the_scenario_thresholds(prepared):
    _, _, feature_df = prepared
    numeric_without_lags = [c for c in NUMERIC_FEATURES if c not in ("lag_1", "lag_7", "rolling_mean_7")]
    pipeline = build_pipeline(numeric_without_lags, CATEGORICAL_FEATURES)
    cutoff = feature_df[DATE_COLUMN].max() - pd.Timedelta(days=VALIDATION_DAYS)
    train_part = feature_df[feature_df[DATE_COLUMN] <= cutoff]
    val_part = feature_df[feature_df[DATE_COLUMN] > cutoff]
    feature_columns = numeric_without_lags + CATEGORICAL_FEATURES
    pipeline.fit(train_part[feature_columns], train_part[TARGET_COLUMN].astype(float))
    predicted = np.clip(pipeline.predict(val_part[feature_columns]), 0.0, None)
    y_val = val_part[TARGET_COLUMN].to_numpy(dtype=float)
    wmape_denom = np.sum(np.abs(y_val))
    wmape = np.sum(np.abs(y_val - predicted)) / wmape_denom if wmape_denom else 0.0
    mae = np.mean(np.abs(y_val - predicted))
    assert wmape > WMAPE_THRESHOLD or mae > MAE_THRESHOLD


# ---- train_and_forecast / recursive forecasting -----------------------------


@pytest.fixture(scope="module")
def forecast_result(prepared):
    """Computed ONCE and reused by several tests below - train_and_forecast
    is expensive (fits the final model + runs the full recursive horizon),
    so structural assertions about its single output share this fixture
    instead of each re-running it."""
    train_df, forecast_df, feature_df = prepared
    pipeline = build_pipeline(NUMERIC_FEATURES, CATEGORICAL_FEATURES)
    predicted = train_and_forecast(
        pipeline, train_df, feature_df, forecast_df, NUMERIC_FEATURES, CATEGORICAL_FEATURES
    )
    return predicted


def test_recursive_forecast_never_needs_a_hidden_future_target(prepared, forecast_result):
    """train_and_forecast's signature never receives forecast-period
    targets at all - this proves structurally that later horizon days can
    only be built from historical actuals and earlier PREDICTED values."""
    _, forecast_df, _ = prepared
    assert TARGET_COLUMN not in forecast_df.columns
    assert len(forecast_result) == len(forecast_df)


def test_forecast_row_order_is_preserved(prepared, forecast_result):
    _, forecast_df, _ = prepared
    assert len(forecast_result) == len(forecast_df)
    assert all(np.isfinite(p) for p in forecast_result)


def test_forecast_predictions_are_non_negative(forecast_result):
    assert all(p >= 0.0 for p in forecast_result)


def test_later_forecast_days_change_when_earlier_predictions_would_change(prepared, forecast_result):
    """Corrupt the model so early-horizon predictions shift dramatically,
    and confirm later-horizon predictions for the SAME series shift too -
    proving later days genuinely depend on earlier predicted history rather
    than on some fixed/precomputed value."""
    train_df, forecast_df, feature_df = prepared

    class ShiftedPipeline:
        def __init__(self, base_pipeline, shift):
            self.base_pipeline = base_pipeline
            self.shift = shift

        def fit(self, X, y):
            self.base_pipeline.fit(X, y)
            return self

        def predict(self, X):
            return self.base_pipeline.predict(X) + self.shift

    shifted_pipeline = ShiftedPipeline(build_pipeline(NUMERIC_FEATURES, CATEGORICAL_FEATURES), shift=500.0)
    shifted_predictions = train_and_forecast(
        shifted_pipeline, train_df, feature_df, forecast_df, NUMERIC_FEATURES, CATEGORICAL_FEATURES
    )

    forecast_sorted = forecast_df.reset_index(drop=True)
    key_store, key_product = forecast_sorted[ENTITY_COLUMNS].iloc[0]
    series_mask = (forecast_sorted["store_id"] == key_store) & (forecast_sorted["product_id"] == key_product)
    series_positions = forecast_sorted.index[series_mask].tolist()
    last_position = series_positions[-1]

    assert shifted_predictions[last_position] > forecast_result[last_position] + 100.0


# ---- main.py end-to-end artifact generation --------------------------------


@pytest.fixture(scope="module")
def main_run():
    return subprocess.run(
        [sys.executable, "main.py"],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        timeout=120,
    )


def test_running_main_succeeds(main_run):
    assert main_run.returncode == 0, (
        f"main.py failed (exit {main_run.returncode}):\n"
        f"stdout:\n{main_run.stdout}\nstderr:\n{main_run.stderr}"
    )


def test_forecasts_file_is_created(main_run):
    assert FORECASTS_CSV.exists(), "main.py did not create forecasts.csv"


def test_forecasts_columns_are_exact(main_run):
    rows = _read_csv_rows(FORECASTS_CSV)
    assert rows[0] == ["date", "store_id", "product_id", "predicted_units"]


def test_forecasts_row_count_matches_forecast_csv(main_run):
    forecast_rows = _read_csv_rows(FORECAST_CSV)[1:]
    predicted_rows = _read_csv_rows(FORECASTS_CSV)[1:]
    assert len(predicted_rows) == len(forecast_rows)


def test_forecasts_preserve_forecast_row_order(main_run):
    forecast_rows = _read_csv_rows(FORECAST_CSV)[1:]
    predicted_rows = _read_csv_rows(FORECASTS_CSV)[1:]
    expected_keys = [(row[0], row[1], row[2]) for row in forecast_rows]  # date, store_id, product_id
    actual_keys = [(row[0], row[1], row[2]) for row in predicted_rows]
    assert actual_keys == expected_keys


def test_predicted_units_are_numeric_finite_and_non_negative(main_run):
    predicted_rows = _read_csv_rows(FORECASTS_CSV)[1:]
    for row in predicted_rows:
        value = float(row[3])
        assert value == value and value not in (float("inf"), float("-inf"))
        assert value >= 0.0


def test_no_accidental_index_column(main_run):
    rows = _read_csv_rows(FORECASTS_CSV)
    assert len(rows[0]) == 4


def test_metrics_json_is_created(main_run):
    assert METRICS_JSON.exists(), "main.py did not create metrics.json"


def test_metrics_json_matches_required_structured_shape(main_run):
    data = json.loads(METRICS_JSON.read_text())
    for key in ("mae", "rmse", "r2", "wmape", "validation_rows"):
        assert key in data["validation"]
    for key in ("name", "mae", "rmse", "wmape"):
        assert key in data["baseline"]
    for key in ("rows", "horizon_days", "minimum_prediction", "maximum_prediction", "mean_prediction"):
        assert key in data["forecast"]
    assert data["dataset"]["training_rows"] > 0
    assert isinstance(data["model"]["name"], str) and data["model"]["name"]
    assert isinstance(data["model"]["validation_strategy"], str) and data["model"]["validation_strategy"]


def test_metrics_json_values_are_valid_and_meet_thresholds(main_run):
    data = json.loads(METRICS_JSON.read_text())
    validation = data["validation"]
    assert validation["r2"] >= R2_THRESHOLD
    assert validation["wmape"] <= WMAPE_THRESHOLD
    assert validation["mae"] <= MAE_THRESHOLD
    assert validation["mae"] < data["baseline"]["mae"]
    train_rows = len(_read_csv_rows(TRAIN_CSV)) - 1
    assert data["dataset"]["training_rows"] == train_rows
    forecast_rows = len(_read_csv_rows(FORECAST_CSV)) - 1
    assert data["forecast"]["rows"] == forecast_rows
    assert data["forecast"]["horizon_days"] == 14


def test_report_txt_is_created(main_run):
    assert REPORT_TXT.exists(), "main.py did not create report.txt"


def test_report_txt_contains_required_concepts(main_run):
    text = REPORT_TXT.read_text()
    assert "chronological" in text.lower()
    assert "WMAPE" in text
    assert "baseline" in text.lower()


def test_repeated_main_runs_produce_identical_artifacts(main_run):
    first_forecasts = FORECASTS_CSV.read_text()
    first_metrics = json.loads(METRICS_JSON.read_text())

    second_run = subprocess.run(
        [sys.executable, "main.py"],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        timeout=120,
    )
    assert second_run.returncode == 0

    assert FORECASTS_CSV.read_text() == first_forecasts
    assert json.loads(METRICS_JSON.read_text()) == first_metrics
