"""Step 2 - Build a Preprocessing and Classification Pipeline."""
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import pytest
from sklearn.compose import ColumnTransformer
from sklearn.exceptions import NotFittedError
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.defect_pipeline import (  # noqa: E402
    ID_COLUMN,
    build_pipeline,
    identify_feature_columns,
    load_training_data,
    split_training_data,
)

TRAIN_PATH = str(ROOT / "data" / "train.csv")


@pytest.fixture(scope="module")
def training_data():
    train_df = load_training_data(TRAIN_PATH)
    numeric_features, categorical_features = identify_feature_columns(train_df)
    X, y = split_training_data(train_df)
    return X, y, numeric_features, categorical_features


def test_build_pipeline_returns_sklearn_pipeline(training_data):
    X, y, numeric_features, categorical_features = training_data
    pipeline = build_pipeline(numeric_features, categorical_features)
    assert isinstance(pipeline, Pipeline)


def test_pipeline_contains_column_transformer(training_data):
    X, y, numeric_features, categorical_features = training_data
    pipeline = build_pipeline(numeric_features, categorical_features)
    step_types = [type(step) for _, step in pipeline.steps]
    assert any(issubclass(t, ColumnTransformer) for t in step_types)


def test_pipeline_numeric_branch_has_imputer(training_data):
    X, y, numeric_features, categorical_features = training_data
    pipeline = build_pipeline(numeric_features, categorical_features)
    ct = next(step for _, step in pipeline.steps if isinstance(step, ColumnTransformer))
    numeric_transformer = next(t for name, t, cols in ct.transformers if set(cols) == set(numeric_features))
    imputers = [s for _, s in numeric_transformer.steps if isinstance(s, SimpleImputer)]
    assert len(imputers) >= 1


def test_pipeline_categorical_branch_has_imputer_and_ohe(training_data):
    X, y, numeric_features, categorical_features = training_data
    pipeline = build_pipeline(numeric_features, categorical_features)
    ct = next(step for _, step in pipeline.steps if isinstance(step, ColumnTransformer))
    categorical_transformer = next(t for name, t, cols in ct.transformers if set(cols) == set(categorical_features))
    steps = [s for _, s in categorical_transformer.steps]
    assert any(isinstance(s, SimpleImputer) for s in steps)
    encoder = next(s for s in steps if isinstance(s, OneHotEncoder))
    assert encoder.handle_unknown == "ignore"


def test_identifier_column_is_not_used_by_the_pipeline(training_data):
    X, y, numeric_features, categorical_features = training_data
    assert ID_COLUMN not in numeric_features
    assert ID_COLUMN not in categorical_features
    pipeline = build_pipeline(numeric_features, categorical_features)
    ct = next(step for _, step in pipeline.steps if isinstance(step, ColumnTransformer))
    used_columns = {c for _, _, cols in ct.transformers for c in cols}
    assert ID_COLUMN not in used_columns


def test_preprocessing_is_not_pre_fitted_outside_the_pipeline(training_data):
    X, y, numeric_features, categorical_features = training_data
    pipeline = build_pipeline(numeric_features, categorical_features)
    with pytest.raises(NotFittedError):
        pipeline.predict(X.head(3))


def test_pipeline_fits_successfully_despite_missing_values(training_data):
    X, y, numeric_features, categorical_features = training_data
    assert X.isna().sum().sum() > 0  # sanity: the training data really has NaNs
    pipeline = build_pipeline(numeric_features, categorical_features)
    pipeline.fit(X, y)  # must not raise


def test_pipeline_predicts_binary_labels_with_correct_shape(training_data):
    X, y, numeric_features, categorical_features = training_data
    pipeline = build_pipeline(numeric_features, categorical_features)
    pipeline.fit(X, y)
    predictions = pipeline.predict(X)
    assert len(predictions) == len(X)
    assert set(np.unique(predictions)).issubset({0, 1})


def test_pipeline_produces_valid_probabilities(training_data):
    X, y, numeric_features, categorical_features = training_data
    pipeline = build_pipeline(numeric_features, categorical_features)
    pipeline.fit(X, y)
    proba = pipeline.predict_proba(X)
    assert proba.shape == (len(X), 2)
    assert np.all((proba >= 0) & (proba <= 1))
    assert np.allclose(proba.sum(axis=1), 1.0)


def test_pipeline_handles_unseen_categories_without_crashing(training_data):
    X, y, numeric_features, categorical_features = training_data
    pipeline = build_pipeline(numeric_features, categorical_features)
    pipeline.fit(X, y)
    novel = X.head(3).copy()
    for col in categorical_features:
        novel[col] = "totally_unseen_category_value"
    predictions = pipeline.predict(novel)  # must not raise
    assert len(predictions) == 3


def test_classifier_addresses_class_imbalance(training_data):
    X, y, numeric_features, categorical_features = training_data
    pipeline = build_pipeline(numeric_features, categorical_features)
    classifier = pipeline.named_steps.get("classify") or pipeline.steps[-1][1]
    assert getattr(classifier, "class_weight", None) is not None


def test_classifier_has_fixed_random_state(training_data):
    X, y, numeric_features, categorical_features = training_data
    pipeline = build_pipeline(numeric_features, categorical_features)
    classifier = pipeline.named_steps.get("classify") or pipeline.steps[-1][1]
    assert getattr(classifier, "random_state", None) is not None


def test_repeated_training_is_deterministic(training_data):
    X, y, numeric_features, categorical_features = training_data
    pipeline_a = build_pipeline(numeric_features, categorical_features)
    pipeline_a.fit(X, y)
    proba_a = pipeline_a.predict_proba(X)

    pipeline_b = build_pipeline(numeric_features, categorical_features)
    pipeline_b.fit(X, y)
    proba_b = pipeline_b.predict_proba(X)

    assert np.allclose(proba_a, proba_b)
