"""Alternative (independently structured) iris pipeline implementation.

Same public contract as
content/interview-scenarios/machine-learning-python/iris-species-classifier/solution/step-3/src/iris_pipeline.py
(same function/constant names, same deterministic model, same feature
contract) but organized differently throughout: private helper names,
control flow, and internal layout diverge from the reference. Used as a
behavioral-equivalence fixture in server/scenarios/behavioral-equivalence-ml.test.ts
- it must PASS the scenario's real authored pytest suite despite matching
none of the reference's private implementation details.
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
    non_feature_columns = {ID_COLUMN, TARGET_COLUMN}
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
