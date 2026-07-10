"""Support Ticket Categorizer - entrypoint (reference solution through Step 1)."""
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
