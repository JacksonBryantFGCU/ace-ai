---
id: retail-demand-forecaster
title: Retail Demand Forecaster
summary: "Build a leakage-safe time-series forecasting pipeline that predicts daily product demand across multiple retail stores."
category: machine-learning-python
skills:
  - python
  - pandas
  - scikit-learn
  - time-series
jobRoles:
  - ml
tags:
  - category:machine-learning
  - framework:scikit-learn
  - dataset:csv
  - pattern:regression
  - pattern:time-series
  - pattern:forecasting
difficulty: medium
experienceMin: junior
experienceMax: senior
estimatedMinutes: 55
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
  artifacts:
    metrics:
      path: metrics.json
      required: true
      requiredPaths:
        - /validation/mae
        - /validation/rmse
        - /validation/r2
        - /validation/wmape
        - /validation/validation_rows
        - /baseline/name
        - /baseline/mae
        - /baseline/rmse
        - /baseline/wmape
        - /forecast/rows
        - /forecast/horizon_days
        - /dataset/training_rows
        - /model/name
        - /model/validation_strategy
      expectedTypes:
        /validation/mae: number
        /validation/rmse: number
        /validation/r2: number
        /validation/wmape: number
        /validation/validation_rows: number
        /baseline/name: string
        /baseline/mae: number
        /baseline/rmse: number
        /baseline/wmape: number
        /forecast/rows: number
        /forecast/horizon_days: number
        /dataset/training_rows: number
        /model/name: string
        /model/validation_strategy: string
      assertions:
        - path: /validation/r2
          type: number
          minimum: -5
          maximum: 1
        - path: /validation/wmape
          type: number
          minimum: 0
        - path: /forecast/rows
          type: number
          minimum: 1
        - path: /forecast/horizon_days
          type: number
          minimum: 1
verification:
  engine: python
  mode: python-step
  includePreviousSteps: true
workspace:
  files:
    - { path: main.py, role: edit }
    - { path: src/demand_pipeline.py, role: edit }
    - { path: data/train.csv, role: readonly }
    - { path: data/forecast.csv, role: readonly }
  entry: main.py
rubric:
  - criterion: Data loading and schema validation
    weight: 10
    detail: "Loads train.csv and forecast.csv, parses dates, and validates required columns and unique store-product-date combinations."
  - criterion: Date parsing and calendar features
    weight: 10
    detail: "Parses date as a real datetime and derives day_of_week/day_of_month/month/is_weekend without string slicing."
  - criterion: Chronological ordering and entity grouping
    weight: 10
    detail: "Sorts each store-product series chronologically before deriving any time-dependent feature."
  - criterion: Leakage-safe lag features
    weight: 15
    detail: "lag_1 and lag_7 are computed per (store_id, product_id) group using only strictly prior rows - never the current or a future row."
  - criterion: Rolling feature engineering
    weight: 10
    detail: "rolling_mean_7 is shifted before the rolling window is applied, so it never includes the current day's demand."
  - criterion: Preprocessing and regression pipeline
    weight: 15
    detail: "Combines a ColumnTransformer (numeric imputation, categorical imputation + one-hot encoding with unknown categories ignored) and a deterministic regressor into one sklearn Pipeline."
  - criterion: Time-aware validation
    weight: 10
    detail: "Uses a chronological holdout (train on earlier dates, validate on later dates) - never a random or shuffled split."
  - criterion: Baseline comparison and metrics
    weight: 10
    detail: "Reports MAE/RMSE/R2/WMAPE for both the model and a seasonal-naive (lag_7) baseline, and the model meaningfully beats it."
  - criterion: Recursive forecasting and artifacts
    weight: 5
    detail: "Builds the 14-day forecast date by date using only historical actuals and previously predicted values, and writes forecasts.csv/metrics.json/report.txt correctly."
  - criterion: Code quality and robustness
    weight: 5
    detail: "Pipeline functions are small and single-purpose, and handle missing values and unseen categories without crashing."
