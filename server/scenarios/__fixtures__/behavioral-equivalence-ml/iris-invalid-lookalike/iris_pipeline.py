"""Invalid lookalike iris pipeline implementation.

Structurally close to iris-alt-passing/iris_pipeline.py (same imports, same
helper shapes, same model) but with one genuine behavioral bug: prepare_features
forgets to exclude TARGET_COLUMN ("species") from the returned feature
matrix, so the target leaks directly into the features used for training,
evaluation, and prediction. Used as a behavioral-equivalence fixture in
server/scenarios/behavioral-equivalence-ml.test.ts - it must FAIL the
scenario's real authored pytest suite.
"""
from __future__ import annotations

import pandas as pd
from sklearn.metrics import accuracy_score
from sklearn.tree import DecisionTreeClassifier

REQUIRED_TRAIN_COLUMNS = [
    "sample_id",
    "sepal_length",
    "sepal_width",
    "petal_length",
    "petal_width",
    "species",
]
REQUIRED_TEST_COLUMNS = [column for column in REQUIRED_TRAIN_COLUMNS if column != "species"]
TARGET_COLUMN = "species"
ID_COLUMN = "sample_id"
MODEL_SEED = 42


def _ensure_schema(frame: pd.DataFrame, expected_columns: list[str], source_label: str) -> None:
    present = set(frame.columns)
    absent = [column for column in expected_columns if column not in present]
    if absent:
        raise ValueError(f"{source_label} is missing required column(s): {', '.join(absent)}")


def _read_csv(path: str) -> pd.DataFrame:
    return pd.read_csv(path)


def load_training_data(path: str) -> pd.DataFrame:
    frame = _read_csv(path)
    _ensure_schema(frame, REQUIRED_TRAIN_COLUMNS, "Training data")
    return frame


def load_test_data(path: str) -> pd.DataFrame:
    frame = _read_csv(path)
    _ensure_schema(frame, REQUIRED_TEST_COLUMNS, "Test data")
    return frame


def prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    # BUG: only excludes the id column - TARGET_COLUMN ("species") stays in
    # the feature matrix whenever it is present (i.e. for every training
    # call), leaking the target directly into the features.
    non_feature_columns = {ID_COLUMN}
    feature_columns = [column for column in df.columns if column not in non_feature_columns]
    return df.loc[:, feature_columns].copy()


def train_model(X: pd.DataFrame, y: pd.Series) -> DecisionTreeClassifier:
    classifier = DecisionTreeClassifier(max_depth=4, random_state=MODEL_SEED)
    classifier.fit(X, y)
    return classifier


def evaluate_model(model: DecisionTreeClassifier, X: pd.DataFrame, y: pd.Series) -> dict:
    predicted = model.predict(X)
    score = accuracy_score(y_true=y, y_pred=predicted)
    return {"accuracy": float(score)}


def predict_species(model: DecisionTreeClassifier, X_test: pd.DataFrame) -> list[str]:
    return [str(species) for species in model.predict(X_test)]


def save_predictions(sample_ids, predictions, path: str) -> None:
    frame = pd.DataFrame({"sample_id": list(sample_ids), "predicted_species": list(predictions)})
    frame.to_csv(path, index=False)
