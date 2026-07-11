"""Manufacturing Defect Classifier - candidate entrypoint.

Run with `python main.py`. By the end of Step 3 this script should:
  1. load workspace/data/train.csv and workspace/data/test.csv
  2. identify numeric/categorical feature columns and split out the target
     and identifier
  3. build a leakage-safe preprocessing + classification Pipeline
  4. evaluate it with stratified cross-validation
  5. train the final pipeline on all training data and predict on every test
     component
  6. write predictions.csv (component_id,predicted_defect,defect_probability),
     metrics.json (structured cross-validated metrics), and report.txt (a
     short human-readable summary) next to this file - the Output Preview
     panel shows these as soon as they exist, so a clear metrics.json/
     report.txt is part of a finished Step 3, not optional extra credit.
"""
from __future__ import annotations

from pathlib import Path

from src.defect_pipeline import (
    identify_feature_columns,
    load_test_data,
    load_training_data,
    split_test_features,
    split_training_data,
)

DATA_DIR = Path(__file__).parent / "data"
PREDICTIONS_PATH = Path(__file__).parent / "predictions.csv"
METRICS_PATH = Path(__file__).parent / "metrics.json"
REPORT_PATH = Path(__file__).parent / "report.txt"
MODEL_NAME = "LogisticRegression"


def main() -> None:
    train_df = load_training_data(str(DATA_DIR / "train.csv"))
    test_df = load_test_data(str(DATA_DIR / "test.csv"))
    print(f"Loaded training rows: {len(train_df)}")
    print(f"Loaded test rows: {len(test_df)}")

    numeric_features, categorical_features = identify_feature_columns(train_df)
    print(f"Identified {len(numeric_features)} numeric and {len(categorical_features)} categorical features.")

    X_train, y_train = split_training_data(train_df)
    X_test, test_ids = split_test_features(test_df)

    # TODO (Step 2): pipeline = build_pipeline(numeric_features, categorical_features)

    # TODO (Step 3): metrics = evaluate_pipeline(pipeline, X_train, y_train)
    # predicted_labels, predicted_probabilities = train_and_predict(pipeline, X_train, y_train, X_test)
    # write_artifacts(metrics=metrics, predictions_path=str(PREDICTIONS_PATH),
    #     metrics_path=str(METRICS_PATH), report_path=str(REPORT_PATH),
    #     test_ids=test_ids, predicted_labels=predicted_labels,
    #     predicted_probabilities=predicted_probabilities,
    #     train_rows=len(train_df), test_rows=len(test_df),
    #     positive_rate=float(y_train.mean()), numeric_features=numeric_features,
    #     categorical_features=categorical_features, model_name=MODEL_NAME)


if __name__ == "__main__":
    main()
