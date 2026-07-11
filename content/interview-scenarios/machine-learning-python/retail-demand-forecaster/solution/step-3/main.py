"""Retail Demand Forecaster - entrypoint (reference solution, all steps).

Writes three artifacts next to this file for the Output Preview panel:
  forecasts.csv - date,store_id,product_id,predicted_units
  metrics.json  - structured chronological-validation metrics + run metadata
  report.txt    - short human-readable summary
"""
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
