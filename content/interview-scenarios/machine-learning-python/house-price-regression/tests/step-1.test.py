"""Step 1 - Load and Prepare Data."""
import sys
from pathlib import Path

import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.price_pipeline import (  # noqa: E402
    REQUIRED_TEST_COLUMNS,
    REQUIRED_TRAIN_COLUMNS,
    load_test_data,
    load_training_data,
    prepare_features,
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


def test_train_has_required_columns():
    df = load_training_data(TRAIN_PATH)
    for column in REQUIRED_TRAIN_COLUMNS:
        assert column in df.columns


def test_test_has_required_columns():
    df = load_test_data(TEST_PATH)
    for column in REQUIRED_TEST_COLUMNS:
        assert column in df.columns


def test_price_only_in_training_data():
    train_df = load_training_data(TRAIN_PATH)
    test_df = load_test_data(TEST_PATH)
    assert "price" in train_df.columns
    assert "price" not in test_df.columns


def test_missing_required_column_raises_clear_error(tmp_path):
    bad_csv = tmp_path / "bad_train.csv"
    bad_csv.write_text("home_id,square_feet\nHOME-1,1200\n")
    with pytest.raises(ValueError):
        load_training_data(str(bad_csv))


def test_test_home_ids_are_preserved():
    df = load_test_data(TEST_PATH)
    raw = pd.read_csv(TEST_PATH)
    assert list(df["home_id"]) == list(raw["home_id"])


def test_prepare_features_excludes_home_id_and_price():
    train_df = load_training_data(TRAIN_PATH)
    features = prepare_features(train_df)
    assert "home_id" not in features.columns
    assert "price" not in features.columns


def test_prepare_features_handles_categorical_columns():
    train_df = load_training_data(TRAIN_PATH)
    features = prepare_features(train_df)
    assert "neighborhood" not in features.columns
    assert "has_garage" not in features.columns
    for dtype in features.dtypes:
        assert pd.api.types.is_numeric_dtype(dtype)
