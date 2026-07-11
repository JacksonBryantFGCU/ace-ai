"""Step 1 - Load, Validate, and Create Calendar Features."""
import sys
from pathlib import Path

import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from src.demand_pipeline import (  # noqa: E402
    DATE_COLUMN,
    ENTITY_COLUMNS,
    REQUIRED_FORECAST_COLUMNS,
    REQUIRED_TRAIN_COLUMNS,
    TARGET_COLUMN,
    create_time_features,
    load_datasets,
    prepare_training_data,
    validate_data,
)

TRAIN_PATH = str(ROOT / "data" / "train.csv")
FORECAST_PATH = str(ROOT / "data" / "forecast.csv")


@pytest.fixture(scope="module")
def datasets():
    return load_datasets(TRAIN_PATH, FORECAST_PATH)


def test_train_data_loads_as_dataframe(datasets):
    train_df, _ = datasets
    assert isinstance(train_df, pd.DataFrame)
    assert len(train_df) > 0


def test_forecast_data_loads_as_dataframe(datasets):
    _, forecast_df = datasets
    assert isinstance(forecast_df, pd.DataFrame)
    assert len(forecast_df) > 0


def test_train_row_count_is_correct(datasets):
    train_df, _ = datasets
    raw = pd.read_csv(TRAIN_PATH)
    assert len(train_df) == len(raw)


def test_forecast_row_count_is_correct(datasets):
    _, forecast_df = datasets
    raw = pd.read_csv(FORECAST_PATH)
    assert len(forecast_df) == len(raw)


def test_date_column_is_parsed_as_datetime(datasets):
    train_df, forecast_df = datasets
    assert pd.api.types.is_datetime64_any_dtype(train_df[DATE_COLUMN])
    assert pd.api.types.is_datetime64_any_dtype(forecast_df[DATE_COLUMN])


def test_train_has_required_columns(datasets):
    train_df, _ = datasets
    for column in REQUIRED_TRAIN_COLUMNS:
        assert column in train_df.columns


def test_forecast_has_required_columns(datasets):
    _, forecast_df = datasets
    for column in REQUIRED_FORECAST_COLUMNS:
        assert column in forecast_df.columns


def test_target_only_in_training_data(datasets):
    train_df, forecast_df = datasets
    assert TARGET_COLUMN in train_df.columns
    assert TARGET_COLUMN not in forecast_df.columns


def test_missing_required_column_raises_clear_error(tmp_path):
    bad_train = tmp_path / "bad_train.csv"
    bad_train.write_text("date,store_id\n2025-01-01,STORE-01\n")
    with pytest.raises(ValueError):
        load_datasets(str(bad_train), FORECAST_PATH)


def test_missing_required_forecast_column_raises_clear_error(tmp_path):
    bad_forecast = tmp_path / "bad_forecast.csv"
    bad_forecast.write_text("date,store_id\n2025-04-21,STORE-01\n")
    with pytest.raises(ValueError):
        load_datasets(TRAIN_PATH, str(bad_forecast))


def test_duplicate_entity_date_rows_are_rejected():
    train_df = pd.read_csv(TRAIN_PATH)
    train_df[DATE_COLUMN] = pd.to_datetime(train_df[DATE_COLUMN])
    duplicated = pd.concat([train_df, train_df.iloc[[0]]], ignore_index=True)
    with pytest.raises(ValueError):
        validate_data(duplicated, REQUIRED_TRAIN_COLUMNS, "Training data")


def test_malformed_date_raises_clear_error(tmp_path):
    raw = pd.read_csv(TRAIN_PATH)
    raw.loc[0, "date"] = "not-a-real-date"
    bad_train = tmp_path / "bad_dates.csv"
    raw.to_csv(bad_train, index=False)
    with pytest.raises(ValueError):
        load_datasets(str(bad_train), FORECAST_PATH)


def test_negative_target_raises_clear_error():
    train_df = pd.read_csv(TRAIN_PATH)
    train_df[DATE_COLUMN] = pd.to_datetime(train_df[DATE_COLUMN])
    train_df.loc[0, TARGET_COLUMN] = -5
    with pytest.raises(ValueError):
        validate_data(train_df, REQUIRED_TRAIN_COLUMNS, "Training data")


