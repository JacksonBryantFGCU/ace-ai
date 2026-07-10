---
id: support-ticket-categorizer
title: Support Ticket Categorizer
summary: "Build a small pandas + scikit-learn pipeline that categorizes customer support tickets from their text."
category: machine-learning-python
skills:
  - python
  - pandas
  - scikit-learn
  - text-classification
jobRoles:
  - ml
tags:
  - category:machine-learning
  - framework:scikit-learn
  - dataset:csv
  - pattern:classification
  - pattern:text
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
    - { path: src/ticket_pipeline.py, role: edit }
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
  - criterion: Text field preparation
    weight: 9
    detail: "Combines subject and message into one text field per ticket, excluding ticket_id and category."
  - criterion: Avoiding target leakage
    weight: 12
    detail: "Never includes category (or anything derived from it) in the feature matrix used for training or evaluation."
  - criterion: Text vectorization
    weight: 10
    detail: "Fits a vectorizer on training text and reuses the SAME fitted vectorizer for validation/test text - never re-fits on test data."
  - criterion: Deterministic model training
    weight: 9
    detail: "Trains with a fixed random seed so repeated runs produce identical models and metrics."
  - criterion: Accuracy/macro F1 calculation
    weight: 10
    detail: "Returns a metrics dictionary with valid, non-NaN accuracy and macro_f1 values."
  - criterion: Prediction generation
    weight: 9
    detail: "Generates a valid category prediction for every test ticket with no missing values."
  - criterion: Artifact generation
    weight: 7
    detail: "python main.py writes predictions.csv, metrics.json, and report.txt next to main.py."
  - criterion: Output file shapes
    weight: 7
    detail: "predictions.csv has exactly the columns ticket_id,predicted_category, one row per test ticket, in test.csv order."
  - criterion: Reproducibility
    weight: 7
    detail: "python main.py can be re-run end to end and produces the same predictions.csv every time."
  - criterion: Code clarity
    weight: 5
    detail: "Pipeline functions are small, single-purpose, and easy to follow."
source: authored
status: verified
visibility: public
type: machine-learning
version: 1
steps:
  - id: load-and-prepare-text-data
    kind: implement
    prompt: "Implement load_training_data and load_test_data in src/ticket_pipeline.py. Both should read the given CSV path with pandas and validate that every required column is present, raising a clear ValueError listing any missing columns. Then implement combine_text_fields so it returns one text string per ticket combining subject and message, without touching ticket_id or category."
    verification: automated-tests
    verify: { harness: python, tests: [tests/step-1.test.py] }
    weight: 30
    checkpoint: { files: [solution/step-1/main.py, solution/step-1/src/ticket_pipeline.py] }
    hints:
      - "pandas.read_csv(path) gives you a DataFrame; check for missing columns with a simple list comprehension against REQUIRED_TRAIN_COLUMNS / REQUIRED_TEST_COLUMNS."
      - "combine_text_fields is just string concatenation: df[\"subject\"] + \" \" + df[\"message\"] - no vectorization happens here yet."
      - "category only exists in train.csv - combine_text_fields must work correctly on test.csv too, which has no category column."
  - id: train-and-evaluate-text-classifier
    kind: implement
    prompt: "Implement prepare_features, train_model, and evaluate_model in src/ticket_pipeline.py. prepare_features should fit a TfidfVectorizer on the training text and, when given test/validation text, transform it with that SAME fitted vectorizer. Train a LogisticRegression (or an equivalently deterministic classifier) with a fixed random_state, and return a metrics dictionary with 'accuracy' and 'macro_f1' keys from evaluate_model. Wire combine_text_fields -> a deterministic train/validation split -> prepare_features -> train_model -> evaluate_model together in main.py."
    verification: automated-tests
    verify: { harness: python, tests: [tests/step-2.test.py] }
    weight: 35
    checkpoint: { files: [solution/step-2/main.py, solution/step-2/src/ticket_pipeline.py] }
    hints:
      - "Use sklearn.model_selection.train_test_split(text, y, test_size=0.25, random_state=42, stratify=y) directly on the combined text Series, so the split - and therefore every downstream metric - is reproducible."
      - "TfidfVectorizer() + LogisticRegression(random_state=42, max_iter=1000) is fast, fully deterministic, and needs no manual feature engineering."
      - "evaluate_model must never leak category into the features it scores against - only compare predictions to the y you already split out."
  - id: generate-predictions
    kind: implement
    prompt: "Implement predict_categories and save_predictions in src/ticket_pipeline.py, then finish main.py so `python main.py` trains the model, predicts the category for every row of data/test.csv, and writes predictions.csv (columns ticket_id,predicted_category, one row per test ticket, in the same order as test.csv) next to main.py."
    verification: automated-tests
    verify: { harness: python, tests: [tests/step-3.test.py] }
    weight: 35
    checkpoint: { files: [solution/step-3/main.py, solution/step-3/src/ticket_pipeline.py] }
    hints:
      - "Fit prepare_features once on the combined training text and transform the combined test text with the SAME call, so train/validation/test features always share one vocabulary - no reindexing needed like with fixed categorical columns."
      - "predict_categories should just return model.predict(X_test) as a plain list of category strings."
      - "save_predictions should write with pandas.DataFrame(...).to_csv(path, index=False) so the header and row order come out exactly right."