source: authored
status: verified
visibility: public
type: machine-learning
version: 1
steps:
  - id: load-validate-and-create-calendar-features
    kind: implement
    prompt: "Implement load_datasets and validate_data in src/demand_pipeline.py: load train.csv and forecast.csv with pandas, parse `date` as a real datetime (no string slicing), validate every required column is present (raising a clear ValueError listing missing columns), and validate that every (store_id, product_id, date) combination is unique in each file. Then implement create_time_features(df) to add day_of_week, day_of_month, month, and is_weekend columns derived from the parsed datetime column, and prepare_training_data(df) to sort a DataFrame chronologically within each (store_id, product_id) group and separate `units_sold` into a target Series (train.csv only) while preserving row identity/order for forecast.csv."
    verification: automated-tests
    verify: { harness: python, tests: [tests/step-1.test.py] }
    weight: 25
    checkpoint: { files: [solution/step-1/main.py, solution/step-1/src/demand_pipeline.py] }
    hints:
      - "pandas.to_datetime(df['date']) gives you a real datetime column - day_of_week/day_of_month/month/is_weekend all come from that column's .dt accessor, not string operations."
      - "Validate uniqueness with df.duplicated(subset=['store_id', 'product_id', 'date']).any() - raise a clear ValueError if any duplicate combination exists."
      - "forecast.csv has no units_sold column - your loading and validation logic must work correctly on both files without assuming the target is present."
  - id: build-leakage-safe-lag-features-and-pipeline
    kind: implement
    prompt: "Implement create_lag_features(df) in src/demand_pipeline.py: grouped by (store_id, product_id) and sorted chronologically, add lag_1, lag_7 (the target shifted 1 and 7 rows within each group), and rolling_mean_7 (the mean of the SHIFTED target over the trailing 7 rows within each group - the current day's demand must never be part of its own rolling window). Then implement build_pipeline(numeric_features, categorical_features) combining a ColumnTransformer (median imputation for numeric columns; most-frequent imputation + OneHotEncoder(handle_unknown='ignore') for categorical columns) with a deterministic regressor in one sklearn Pipeline, returned unfitted."
    verification: automated-tests
    verify: { harness: python, tests: [tests/step-2.test.py] }
    weight: 35
    checkpoint: { files: [solution/step-2/main.py, solution/step-2/src/demand_pipeline.py] }
    hints:
      - "groupby(['store_id', 'product_id'])['units_sold'].shift(1) and .shift(7) give you lag_1/lag_7 without any row crossing a store-product boundary."
      - "rolling_mean_7 must be computed from the ALREADY-SHIFTED series: groupby(...)['units_sold'].transform(lambda s: s.shift(1).rolling(7).mean()) - rolling BEFORE shifting would leak the current day's own demand into its own feature."
      - "RandomForestRegressor(n_estimators=60, random_state=42, n_jobs=1) is a good deterministic, efficient choice that is compatible with the sparse one-hot output of the ColumnTransformer."
  - id: evaluate-forecast-and-generate-artifacts
    kind: implement
    prompt: "Implement evaluate_model, train_and_forecast, and write_artifacts in src/demand_pipeline.py, then finish main.py so `python main.py` evaluates the pipeline with a chronological holdout (train on earlier dates, validate on the final 17 historical days - never a random split), computes MAE/RMSE/R2/WMAPE for both the model and a seasonal-naive (lag_7) baseline, trains the final pipeline on all historical data, produces a recursive day-by-day 14-day forecast for every forecast.csv row (using only historical actuals and previously predicted values within the horizon - never a hidden future target), and writes forecasts.csv, metrics.json, and report.txt next to main.py."
    verification: automated-tests
    verify: { harness: python, tests: [tests/step-3.test.py] }
    weight: 40
    checkpoint: { files: [solution/step-3/main.py, solution/step-3/src/demand_pipeline.py] }
    hints:
      - "A date-based chronological holdout is simplest here: rows with date <= cutoff are training, rows with date > cutoff are validation, where cutoff is the max historical date minus 17 days - this keeps every date's rows together on one side of the split."
      - "The seasonal-naive baseline is just predicting lag_7 directly (the value from exactly one week earlier) for every validation row - no model needed, just a column."
      - "For the recursive forecast: process forecast.csv one date at a time, in order. For each date, build that row's lag_1/lag_7/rolling_mean_7 from the combined history-so-far (real historical units_sold, plus whatever you've already predicted for earlier forecast dates in the same store-product series), predict, then append that prediction to the history before moving to the next date. Never use a forecast row's own future date's data, and never invent a units_sold value that wasn't either real history or an earlier prediction in this same run."
      - "Cast every numpy scalar (np.float64, np.int64, ...) to a plain Python float/int before json.dump, and clamp any negative prediction to 0.0 before writing it to forecasts.csv."
      - "report.txt just needs to mention chronological validation, WMAPE, and the baseline comparison in plain language - no specific heading or wording is required."
