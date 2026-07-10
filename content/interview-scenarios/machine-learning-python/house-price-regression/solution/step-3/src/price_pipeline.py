"""House price pipeline helpers (reference solution, all steps)."""
from __future__ import annotations

import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score

REQUIRED_TRAIN_COLUMNS = [
    "home_id",
    "square_feet",
    "bedrooms",
    "bathrooms",
    "year_built",
    "neighborhood",
    "has_garage",
    "price",
]
REQUIRED_TEST_COLUMNS = [
    "home_id",
    "square_feet",
    "bedrooms",
    "bathrooms",
    "year_built",
    "neighborhood",
    "has_garage",
]
TARGET_COLUMN = "price"
ID_COLUMN = "home_id"
CATEGORICAL_COLUMNS = ["neighborhood", "has_garage"]
NEIGHBORHOODS = ["downtown", "suburban", "lakeside", "rural"]
GARAGE_VALUES = ["yes", "no"]
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


def prepare_features(df: pd.DataFrame) -> pd.DataFrame:
    drop_columns = [c for c in (ID_COLUMN, TARGET_COLUMN) if c in df.columns]
    features = df.drop(columns=drop_columns).copy()
    # Fixed categories (not just "whatever appears in this df") so train and
    # test feature frames always produce the exact same encoded columns.
    features["neighborhood"] = pd.Categorical(features["neighborhood"], categories=NEIGHBORHOODS)
    features["has_garage"] = pd.Categorical(features["has_garage"], categories=GARAGE_VALUES)
    features = pd.get_dummies(features, columns=CATEGORICAL_COLUMNS)
    return features


def train_model(X: pd.DataFrame, y: pd.Series) -> RandomForestRegressor:
    model = RandomForestRegressor(random_state=RANDOM_STATE, n_estimators=50, max_depth=6)
    model.fit(X, y)
    return model


def evaluate_model(model: RandomForestRegressor, X: pd.DataFrame, y: pd.Series) -> dict:
    predictions = model.predict(X)
    return {
        "mae": float(mean_absolute_error(y, predictions)),
        "r2": float(r2_score(y, predictions)),
    }


def predict_prices(model: RandomForestRegressor, X_test: pd.DataFrame) -> list[int]:
    return [int(round(value)) for value in model.predict(X_test)]


def save_predictions(home_ids, predictions, path: str) -> None:
    output = pd.DataFrame({"home_id": list(home_ids), "predicted_price": list(predictions)})
    output.to_csv(path, index=False)
