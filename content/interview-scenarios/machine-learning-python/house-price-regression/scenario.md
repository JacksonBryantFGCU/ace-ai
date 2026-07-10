---
id: house-price-regression
title: House Price Regression
summary: "Build a small pandas + scikit-learn pipeline that predicts home sale prices from listing features."
category: machine-learning-python
skills:
  - python
  - pandas
  - scikit-learn
  - regression
jobRoles:
  - ml
tags:
  - category:machine-learning
  - framework:scikit-learn
  - dataset:csv
  - pattern:regression
difficulty: easy
experienceMin: intern
experienceMax: junior
estimatedMinutes: 40
stack:
  languages:
    - python
  harness: python
language:
  primary: python
runtime: python
ml:
  pythonVersion: "3.11"
execution:
  mode: python-ml
verification:
  engine: python
  mode: python-step
  includePreviousSteps: true
workspace:
  files:
    - { path: main.py, role: edit }
    - { path: src/price_pipeline.py, role: edit }
    - { path: data/train.csv, role: readonly }
    - { path: data/test.csv, role: readonly }
  entry: main.py
rubric:
  - criterion: Data loading
    weight: 8
    detail: "Loads train.csv and test.csv into usable DataFrame-like objects without crashing on the provided files."
  - criterion: Column validation
    weight: 7
    detail: "Validates required columns are present and raises a clear, actionable error when they are not."
  - criterion: Feature preparation
    weight: 9
    detail: "Produces a model-ready feature matrix, excluding home_id and price from the feature set."
  - criterion: Categorical encoding
    weight: 8
    detail: "Encodes neighborhood and has_garage consistently so train and test features share the same columns."
  - criterion: Avoiding target leakage
    weight: 12
    detail: "Never includes price (or anything derived from it) in the feature matrix used for training or evaluation."
  - criterion: Deterministic model training
    weight: 10
    detail: "Trains with a fixed random seed so repeated runs produce identical models and metrics."
  - criterion: MAE/R2 calculation
    weight: 10
    detail: "Returns a metrics dictionary with valid, non-NaN mae and r2 values."
  - criterion: Prediction generation
    weight: 9
    detail: "Generates a positive, integer-like price prediction for every test home with no missing values."
  - criterion: Artifact generation
    weight: 7
    detail: "python main.py writes predictions.csv, metrics.json, and report.txt next to main.py."
  - criterion: Output file shapes
    weight: 7
    detail: "predictions.csv has exactly the columns home_id,predicted_price, one row per test home, in test.csv order."
  - criterion: Reproducibility
    weight: 7
    detail: "python main.py can be re-run end to end and produces the same predictions.csv every time."
  - criterion: Code clarity
    weight: 6
    detail: "Pipeline functions are small, single-purpose, and easy to follow."
source: authored
status: verified
visibility: public
type: machine-learning
version: 1
steps:
  - id: load-and-prepare-data
    kind: implement
    prompt: "Implement load_training_data and load_test_data in src/price_pipeline.py. Both should read the given CSV path with pandas and validate that every required column is present, raising a clear ValueError listing any missing columns. Then implement prepare_features so it drops home_id (and price, if present) and one-hot encodes neighborhood/has_garage using the fixed NEIGHBORHOODS/GARAGE_VALUES category lists already declared in the file, so train and test always produce identical encoded columns."
    verification: automated-tests
    verify: { harness: python, tests: [tests/step-1.test.py] }
    weight: 30
    checkpoint: { files: [solution/step-1/main.py, solution/step-1/src/price_pipeline.py] }
    hints:
      - "pandas.read_csv(path) gives you a DataFrame; check for missing columns with a simple list comprehension against REQUIRED_TRAIN_COLUMNS / REQUIRED_TEST_COLUMNS."
      - "Use pd.Categorical(series, categories=NEIGHBORHOODS) before pd.get_dummies so a category missing from one split doesn't produce a column mismatch against the other."
      - "price only exists in train.csv - prepare_features must work correctly whether or not the column is present."
  - id: train-and-evaluate-model
    kind: implement
    prompt: "Implement train_model and evaluate_model in src/price_pipeline.py. Train a RandomForestRegressor (or an equivalently deterministic regressor) with a fixed random_state, and return a metrics dictionary with 'mae' and 'r2' keys from evaluate_model. Wire prepare_features -> a deterministic train/validation split -> train_model -> evaluate_model together in main.py."
    verification: automated-tests
    verify: { harness: python, tests: [tests/step-2.test.py] }
    weight: 35
    checkpoint: { files: [solution/step-2/main.py, solution/step-2/src/price_pipeline.py] }
    hints:
      - "Use sklearn.model_selection.train_test_split(X, y, test_size=0.25, random_state=42) so the split - and therefore every downstream metric - is reproducible."
      - "RandomForestRegressor(random_state=42, n_estimators=50, max_depth=6) is fast, fully deterministic given a fixed seed, and needs no feature scaling."
      - "evaluate_model must never leak price into the features it scores against - only compare predictions to the y you already split out."
  - id: generate-predictions
    kind: implement
    prompt: "Implement predict_prices and save_predictions in src/price_pipeline.py, then finish main.py so `python main.py` trains the model, predicts the price for every row of data/test.csv, and writes predictions.csv (columns home_id,predicted_price, one row per test home, in the same order as test.csv) next to main.py."
    verification: automated-tests
    verify: { harness: python, tests: [tests/step-3.test.py] }
    weight: 35
    checkpoint: { files: [solution/step-3/main.py, solution/step-3/src/price_pipeline.py] }
    hints:
      - "Build the test feature matrix the same way as the training features, then reindex it to the training features' columns (fill_value=0) before predicting - this guards against any last column mismatch."
      - "predict_prices should return model.predict(X_test) rounded to the nearest integer dollar."
      - "save_predictions should write with pandas.DataFrame(...).to_csv(path, index=False) so the header and row order come out exactly right."
