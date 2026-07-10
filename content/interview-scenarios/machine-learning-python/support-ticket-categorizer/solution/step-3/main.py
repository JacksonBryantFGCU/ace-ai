"""Support Ticket Categorizer - entrypoint (reference solution, all steps).

Writes three artifacts next to this file for the Output Preview panel:
  predictions.csv - ticket_id,predicted_category, one row per test ticket
  metrics.json    - validation accuracy/macro F1 + run metadata
  report.txt      - short human-readable summary
"""
from __future__ import annotations

import json
from pathlib import Path

from sklearn.model_selection import train_test_split

from src.ticket_pipeline import (
    combine_text_fields,
    evaluate_model,
    load_test_data,
    load_training_data,
    predict_categories,
    prepare_features,
    save_predictions,
    train_model,
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

    train_text = combine_text_fields(train_df)
    test_text = combine_text_fields(test_df)
    print("Prepared text features.")

    y = train_df["category"]
    # Fit the vectorizer once on ALL training text (fitting only needs text,
    # not the target), transforming test text with that same vocabulary at
    # the same time - then split the resulting feature matrix for
    # train/validation, exactly like the numeric-feature ML scenarios do.
    X_train_full, X_test, _vectorizer = prepare_features(train_text, test_text)
    X_train, X_val, y_train, y_val = train_test_split(
        X_train_full, y, test_size=0.25, random_state=42, stratify=y
    )

    model = train_model(X_train, y_train)
    metrics = evaluate_model(model, X_val, y_val)
    accuracy = metrics["accuracy"]
    macro_f1 = metrics["macro_f1"]
    print(f"Validation accuracy: {accuracy:.2f}")
    print(f"Validation macro F1: {macro_f1:.2f}")

    predictions = predict_categories(model, X_test)
    save_predictions(test_df["ticket_id"], predictions, str(PREDICTIONS_PATH))
    print("Saved predictions.csv.")

    metrics_payload = {
        "accuracy": round(accuracy, 4),
        "macro_f1": round(macro_f1, 4),
        "train_rows": len(train_df),
        "test_rows": len(test_df),
        "model": MODEL_NAME,
    }
    METRICS_PATH.write_text(json.dumps(metrics_payload, indent=2) + "\n")
    print("Saved metrics.json.")

    report_lines = [
        "Support Ticket Categorizer Report",
        f"Training rows: {len(train_df)}",
        f"Test rows: {len(test_df)}",
        f"Validation accuracy: {accuracy:.2f}",
        f"Validation macro F1: {macro_f1:.2f}",
        f"Generated predictions: {len(predictions)}",
    ]
    REPORT_PATH.write_text("\n".join(report_lines) + "\n")
    print("Saved report.txt.")


if __name__ == "__main__":
    main()
