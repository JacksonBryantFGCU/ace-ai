"""Retail Demand Forecaster - candidate entrypoint.

Run with `python main.py`. By the end of Step 3 this script should:
  1. load workspace/data/train.csv and workspace/data/forecast.csv
  2. add calendar features and leakage-safe lag/rolling features
  3. build a leakage-safe preprocessing + regression Pipeline
  4. evaluate it with a chronological holdout against a seasonal-naive
     baseline
  5. train the final pipeline on all historical data and recursively
     forecast every row of forecast.csv
  6. write forecasts.csv (date,store_id,product_id,predicted_units),
     metrics.json (structured validation/baseline/forecast metrics), and
     report.txt (a short human-readable summary) next to this file - the
     Output Preview panel shows these as soon as they exist, so a clear
     metrics.json/report.txt is part of a finished Step 3, not optional
     extra credit.
"""
from __future__ import annotations

from pathlib import Path

from src.demand_pipeline import (
    load_datasets,
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

    # TODO (Step 1): train_df = create_time_features(train_df)
    # forecast_df = create_time_features(forecast_df)
    # train_df = prepare_training_data(train_df)

    # TODO (Step 2): feature_df = create_lag_features(train_df)
    # feature_df = feature_df.dropna(subset=["lag_1", "lag_7", "rolling_mean_7"])
    # pipeline = build_pipeline(NUMERIC_FEATURES, CATEGORICAL_FEATURES)

    # TODO (Step 3): evaluation = evaluate_model(pipeline, feature_df, NUMERIC_FEATURES, CATEGORICAL_FEATURES)
    # predicted_units = train_and_forecast(pipeline, train_df, feature_df, forecast_df,
    #     NUMERIC_FEATURES, CATEGORICAL_FEATURES)
    # write_artifacts(evaluation=evaluation, forecast_df=forecast_df,
    #     predicted_units=predicted_units, forecasts_path=str(FORECASTS_PATH),
    #     metrics_path=str(METRICS_PATH), report_path=str(REPORT_PATH),
    #     training_rows=len(train_df), historical_days=int(train_df["date"].nunique()),
    #     store_count=int(train_df["store_id"].nunique()),
    #     product_count=int(train_df["product_id"].nunique()), model_name=MODEL_NAME)


if __name__ == "__main__":
    main()
