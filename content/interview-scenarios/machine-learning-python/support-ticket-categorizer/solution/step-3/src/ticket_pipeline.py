"""Support ticket pipeline helpers (reference solution, all steps)."""
from __future__ import annotations

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score

REQUIRED_TRAIN_COLUMNS = ["ticket_id", "subject", "message", "category"]
REQUIRED_TEST_COLUMNS = ["ticket_id", "subject", "message"]
TARGET_COLUMN = "category"
ID_COLUMN = "ticket_id"
VALID_CATEGORIES = ["billing", "technical", "account", "shipping"]
RANDOM_STATE = 42


def _require_columns(df: pd.DataFrame, required: list[str], label: str) -> None:
    missing = [column for column in required if column not in df.columns]
    if missing:
        raise ValueError(f"{label} is missing required column(s): {', '.join(missing)}")


def load_training_data(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    _require_columns(df, REQUIRED_TRAIN_COLUMNS, "Training data")
    return df


def load_test_data(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    _require_columns(df, REQUIRED_TEST_COLUMNS, "Test data")
    return df


def combine_text_fields(df: pd.DataFrame) -> pd.Series:
    return df["subject"].astype(str) + " " + df["message"].astype(str)


def prepare_features(train_text: pd.Series, test_text: pd.Series | None = None):
    vectorizer = TfidfVectorizer()
    X_train = vectorizer.fit_transform(train_text)
    if test_text is None:
        return X_train, vectorizer
    # Same fitted vectorizer transforms test text - never re-fit on test data,
    # so train/test features always share the same vocabulary/columns.
    X_test = vectorizer.transform(test_text)
    return X_train, X_test, vectorizer


def train_model(X, y: pd.Series) -> LogisticRegression:
    model = LogisticRegression(random_state=RANDOM_STATE, max_iter=1000)
    model.fit(X, y)
    return model


def evaluate_model(model: LogisticRegression, X, y: pd.Series) -> dict:
    predictions = model.predict(X)
    return {
        "accuracy": float(accuracy_score(y, predictions)),
        "macro_f1": float(f1_score(y, predictions, average="macro")),
    }


def predict_categories(model: LogisticRegression, X_test) -> list[str]:
    return [str(value) for value in model.predict(X_test)]


def save_predictions(ticket_ids, predictions, path: str) -> None:
    output = pd.DataFrame({"ticket_id": list(ticket_ids), "predicted_category": list(predictions)})
    output.to_csv(path, index=False)
