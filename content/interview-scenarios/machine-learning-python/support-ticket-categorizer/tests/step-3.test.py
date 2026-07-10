"""Step 3 - Generate Predictions and Artifacts."""
import csv
import json
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

TEST_CSV = ROOT / "data" / "test.csv"
TRAIN_CSV = ROOT / "data" / "train.csv"
PREDICTIONS_CSV = ROOT / "predictions.csv"
METRICS_JSON = ROOT / "metrics.json"
REPORT_TXT = ROOT / "report.txt"
VALID_CATEGORIES = {"billing", "technical", "account", "shipping"}


def _read_csv_rows(path: Path):
    with open(path, newline="") as f:
        return list(csv.reader(f))


@pytest.fixture(scope="module")
def main_run():
    return subprocess.run(
        [sys.executable, "main.py"],
        cwd=str(ROOT),
        capture_output=True,
        text=True,
        timeout=60,
    )


def test_running_main_succeeds(main_run):
    assert main_run.returncode == 0, (
        f"main.py failed (exit {main_run.returncode}):\n"
        f"stdout:\n{main_run.stdout}\nstderr:\n{main_run.stderr}"
    )


def test_predictions_file_is_created(main_run):
    assert PREDICTIONS_CSV.exists(), "main.py did not create predictions.csv"


def test_predictions_columns_are_exact(main_run):
    rows = _read_csv_rows(PREDICTIONS_CSV)
    assert rows[0] == ["ticket_id", "predicted_category"]


def test_predictions_row_count_matches_test_csv(main_run):
    test_rows = _read_csv_rows(TEST_CSV)[1:]
    pred_rows = _read_csv_rows(PREDICTIONS_CSV)[1:]
    assert len(pred_rows) == len(test_rows)


def test_predictions_preserve_test_ticket_order(main_run):
    test_rows = _read_csv_rows(TEST_CSV)[1:]
    pred_rows = _read_csv_rows(PREDICTIONS_CSV)[1:]
    expected_ids = [row[0] for row in test_rows]
    actual_ids = [row[0] for row in pred_rows]
    assert actual_ids == expected_ids


def test_predictions_are_valid_categories(main_run):
    pred_rows = _read_csv_rows(PREDICTIONS_CSV)[1:]
    for row in pred_rows:
        assert row[1] in VALID_CATEGORIES


def test_no_missing_predictions(main_run):
    pred_rows = _read_csv_rows(PREDICTIONS_CSV)[1:]
    for row in pred_rows:
        assert row[1] not in (None, "")


def test_metrics_json_is_created(main_run):
    assert METRICS_JSON.exists(), "main.py did not create metrics.json"


def test_metrics_json_has_expected_keys(main_run):
    data = json.loads(METRICS_JSON.read_text())
    for key in ("accuracy", "macro_f1", "train_rows", "test_rows", "model"):
        assert key in data


def test_metrics_json_values_are_valid(main_run):
    data = json.loads(METRICS_JSON.read_text())
    assert isinstance(data["accuracy"], (int, float))
    assert 0.0 <= data["accuracy"] <= 1.0
    assert isinstance(data["macro_f1"], (int, float))
    assert 0.0 <= data["macro_f1"] <= 1.0
    train_rows = len(_read_csv_rows(TRAIN_CSV)) - 1
    test_rows = len(_read_csv_rows(TEST_CSV)) - 1
    assert data["train_rows"] == train_rows
    assert data["test_rows"] == test_rows
    assert isinstance(data["model"], str) and data["model"]


def test_report_txt_is_created(main_run):
    assert REPORT_TXT.exists(), "main.py did not create report.txt"


def test_report_txt_contains_summary(main_run):
    text = REPORT_TXT.read_text()
    train_rows = len(_read_csv_rows(TRAIN_CSV)) - 1
    test_rows = len(_read_csv_rows(TEST_CSV)) - 1
    assert "Support Ticket Categorizer Report" in text
    assert f"Training rows: {train_rows}" in text
    assert f"Test rows: {test_rows}" in text
