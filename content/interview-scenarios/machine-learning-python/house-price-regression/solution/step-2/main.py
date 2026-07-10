"""House Price Regression - entrypoint (reference solution through Step 2)."""
from __future__ import annotations

from pathlib import Path

from sklearn.model_selection import train_test_split

from src.price_pipeline import (
    evaluate_model,
    load_test_data,
    load_training_data,
    prepare_features,
    train_model,
)

DATA_DIR = Path(__file__).parent / "data"
PREDICTIONS_PATH = Path(__file__).parent / "predictions.csv"


def main() -> None:
    train_df = load_training_data(str(DATA_DIR / "train.csv"))
    test_df = load_test_data(str(DATA_DIR / "test.csv"))
    print(f"Loaded training rows: {len(train_df)}")
    print(f"Loaded test rows: {len(test_df)}")

    y = train_df["price"]
    X = prepare_features(train_df)
    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.25, random_state=42)

    model = train_model(X_train, y_train)
    metrics = evaluate_model(model, X_val, y_val)
    print(f"Validation metrics: {metrics}")

    # TODO (Step 3): predict the price for every row of test_df and write
    # predictions.csv with save_predictions(...).


if __name__ == "__main__":
    main()