---

## Overview

Build a small house price regression pipeline. `HearthList` wants to estimate
the sale price of homes currently on the market based on a handful of listing
features. You're given a training set of recently sold homes (with a known
`price`) and a test set of homes currently for sale (without one) - your job
is to train a model on the first and produce a price prediction for every row
of the second.

This is intentionally small and fast: a handful of numeric/categorical
features, a simple deterministic regression model, no external data, no GPU,
no notebooks.

## Workspace

- **`main.py`** *(edit, entry)* - orchestrates the pipeline: load data,
  prepare features, train, evaluate, predict, and write `predictions.csv`.
  Run it with `python main.py`.
- **`src/price_pipeline.py`** *(edit)* - the functions you implement across
  all three steps.
- **`data/train.csv`** *(readonly)* - 75 recently sold homes.
- **`data/test.csv`** *(readonly)* - 20 homes currently for sale to predict
  prices for.

## Dataset

Both files share the same home listing columns; `train.csv` additionally has
the target column.

| column           | type                                              | notes                          |
| ---------------- | -------------------------------------------------- | -------------------------------- |
| `home_id`        | string                                              | stable id, e.g. `HOME-101`      |
| `square_feet`    | integer > 0                                         | interior square footage          |
| `bedrooms`       | integer > 0                                         | number of bedrooms               |
| `bathrooms`      | integer > 0                                         | number of bathrooms              |
| `year_built`     | integer                                             | year the home was built          |
| `neighborhood`   | `downtown` \| `suburban` \| `lakeside` \| `rural`   | listing neighborhood             |
| `has_garage`     | `yes` \| `no`                                       | whether the home has a garage    |
| `price`          | integer dollars                                     | **train.csv only** - the target  |

## Target Variable

`price` (sale price in whole dollars). It exists only in `train.csv` -
`test.csv` deliberately omits it, since that's what you're predicting.

## Expected `predictions.csv`

Running `python main.py` after Step 3 should produce a `predictions.csv` next
to `main.py` with exactly this shape:

```csv
home_id,predicted_price
HOME-101,325000
HOME-102,410000
```

- Exactly the columns `home_id,predicted_price` - nothing else.
- One row per home in `data/test.csv`, in the same order.
- `predicted_price` is always a positive, integer-dollar number - never
  missing, never negative.

## Step Flow

1. **Load and Prepare Data** - load + validate both CSVs, and turn a raw
   home listing table into a model-ready numeric feature matrix.
2. **Train and Evaluate Model** - train a deterministic regression model on a
   fixed train/validation split and report MAE and R².
3. **Generate Predictions** - predict on `data/test.csv` and write
   `predictions.csv`, `metrics.json`, and `report.txt` in the required shape.

Each step's checks include every previous step's checks, so later work must
preserve earlier behavior - don't change `load_training_data`,
`load_test_data`, or `prepare_features`'s contract once Step 1 passes.

## Verification

Each step runs an automated Python check (`Run step checks`) covering that
step plus every prior step. The final step also exposes `Run final checks`,
which re-runs every step's checks together against the finished pipeline. Both
run entirely offline against the CSVs already in your workspace - no network
access, no package installation, no notebooks.

You can also run `python main.py` at any time to preview stdout, metrics, and
generated files in the notebook-style Output Preview panel - this is a
preview, not verification, and never affects step pass/fail on its own.

## Reference Solutions

- `solution/step-1/` - loading, validation, and feature preparation only.
- `solution/step-2/` - adds deterministic training and evaluation.
- `solution/step-3/` - the complete pipeline, including `predictions.csv`,
  `metrics.json`, and `report.txt` generation.
