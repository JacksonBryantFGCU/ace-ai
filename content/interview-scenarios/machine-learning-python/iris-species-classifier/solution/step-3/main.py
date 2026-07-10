"""Iris Species Classifier - entrypoint (reference solution, all steps).

Writes three artifacts next to this file for the Output Preview panel:
  predictions.csv - sample_id,predicted_species, one row per test sample
  metrics.json    - validation accuracy + run metadata
  report.txt      - short human-readable summary
"""
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
    METRICS_PATH.write_text(json.dumps(metrics_payload, indent=2) + "\n")
    print("Saved metrics.json.")

    report_lines = [
        "Iris Species Classifier Report",
        f"Training rows: {len(train_df)}",
        f"Test rows: {len(test_df)}",
        f"Validation accuracy: {accuracy:.2f}",
        f"Generated predictions: {len(predictions)}",
    ]
    REPORT_PATH.write_text("\n".join(report_lines) + "\n")
    print("Saved report.txt.")


if __name__ == "__main__":
    main()
