# ACE.AI Project Docs

This is the compact GitHub-facing documentation for the current ACE.AI codebase. Older planning notes, screenshots, and copied legacy app code were consolidated into `docs/legacy-notes.md`.

## Product Flow

- Setup page collects role, question type, interviewer, difficulty, strictness, and experience level.
- Technical interviews continue to `/interview/scenario-picker`, where scenario search and filtering are role-aware.
- Behavioral interviews start the voice flow directly.
- Technical runtime pages should not be redesigned as part of scenario-library work.

## Scenario System

Scenarios are file-backed packages under `content/interview-scenarios/<category>/<slug>`.

Common package shape:

```txt
scenario.md
workspace/
tests/
solution/
preview/
```

The scenario loader reads `scenario.md` frontmatter and authored files. Public candidate discovery should only include public scenarios. Internal templates or deleted examples must not count toward role, category, or difficulty totals.

### Public Backend Library

Easy:

- `notes-rest-api`
- `task-tracker-api`
- `product-catalog-api`

Medium:

- `authentication-api`
- `order-management-api`
- `blog-comments-api`

Hard:

- `analytics-api`
- `banking-transfers-api`
- `url-shortener-api`

`golden-health-check` is intentionally not part of the public library.

### Public Machine Learning Library

Easy:

- `iris-species-classifier` (classification)
- `house-price-regression` (regression)
- `support-ticket-categorizer` (text classification)

`customer-churn-classifier` is the internal ML reference scenario — `visibility: internal`, never public.

### Public Frontend Library

Frontend React scenarios currently live in `content/interview-scenarios/frontend-react`.

The picker rules are:

- Frontend Engineer: frontend scenarios only
- Backend Engineer: backend scenarios only
- Full-Stack Engineer: frontend and backend scenarios, ranked by best match
- Playground: all public scenarios by default

## Candidate Verification Policy

**Core principle:** candidate solutions are evaluated against the public contract and behavioral requirements documented in `scenario.md`, not against the source code of the reference solution (`solution/`). The reference solution is executed only to prove a scenario is solvable (see `npm run scenario:validate`) — it is never diffed, hashed, or compared against candidate files, and candidate verification never reads `solution/` at grading time. `solution/` (checkpoint) files are only ever served to the *candidate*, on request, through the separate "reveal solution" recovery action (`fetchCheckpoint` in `actions/scenario.ts`) — never read back into the grading path.

**Fixed during this audit:** `lib/scenarios/fullstack-step-verification.ts` previously resolved every prior-step-through-current-step reference-solution checkpoint (`buildExpectedWorkspace`/`resolveCheckpointFiles`, `i <= stepIndex` — i.e. including the step actually being graded) and exact-string-compared it against the candidate's submitted workspace (`compareWorkspaceFiles`/`fileSignature`) *before* running any authored backend/frontend/integration test — failing the whole step immediately, tests unrun, on any byte-level difference (different formatting, naming, route order, ...). This was a real reference-source-comparison gate in the live grading path for every `fullstack-react-node` scenario, not a dormant or authoring-only code path. It has been removed; fullstack step grading now runs the same way backend/frontend/ML grading already did — authored tests against whatever the candidate submitted, nothing else.

Verification is black-box and behavioral per role:

| Role | Mechanism |
|---|---|
| Frontend | React Testing Library queries (`getByRole`, `getByLabelText`, `getByText`) against the rendered candidate component — accessibility-tree driven, not DOM-structure driven. |
| Backend | HTTP requests (supertest) against the candidate's exported app, plus database *state* assertions (row values/counts) — never assertions on the candidate's SQL text or ORM calls. |
| Fullstack | The candidate's frontend and backend are actually run (spawned processes / dev servers) and probed the same way — real HTTP + real DOM, layered as backend/frontend/integration test suites. |
| Machine Learning | The candidate's `main.py` is executed in a sandboxed container; tests assert on `metrics.json` (schema + threshold checks), `forecasts.csv`/`predictions.csv` contract (shape, row alignment, probability validity), and behavioral properties (e.g. feature mutation tests proving no target leakage) — never on the candidate's Python source text or a fixed reference prediction array. |

### Valid exact constraints

