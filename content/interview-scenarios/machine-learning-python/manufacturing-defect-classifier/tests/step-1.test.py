"""Step 1 - Load and Prepare the Dataset."""
import sys
from pathlib import Path

import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.defect_pipeline import (  # noqa: E402
    ID_COLUMN,
    REQUIRED_TEST_COLUMNS,
    REQUIRED_TRAIN_COLUMNS,
    TARGET_COLUMN,
    identify_feature_columns,
    load_test_data,
    load_training_data,
    split_test_features,
    split_training_data,
)

TRAIN_PATH = str(ROOT / "data" / "train.csv")
TEST_PATH = str(ROOT / "data" / "test.csv")


def test_train_data_loads_as_dataframe():
    df = load_training_data(TRAIN_PATH)
    assert isinstance(df, pd.DataFrame)
    assert len(df) > 0


def test_test_data_loads_as_dataframe():
    df = load_test_data(TEST_PATH)
    assert isinstance(df, pd.DataFrame)
    assert len(df) > 0


def test_train_row_count_is_correct():
    df = load_training_data(TRAIN_PATH)
    raw = pd.read_csv(TRAIN_PATH)
    assert len(df) == len(raw)


def test_test_row_count_is_correct():
    df = load_test_data(TEST_PATH)
    raw = pd.read_csv(TEST_PATH)
    assert len(df) == len(raw)


def test_train_has_required_columns():
    df = load_training_data(TRAIN_PATH)
    for column in REQUIRED_TRAIN_COLUMNS:
        assert column in df.columns


def test_test_has_required_columns():
    df = load_test_data(TEST_PATH)
    for column in REQUIRED_TEST_COLUMNS:
        assert column in df.columns


def test_target_only_in_training_data():
    train_df = load_training_data(TRAIN_PATH)
    test_df = load_test_data(TEST_PATH)
    assert TARGET_COLUMN in train_df.columns
    assert TARGET_COLUMN not in test_df.columns


def test_identifier_present_in_both():
    train_df = load_training_data(TRAIN_PATH)
    test_df = load_test_data(TEST_PATH)
    assert ID_COLUMN in train_df.columns
    assert ID_COLUMN in test_df.columns


def test_missing_required_column_raises_clear_error(tmp_path):
    bad_csv = tmp_path / "bad_train.csv"
    bad_csv.write_text("component_id,temperature_c\nCOMP-1,75.0\n")
    with pytest.raises(ValueError):
        load_training_data(str(bad_csv))


def test_missing_required_test_column_raises_clear_error(tmp_path):
    bad_csv = tmp_path / "bad_test.csv"
    bad_csv.write_text("component_id,temperature_c\nCOMP-1,75.0\n")
    with pytest.raises(ValueError):
        load_test_data(str(bad_csv))


def test_invalid_target_values_raise_clear_error(tmp_path):
    train_df = pd.read_csv(TRAIN_PATH).head(5).copy()
    train_df.loc[0, "is_defective"] = 7  # not 0/1
    bad_csv = tmp_path / "bad_target.csv"
    train_df.to_csv(bad_csv, index=False)
    with pytest.raises(ValueError):
        load_training_data(str(bad_csv))


def test_missing_target_values_raise_clear_error(tmp_path):
    train_df = pd.read_csv(TRAIN_PATH).head(5).copy()
    train_df.loc[0, "is_defective"] = None
    bad_csv = tmp_path / "missing_target.csv"
    train_df.to_csv(bad_csv, index=False)
    with pytest.raises(ValueError):
        load_training_data(str(bad_csv))


def test_test_component_ids_are_preserved_in_order():
    df = load_test_data(TEST_PATH)
    raw = pd.read_csv(TEST_PATH)
    assert list(df["component_id"]) == list(raw["component_id"])


def test_missing_values_are_preserved_not_dropped():
    df = load_training_data(TRAIN_PATH)
    raw = pd.read_csv(TRAIN_PATH)
    assert len(df) == len(raw)
    # the dataset intentionally has missing numeric/categorical values;
    # loading must not silently drop rows or columns with NaNs.
    assert df.isna().sum().sum() == raw.isna().sum().sum()
    assert df.isna().sum().sum() > 0


def test_identify_feature_columns_splits_numeric_and_categorical():
    df = load_training_data(TRAIN_PATH)
    numeric_features, categorical_features = identify_feature_columns(df)
    assert isinstance(numeric_features, list)
    assert isinstance(categorical_features, list)
    assert ID_COLUMN not in numeric_features and ID_COLUMN not in categorical_features
    assert TARGET_COLUMN not in numeric_features and TARGET_COLUMN not in categorical_features
    for column in ("temperature_c", "pressure_bar", "vibration_mm_s"):
        assert column in numeric_features
    for column in ("machine_type", "material_grade", "production_line"):
        assert column in categorical_features
    # no overlap, and every feature accounted for
    assert set(numeric_features).isdisjoint(categorical_features)
    all_columns = set(df.columns) - {ID_COLUMN, TARGET_COLUMN}
    assert set(numeric_features) | set(categorical_features) == all_columns


def test_identify_feature_columns_works_without_target_column():
    df = load_test_data(TEST_PATH)
    numeric_features, categorical_features = identify_feature_columns(df)
    assert len(numeric_features) > 0
    assert len(categorical_features) > 0


def test_split_training_data_excludes_id_and_target():
    train_df = load_training_data(TRAIN_PATH)
    X, y = split_training_data(train_df)
    assert ID_COLUMN not in X.columns
    assert TARGET_COLUMN not in X.columns
    assert len(X) == len(train_df)
    assert len(y) == len(train_df)
    assert set(y.unique()).issubset({0, 1})


def test_split_training_data_preserves_row_order():
    train_df = load_training_data(TRAIN_PATH)
    X, y = split_training_data(train_df)
    assert list(y.values) == [int(v) for v in train_df[TARGET_COLUMN]]


def test_split_test_features_excludes_id_and_preserves_order():
    test_df = load_test_data(TEST_PATH)
    X_test, test_ids = split_test_features(test_df)
    assert ID_COLUMN not in X_test.columns
    assert list(test_ids) == list(test_df[ID_COLUMN])
    assert len(X_test) == len(test_df)
