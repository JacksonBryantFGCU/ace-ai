---
id: customer-churn-classifier
title: Customer Churn Classifier
summary: "Build a small pandas + scikit-learn pipeline that predicts which customers will churn."
category: machine-learning-python
skills:
  - python
  - pandas
  - scikit-learn
  - classification
jobRoles:
  - ml
tags:
  - category:machine-learning
  - framework:scikit-learn
  - dataset:csv
  - pattern:classification
difficulty: medium
experienceMin: junior
experienceMax: senior
estimatedMinutes: 50
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
    - { path: src/churn_pipeline.py, role: edit }
    - { path: data/train.csv, role: readonly }
    - { path: data/test.csv, role: readonly }
  entry: main.py
rubric:
  - criterion: Data loading
    weight: 10
    detail: "Loads train.csv and test.csv into usable DataFrame-like objects without crashing on the provided files."
  - criterion: Column validation
    weight: 8
    detail: "Validates required columns are present and raises a clear, actionable error when they are not."
  - criterion: Feature preprocessing
    weight: 10
    detail: "Produces model-ready numeric features, excluding customer_id and churned from the feature set."
  - criterion: Categorical encoding
    weight: 8
    detail: "Encodes contract_type and auto_pay consistently so train and test features share the same columns."
  - criterion: Avoiding target leakage
    weight: 12
    detail: "Never includes churned (or anything derived from it) in the feature matrix used for training or evaluation."
  - criterion: Deterministic model training
    weight: 10
    detail: "Trains with a fixed random seed so repeated runs produce identical models and metrics."
  - criterion: Metric calculation
    weight: 10
    detail: "Returns a metrics dictionary with valid, non-NaN accuracy (and ideally F1) values."
  - criterion: Prediction generation
    weight: 10
    detail: "Generates a 0/1 prediction for every test customer with no missing values."
  - criterion: Output file shape
    weight: 8
    detail: "predictions.csv has exactly the columns customer_id,churn_prediction, one row per test customer, in test.csv order."
  - criterion: Reproducibility
    weight: 8
    detail: "python main.py can be re-run end to end and produces the same predictions.csv every time."
  - criterion: Code clarity
    weight: 6
    detail: "Pipeline functions are small, single-purpose, and easy to follow."
source: authored
status: verified
visibility: internal
type: machine-learning
version: 1
steps:
  - id: load-and-inspect-data
    kind: implement
    prompt: "Implement load_training_data and load_test_data in src/churn_pipeline.py. Both should read the given CSV path with pandas and validate that every required column is present, raising a clear ValueError listing any missing columns. Then implement prepare_features so it drops customer_id (and churned, if present) and one-hot encodes contract_type/auto_pay using the fixed CONTRACT_TYPES/AUTO_PAY_VALUES category lists already declared in the file, so train and test always produce identical encoded columns."
    verification: automated-tests
    verify: { harness: python, tests: [tests/step-1.test.py] }
    weight: 30
    checkpoint: { files: [solution/step-1/main.py, solution/step-1/src/churn_pipeline.py] }
    hints:
      - "pandas.read_csv(path) gives you a DataFrame; check for missing columns with a simple list comprehension against REQUIRED_TRAIN_COLUMNS / REQUIRED_TEST_COLUMNS."
      - "Use pd.Categorical(series, categories=CONTRACT_TYPES) before pd.get_dummies so a category missing from one split doesn't produce a column mismatch against the other."
      - "churned only exists in train.csv - prepare_features must work correctly whether or not the column is present."
  - id: train-and-evaluate-model
    kind: implement
    prompt: "Implement train_model and evaluate_model in src/churn_pipeline.py. Train a DecisionTreeClassifier (or an equivalently deterministic classifier) with a fixed random_state, and return a metrics dictionary with at least an 'accuracy' key from evaluate_model. Wire prepare_features -> a deterministic train/validation split -> train_model -> evaluate_model together in main.py."
    verification: automated-tests
    verify: { harness: python, tests: [tests/step-2.test.py] }
    weight: 35
    checkpoint: { files: [solution/step-2/main.py, solution/step-2/src/churn_pipeline.py] }
    hints:
      - "Use sklearn.model_selection.train_test_split(X, y, test_size=0.25, random_state=42, stratify=y) so the split - and therefore every downstream metric - is reproducible."
      - "DecisionTreeClassifier(random_state=42, max_depth=4) is fast, fully deterministic, and needs no feature scaling."
      - "evaluate_model must never leak churned into the features it scores against - only compare predictions to the y you already split out."
  - id: generate-predictions
    kind: implement
    prompt: "Implement predict_churn and save_predictions in src/churn_pipeline.py, then finish main.py so `python main.py` trains the model, predicts churn for every row of data/test.csv, writes predictions.csv (columns customer_id,churn_prediction, one row per test customer, in the same order as test.csv), writes metrics.json (keys accuracy, f1, train_rows, test_rows, model), and writes report.txt (a human-readable summary beginning with the heading 'Customer Churn Classifier Report' and including the training/test row counts) next to main.py."
    verification: automated-tests
    verify: { harness: python, tests: [tests/step-3.test.py] }
    weight: 35
    checkpoint: { files: [solution/step-3/main.py, solution/step-3/src/churn_pipeline.py] }
    hints:
      - "Build the test feature matrix the same way as the training features, then reindex it to the training features' columns (fill_value=0) before predicting - this guards against any last column mismatch."
      - "predict_churn should just return model.predict(X_test) as plain ints (0 or 1)."
      - "report.txt just needs to start with the literal line 'Customer Churn Classifier Report' and mention the training/test row counts (e.g. 'Training rows: N' / 'Test rows: N') - the rest of the format is up to you."
      - "save_predictions should write with pandas.DataFrame(...).to_csv(path, index=False) so the header and row order come out exactly right."
