---
id: manufacturing-defect-classifier
title: Manufacturing Defect Classifier
summary: "Build a leakage-safe scikit-learn Pipeline that predicts defective manufactured components from noisy, imbalanced production data."
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
  - pattern:imbalanced-data
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
  artifacts:
    metrics:
      path: metrics.json
      required: true
      requiredPaths:
        - /summary/accuracy
        - /summary/precision
        - /summary/recall
        - /summary/f1
        - /summary/roc_auc
        - /cross_validation/fold_scores
        - /cross_validation/mean
        - /cross_validation/std
        - /confusion_matrix
        - /dataset/training_rows
        - /dataset/test_rows
        - /model/name
      expectedTypes:
        /summary/accuracy: number
        /summary/precision: number
        /summary/recall: number
        /summary/f1: number
        /summary/roc_auc: number
        /cross_validation/fold_scores: array
        /cross_validation/mean: number
        /cross_validation/std: number
        /confusion_matrix: array
        /dataset/training_rows: number
        /dataset/test_rows: number
        /model/name: string
      assertions:
        - path: /summary/f1
          type: number
          minimum: 0
          maximum: 1
        - path: /summary/roc_auc
          type: number
          minimum: 0
          maximum: 1
        - path: /confusion_matrix
          type: array
          minItems: 2
          maxItems: 2
        - path: /cross_validation/fold_scores
          type: array
          minItems: 5
          maxItems: 5
verification:
  engine: python
  mode: python-step
  includePreviousSteps: true
workspace:
  files:
    - { path: main.py, role: edit }
    - { path: src/defect_pipeline.py, role: edit }
    - { path: data/train.csv, role: readonly }
    - { path: data/test.csv, role: readonly }
  entry: main.py
rubric:
  - criterion: Data loading and validation
    weight: 10
    detail: "Loads train.csv and test.csv, validates required columns, and validates that is_defective only contains 0/1 with no missing entries."
  - criterion: Feature and target separation
    weight: 10
    detail: "Excludes component_id and is_defective from the model feature matrix in every step, never leaking the target into X."
  - criterion: Numerical preprocessing
    weight: 10
    detail: "Median-imputes and scales numerical features inside the Pipeline."
  - criterion: Categorical preprocessing
    weight: 10
    detail: "Most-frequent-imputes and one-hot encodes categorical features with unknown categories ignored at prediction time."
  - criterion: Pipeline construction
    weight: 15
    detail: "Combines a ColumnTransformer and a deterministic classifier into one sklearn Pipeline, fit only inside the Pipeline - never pre-fit outside it."
  - criterion: Class-imbalance handling
    weight: 10
    detail: "Addresses the ~20% positive class rate (e.g. class_weight=balanced) so the model doesn't just predict the majority class."
  - criterion: Cross-validation and leakage prevention
    weight: 15
    detail: "Evaluates the whole Pipeline with deterministic stratified cross-validation, never scoring a row with a model that saw it during fitting."
  - criterion: Metric calculation and structured output
    weight: 10
    detail: "Reports accuracy/precision/recall/f1/roc_auc, cross-validation fold detail, and a confusion matrix in the required metrics.json shape."
  - criterion: Prediction artifact correctness
    weight: 5
    detail: "predictions.csv has exactly component_id,predicted_defect,defect_probability, one row per test component, in test.csv order."
  - criterion: Code quality and robustness
    weight: 5
    detail: "Pipeline functions are small, single-purpose, and handle missing values and unseen categories without crashing."
