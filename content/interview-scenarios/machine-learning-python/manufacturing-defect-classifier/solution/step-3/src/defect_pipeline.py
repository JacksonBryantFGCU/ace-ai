"""Manufacturing defect pipeline helpers (reference solution, all steps)."""
from __future__ import annotations

import json

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_predict, cross_val_score
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
    """Leakage-safe stratified cross-validation over the WHOLE pipeline.

    Returns a nested dict with a probability-derived summary (accuracy,
    precision, recall, f1, roc_auc), the cross-validation fold detail, and a
    2x2 confusion matrix — all computed from out-of-fold predictions so no
    validation row is ever scored by a model that saw it during fitting.
    """
    skf = StratifiedKFold(n_splits=N_SPLITS, shuffle=True, random_state=RANDOM_STATE)

    fold_scores = cross_val_score(pipeline, X, y, cv=skf, scoring="f1")
    probabilities = cross_val_predict(pipeline, X, y, cv=skf, method="predict_proba")[:, 1]
    predictions = (probabilities >= 0.5).astype(int)

    summary = {
        "accuracy": float(accuracy_score(y, predictions)),
        "precision": float(precision_score(y, predictions, zero_division=0)),
        "recall": float(recall_score(y, predictions, zero_division=0)),
        "f1": float(f1_score(y, predictions, zero_division=0)),
        "roc_auc": float(roc_auc_score(y, probabilities)),
    }
    cross_validation = {
        "metric": "f1",
        "fold_scores": [float(score) for score in fold_scores],
        "mean": float(fold_scores.mean()),
        "std": float(fold_scores.std()),
        "fold_count": int(N_SPLITS),
    }
    confusion = [[int(v) for v in row] for row in confusion_matrix(y, predictions).tolist()]

    return {"summary": summary, "cross_validation": cross_validation, "confusion_matrix": confusion}


def train_and_predict(
    pipeline: Pipeline, X: pd.DataFrame, y: pd.Series, X_test: pd.DataFrame
) -> tuple[list[int], list[float]]:
    """Fit `pipeline` on all training data, then predict labels and
    positive-class probabilities for every row of X_test, preserving order."""
    pipeline.fit(X, y)
    predicted_labels = [int(v) for v in pipeline.predict(X_test)]
    predicted_probabilities = [float(v) for v in pipeline.predict_proba(X_test)[:, 1]]
    return predicted_labels, predicted_probabilities


def save_predictions(test_ids, predicted_labels, predicted_probabilities, path: str) -> None:
    output = pd.DataFrame(
        {
            "component_id": list(test_ids),
            "predicted_defect": list(predicted_labels),
            "defect_probability": list(predicted_probabilities),
        }
    )
    output.to_csv(path, index=False)


def write_artifacts(
    *,
    metrics: dict,
    predictions_path: str,
    metrics_path: str,
    report_path: str,
    test_ids,
    predicted_labels: list[int],
    predicted_probabilities: list[float],
    train_rows: int,
    test_rows: int,
    positive_rate: float,
    numeric_features: list[str],
    categorical_features: list[str],
    model_name: str,
) -> None:
    """Write predictions.csv, metrics.json, and report.txt next to main.py."""
    save_predictions(test_ids, predicted_labels, predicted_probabilities, predictions_path)

    summary = metrics["summary"]
    cross_validation = metrics["cross_validation"]
    confusion = metrics["confusion_matrix"]

    metrics_payload = {
        "summary": {
            "accuracy": round(summary["accuracy"], 4),
            "precision": round(summary["precision"], 4),
            "recall": round(summary["recall"], 4),
            "f1": round(summary["f1"], 4),
            "roc_auc": round(summary["roc_auc"], 4),
        },
        "cross_validation": {
            "metric": cross_validation["metric"],
            "fold_scores": [round(v, 4) for v in cross_validation["fold_scores"]],
            "mean": round(cross_validation["mean"], 4),
            "std": round(cross_validation["std"], 4),
            "fold_count": cross_validation["fold_count"],
        },
        "confusion_matrix": confusion,
        "dataset": {
            "training_rows": train_rows,
            "test_rows": test_rows,
            "positive_rate": round(positive_rate, 4),
        },
        "model": {
            "name": model_name,
            "class_weight": "balanced",
        },
    }

    with open(metrics_path, "w") as f:
        json.dump(metrics_payload, f, indent=2)

    report_lines = [
        "Manufacturing Defect Classifier Report",
        f"Training rows: {train_rows}",
        f"Test rows: {test_rows}",
        f"Positive class rate: {metrics_payload['dataset']['positive_rate']:.4f}",
        f"Numerical features: {len(numeric_features)}",
        f"Categorical features: {len(categorical_features)}",
        f"Model: {model_name}",
        "Imbalance strategy: class_weight=balanced",
        f"Cross-validation strategy: StratifiedKFold(n_splits={cross_validation['fold_count']}, shuffle=True, random_state={RANDOM_STATE})",
        f"Accuracy: {summary['accuracy']:.4f}",
        f"Precision: {summary['precision']:.4f}",
        f"Recall: {summary['recall']:.4f}",
        f"F1: {summary['f1']:.4f}",
        f"ROC AUC: {summary['roc_auc']:.4f}",
        f"Cross-validation F1 mean: {cross_validation['mean']:.4f}",
        f"Cross-validation F1 std: {cross_validation['std']:.4f}",
        f"Generated predictions: {len(predicted_labels)}",
    ]
    with open(report_path, "w") as f:
        f.write("\n".join(report_lines) + "\n")
