"""Step 1 - Load and Prepare Text Data."""
import sys
from pathlib import Path

import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.ticket_pipeline import (  # noqa: E402
    REQUIRED_TEST_COLUMNS,
    REQUIRED_TRAIN_COLUMNS,
    combine_text_fields,
    load_test_data,
    load_training_data,
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


def test_category_only_in_training_data():
    train_df = load_training_data(TRAIN_PATH)
    test_df = load_test_data(TEST_PATH)
    assert "category" in train_df.columns
    assert "category" not in test_df.columns


def test_missing_required_column_raises_clear_error(tmp_path):
    bad_csv = tmp_path / "bad_train.csv"
    bad_csv.write_text("ticket_id,subject\nTICKET-1,Invoice question\n")
    with pytest.raises(ValueError):
        load_training_data(str(bad_csv))


def test_test_ticket_ids_are_preserved():
    df = load_test_data(TEST_PATH)
    raw = pd.read_csv(TEST_PATH)
    assert list(df["ticket_id"]) == list(raw["ticket_id"])


def test_combine_text_fields_includes_subject_and_message():
    train_df = load_training_data(TRAIN_PATH)
    combined = combine_text_fields(train_df)
    assert isinstance(combined, pd.Series)
    assert len(combined) == len(train_df)
    first_row = train_df.iloc[0]
    assert first_row["subject"] in combined.iloc[0]
    assert first_row["message"] in combined.iloc[0]


def test_combine_text_fields_works_without_ticket_id_or_category():
    test_df = load_test_data(TEST_PATH)  # no ticket_id used, no category present
    combined = combine_text_fields(test_df)
    assert len(combined) == len(test_df)
    for value in combined:
        assert isinstance(value, str) and value.strip()
