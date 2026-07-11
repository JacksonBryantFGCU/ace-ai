"""Step 2 - Build Leakage-Safe Lag Features and the Model Pipeline."""
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

from src.demand_pipeline import (  # noqa: E402
    CATEGORICAL_FEATURES,
    DATE_COLUMN,
    ENTITY_COLUMNS,
    NUMERIC_FEATURES,
    TARGET_COLUMN,
    build_pipeline,
    create_lag_features,
    create_time_features,
    load_datasets,
    prepare_training_data,
)

TRAIN_PATH = str(ROOT / "data" / "train.csv")
FORECAST_PATH = str(ROOT / "data" / "forecast.csv")


@pytest.fixture(scope="module")
def prepared_train():
    train_df, _ = load_datasets(TRAIN_PATH, FORECAST_PATH)
    train_df = create_time_features(train_df)
    return prepare_training_data(train_df)


@pytest.fixture(scope="module")
def feature_df(prepared_train):
    featured = create_lag_features(prepared_train)
    return featured.dropna(subset=["lag_1", "lag_7", "rolling_mean_7"]).reset_index(drop=True)


# ---- create_lag_features correctness ---------------------------------------


def test_lag_columns_exist(feature_df):
    for column in ("lag_1", "lag_7", "rolling_mean_7"):
        assert column in feature_df.columns


def test_lag_1_matches_independent_recomputation(prepared_train, feature_df):
    recombined = prepared_train.copy()
    recombined["expected_lag_1"] = prepared_train.groupby(ENTITY_COLUMNS)[TARGET_COLUMN].shift(1)
    merged = feature_df.merge(
        recombined[ENTITY_COLUMNS + [DATE_COLUMN, "expected_lag_1"]],
        on=ENTITY_COLUMNS + [DATE_COLUMN],
        how="left",
    )
    assert np.allclose(merged["lag_1"], merged["expected_lag_1"])


def test_lag_7_matches_independent_recomputation(prepared_train, feature_df):
    recombined = prepared_train.copy()
    recombined["expected_lag_7"] = prepared_train.groupby(ENTITY_COLUMNS)[TARGET_COLUMN].shift(7)
    merged = feature_df.merge(
        recombined[ENTITY_COLUMNS + [DATE_COLUMN, "expected_lag_7"]],
        on=ENTITY_COLUMNS + [DATE_COLUMN],
        how="left",
    )
    assert np.allclose(merged["lag_7"], merged["expected_lag_7"])


def test_rolling_mean_7_matches_independent_recomputation(prepared_train, feature_df):
    recombined = prepared_train.copy()
    recombined["expected_rolling"] = prepared_train.groupby(ENTITY_COLUMNS)[TARGET_COLUMN].transform(
        lambda s: s.shift(1).rolling(7).mean()
    )
    merged = feature_df.merge(
        recombined[ENTITY_COLUMNS + [DATE_COLUMN, "expected_rolling"]],
        on=ENTITY_COLUMNS + [DATE_COLUMN],
        how="left",
    )
    assert np.allclose(merged["rolling_mean_7"], merged["expected_rolling"])


def test_rolling_mean_7_never_includes_the_current_rows_own_target(prepared_train):
    """A leaky implementation that rolls BEFORE shifting would make
    rolling_mean_7 equal to a window that includes the current day's own
    target. Detect that directly: compute the (leaky) un-shifted rolling
    mean and confirm the candidate's rolling_mean_7 does NOT match it for
    rows where the two diverge (they must diverge whenever the current
    day's own value differs from what a properly-shifted window would
    produce)."""
    featured = create_lag_features(prepared_train)
    leaky_rolling = prepared_train.groupby(ENTITY_COLUMNS)[TARGET_COLUMN].transform(
        lambda s: s.rolling(7).mean()
    )
    valid = featured["rolling_mean_7"].notna() & leaky_rolling.notna()
    # the honest (shifted) and leaky (unshifted) rolling means must differ
    # on a meaningful fraction of rows - if they never differ, the
    # implementation is not actually shifting before rolling.
    differing_fraction = (~np.isclose(featured.loc[valid, "rolling_mean_7"], leaky_rolling[valid])).mean()
    assert differing_fraction > 0.5


def test_lag_features_do_not_cross_store_product_boundaries(prepared_train):
    """Mutate a large chunk of one (store, product) series' target and
    confirm lag/rolling features for every OTHER series are completely
    unaffected - proving lags are grouped by BOTH store and product, not
    just one of them."""
    mutated = prepared_train.copy()
    key_store, key_product = mutated[ENTITY_COLUMNS].iloc[0]
    mask = (mutated["store_id"] == key_store) & (mutated["product_id"] == key_product)
    mutated.loc[mask, TARGET_COLUMN] = mutated.loc[mask, TARGET_COLUMN] + 10_000

    baseline_features = create_lag_features(prepared_train)
    mutated_features = create_lag_features(mutated)

    other_rows = ~mask
    for column in ("lag_1", "lag_7", "rolling_mean_7"):
        base_values = baseline_features.loc[other_rows, column].to_numpy(dtype=float)
        mutated_values = mutated_features.loc[other_rows, column].to_numpy(dtype=float)
        assert np.allclose(base_values, mutated_values, equal_nan=True)