Exact checks are acceptable — and used — for public contract elements: required route paths and HTTP status codes, exported module/app names, required file names (`main.py`, `metrics.json`, `forecasts.csv`), documented JSON paths and artifact column names/order, documented accessible labels/roles, and deterministic values derived from fixed input data (e.g. a calendar feature computed from a literal date). ML metric *thresholds* are also exact numbers, but they're margin-calibrated against the reference's performance, not equality checks (see below).

### Invalid accidental constraints

Tests should not require a specific private helper name, local variable name, control-flow shape, CSS class (unless it's part of a documented public contract), exact SQL text, or exact floating-point metric/prediction value. When found, these are bugs — fix them, don't work around them. **Known fixed exception:** `retail-demand-forecaster/tests/step-3.test.py` previously asserted the literal string `"Retail Demand Forecaster Report"` inside `report.txt`; that heading was never part of the documented contract (`scenario.md` only requires the report to mention chronological validation, WMAPE, and baseline comparison), so it was accidental brittleness coupling candidates to the reference solution's exact wording. The assertion was narrowed to the documented required concepts only.

### ML tolerance policy

ML metric checks use threshold bands with real margin below the reference solution's measured performance (e.g. `retail-demand-forecaster` requires R²≥0.60 against a ~0.74 reference, WMAPE≤0.25 against ~0.18), not exact equality — see each scenario's `tests/step-N.test.py` for the calibrated values and the adversarial "naive baseline must fail" tests that prove the threshold isn't trivially satisfiable. Determinism checks (`pytest.approx(..., abs=1e-6)`) only verify the *candidate's own* repeated runs are reproducible, never that the candidate matches a fixed reference number. Where a scenario requires a specific technique (e.g. `Pipeline` + `ColumnTransformer` in `retail-demand-forecaster`, class-balance-aware metrics in imbalanced classification scenarios), that requirement is stated in `scenario.md`'s rubric/step prompts, and the corresponding `isinstance()`/structural check exists to enforce a documented requirement — not an incidental implementation detail.

## Task Types

Every step declares a `kind` (`lib/scenarios/schema.ts` `STEP_KINDS`): `implement`, `debug`, `refactor`, or `explain`. This is validated and enforced today — `explain` steps require `verification: rubric` + `harness: none` + no tests; the other three require an executable harness and tests. It's rendered consistently in the interview step header, scenario picker step preview, Authoring Studio step list, and the results/evaluation report.

Scenarios do not currently declare a *dominant* type — only their steps do. `taskType` is now an optional scenario-level field (same four values) for scenarios that want to state their dominant activity explicitly (e.g. a scenario about fixing a broken pipeline should say `taskType: debug` even though most of its steps are `implement`-shaped repair work). When omitted, `scenarioTaskTypeOf()` (`lib/scenarios/scenario-task-type.ts`) derives it as the most frequent step kind, tie-broken by first occurrence — every existing scenario resolves correctly under this fallback with zero content changes required.

**Current catalog distribution** (34 scenarios / 111 steps, as of this audit — includes the two new `manufacturing-defect-classifier`/`retail-demand-forecaster` ML scenarios):

| Role | Scenarios | Step kinds |
|---|---|---|
| Backend | 9 | 100% `implement` |
| Fullstack | 10 | 100% `implement` |
| Machine Learning | 6 | 100% `implement` |
| Frontend | 9 | `implement` (steps 1–2), then always `debug` → `explain`, with `refactor` replacing one slot in most scenarios |

Only frontend scenarios use `debug`/`refactor`/`explain` today — not because the schema is frontend-specific (it isn't; `kind` is engine-agnostic and validated identically for every role), but because no backend/fullstack/ML scenario has been authored with a non-`implement` step yet. This is a **content gap, not a design constraint**.

**Recommended distribution going forward** (guidance, not enforced by the schema validator):

```text
Implement:      ~40-55%
Debug:          ~20-30%
Refactor:       ~15-25%
Explain/hybrid: ~5-15%
```

For the ML catalog specifically: the next ML scenario should be a `debug` scenario, not a third clean-slate `implement` build. A flawed fraud-detection/risk-scoring pipeline (target leakage, class-imbalance-blind accuracy-only evaluation, or an unshifted temporal feature) gives ML the same implement→debug progression frontend already has, and mirrors the mutation-style verification already proven out in `retail-demand-forecaster`. **Not authored as part of this task** — scoped out per instructions.

### Explain support — what's real today

Candidates *can* answer `explain`/discussion steps (their response is captured per-step as free text — via the voice conversation transcript, see `InterviewResult.steps[].response`), and there **is** a real evaluation path: `hooks/use-evaluation.ts` wires an `aiReviewScorer` (`lib/scenarios/evaluation/ai-scorer.ts`) into the runtime evaluation engine alongside the deterministic scorers. It calls the authenticated server action `gradeScenarioResponses` (`actions/scenario.ts`), which re-loads the scenario's authored rubric **server-side only** (never sent to the browser) and sends it plus the candidate's responses/transcript/workspace to an LLM (`buildScenarioGradingPrompt`, `server/ai/prompts/scenario-evaluation.ts`) for a JSON-scored review (0–100 quality + communication, strengths/improvements/next steps), cached 1h per input hash.

This is a genuine LLM-graded rubric evaluation, not a keyword matcher — but it has real limitations worth stating plainly rather than overselling:

- **No persistence / audit trail.** `useEvaluation` holds the report only in React state for the current session (`hooks/use-evaluation.ts:15-16`); there's no stored record of what the model scored or why, and no way to re-derive a past grade.
- **No interviewer override.** The AI score is final for that session; there's no reviewer UI to adjust it.
- **No documented determinism/reliability guarantee.** A single LLM call per attempt, degrading to "unavailable" on any failure (`ai-scorer.ts:48-53`) — there's no retry, no second-model cross-check, no eval harness proving score stability across repeated runs of the same transcript.
- **Prompt-injection surface not specifically hardened.** Candidate-authored workspace content and transcript text are interpolated into the user message the model sees; there's no sanitization/escaping step beyond normal system/user role separation.

Given this, `explain` should stay scoped to what it already covers well (discussion/reasoning steps graded holistically alongside automated correctness) rather than becoming the primary verification method for a step whose correctness *can* be checked automatically. Do not build a second, cheaper "keyword-matching" grader as a substitute — the real evaluator above is worth strengthening (persistence, audit trail, override) rather than working around.

## Verification

Run these before shipping scenario or runtime changes:

```bash
npm run typecheck
npm run lint
npm run test
npm run scenario:check
npm run build
```

For one scenario:

```bash
npm run scenario:validate -- <slug>
```

The scenario toolkit validates schema, taxonomy, files, tests, checkpoint solutions, and runtime compatibility.

ML scenarios execute inside a Docker sandbox (see "Container Sandbox" below). Before running ML-related tests or verification locally:

```bash
npm run sandbox:build    # build the pinned ace-ai-ml-runner image (once, or after Dockerfile changes)
npm run sandbox:verify   # real container integration tests — proves isolation is enforced, not just configured
npm run sandbox:clean    # remove any orphaned sandbox containers
```

## Runtime Architecture

Technical scenarios resolve an execution profile from scenario metadata. The platform routes verification through the registered engine:

- React/frontend scenarios use the browser/component preview and verification path.
- Backend Node scenarios use the Node engine.
- Express scenarios use the in-memory Express request driver.
- SQLite scenarios run with a fresh per-verification database loaded from authored schema/seed files.

Scenario authoring should stay within scenario packages unless there is a real platform bug. Do not modify execution engines, preview runtime, verification runtime, or scenario picker while adding ordinary scenarios.

## Machine Learning Scenario Runtime

ML scenarios (`type: machine-learning`, `execution.mode: python-ml`, `verification.mode: python-step`) are script/pytest-based, not function-call based — there is no `functionName`, and a step verifies a whole script + artifacts, not one function.

### Execution lifecycle

Every real Python run — preview, step verification, final verification, and authoring-toolkit solution validation — goes through the SAME two-layer runtime:

- `lib/scenarios/machine-learning-runtime.ts` — pure orchestration (dependency-injected: `resolvePython` / `prepareWorkspace` / `runProcess` / `cleanupWorkspace`), no fs, no `child_process`. Unit-tested with fakes.
- `server/scenarios/machine-learning-runtime.ts` — the real dependencies: an isolated temp workspace under `.scenario-runtime/ml/<run-id>/` per run, and a spawned `python -m pytest` or `python main.py` process (`server/scenarios/python-runtime.ts`).

Four callers sit on top of that runtime, each for a different purpose:

| Caller | File | Runs pytest? | Affects gating? |
| --- | --- | --- | --- |
| Output Preview | `lib/scenarios/machine-learning-preview.ts` | No — only `python main.py` | No — never touches step state |
| Step verification | `lib/scenarios/machine-learning-step-verification.ts` (`verifyMlScenarioStep`) | Yes | Yes — the real "Run step checks" |
| Final verification | same file (`verifyMlScenarioFinal`) | Yes, every step's test together | Yes — the real "Run final checks" |
| Authoring solution validation | `lib/scenarios/authoring/machine-learning-solution.ts` | Yes, via the SAME `verifyMlScenarioStep`/`verifyMlScenarioFinal` | No — CLI-only, gates `scenario:validate`/`scenario:check` |

**Preview and verification are deliberately separate** and must stay that way: preview never runs pytest and never sees `tests/`/`solution/`; a successful/failed preview run never marks a step passed/failed.

### Cumulative checkpoint / step verification

`verification.includePreviousSteps: true` (the default) means step *N*'s check runs `tests/step-1.test.py … tests/step-N.test.py` together — not just step N's own test. `python -m pytest -q --import-mode=importlib <selected test paths>` is the exact, deterministic command (the `--import-mode=importlib` flag is required because pytest's default import mode can't resolve the frozen `tests/step-N.test.py` naming convention). Final verification (`python-final`) always runs every authored step test together, regardless of `includePreviousSteps`.

### Authoring-toolkit solution validation (the placeholder fix)

`npm run scenario:validate` / `scenario:check` (`runSolution: true`) used to report every ML step as `solution/harness-not-runnable`, because the toolkit's generic solution validator (`lib/scenarios/authoring/solution.ts`) only knew how to dispatch through the single-step `ExecutionPlatform` engine registry (`lib/scenarios/execution/`), where `python` is still a registered placeholder engine (`lib/scenarios/execution/engines/placeholder.ts`) — it always returns `status: "unsupported"`. That registry assumes one step = one isolated test run, which can't express ML's cumulative cross-step dependency, so retrofitting a "real" `pythonEngine` into it would either lose cumulative behavior or require restructuring the shared `ExecutionContext` for every other engine too.

Instead, `lib/scenarios/authoring/solution.ts` special-cases `type: machine-learning` scenarios (the same way it already special-cases `fullstack`) and routes them to `lib/scenarios/authoring/machine-learning-solution.ts`, which:

1. builds each step's checkpoint workspace (`solution/step-N/` overlaid onto `workspace/`) — every checkpoint is a complete, self-contained solution by convention, so step *N* is verified with ONLY `scenario.steps[N].checkpoint.files`, never a later step's solution,
2. calls the exact same `verifyMlScenarioStep` / `verifyMlScenarioFinal` real candidates use, injected with the real `runMachineLearningPytest` (composed once in `server/scenarios/authoring.ts`, only when `runSolution: true`),
3. turns a real `passed: false` result into a `solution/tests-fail` **error** diagnostic (not the old placeholder suggestion) — a genuinely broken reference solution now fails validation, it does not validate cleanly with a "verify manually" note.

No scenario-specific hardcoding: the module only reads `scenario.steps`/`scenario.verification`/`bundle.files`, generic across every ML scenario. `solution/harness-not-runnable` still exists for the OTHER placeholder engines (`java`, `csharp`, `sql`) — it was never removed globally, only made unreachable for `machine-learning`.

### Artifacts, metrics, report

Both the Output Preview and a `python main.py` run write artifacts next to `main.py`. The preview allowlist (`lib/scenarios/machine-learning-preview.ts`) is `predictions.csv` / `metrics.json` / `report.txt` at the workspace root, plus anything under `outputs/` — nothing else is ever surfaced (no `tests/`, `solution/`, `__pycache__`, dotfiles). Caps: `ML_PREVIEW_MAX_ARTIFACTS` (10 files), `ML_PREVIEW_MAX_FILE_SIZE_BYTES` (1 MB/file), `ML_PREVIEW_MAX_TOTAL_BYTES` (5 MB across every returned artifact), `ML_PREVIEW_MAX_CSV_ROWS` (5 rows), `ML_PREVIEW_MAX_TEXT_CHARS` (5,000 chars). A malformed `metrics.json` is still previewable as raw text — it never crashes the preview.

`report.txt` is a short human-readable summary — candidate-generated, never authored/hidden content, always just a bounded raw-text preview.

#### `metrics.json` contract

`metrics.json` has **no fixed schema** — scenarios can report whatever metrics fit the task (`accuracy`/`macro_f1`/`mae`/`r2`/etc.), and nothing in the platform hardcodes a metric list or vocabulary. What IS enforced, generically, by the shared parser (`lib/scenarios/machine-learning-metrics.ts`, `parseMachineLearningMetrics`) is that the file is safe and bounded:

- **Root shape**: a plain JSON object. Arrays, strings, numbers, booleans, and `null` at the root are all rejected (`metrics/root-not-object`).
- **Values**: finite numbers, strings, booleans, `null`, arrays, or **nested plain objects** — recursively, up to `ML_METRICS_MAX_DEPTH` (8) container levels. Confusion matrices, per-class breakdowns, cross-validation fold arrays, and nested hyperparameter objects are all valid directly (no need to flatten into `precision_class_0`, `precision_class_1`, …).
- **Recursive bounds**, checked at every depth via an **iterative** (explicit work-stack, not recursive-function-call) traversal — so adversarially deep/wide input fails a bounded check instead of overflowing the parser's own call stack:
  - `ML_METRICS_MAX_BYTES` — 1 MB file size
  - `ML_METRICS_MAX_DEPTH` — 8 container levels (the root object is depth 1)
  - `ML_METRICS_MAX_NODES` — 5,000 total JSON nodes (objects + arrays + primitives) across the whole document
  - `ML_METRICS_MAX_KEYS_PER_OBJECT` — 100 keys, checked in every object at every depth
  - `ML_METRICS_MAX_ARRAY_LENGTH` — 1,000 elements, checked in every array at every depth
  - `ML_METRICS_MAX_KEY_LENGTH` — 100 characters per key
  - `ML_METRICS_MAX_STRING_LENGTH` — 2,000 characters per string value
  - `ML_METRICS_MAX_TOTAL_STRING_BYTES` — 200,000 bytes combined across every string value in the document
- **Keys**: non-empty after trimming, no control characters, no `__proto__`/`constructor`/`prototype` — rejected outright at **every nesting depth**, not just the top level, and the resulting object is built with `Object.create(null)` at every depth so even a key that slipped past validation could never reach a real prototype.
- Never throws; every failure is `{ ok: false, error: { code, message, key? } }` with a stable `metrics/*` error code (`metrics/invalid-json`, `metrics/max-depth-exceeded`, `metrics/max-nodes-exceeded`, `metrics/object-too-large`, `metrics/array-too-large`, `metrics/dangerous-key`, `metrics/type-mismatch`, …) and a message that never contains a host path or stack trace. `key`, when present, is a safe logical path like `cross_validation.fold_scores[3]` — never a filesystem path.

Example valid `metrics.json` (flat values still work unchanged; nested structures are equally valid):

```json
{
  "accuracy": 0.84,
  "f1": 0.75,
  "model_name": "LogisticRegression",
  "confusion_matrix": [[42, 3], [5, 38]],
  "cross_validation": {
    "fold_scores": [0.81, 0.79, 0.85, 0.83, 0.80],
    "mean": 0.816,
    "std": 0.021
  },
  "per_class": {
    "setosa": { "precision": 0.97, "recall": 1.0 },
    "versicolor": { "precision": 0.82, "recall": 0.79 }
  }
}
```

**Same parser, three callers**: the Output Preview panel, step/final verification, and authoring solution validation (`scenario:validate`/`scenario:check`) all call `parseMachineLearningMetrics` — there is exactly one metrics-parsing implementation in the codebase.

- **Preview** (optional, always): `metrics.json` is parsed if present. Primitive top-level values still render as metric cards; nested objects/arrays render as an expandable tree (native `<details>/<summary>`, no `dangerouslySetInnerHTML`) with 2D numeric arrays rendered as a small matrix table. Rendering is truncated for large structures (`MAX_RENDERED_ARRAY_ITEMS` = 20, `MAX_RENDERED_OBJECT_KEYS` = 30) — safe because the parser already bounded the data before it reaches the UI. Invalid metrics show a clear inline warning with the raw text still available underneath (`metricsError`) — a malformed file never crashes the preview and is never silently treated as valid.
- **Verification** (opt-in per scenario): by default `metrics.json` is not checked at all during step/final verification (unchanged from before this contract existed) — every scenario without `execution.artifacts.metrics` behaves identically to before. A scenario can opt in, using **JSON Pointer (RFC 6901)** syntax (`/summary/f1`, `/confusion_matrix/0/0`, `~1`→`/` and `~0`→`~` escapes) for every path — never dotted notation:

  ```yaml
  execution:
    mode: python-ml
    artifacts:
      metrics:
        path: metrics.json      # optional, defaults to "metrics.json"
        required: true          # only then does final verification run `main.py` and check it
        requiredPaths: ["/accuracy", "/f1", "/cross_validation/mean"]
        expectedTypes:
          /accuracy: number
          /f1: number
          /confusion_matrix: array
        assertions:
          - path: /f1
            minimum: 0.6
          - path: /confusion_matrix
            minItems: 2
            maxItems: 2
  ```

  When `required: true`, **final** verification (not step verification) runs `main.py` via the same real Output Preview runtime and adds a `"metrics"` verification group. `requiredPaths` checks presence only (including `null`); `expectedTypes` checks JSON type (`number`/`string`/`boolean`/`null`/`array`/`object`) for whichever listed paths resolve, without itself requiring presence; `assertions` add **generic** structural checks per path — `type`, `minimum`, `maximum`, `minItems`, `maxItems`, `integer` — deliberately NOT ML-vocabulary-specific (no `accuracyThreshold` or similar hardcoded metric names anywhere in the platform). None of these require exact key/path equality — metrics beyond what's listed are always allowed. Authoring validation (`scenario:validate`/`scenario:check`) enforces the identical contract on the reference solution, through the same real dependency composition (`server/scenarios/machine-learning-verification-dependencies.ts`) — a scenario author gets the exact same pass/fail a real candidate would.
  Schema-level checks on this config itself (`lib/scenarios/authoring/execution.ts`): `path` must be relative with no `..` traversal; every `requiredPaths`/`expectedTypes`/assertion `path` must be a syntactically valid JSON Pointer (`execution/metrics-invalid-path`); `requiredPaths` must have no duplicates (`execution/metrics-duplicate-required-key`); assertion bounds must be internally sane (`minimum <= maximum`, `minItems <= maxItems` — `execution/metrics-invalid-assertion-bounds`); `requiredPaths`/`expectedTypes`/`assertions` are each capped at `MAX_METRICS_CONFIG_KEYS` entries.

- **Backward compatibility**: every existing scenario's `metrics.json` (flat, primitive-only) parses identically to before — the flat case is a strict subset of the recursive one, and `requiredKeys`/dotted-path config from before this change is not silently reinterpreted as JSON Pointer; scenarios must migrate explicitly to `requiredPaths`.

### Supported dependencies

`python`, `pytest`, `pandas`, `numpy`, `scikit-learn` (`lib/scenarios/machine-learning.ts` → `ML_SUPPORTED_DEPENDENCIES`). No `pip install` ever runs against candidate-controlled files — the verification/preview environment is whatever's already on the host `PATH` (`python3` / `python` / `py`, resolved once and memoized by `server/scenarios/python-runtime.ts`). If a required package is missing from the host environment, scripts fail with a normal Python `ImportError`, surfaced the same way any other candidate runtime error is.

### Container Sandbox

Candidate Python code (preview, step/final verification, and authoring solution validation — every real execution path) runs inside a real Docker container by default, not as a direct host OS process. The abstraction is generic on purpose, so it isn't ML-specific plumbing:

```
Scenario Runtime (lib/scenarios/machine-learning-runtime.ts)
      |
      v
SandboxExecutor  (lib/scenarios/execution/sandbox/sandbox-executor.ts — pure interface)
      |
      +-- ContainerSandboxExecutor   (server/scenarios/sandbox/container-sandbox-executor.ts)
      |     real Docker isolation — the production/default path
      |
      +-- LocalTrustedExecutor       (server/scenarios/sandbox/local-trusted-executor.ts)
            direct host subprocess — explicit opt-in ONLY, never the silent default
```

`server/scenarios/sandbox/execution-mode.ts` is the single place that decides which executor is active: the container by default, or `LocalTrustedExecutor` when `ACE_EXECUTION_MODE=local-trusted` is set exactly (any other value, or unset, uses the container). If Docker genuinely isn't reachable, the container executor returns a structured `sandbox-unavailable` result with an actionable message — it never silently falls back to host execution.

**Image**: `docker/ml-runner/Dockerfile`, built as `ace-ai-ml-runner:1` (`npm run sandbox:build`). `python:3.11.9-slim-bookworm` base, pinned `pytest==8.3.3`/`numpy==1.26.4`/`pandas==2.2.2`/`scikit-learn==1.4.2` (`docker/ml-runner/requirements.txt`), non-root `sandbox` user (uid/gid 10001, no home, nologin shell). Candidate code never runs `pip install` — the image's dependency set is fixed and versioned; a scenario needing a new package requires an image change, not a candidate-triggered install.

**Per-execution isolation**: every execution gets a brand-new, uniquely-named container (`ace-ml-<uuid>`), removed with `--rm` plus an explicit `docker kill` on timeout — containers are never reused across candidates, steps, or interview sessions.

**Security controls** (`server/scenarios/sandbox/container-sandbox-executor.ts`):

- **Network**: `--network none` by default — no outbound network access at all. (`SandboxExecutionRequest.networkAccess: true` exists for a reviewed future use case; nothing in the ML runtime sets it today.)
- **Filesystem**: `--read-only` root filesystem; the ONLY writable path is the bind-mounted, single-execution workspace directory (`-v <workspace>:/workspace:rw`) — never the repo root, never a home directory, never the Docker socket. A bounded `/tmp` tmpfs (`size=96m,mode=1777`) covers anything a library wants to scratch-write outside `/workspace`.
- **Resource limits**: memory (`--memory`/`--memory-swap`, default 768 MB, capped at 2048 MB), CPU (`--cpus`, default 1, capped at 2), PIDs (`--pids-limit`, default 64, capped at 256), wall-clock timeout (default 45s, capped at 120s, enforced by the Node side killing the container by name — not trusted to the container alone).
- **Linux hardening**: `--cap-drop ALL` (every Linux capability dropped), `--security-opt no-new-privileges`, non-root `--user 10001:10001`.
- **Single-threaded BLAS**: `OPENBLAS_NUM_THREADS`/`OMP_NUM_THREADS`/`MKL_NUM_THREADS`/`NUMEXPR_NUM_THREADS`/`VECLIB_MAXIMUM_THREADS=1` are always injected. Without this, numpy/scipy/scikit-learn auto-detect the HOST's CPU count (not the container's `--cpus` cap) on first import and spawn that many native pthreads — on a many-core host this can exceed `--pids-limit` and crash the candidate's own import with an opaque `pthread_create failed: Resource temporarily unavailable`, which is a resource collision, not a candidate bug.
- **No shell, ever**: `docker run` is invoked via `spawn(command, argsArray)` (array args), never a shell string — no shell-metacharacter injection surface regardless of file/candidate-code contents.
- Output caps (`maxOutputChars`, default 200,000, capped at 1,000,000) truncate combined stdout/stderr rather than returning it unbounded.

All of the above is proven by real (non-mocked) integration tests, not just configured: `server/scenarios/sandbox/container-sandbox-executor.integration.test.ts` (`npm run sandbox:verify`) spins up real containers and asserts network access actually fails, `os.getuid()` is actually 10001, host env vars are actually absent, writes outside `/workspace` actually fail, a hung process is actually killed by the timeout, oversized output is actually truncated, and no container survives after success/timeout.

**Cleanup**: `server/scenarios/sandbox/cleanup.ts`'s `cleanupOrphanedSandboxContainers()` (`npm run sandbox:clean`) removes any container carrying the `ace.ai.sandbox=true` label — the ONLY selector it uses, so it can never touch a container it didn't create. Intended for startup/maintenance (a hard-killed Node process can orphan a container `--rm` alone wouldn't have caught), not called per-execution.

- Timeouts: `DEFAULT_RUN_MAIN_TIMEOUT_MS` (15s, preview), `DEFAULT_PYTEST_STEP_TIMEOUT_MS` (30s), `DEFAULT_PYTEST_FINAL_TIMEOUT_MS` (45s, more than one test file) — all overridable per step via `verify.timeoutMs`, always subject to the sandbox's own `SANDBOX_MAX_TIMEOUT_MS` (120s) ceiling.
- Deterministic env: `PYTHONHASHSEED=0` and `PYTHONDONTWRITEBYTECODE=1` on every spawned Python process (`ML_DETERMINISTIC_ENV`). This does NOT make candidate code deterministic on its own — scenarios still require a fixed `random_state` in the candidate's own model code.
- Host-path redaction: the workspace's absolute path is stripped from stdout/stderr (replaced with `<workspace>`) before it's returned from either the verification or preview runtime, so a Python traceback never leaks the server's absolute filesystem path.
- Path traversal: `assertSafeWorkspacePath` rejects any workspace-relative path that would escape the temp workspace root when WRITING files; artifact READING is allowlist-only (`predictions.csv`/`metrics.json`/`report.txt`/`outputs/*`), so there's no traversal surface on the read side either.

**Local development without Docker**: set `ACE_EXECUTION_MODE=local-trusted` to run candidate code as a direct host subprocess instead — no container isolation, no network block, no resource limits beyond timeout/output capping. This is the pre-sandbox behavior, kept ONLY as an explicit, clearly-named opt-in (never the silent default, never set in CI or production). Requires Python + the ML dependencies on the host PATH; `ACE_DOCKER_BIN` overrides the Docker binary name/path when using the container mode.

**Supported platforms**: any host with a working Docker CLI reachable from Node — Docker Desktop (Windows/macOS) or a native Docker daemon (Linux CI runners). No shell-string interpolation means no POSIX-vs-Windows path-quoting divergence in the spawned command itself; only the Docker CLI needs to be present.

**Containerized vs. not (tracked scope)**: this container sandbox currently covers ML scenario execution ONLY (`type: machine-learning`). Every other execution engine remains in-process/OS-process-level, unchanged by this work:

- Node/Express backend scenarios — `node:vm`-based in-process execution.
- SQL scenarios — `sql.js` (WebAssembly), in-process.
- React/frontend scenarios — JSDOM-based, in-process.
- Fullstack scenarios — subprocess-spawned long-running dev servers (not one-shot executions; containerizing these would need a materially different lifecycle, e.g. a persisted container per session rather than one-per-execution).

> **TODO (tracked, non-blocking)**: extend container-level isolation to the other engines above before arbitrary untrusted public execution is enabled at scale for those scenario types. Out of scope for this work; documentation only, does not fail `scenario:validate`/`scenario:check`/CI.

### Authoring future Medium/Hard ML scenarios

The pipeline is generic already — no scenario-specific code exists anywhere in the runtime, verification, preview, or authoring-validation layers. A Medium/Hard scenario needs no engine work, only content: more steps (`tests/step-4.test.py`, …, `solution/step-4/`, …), additional metrics keys in `metrics.json`, additional artifacts under `outputs/`, denser/noisier datasets, or more complex `src/*.py` pipelines (cross-validation, preprocessing, class imbalance, etc.) all work today because nothing about the runtime assumes a fixed number of steps, a fixed metric set, or a fixed artifact filename set beyond the small preview allowlist above (which is intentionally generic — `outputs/*.{csv,json,txt}` covers arbitrary additional artifacts).

## Backend Scenario Authoring Rules

- Use TypeScript, Node, Express, and SQLite conventions already present in backend scenarios.
- Keep candidate work inside `workspace/`.
- Keep authored tests deterministic and HTTP-level where possible.
- Keep checkpoint solutions in `solution/step-*`.
- Use integer cents for money.
- Use parameterized SQL for user-provided values.
- Whitelist SQL identifiers such as sort columns.
- Preserve previous step behavior in later steps.
- Do not expose database-only fields in API responses.

## Environment

Copy `.env.example` to `.env.local` for local development.

Public client values:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_VAPI_PUBLIC_KEY`

Server-only values:

- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_DAY_PASS`
- `STRIPE_PRICE_WEEK_PASS`

Provider setup lives outside the app:

- Supabase owns auth providers, redirect URLs, profiles/interviews tables, RLS, and related triggers.
- Vapi owns the public web key and provider-level model/transcriber/voice credentials.
- Stripe owns products, prices, checkout sessions, and webhook signing.

## Public Assets

Keep:

- `public/ace-ai.png`
- `public/icon-512.png`
- `app/icon.png`

The old marketing screenshots and copied legacy screenshots were removed from the repo.
