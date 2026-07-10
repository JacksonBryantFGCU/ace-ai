"""Customer Churn Classifier - candidate entrypoint.

Run with `python main.py`. By the end of Step 3 this script should:
  1. load workspace/data/train.csv and workspace/data/test.csv
  2. prepare model-ready features
  3. train + evaluate a deterministic classifier
  4. predict churn for every test customer
  5. write predictions.csv (customer_id,churn_prediction) next to this file,
     in the same customer order as data/test.csv
  6. write metrics.json (accuracy/f1 + row counts) and report.txt (a short
     human-readable summary) next to this file too - the Output Preview panel
     shows these as soon as they exist, so a clear metrics.json/report.txt is
     part of a finished Step 3, not optional extra credit.
"""
from __future__ import annotations

from pathlib import Path

from src.churn_pipeline import (
    load_test_data,
    load_training_data,
    prepare_features,
)

DATA_DIR = Path(__file__).parent / "data"
PREDICTIONS_PATH = Path(__file__).parent / "predictions.csv"


def main() -> None:
    train_df = load_training_data(str(DATA_DIR / "train.csv"))
    test_df = load_test_data(str(DATA_DIR / "test.csv"))
    print(f"Loaded {len(train_df)} training rows and {len(test_df)} test rows.")

    features = prepare_features(train_df)
    print(f"Prepared {features.shape[1]} model-ready feature columns.")

    # TODO (Step 2): split train_df into train/validation (fixed random_state),
    # train a model with train_model(...), and evaluate it with
    # evaluate_model(...).

    # TODO (Step 3): predict churn for every row of test_df and write
    # predictions.csv with save_predictions(...).


if __name__ == "__main__":
    main()
