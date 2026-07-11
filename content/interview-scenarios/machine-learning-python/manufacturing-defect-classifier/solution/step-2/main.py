"""Manufacturing Defect Classifier - entrypoint (reference solution through Step 2)."""
from __future__ import annotations

from pathlib import Path

from src.defect_pipeline import (
    build_pipeline,
    identify_feature_columns,
    load_test_data,
    load_training_data,
    split_test_features,
    split_training_data,
)

DATA_DIR = Path(__file__).parent / "data"
PREDICTIONS_PATH = Path(__file__).parent / "predictions.csv"


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
    pipeline.fit(X_train, y_train)
    print("Built and fit the preprocessing + classification pipeline.")

    # TODO (Step 3): evaluate_pipeline via stratified cross-validation, then
    # train_and_predict on X_test and write_artifacts(...).


if __name__ == "__main__":
    main()