---

## Overview

`Northfield Retail` operates four stores that each carry the same six core
products. Store managers currently reorder stock by gut feel, which means
some products run out mid-week while others sit in the backroom past their
promotional window. Leadership wants a daily unit-demand forecast for every
store-product pair so replenishment, staffing, and promotional inventory can
be planned ahead of time instead of reacted to.

This is a meaningfully different skill set from a classification scenario:
the data is chronologically ordered, the target has real weekly seasonality
and day-to-day momentum, and the correct validation strategy is time-aware,
not a random split. The engineered lag and rolling features must never see
a future value - if they do, your validation metrics will look great and be
meaningless.

## Workspace

- **`main.py`** *(edit, entry)* - orchestrates the pipeline: load data,
  build calendar and lag features, build the pipeline, evaluate it
  chronologically against a baseline, train the final model, produce a
  recursive 14-day forecast, and write the three output artifacts. Run it
  with `python main.py`.
- **`src/demand_pipeline.py`** *(edit)* - the functions you implement across
  all three steps.
- **`data/train.csv`** *(readonly)* - ~110 days of historical daily sales
  across 4 stores and 6 products.
- **`data/forecast.csv`** *(readonly)* - the following 14 days for every
  store-product pair, with no `units_sold` column.

## Dataset

Both files share the same production columns; `train.csv` additionally has
the target column. Missing values appear in a few non-target columns in
both files - that's intentional, not a data bug.

| column                | type                                          | notes                                          |
| --------------------- | ---------------------------------------------- | ----------------------------------------------- |
| `date`                 | date (`YYYY-MM-DD`)                             | one row per store-product-date                  |
| `store_id`             | `STORE-01` .. `STORE-04`                        | which store                                     |
| `product_id`           | `PRODUCT-001` .. `PRODUCT-006`                  | which product                                   |
| `category`             | `beverages` \| `snacks` \| `household`          | product category                                |
| `base_price`           | number                                          | the product's list price                        |
| `current_price`        | number, some missing                            | the price actually charged that day             |
| `promotion`             | `0` \| `1`                                     | whether the product was on promotion that day    |
| `holiday`               | `0` \| `1`                                     | whether the date is a recognized holiday         |
| `inventory_level`       | number, some missing                            | units on hand at the start of the day            |
| `days_since_restock`    | number, some missing                            | days since the store last restocked this product |
| `units_sold`            | number                                          | **train.csv only** - the target                  |

## Target Variable

`units_sold` - the number of units of a product sold at a store on a given
day. It exists only in `train.csv`; `forecast.csv` deliberately omits it,
since that's what you're predicting for the 14 days immediately following
the historical data. Demand has real weekly seasonality, price and
promotion effects, and day-to-day momentum, but it is not perfectly
predictable - a model that ignores that structure (or leaks future values
into its features) will score poorly.

## Expected `forecasts.csv`

Running `python main.py` after Step 3 should produce a `forecasts.csv` next
to `main.py` with exactly this shape:

```csv
date,store_id,product_id,predicted_units
2025-04-21,STORE-01,PRODUCT-001,38.42
2025-04-21,STORE-01,PRODUCT-002,21.07
```

- Exactly the columns `date,store_id,product_id,predicted_units` - nothing
  else, no pandas index column.
- One row per row of `data/forecast.csv`, in the same order.
- `predicted_units` is a finite, non-negative number - floating point is
  fine, you do not need to round to whole units.

## Step Flow

1. **Load, Validate, and Create Calendar Features** - load both CSVs,
   parse `date` as a real datetime, validate schema and uniqueness, and
   derive `day_of_week` / `day_of_month` / `month` / `is_weekend`.
2. **Build Leakage-Safe Lag Features and the Model Pipeline** - grouped by
   `(store_id, product_id)` and sorted chronologically, engineer `lag_1`,
   `lag_7`, and `rolling_mean_7` using only prior rows, and build a
   `ColumnTransformer` + regressor `Pipeline`.
3. **Evaluate, Forecast, and Generate Artifacts** - evaluate the pipeline
   with a chronological holdout against a seasonal-naive baseline, train on
   all historical data, recursively forecast the 14-day horizon, and write
   `forecasts.csv`, `metrics.json`, and `report.txt`.

