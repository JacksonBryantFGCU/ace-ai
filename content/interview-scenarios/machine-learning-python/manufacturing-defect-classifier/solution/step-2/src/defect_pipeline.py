"""Manufacturing defect pipeline helpers (reference solution through Step 2)."""
from __future__ import annotations

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

REQUIRED_TRAIN_COLUMNS = [
    "component_id",
    "temperature_c",
    "pressure_bar",
    "vibration_mm_s",
    "cycle_time_seconds",
    "material_density",
    "operator_experience_years",
    "maintenance_days_ago",
    "ambient_humidity",
    "machine_type",
    "shift",
    "material_grade",
    "supplier_region",
    "production_line",
    "is_defective",
]
REQUIRED_TEST_COLUMNS = [c for c in REQUIRED_TRAIN_COLUMNS if c != "is_defective"]

TARGET_COLUMN = "is_defective"
ID_COLUMN = "component_id"
RANDOM_STATE = 42
N_SPLITS = 5


def _require_columns(df: pd.DataFrame, required: list[str], label: str) -> None:
    missing = [column for column in required if column not in df.columns]
    if missing:
        raise ValueError(f"{label} is missing required column(s): {', '.join(missing)}")


def _validate_target_values(df: pd.DataFrame) -> None:
    values = set(df[TARGET_COLUMN].dropna().unique().tolist())
    if df[TARGET_COLUMN].isna().any() or not values.issubset({0, 1}):
        raise ValueError(f"{TARGET_COLUMN} must contain only 0/1 values with no missing entries")


def load_training_data(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    _require_columns(df, REQUIRED_TRAIN_COLUMNS, "Training data")
    _validate_target_values(df)
    return df


def load_test_data(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    _require_columns(df, REQUIRED_TEST_COLUMNS, "Test data")
    return df


def identify_feature_columns(df: pd.DataFrame) -> tuple[list[str], list[str]]:
    """Split df's columns into (numeric_features, categorical_features),
    excluding the identifier and target columns (target may be absent)."""
    candidate_columns = [c for c in df.columns if c not in (ID_COLUMN, TARGET_COLUMN)]
    numeric_features = [c for c in candidate_columns if pd.api.types.is_numeric_dtype(df[c])]
    categorical_features = [c for c in candidate_columns if c not in numeric_features]
    return numeric_features, categorical_features


def split_training_data(train_df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """Return (X_train, y_train) with component_id/is_defective excluded from X."""
    y_train = train_df[TARGET_COLUMN].astype(int)
    X_train = train_df.drop(columns=[ID_COLUMN, TARGET_COLUMN])
    return X_train, y_train


def split_test_features(test_df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """Return (test_features, test_ids) with component_id excluded from features."""
    test_ids = test_df[ID_COLUMN]
    test_features = test_df.drop(columns=[ID_COLUMN])
    return test_features, test_ids


def build_pipeline(numeric_features: list[str], categorical_features: list[str]) -> Pipeline:
    """Build a leakage-safe preprocessing + classification Pipeline.

    Numeric columns are median-imputed and scaled; categorical columns are
    most-frequent-imputed and one-hot encoded with unknown categories
    ignored at prediction time. All fitting happens inside the Pipeline, so
    cross-validating it never leaks validation-fold statistics into training.
    """
    numeric_transformer = Pipeline(
        steps=[
            ("impute", SimpleImputer(strategy="median")),
            ("scale", StandardScaler()),
        ]
    )
    categorical_transformer = Pipeline(
        steps=[
            ("impute", SimpleImputer(strategy="most_frequent")),
            ("encode", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    preprocessor = ColumnTransformer(
        transformers=[
            ("numeric", numeric_transformer, numeric_features),
            ("categorical", categorical_transformer, categorical_features),
        ]
    )
    classifier = LogisticRegression(
        random_state=RANDOM_STATE,
        max_iter=2000,
        class_weight="balanced",
    )
    return Pipeline(steps=[("preprocess", preprocessor), ("classify", classifier)])


def evaluate_pipeline(pipeline: Pipeline, X: pd.DataFrame, y: pd.Series) -> dict:
    raise NotImplementedError("evaluate_pipeline is not implemented yet")


def train_and_predict(pipeline: Pipeline, X: pd.DataFrame, y: pd.Series, X_test: pd.DataFrame):
    raise NotImplementedError("train_and_predict is not implemented yet")


def save_predictions(test_ids, predicted_labels, predicted_probabilities, path: str) -> None:
    raise NotImplementedError("save_predictions is not implemented yet")


def write_artifacts(**kwargs) -> None:
    raise NotImplementedError("write_artifacts is not implemented yet")
