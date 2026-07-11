"""Manufacturing Defect Classifier - entrypoint (reference solution, all steps).

Writes three artifacts next to this file for the Output Preview panel:
  predictions.csv - component_id,predicted_defect,defect_probability
  metrics.json    - structured cross-validated metrics + run metadata
  report.txt      - short human-readable summary
"""
from __future__ import annotations

from pathlib import Path

from src.defect_pipeline import (
    build_pipeline,
    evaluate_pipeline,
    identify_feature_columns,
    load_test_data,
    load_training_data,
    split_test_features,
    split_training_data,
    train_and_predict,
    write_artifacts,
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

    pipeline = build_pipeline(numeric_features, categorical_features)
    print("Built preprocessing + classification pipeline.")

    metrics = evaluate_pipeline(pipeline, X_train, y_train)
    summary = metrics["summary"]
    cross_validation = metrics["cross_validation"]
    print(f"Cross-validated F1 mean: {cross_validation['mean']:.4f} (std {cross_validation['std']:.4f})")
    print(f"Validation accuracy: {summary['accuracy']:.4f}")
    print(f"Validation ROC AUC: {summary['roc_auc']:.4f}")

    predicted_labels, predicted_probabilities = train_and_predict(pipeline, X_train, y_train, X_test)
    print("Trained final pipeline on all training data and generated test predictions.")

    write_artifacts(
        metrics=metrics,
        predictions_path=str(PREDICTIONS_PATH),
        metrics_path=str(METRICS_PATH),
        report_path=str(REPORT_PATH),
        test_ids=test_ids,
        predicted_labels=predicted_labels,
        predicted_probabilities=predicted_probabilities,
        train_rows=len(train_df),
        test_rows=len(test_df),
        positive_rate=float(y_train.mean()),
        numeric_features=numeric_features,
        categorical_features=categorical_features,
        model_name=MODEL_NAME,
    )
    print("Saved predictions.csv.")
    print("Saved metrics.json.")
    print("Saved report.txt.")


if __name__ == "__main__":
    main()