source: authored
status: verified
visibility: public
type: machine-learning
version: 1
steps:
  - id: load-and-prepare-dataset
    kind: implement
    prompt: "Implement load_training_data and load_test_data in src/defect_pipeline.py. Both should read the given CSV path with pandas, validate that every required column is present (raising a clear ValueError listing any missing columns), and load_training_data must also validate that is_defective contains only 0/1 values with no missing entries. Then implement identify_feature_columns (split a DataFrame's columns into numeric vs categorical, excluding component_id and is_defective), split_training_data (return (X_train, y_train) with component_id/is_defective excluded from X), and split_test_features (return (test_features, test_ids) with component_id excluded from the features)."
    verification: automated-tests
    verify: { harness: python, tests: [tests/step-1.test.py] }
    weight: 30
    checkpoint: { files: [solution/step-1/main.py, solution/step-1/src/defect_pipeline.py] }
    hints:
      - "pandas.read_csv(path) gives you a DataFrame; check for missing columns with a simple list comprehension against REQUIRED_TRAIN_COLUMNS / REQUIRED_TEST_COLUMNS."
      - "identify_feature_columns can lean on pandas dtypes: pd.api.types.is_numeric_dtype(df[column]) is true for the 8 numeric columns and false for the 5 categorical ones - no hardcoded column list needed."
      - "is_defective only exists in train.csv - identify_feature_columns and split_test_features must work correctly on test.csv too, which has no is_defective column."
  - id: build-preprocessing-and-classification-pipeline
    kind: implement
    prompt: "Implement build_pipeline(numeric_features, categorical_features) in src/defect_pipeline.py. Build a numeric branch (SimpleImputer(strategy='median') -> StandardScaler()) and a categorical branch (SimpleImputer(strategy='most_frequent') -> OneHotEncoder(handle_unknown='ignore')), combine them with a ColumnTransformer, and combine that with a LogisticRegression(random_state=42, max_iter=2000, class_weight='balanced') inside ONE sklearn Pipeline. Return the pipeline unfitted - all preprocessing must be fit only when the Pipeline itself is fit, never on the full dataset beforehand."
    verification: automated-tests
    verify: { harness: python, tests: [tests/step-2.test.py] }
    weight: 35
    checkpoint: { files: [solution/step-2/main.py, solution/step-2/src/defect_pipeline.py] }
    hints:
      - "ColumnTransformer([('numeric', numeric_pipeline, numeric_features), ('categorical', categorical_pipeline, categorical_features)]) keeps each branch's imputation/encoding scoped to its own columns."
      - "OneHotEncoder(handle_unknown='ignore') is what lets the fitted pipeline predict on a production_line value it never saw during training instead of crashing."
      - "class_weight='balanced' reweights the loss by inverse class frequency, so the ~20% positive class doesn't get ignored by the classifier."
  - id: evaluate-train-and-generate-artifacts
    kind: implement
    prompt: "Implement evaluate_pipeline, train_and_predict, save_predictions, and write_artifacts in src/defect_pipeline.py, then finish main.py so `python main.py` evaluates the pipeline with deterministic stratified cross-validation, trains it on all training data, predicts a label and probability for every row of data/test.csv, and writes predictions.csv, metrics.json, and report.txt next to main.py."
    verification: automated-tests
    verify: { harness: python, tests: [tests/step-3.test.py] }
    weight: 35
    checkpoint: { files: [solution/step-3/main.py, solution/step-3/src/defect_pipeline.py] }
    hints:
      - "sklearn.model_selection.StratifiedKFold(n_splits=5, shuffle=True, random_state=42) plus cross_val_score(pipeline, X, y, cv=skf, scoring='f1') and cross_val_predict(pipeline, X, y, cv=skf, method='predict_proba') give you deterministic, leakage-safe fold scores and out-of-fold probabilities in one pass - cross-validating the whole Pipeline re-fits preprocessing inside each fold automatically."
      - "Never evaluate against data/test.csv - it has no is_defective column to score against. All metrics come from cross-validating on the training data only."
      - "Cast every numpy scalar (np.float64, np.int64, …) to a plain Python float/int before json.dump - metrics.json must contain only native JSON numbers."
      - "report.txt just needs to start with the literal line 'Manufacturing Defect Classifier Report', mention the training/test row counts (e.g. 'Training rows: N' / 'Test rows: N'), and mention 'Cross-validation' and 'ROC AUC' - the rest of the format is up to you."
---

## Overview

`ForgeWorks Manufacturing` runs three production lines that stamp, mill, mold,
and cut precision components around the clock. Roughly one in five components
turns out defective, and a missed defect that reaches a customer is far more
expensive than a false alarm that sends a good component back for a second
inspection. Quality control wants a model that flags likely defects from the
sensor and production metadata already being logged for every component -
your job is to build it.

This is meaningfully harder than a first ML scenario: the features are a mix
of machine sensor readings and categorical production context, several
columns have realistic missing values, the target is imbalanced (~20%
positive), the classes visibly overlap (this is not a perfectly separable
toy dataset), and the grading looks well past raw accuracy.

## Workspace

- **`main.py`** *(edit, entry)* - orchestrates the pipeline: load data,
  identify features, build the pipeline, cross-validate it, train the final
  model, predict on `data/test.csv`, and write the three output artifacts.
  Run it with `python main.py`.
- **`src/defect_pipeline.py`** *(edit)* - the functions you implement across
  all three steps.
- **`data/train.csv`** *(readonly)* - 600 labeled components.
- **`data/test.csv`** *(readonly)* - 150 unlabeled components to predict for.

## Dataset

Both files share the same production columns; `train.csv` additionally has
the target column. Missing values appear in several columns (both numeric
and categorical) - that's intentional, not a data bug.

| column                       | type                                                                                     | notes                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `component_id`                | string                                                                                      | stable id, e.g. `COMP-0101`                |
| `temperature_c`               | number, some missing                                                                        | machine operating temperature               |
| `pressure_bar`                | number                                                                                      | machine operating pressure                  |
| `vibration_mm_s`               | number, some missing                                                                        | machine vibration reading                   |
| `cycle_time_seconds`           | number                                                                                      | production cycle duration                   |
| `material_density`             | number                                                                                      | raw material density                        |
| `operator_experience_years`    | number, some missing                                                                        | operator's years of experience              |
| `maintenance_days_ago`         | number, some missing                                                                        | days since the machine was last serviced    |
| `ambient_humidity`             | number                                                                                      | shop-floor humidity                         |
| `machine_type`                 | `stamping_press` \| `cnc_mill` \| `injection_molder` \| `laser_cutter`, some missing         | machine that produced the component          |
| `shift`                        | `day` \| `evening` \| `night`                                                                | production shift                            |
| `material_grade`               | `A` \| `B` \| `C`, some missing                                                              | raw material quality grade                  |
| `supplier_region`              | `north` \| `south` \| `east` \| `west`, some missing                                        | material supplier region                    |
| `production_line`              | `line_1` \| `line_2` \| `line_3` (plus an unseen `line_4` in a few `test.csv` rows only)      | production line                              |
| `is_defective`                 | `0` \| `1`                                                                                  | **train.csv only** - the target             |

