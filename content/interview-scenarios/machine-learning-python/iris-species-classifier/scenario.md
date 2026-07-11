---
id: iris-species-classifier
title: Iris Species Classifier
summary: "Build a small pandas + scikit-learn pipeline that classifies iris flowers by species from their measurements."
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
difficulty: easy
experienceMin: intern
experienceMax: junior
estimatedMinutes: 35
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
    - { path: src/iris_pipeline.py, role: edit }
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
  - criterion: Feature preparation
    weight: 10
    detail: "Produces a model-ready numeric feature matrix, excluding sample_id and species from the feature set."
  - criterion: Avoiding target leakage
    weight: 14
    detail: "Never includes species (or anything derived from it) in the feature matrix used for training or evaluation."
  - criterion: Deterministic model training
    weight: 10
    detail: "Trains with a fixed random seed so repeated runs produce identical models and metrics."
  - criterion: Accuracy calculation
    weight: 10
    detail: "Returns a metrics dictionary with a valid, non-NaN accuracy value."
  - criterion: Prediction generation
    weight: 10
    detail: "Generates a valid species prediction for every test sample with no missing values."
  - criterion: Artifact generation
    weight: 8
    detail: "python main.py writes predictions.csv, metrics.json, and report.txt next to main.py."
  - criterion: Output file shapes
    weight: 8
    detail: "predictions.csv has exactly the columns sample_id,predicted_species, one row per test sample, in test.csv order."
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
  - id: load-and-prepare-data
    kind: implement
    prompt: "Implement load_training_data and load_test_data in src/iris_pipeline.py. Both should read the given CSV path with pandas and validate that every required column is present, raising a clear ValueError listing any missing columns. Then implement prepare_features so it drops sample_id (and species, if present), returning only the numeric flower measurement columns."
    verification: automated-tests
    verify: { harness: python, tests: [tests/step-1.test.py] }
    weight: 30
    checkpoint: { files: [solution/step-1/main.py, solution/step-1/src/iris_pipeline.py] }
    hints:
      - "pandas.read_csv(path) gives you a DataFrame; check for missing columns with a simple list comprehension against REQUIRED_TRAIN_COLUMNS / REQUIRED_TEST_COLUMNS."
      - "sepal_length, sepal_width, petal_length, and petal_width are already numeric - prepare_features just needs to drop sample_id and species (when present), no encoding required."
      - "species only exists in train.csv - prepare_features must work correctly whether or not the column is present."
  - id: train-and-evaluate-model
    kind: implement
    prompt: "Implement train_model and evaluate_model in src/iris_pipeline.py. Train a DecisionTreeClassifier (or an equivalently deterministic classifier) with a fixed random_state, and return a metrics dictionary with at least an 'accuracy' key from evaluate_model. Wire prepare_features -> a deterministic train/validation split -> train_model -> evaluate_model together in main.py."
    verification: automated-tests
    verify: { harness: python, tests: [tests/step-2.test.py] }
    weight: 35
    checkpoint: { files: [solution/step-2/main.py, solution/step-2/src/iris_pipeline.py] }
    hints:
      - "Use sklearn.model_selection.train_test_split(X, y, test_size=0.25, random_state=42, stratify=y) so the split - and therefore every downstream metric - is reproducible."
      - "DecisionTreeClassifier(random_state=42, max_depth=4) is fast, fully deterministic, and needs no feature scaling."
      - "evaluate_model must never leak species into the features it scores against - only compare predictions to the y you already split out."
  - id: generate-predictions
    kind: implement
    prompt: "Implement predict_species and save_predictions in src/iris_pipeline.py, then finish main.py so `python main.py` trains the model, predicts the species for every row of data/test.csv, writes predictions.csv (columns sample_id,predicted_species, one row per test sample, in the same order as test.csv), writes metrics.json (keys accuracy, train_rows, test_rows, model), and writes report.txt (a human-readable summary beginning with the heading 'Iris Species Classifier Report' and including the training/test row counts) next to main.py."
    verification: automated-tests
    verify: { harness: python, tests: [tests/step-3.test.py] }
    weight: 35
    checkpoint: { files: [solution/step-3/main.py, solution/step-3/src/iris_pipeline.py] }
    hints:
      - "Build the test feature matrix the same way as the training features, then reindex it to the training features' columns (fill_value=0) before predicting - this guards against any last column mismatch."
      - "predict_species should just return model.predict(X_test) as a plain list of species strings."
      - "save_predictions should write with pandas.DataFrame(...).to_csv(path, index=False) so the header and row order come out exactly right."
      - "report.txt just needs to start with the literal line 'Iris Species Classifier Report' and mention the training/test row counts (e.g. 'Training rows: N' / 'Test rows: N') - the rest of the format is up to you."
---

## Overview

Build a small iris flower species classification pipeline. A botanical garden
wants to identify the species of newly measured iris flowers from four simple
measurements. You're given a training set of previously identified flowers
(with a known `species` label) and a test set of newly measured flowers
(without one) - your job is to train a model on the first and produce a
prediction for every row of the second.

This is intentionally small and fast: four numeric measurements, a simple
deterministic classifier, no external data, no GPU, no notebooks.

## Workspace

- **`main.py`** *(edit, entry)* - orchestrates the pipeline: load data,
  prepare features, train, evaluate, predict, and write `predictions.csv`.
  Run it with `python main.py`.
- **`src/iris_pipeline.py`** *(edit)* - the functions you implement across all
  three steps.
- **`data/train.csv`** *(readonly)* - 75 labeled flower samples.
- **`data/test.csv`** *(readonly)* - 20 unlabeled flower samples to predict for.

## Dataset

Both files share the same measurement columns; `train.csv` additionally has
the target column.

| column          | type                                  | notes                        |
| --------------- | -------------------------------------- | ----------------------------- |
| `sample_id`     | string                                  | stable id, e.g. `IRIS-1`     |
| `sepal_length`  | number, cm                             | sepal length measurement      |
| `sepal_width`   | number, cm                             | sepal width measurement       |
| `petal_length`  | number, cm                             | petal length measurement      |
| `petal_width`   | number, cm                             | petal width measurement       |
| `species`       | `setosa` \| `versicolor` \| `virginica` | **train.csv only** - the target |

## Target Variable

`species` (one of `setosa`, `versicolor`, or `virginica`). It exists only in
`train.csv` - `test.csv` deliberately omits it, since that's what you're
predicting.

## Expected `predictions.csv`

Running `python main.py` after Step 3 should produce a `predictions.csv` next
to `main.py` with exactly this shape:

```csv
sample_id,predicted_species
IRIS-101,setosa
IRIS-102,versicolor
```

- Exactly the columns `sample_id,predicted_species` - nothing else.
- One row per sample in `data/test.csv`, in the same order.
- `predicted_species` is always one of `setosa`, `versicolor`, or
  `virginica` - never missing, never a probability.

## Step Flow

1. **Load and Prepare Data** - load + validate both CSVs, and turn a raw
   flower measurement table into a model-ready numeric feature matrix.
2. **Train and Evaluate Model** - train a deterministic classifier on a fixed
   train/validation split and report accuracy.
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