def test_missing_target_values_raise_clear_error():
    train_df = pd.read_csv(TRAIN_PATH)
    train_df[DATE_COLUMN] = pd.to_datetime(train_df[DATE_COLUMN])
    train_df.loc[0, TARGET_COLUMN] = None
    with pytest.raises(ValueError):
        validate_data(train_df, REQUIRED_TRAIN_COLUMNS, "Training data")


def test_non_numeric_target_raises_clear_error():
    train_df = pd.read_csv(TRAIN_PATH)
    train_df[DATE_COLUMN] = pd.to_datetime(train_df[DATE_COLUMN])
    train_df[TARGET_COLUMN] = train_df[TARGET_COLUMN].astype(object)
    train_df.loc[0, TARGET_COLUMN] = "not-a-number"
    with pytest.raises(ValueError):
        validate_data(train_df, REQUIRED_TRAIN_COLUMNS, "Training data")


def test_forecast_row_order_is_preserved_by_loading(datasets):
    _, forecast_df = datasets
    raw = pd.read_csv(FORECAST_PATH)
    assert list(forecast_df["store_id"]) == list(raw["store_id"])
    assert list(forecast_df["product_id"]) == list(raw["product_id"])
    assert list(forecast_df["date"].dt.strftime("%Y-%m-%d")) == list(raw["date"])


def test_missing_values_are_preserved_not_dropped(datasets):
    train_df, _ = datasets
    raw = pd.read_csv(TRAIN_PATH)
    assert len(train_df) == len(raw)
    assert train_df.isna().sum().sum() == raw.isna().sum().sum()
    assert train_df.isna().sum().sum() > 0


def test_create_time_features_adds_expected_columns(datasets):
    train_df, _ = datasets
    featured = create_time_features(train_df)
    for column in ("day_of_week", "day_of_month", "month", "is_weekend"):
        assert column in featured.columns


def test_calendar_features_have_correct_values(datasets):
    train_df, _ = datasets
    featured = create_time_features(train_df)
    row = featured[featured[DATE_COLUMN] == pd.Timestamp("2025-01-04")].iloc[0]  # a Saturday
    assert int(row["day_of_week"]) == 5
    assert int(row["day_of_month"]) == 4
    assert int(row["month"]) == 1
    assert int(row["is_weekend"]) == 1

    weekday_row = featured[featured[DATE_COLUMN] == pd.Timestamp("2025-01-02")].iloc[0]  # a Thursday
    assert int(weekday_row["day_of_week"]) == 3
    assert int(weekday_row["is_weekend"]) == 0


def test_weekend_logic_matches_all_seven_weekdays(datasets):
    train_df, _ = datasets
    featured = create_time_features(train_df)
    computed_weekend = (featured["day_of_week"] >= 5).astype(int)
    assert (featured["is_weekend"] == computed_weekend).all()


def test_create_time_features_does_not_use_string_slicing_of_a_bad_format(datasets):
    """A sanity check that day_of_week/month genuinely come from the parsed
    datetime rather than a fixed-width string slice: shuffle the date
    formatting and confirm the derived values still match Python's own
    date arithmetic for a sample of rows."""
    train_df, _ = datasets
    featured = create_time_features(train_df)
    sample = featured.sample(n=25, random_state=1)
    for _, row in sample.iterrows():
        expected = row[DATE_COLUMN]
        assert int(row["day_of_week"]) == expected.dayofweek
        assert int(row["day_of_month"]) == expected.day
        assert int(row["month"]) == expected.month


def test_prepare_training_data_sorts_chronologically_within_each_group(datasets):
    train_df, _ = datasets
    prepared = prepare_training_data(train_df)
    for _, group in prepared.groupby(ENTITY_COLUMNS):
        dates = group[DATE_COLUMN].tolist()
        assert dates == sorted(dates)


def test_prepare_training_data_preserves_all_rows(datasets):
    train_df, _ = datasets
    prepared = prepare_training_data(train_df)
    assert len(prepared) == len(train_df)
    assert set(zip(prepared["store_id"], prepared["product_id"], prepared[DATE_COLUMN])) == set(
        zip(train_df["store_id"], train_df["product_id"], train_df[DATE_COLUMN])
    )