## Target Variable

`is_defective` (`1` = the component failed quality control, `0` = it
passed). It exists only in `train.csv` - `test.csv` deliberately omits it,
since that's what you're predicting. Roughly 20% of training rows are
positive, so a model that always predicts "not defective" would score high
accuracy while catching zero real defects - the rubric and hidden tests are
built around that failure mode, not around it.

## Expected `predictions.csv`

Running `python main.py` after Step 3 should produce a `predictions.csv`
next to `main.py` with exactly this shape:

```csv
component_id,predicted_defect,defect_probability
COMP-0601,0,0.2153
COMP-0602,1,0.8012
```

- Exactly the columns `component_id,predicted_defect,defect_probability` -
  nothing else, no pandas index column.
- One row per component in `data/test.csv`, in the same order.
- `predicted_defect` is always `0` or `1` - never missing.
- `defect_probability` is the model's probability of the POSITIVE
  (`is_defective=1`) class, always between `0.0` and `1.0`.

## Step Flow

1. **Load and Prepare the Dataset** - load + validate both CSVs, identify
   numeric vs categorical feature columns, and separate the identifier and
   target from the feature matrix.
2. **Build a Preprocessing and Classification Pipeline** - combine numeric
   and categorical preprocessing with a `ColumnTransformer`, and combine
   that with a class-imbalance-aware classifier in one `Pipeline`.
3. **Evaluate, Train, and Generate Artifacts** - cross-validate the whole
   pipeline with stratified folds, train it on all training data, predict on
   `data/test.csv`, and write `predictions.csv`, `metrics.json`, and
   `report.txt`.

Each step's checks include every previous step's checks, so later work must
preserve earlier behavior - don't change `load_training_data`,
`load_test_data`, `identify_feature_columns`, `split_training_data`, or
`split_test_features`'s contract once Step 1 passes, and don't change
`build_pipeline`'s contract once Step 2 passes.

## Why accuracy alone is misleading

With ~20% of components defective, a model that predicts "not defective"
every single time would be about 80% accurate while never catching a real
defect. That's why the rubric and hidden tests weight precision, recall,
F1, and ROC AUC - and why `class_weight="balanced"` (or an equivalent
imbalance strategy) is part of the grading, not an optional nicety.

## Why the identifier must be excluded

`component_id` is a stable label, not a signal - it carries no information
about whether a component is defective, and letting it into the feature
matrix (directly, or via a leaky encoding) would let the model memorize
training IDs instead of learning from machine/production features. Every
step's tests check that it never reaches the model.

## Why preprocessing belongs inside the Pipeline

If you impute or scale on the full dataset before splitting, information
from validation rows leaks into what the model was "trained" on, and your
cross-validation score stops meaning what it's supposed to mean. Building a
single `Pipeline` that contains both preprocessing and the classifier -
then cross-validating that whole Pipeline - means every fold's
preprocessing is fit only on that fold's training rows.

## Why stratification matters

With an imbalanced target, a plain random split can accidentally starve a
fold of positive examples, making its score meaningless. `StratifiedKFold`
keeps each fold's positive rate close to the overall dataset's positive
rate, so every fold's score is actually comparable.

## Why probabilities are required

`predicted_defect` alone throws away how confident the model was.
`defect_probability` lets quality control triage borderline components
differently from obvious ones, and it's what makes ROC AUC (a
threshold-independent measure of ranking quality) computable at all.

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
- Keep cross-validation to the configured `StratifiedKFold(n_splits=5, ...)`
  - no hyperparameter search, no large ensembles. The dataset and model are
  sized to run comfortably within the verification timeout.
- `is_defective` (and anything derived from it) must never reach the feature
  matrix used for training, cross-validation, or prediction.

## Reference Solutions

- `solution/step-1/` - loading, validation, feature-type identification, and
  target/identifier separation only.
- `solution/step-2/` - adds the full preprocessing + classification
  `Pipeline`.
- `solution/step-3/` - the complete pipeline, including cross-validation,
  final training, and `predictions.csv`/`metrics.json`/`report.txt`
  generation.

## Evaluation Notes

The dataset is synthetic but deliberately not perfectly separable: multiple
risk factors (elevated vibration, overdue maintenance, lower material grade,
certain machines and shifts, and a couple of interaction effects) combine
with substantial random noise before the label is drawn, so classes
genuinely overlap. A majority-class baseline and a classifier that ignores
class imbalance both fail this scenario's thresholds; the intended
`class_weight="balanced"` `LogisticRegression` pipeline passes them with
meaningful, but not perfect, margin.