---

## Overview

Build a small support ticket categorization pipeline. `HelpDeskCo` wants to
automatically route incoming support tickets to the right team based on their
subject and message text. You're given a training set of previously
categorized tickets (with a known `category`) and a test set of new tickets
(without one) - your job is to train a model on the first and produce a
category prediction for every row of the second.

This is intentionally small and fast: short deterministic ticket text, simple
TF-IDF vectorization, a fast deterministic classifier, no external data, no
GPU, no notebooks.

## Workspace

- **`main.py`** *(edit, entry)* - orchestrates the pipeline: load data,
  prepare text features, train, evaluate, predict, and write
  `predictions.csv`. Run it with `python main.py`.
- **`src/ticket_pipeline.py`** *(edit)* - the functions you implement across
  all three steps.
- **`data/train.csv`** *(readonly)* - 80 labeled support tickets.
- **`data/test.csv`** *(readonly)* - 20 unlabeled support tickets to predict
  categories for.

## Dataset

Both files share the same ticket columns; `train.csv` additionally has the
target column.

| column       | type                                                    | notes                          |
| ------------ | -------------------------------------------------------- | --------------------------------- |
| `ticket_id`  | string                                                    | stable id, e.g. `TICKET-101`     |
| `subject`    | string                                                    | short ticket subject line         |
| `message`    | string                                                    | ticket body text                  |
| `category`   | `billing` \| `technical` \| `account` \| `shipping`       | **train.csv only** - the target   |

## Target Variable

`category` (one of `billing`, `technical`, `account`, or `shipping`). It
exists only in `train.csv` - `test.csv` deliberately omits it, since that's
what you're predicting.

## Expected `predictions.csv`

Running `python main.py` after Step 3 should produce a `predictions.csv` next
to `main.py` with exactly this shape:

```csv
ticket_id,predicted_category
TICKET-101,billing
TICKET-102,technical
```

- Exactly the columns `ticket_id,predicted_category` - nothing else.
- One row per ticket in `data/test.csv`, in the same order.
- `predicted_category` is always one of `billing`, `technical`, `account`, or
  `shipping` - never missing.

## Step Flow

1. **Load and Prepare Text Data** - load + validate both CSVs, and combine
   `subject`/`message` into one text field per ticket.
2. **Train and Evaluate Text Classifier** - vectorize the combined text,
   train a deterministic classifier on a fixed train/validation split, and
   report accuracy and macro F1.
3. **Generate Predictions** - predict on `data/test.csv` and write
   `predictions.csv`, `metrics.json`, and `report.txt` in the required shape.

Each step's checks include every previous step's checks, so later work must
preserve earlier behavior - don't change `load_training_data`,
`load_test_data`, or `combine_text_fields`'s contract once Step 1 passes.

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

- `solution/step-1/` - loading, validation, and text field preparation only.
- `solution/step-2/` - adds vectorization, deterministic training, and
  evaluation.
- `solution/step-3/` - the complete pipeline, including `predictions.csv`,
  `metrics.json`, and `report.txt` generation.