Each step's checks include every previous step's checks, so later work must
preserve earlier behavior - don't change `load_datasets`, `validate_data`,
`create_time_features`, or `prepare_training_data`'s contract once Step 1
passes, and don't change `create_lag_features` or `build_pipeline`'s
contract once Step 2 passes.

## Why random splitting is inappropriate

A random train/validation split mixes dates: a validation row from January
could sit right next to training rows from February in the same fold,
letting the model "peek" at demand patterns from after the date it's being
scored on. Real forecasting only ever has the past to learn from - your
validation split must respect that, training only on earlier dates and
validating only on later ones.

## Why lag features must use only prior targets

`lag_1` and `lag_7` exist to give the model recent demand history. If a
lag value for a row dated `D` is computed from date `D` or later, the
model is being handed the answer (or something correlated with it) at
training and evaluation time, but that value will not exist for a real
future date at prediction time - your validation score would be
meaningless and the recursive forecast would have no valid inputs.

## Why rolling values must be shifted

The same leakage risk applies to `rolling_mean_7`: a rolling window
computed directly over `units_sold` includes the current row's own value
in its own feature. Shifting the series by one day *before* taking the
rolling mean guarantees the window only ever covers strictly earlier days.

## Why store-product grouping matters

Demand for `STORE-01`'s `PRODUCT-001` has nothing to do with `STORE-02`'s
`PRODUCT-006` from the day before. Lag and rolling features must be
computed independently within each `(store_id, product_id)` series - grouping
by only one of the two, or not grouping at all, blends unrelated series
together and produces meaningless features.

## Why the forecast must be built chronologically

`forecast.csv` has no `units_sold`, and days 8-14 of the horizon need
`lag_7` values that don't exist yet as real observations. The only correct
way to fill that gap is to forecast one day at a time, in order, feeding
each day's prediction back in as history for the days that follow - never
by assuming future actuals or leaving those lags empty.

## Why baseline comparison matters

A model's raw MAE or R² doesn't mean much in isolation. Comparing against a
seasonal-naive baseline (predicting `lag_7` directly, i.e. "the same as one
week ago") shows whether the engineered features and model are actually
adding value over the simplest reasonable forecast a store manager could
already make without any modeling at all.

## Verification

Each step runs an automated Python check (`Run step checks`) covering that
step plus every prior step. The final step also exposes `Run final checks`,
which re-runs every step's checks together against the finished pipeline, and
also validates `metrics.json` against the structured metrics contract
declared in this scenario's `execution.artifacts.metrics` configuration. Both
run entirely offline against the CSVs already in your workspace, inside an
isolated sandbox - no network access, no package installation, no notebooks.

You can also run `python main.py` at any time to preview stdout, metrics, and
generated files in the notebook-style Output Preview panel - this is a
preview, not verification, and never affects step pass/fail on its own.

## Constraints

- No network access and no package installation - only `pandas`, `numpy`,
  and `scikit-learn` (already available) are needed.
- No random or shuffled train/validation splitting - the validation split
  must be chronological.
- `units_sold` (and anything derived from a same-or-future-dated row) must
  never reach a feature for an earlier-dated row.
- Keep the model efficient (e.g. a modest `RandomForestRegressor` with
  `n_jobs=1`, no hyperparameter search) - the dataset and model are sized
  to run comfortably within the verification timeout.

## Reference Solutions

- `solution/step-1/` - loading, validation, datetime parsing, sorting, and
  calendar feature creation only.
- `solution/step-2/` - adds leakage-safe lag/rolling features and the full
  preprocessing + regression `Pipeline`.
- `solution/step-3/` - the complete pipeline, including chronological
  evaluation, baseline comparison, final training, recursive forecasting,
  and `forecasts.csv`/`metrics.json`/`report.txt` generation.

## Evaluation Notes

The dataset is synthetic but deliberately not perfectly predictable:
weekly seasonality, price and promotion effects, holiday uplift, and a slow
trend combine with a genuinely autocorrelated noise process before
`units_sold` is rounded to a non-negative integer, so day-to-day demand has
real momentum but is never fully deterministic. A global-mean baseline and
a seasonal-naive baseline both fail this scenario's thresholds; a model
that omits lag features clearly underperforms one that includes them. The
intended leakage-safe, lag-aware pipeline passes the thresholds with
meaningful, but not perfect, margin.
