"""Support Ticket Categorizer - candidate entrypoint.

Run with `python main.py`. By the end of Step 3 this script should:
  1. load workspace/data/train.csv and workspace/data/test.csv
  2. combine subject + message into one text field per ticket
  3. vectorize text and train + evaluate a deterministic classifier
  4. predict the category for every test ticket
  5. write predictions.csv (ticket_id,predicted_category) next to this file,
     in the same ticket order as data/test.csv
  6. write metrics.json (accuracy/macro F1 + run metadata) and report.txt (a
     short human-readable summary) next to this file too - the Output Preview
     panel shows these as soon as they exist, so a clear
     metrics.json/report.txt is part of a finished Step 3, not optional extra
     credit.
"""
from __future__ import annotations

from pathlib import Path

from src.ticket_pipeline import (
    combine_text_fields,
    load_test_data,
    load_training_data,
)

DATA_DIR = Path(__file__).parent / "data"
PREDICTIONS_PATH = Path(__file__).parent / "predictions.csv"


def main() -> None:
    train_df = load_training_data(str(DATA_DIR / "train.csv"))
    test_df = load_test_data(str(DATA_DIR / "test.csv"))
    print(f"Loaded training rows: {len(train_df)}")
    print(f"Loaded test rows: {len(test_df)}")

    train_text = combine_text_fields(train_df)
    print("Prepared text features.")

    # TODO (Step 2): split train_df into train/validation (fixed random_state),
    # vectorize with prepare_features(...), train a model with
    # train_model(...), and evaluate it with evaluate_model(...).

    # TODO (Step 3): predict the category for every row of test_df and write
    # predictions.csv with save_predictions(...).


if __name__ == "__main__":
    main()