def test_lag_features_use_only_strictly_prior_rows(prepared_train):
    """Mutate only the LAST date's target for one series and confirm no
    EARLIER row's lag/rolling feature in that same series changed - proving
    lag/rolling features never look forward."""
    mutated = prepared_train.copy()
    key_store, key_product = mutated[ENTITY_COLUMNS].iloc[0]
    series_mask = (mutated["store_id"] == key_store) & (mutated["product_id"] == key_product)
    series_dates = mutated.loc[series_mask, DATE_COLUMN]
    last_date = series_dates.max()
    last_row_mask = series_mask & (mutated[DATE_COLUMN] == last_date)
    mutated.loc[last_row_mask, TARGET_COLUMN] = mutated.loc[last_row_mask, TARGET_COLUMN] + 10_000

    baseline_features = create_lag_features(prepared_train)
    mutated_features = create_lag_features(mutated)

    earlier_rows = series_mask & (mutated[DATE_COLUMN] < last_date)
    for column in ("lag_1", "lag_7", "rolling_mean_7"):
        base_values = baseline_features.loc[earlier_rows, column].to_numpy(dtype=float)
        mutated_values = mutated_features.loc[earlier_rows, column].to_numpy(dtype=float)
        assert np.allclose(base_values, mutated_values, equal_nan=True)


def test_rows_lacking_sufficient_history_have_missing_lag_values(prepared_train):
    featured = create_lag_features(prepared_train)
    first_rows = featured.groupby(ENTITY_COLUMNS).head(1)
    assert first_rows["lag_1"].isna().all()
    assert first_rows["lag_7"].isna().all()


# ---- build_pipeline ----------------------------------------------------------


@pytest.fixture(scope="module")
def training_arrays(feature_df):
    X = feature_df[NUMERIC_FEATURES + CATEGORICAL_FEATURES]
    y = feature_df[TARGET_COLUMN].astype(float)
    return X, y


def test_build_pipeline_returns_sklearn_pipeline(training_arrays):
    X, y = training_arrays
    pipeline = build_pipeline(NUMERIC_FEATURES, CATEGORICAL_FEATURES)
    assert isinstance(pipeline, Pipeline)


def test_pipeline_contains_column_transformer(training_arrays):
    pipeline = build_pipeline(NUMERIC_FEATURES, CATEGORICAL_FEATURES)
    step_types = [type(step) for _, step in pipeline.steps]
    assert any(issubclass(t, ColumnTransformer) for t in step_types)


def test_pipeline_numeric_branch_has_imputer():
    pipeline = build_pipeline(NUMERIC_FEATURES, CATEGORICAL_FEATURES)
    ct = next(step for _, step in pipeline.steps if isinstance(step, ColumnTransformer))
    numeric_transformer = next(t for name, t, cols in ct.transformers if set(cols) == set(NUMERIC_FEATURES))
    imputers = [s for _, s in numeric_transformer.steps if isinstance(s, SimpleImputer)]
    assert len(imputers) >= 1


def test_pipeline_categorical_branch_has_imputer_and_ohe():
    pipeline = build_pipeline(NUMERIC_FEATURES, CATEGORICAL_FEATURES)
    ct = next(step for _, step in pipeline.steps if isinstance(step, ColumnTransformer))
    categorical_transformer = next(t for name, t, cols in ct.transformers if set(cols) == set(CATEGORICAL_FEATURES))
    steps = [s for _, s in categorical_transformer.steps]
    assert any(isinstance(s, SimpleImputer) for s in steps)
    encoder = next(s for s in steps if isinstance(s, OneHotEncoder))
    assert encoder.handle_unknown == "ignore"


def test_preprocessing_is_not_pre_fitted_outside_the_pipeline(training_arrays):
    X, y = training_arrays
    pipeline = build_pipeline(NUMERIC_FEATURES, CATEGORICAL_FEATURES)
    with pytest.raises(NotFittedError):
        pipeline.predict(X.head(3))


def test_pipeline_fits_successfully_despite_missing_values(training_arrays):
    X, y = training_arrays
    assert X.isna().sum().sum() > 0  # sanity: real missingness carries through
    pipeline = build_pipeline(NUMERIC_FEATURES, CATEGORICAL_FEATURES)
    pipeline.fit(X, y)  # must not raise


def test_pipeline_predicts_numeric_values_with_correct_shape(training_arrays):
    X, y = training_arrays
    pipeline = build_pipeline(NUMERIC_FEATURES, CATEGORICAL_FEATURES)
    pipeline.fit(X, y)
    predictions = pipeline.predict(X)
    assert len(predictions) == len(X)
    assert np.all(np.isfinite(predictions))


def test_pipeline_handles_unseen_categories_without_crashing(training_arrays):
    X, y = training_arrays
    pipeline = build_pipeline(NUMERIC_FEATURES, CATEGORICAL_FEATURES)
    pipeline.fit(X, y)
    novel = X.head(3).copy()
    for col in CATEGORICAL_FEATURES:
        novel[col] = "totally_unseen_category_value"
    predictions = pipeline.predict(novel)  # must not raise
    assert len(predictions) == 3


def test_estimator_has_fixed_random_state(training_arrays):
    pipeline = build_pipeline(NUMERIC_FEATURES, CATEGORICAL_FEATURES)
    estimator = pipeline.steps[-1][1]
    assert getattr(estimator, "random_state", None) is not None


def test_repeated_training_is_deterministic(training_arrays):
    X, y = training_arrays
    pipeline_a = build_pipeline(NUMERIC_FEATURES, CATEGORICAL_FEATURES)
    pipeline_a.fit(X, y)
    pred_a = pipeline_a.predict(X)

    pipeline_b = build_pipeline(NUMERIC_FEATURES, CATEGORICAL_FEATURES)
    pipeline_b.fit(X, y)
    pred_b = pipeline_b.predict(X)

    assert np.allclose(pred_a, pred_b)


def test_rows_are_sorted_chronologically_before_feature_creation(prepared_train):
    for _, group in prepared_train.groupby(ENTITY_COLUMNS):
        dates = group[DATE_COLUMN].tolist()
        assert dates == sorted(dates)
