"""Customer Churn Classifier - entrypoint (reference solution through Step 1)."""
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