---

## Overview

Build a small customer churn classification pipeline. `TelcoCo` wants to know
which of its customers are likely to cancel their subscription (churn) so the
retention team can reach out first. You're given a training set of past
customers (with a known `churned` outcome) and a test set of current customers
(without one) - your job is to train a model on the first and produce a
prediction for every row of the second.

This is intentionally small and fast: a handful of numeric/categorical
features, a simple deterministic classifier, no external data, no GPU, no
notebooks.

## Workspace

- **`main.py`** *(edit, entry)* - orchestrates the pipeline: load data, prepare
  features, train, evaluate, predict, and write `predictions.csv`. Run it with
  `python main.py`.
- **`src/churn_pipeline.py`** *(edit)* - the functions you implement across all
  three steps.
- **`data/train.csv`** *(readonly)* - 60 labeled customers.
- **`data/test.csv`** *(readonly)* - 15 unlabeled customers to predict for.

## Dataset

Both files share the same customer columns; `train.csv` additionally has the
target column.

| column            | type                              | notes                        |
| ----------------- | ---------------------------------- | ----------------------------- |
| `customer_id`     | string                             | stable id, e.g. `CUST-101`   |
| `tenure_months`   | integer >= 0                       | how long they've been a customer |
| `monthly_charges` | number                             | current monthly bill          |
| `support_tickets` | integer >= 0                       | support tickets filed         |
| `contract_type`   | `monthly` \| `annual` \| `two_year`| billing contract              |
| `auto_pay`        | `yes` \| `no`                      | enrolled in autopay            |
| `churned`         | `0` \| `1`                         | **train.csv only** - the target |

## Target Variable

`churned` (`1` = the customer left, `0` = they stayed). It exists only in
`train.csv` - `test.csv` deliberately omits it, since that's what you're
predicting.

## Expected `predictions.csv`

Running `python main.py` after Step 3 should produce a `predictions.csv` next
to `main.py` with exactly this shape:

```csv
customer_id,churn_prediction
CUST-160,0
CUST-161,1
```

- Exactly the columns `customer_id,churn_prediction` - nothing else.
- One row per customer in `data/test.csv`, in the same order.
- `churn_prediction` is always `0` or `1` - never missing, never a probability.

## Step Flow

1. **Load and Inspect Data** - load + validate both CSVs, and turn a raw
   customer table into model-ready numeric features.
2. **Train and Evaluate Model** - train a deterministic classifier on a fixed
   train/validation split and report accuracy (and ideally F1).
3. **Generate Predictions** - predict on `data/test.csv` and write
   `predictions.csv` in the required shape.

Each step's checks include every previous step's checks, so later work must
preserve earlier behavior - don't change `load_training_data`,
`load_test_data`, or `prepare_features`'s contract once Step 1 passes.

## Verification

Each step runs an automated Python check (`Run step checks`) covering that
step plus every prior step. The final step also exposes `Run final checks`,
which re-runs every step's checks together against the finished pipeline. Both
run entirely offline against the CSVs already in your workspace - no network
access, no package installation, no notebooks.

## Reference Solutions

- `solution/step-1/` - loading, validation, and feature preparation only.
- `solution/step-2/` - adds deterministic training and evaluation.
- `solution/step-3/` - the complete pipeline, including `predictions.csv`
  generation.

## Evaluation Notes

This is an internal reference scenario (`visibility: internal`) used to prove
the Machine Learning runtime, verification, workspace UI, and picker
boundaries end to end - it is not served in the public candidate picker.

The dataset is small and synthetic but genuinely learnable: a
`DecisionTreeClassifier(random_state=42, max_depth=4)` reaches roughly 93%
validation accuracy on the seeded train/validation split, comfortably above
the step 2 accuracy threshold (0.70), and reproduces identical predictions
across repeated runs.
