import { z } from "zod";

/**
 * Zod schema + inferred types for the Interview Scenario content unit.
 *
 * This mirrors the scenario contract summarized in `docs/README.md`
 * §3 steps). It is the single runtime source of truth for a scenario's shape and
 * the cross-field invariants that must hold for a scenario to *run* (weights sum
 * to 100, `explain` steps carry no tests, etc.).
 *
 * Scope note (Phase 1): this validates **structure and runnability**. Taxonomy
 * membership (`category` ∈ categories.yaml, `skills` ⊆ skills.yaml, …) and the
 * offline correctness gate (reference solution passes its tests) are the job of
 * the separate scenario validator, which is deliberately deferred until the
 * runtime works. Keeping this module pure (no fs) lets client components import
 * the types and lets the parser be unit-tested with plain strings.
 */

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const EXPERIENCE_LEVELS = ["intern", "entry", "junior", "senior"] as const;
export const STEP_KINDS = ["implement", "debug", "refactor", "explain"] as const;
export const VERIFICATIONS = ["automated-tests", "rubric", "hybrid", "none"] as const;
export const HARNESSES = ["node-vm", "python", "sqlite", "component", "none"] as const;
export const FILE_ROLES = ["edit", "readonly"] as const;

/**
 * Generalized execution metadata (Phase 6). These four INDEPENDENT axes replace
 * the React-centric `stack` for language-agnostic engine selection. They are
 * OPTIONAL: existing scenarios omit them and their profile is derived from the
 * legacy `stack.harness` (see lib/scenarios/execution/profile.ts), so nothing
 * changes for current content. New (backend) scenarios declare them explicitly.
 */
export const RUNTIMES = ["browser", "node", "python", "jvm", "dotnet"] as const;
export const ENGINE_IDS = ["react", "node", "python", "java", "csharp", "sql"] as const;
/** Databases a scenario can provision for its engine (Phase 9). */
export const DATABASE_ENGINES = ["sqlite"] as const;
export const SCENARIO_VISIBILITIES = ["public", "internal"] as const;
export const SCENARIO_TYPES = ["frontend", "backend", "fullstack", "machine-learning"] as const;
export const EXECUTION_MODES = ["single", "fullstack", "python-ml"] as const;
/** JSON type names `execution.artifacts.metrics.expectedTypes`/`assertions`
 *  may require — mirrors `MachineLearningMetricTypeName` in
 *  lib/scenarios/machine-learning-metrics.ts (kept independent here so the
 *  schema module stays fs/dependency-free; both lists must be changed
 *  together if ever extended). */
export const ML_METRIC_TYPE_NAMES = ["number", "string", "boolean", "null", "array", "object"] as const;
export const VERIFICATION_MODES = [
  "single-file",
  "scenario-step",
  "scenario-final",
  "python-step",
  "python-final",
] as const;

/** Harnesses whose `verify.functionName` is required (per frozen §3 rule 8). */
const FUNCTION_NAME_HARNESSES = new Set(["node-vm", "python", "component"]);

const rubricCriterionSchema = z.object({
  criterion: z.string().min(1),
  weight: z.number().int().min(0).max(100),
  detail: z.string().min(1),
});

const workspaceFileSchema = z.object({
  path: z.string().min(1),
  role: z.enum(FILE_ROLES),
});

const verifySchema = z.object({
  harness: z.enum(HARNESSES),
  functionName: z.string().min(1).optional(),
  tests: z.array(z.string().min(1)).optional(),
  timeoutMs: z.number().int().positive().optional(),
});

const stepSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(STEP_KINDS),
  prompt: z.string().min(1),
  verification: z.enum(VERIFICATIONS),
  verify: verifySchema,
  rubric: z.array(rubricCriterionSchema).optional(),
  weight: z.number().int().min(0).max(100),
  checkpoint: z.object({ files: z.array(z.string().min(1)).min(1) }).optional(),
  hints: z.array(z.string().min(1)).optional(),
});

/** Sum of a `weight` list; used by the "must total 100" invariants. */
function sumWeights(items: { weight: number }[]): number {
  return items.reduce((total, item) => total + item.weight, 0);
}

const experienceIndex = (level: (typeof EXPERIENCE_LEVELS)[number]) =>
  EXPERIENCE_LEVELS.indexOf(level);

export const scenarioSchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "id must be kebab-case ([a-z0-9-])"),
    title: z.string().min(1),
    summary: z.string().min(10).max(200),
    category: z.string().min(1),
    skills: z.array(z.string().min(1)).min(1).max(4),
    jobRoles: z.array(z.string().min(1)).min(1),
    tags: z.array(z.string().min(1)).optional(),
    difficulty: z.enum(DIFFICULTIES),
    experienceMin: z.enum(EXPERIENCE_LEVELS),
    experienceMax: z.enum(EXPERIENCE_LEVELS),
    estimatedMinutes: z.number().int().positive(),
    stack: z.object({
      languages: z.array(z.string().min(1)).min(1),
      harness: z.enum(HARNESSES),
    }),
    // Generalized execution metadata (Phase 6) — all OPTIONAL and additive.
    // When omitted, the execution profile is derived from `stack.harness`.
    language: z
      .object({ primary: z.string().min(1), secondary: z.array(z.string().min(1)).optional() })
      .optional(),
    runtime: z.enum(RUNTIMES).optional(),
    framework: z.string().min(1).optional(),
    verification: z
      .object({
        engine: z.enum(ENGINE_IDS),
        mode: z.enum(VERIFICATION_MODES).optional(),
        testGroups: z.array(z.enum(["backend", "frontend", "integration"])).optional(),
        includePreviousSteps: z.boolean().optional(),
      })
      .optional(),
    database: z.object({ engine: z.enum(DATABASE_ENGINES) }).optional(),
    workspace: z.object({
      files: z.array(workspaceFileSchema).min(1),
      entry: z.string().min(1),
    }),
    rubric: z.array(rubricCriterionSchema).min(1),
    source: z.enum(["authored", "adapted"]).optional(),
    status: z.enum(["draft", "review", "verified"]),
    visibility: z.enum(SCENARIO_VISIBILITIES).optional(),
    type: z.enum(SCENARIO_TYPES).optional(),
    // Scenario-level dominant task type (additive, optional). When omitted,
    // consumers derive it from `steps[].kind` — see scenarioTaskTypeOf() in
    // lib/scenarios/scenario-task-type.ts. Mirrors STEP_KINDS so a scenario
    // can declare "this interview is primarily a debug exercise" without
    // requiring every existing scenario.md to be touched.
    taskType: z.enum(STEP_KINDS).optional(),
    frontend: z
      .object({
        framework: z.string().min(1),
        bundler: z.string().min(1).optional(),
      })
      .optional(),
    backend: z
      .object({
        framework: z.string().min(1),
        database: z.enum(DATABASE_ENGINES).optional(),
      })
      .optional(),
    // Machine-learning-specific metadata (Phase 1: contract only, no execution).
    // `language: python` is already covered by the generalized `runtime` field
    // (RUNTIMES includes "python"); this block adds the ML-only extras. The
    // candidate entrypoint is `workspace.entry`, which the invariant below pins
    // to `main.py` — no separate `entrypoint` field is needed.
    ml: z
      .object({
        pythonVersion: z.string().min(1).optional(),
      })
      .optional(),
    execution: z
      .object({
        mode: z.enum(EXECUTION_MODES),
        // Optional, additive artifact-requirement config (ML scenarios only in
        // practice today) — existing scenarios omit `artifacts` entirely and are
        // completely unaffected. See docs/README.md "Machine Learning Scenario
        // Runtime" for the metrics.json contract this configures.
        artifacts: z
          .object({
            metrics: z
              .object({
                /** Workspace-relative path to the metrics file. Defaults to
                 *  "metrics.json" when omitted. Semantic checks (relative,
                 *  no traversal) live in authoring/execution.ts, not here. */
                path: z.string().min(1).optional(),
                /** When true, missing/malformed metrics.json fails final
                 *  verification. When false/omitted, metrics.json stays an
                 *  optional artifact (preview-only). */
                required: z.boolean().optional(),
                /** JSON Pointers (RFC 6901, e.g. "/summary/accuracy") that
                 *  must resolve to some value. Supports arbitrarily nested
                 *  metrics.json shapes, not just flat top-level keys. */
                requiredPaths: z.array(z.string().min(1)).optional(),
                /** Keyed by JSON Pointer — when present, the resolved value's
                 *  JSON type must match. */
                expectedTypes: z.record(z.string().min(1), z.enum(ML_METRIC_TYPE_NAMES)).optional(),
                /** Generic structural checks beyond presence/type — see
                 *  `MachineLearningMetricAssertion` (lib/scenarios/machine-
                 *  learning-metrics.ts). Intentionally NOT ML-specific
                 *  vocabulary (no "accuracyThreshold" etc.) — just bounded
                 *  JSON structure checks. */
                assertions: z
                  .array(
                    z.object({
                      path: z.string().min(1),
                      type: z.enum(ML_METRIC_TYPE_NAMES).optional(),
                      minimum: z.number().finite().optional(),
                      maximum: z.number().finite().optional(),
                      minItems: z.number().int().nonnegative().optional(),
                      maxItems: z.number().int().nonnegative().optional(),
                      integer: z.boolean().optional(),
                    }),
                  )
                  .optional(),
              })
              .optional(),
          })
          .optional(),
      })
      .optional(),
    version: z.number().int().positive(),
    steps: z.array(stepSchema).min(1),
  })
  // `.loose()` keeps unknown top-level frontmatter fields instead of stripping or
  // rejecting them, so a V2 field added to content never breaks a V1 runtime and
  // the extra data survives round-trips. Unknown *nested* fields are tolerated
  // (ignored) too, since inner objects use Zod's default strip (never reject).
  .loose()
  .superRefine((s, ctx) => {
    // summary must be a single line, distinct from title (frozen §2).
    if (/\n/.test(s.summary)) {
      ctx.addIssue({ code: "custom", path: ["summary"], message: "summary must be a single line" });
    }
    if (s.summary.trim() === s.title.trim()) {
      ctx.addIssue({ code: "custom", path: ["summary"], message: "summary must differ from title" });
    }

    if (s.type === "fullstack") {
      if (s.frontend?.framework !== "react") {
        ctx.addIssue({
          code: "custom",
          path: ["frontend", "framework"],
          message: "fullstack scenarios must declare frontend.framework: react",
        });
      }
      if (s.frontend?.bundler !== "vite") {
        ctx.addIssue({
          code: "custom",
          path: ["frontend", "bundler"],
          message: "fullstack scenarios must declare frontend.bundler: vite",
        });
      }
      if (s.backend?.framework !== "express") {
        ctx.addIssue({
          code: "custom",
          path: ["backend", "framework"],
          message: "fullstack scenarios must declare backend.framework: express",
        });
      }
      if (s.backend?.database !== "sqlite") {
        ctx.addIssue({
          code: "custom",
          path: ["backend", "database"],
          message: "fullstack scenarios must declare backend.database: sqlite",
        });
      }
      if (s.execution?.mode !== "fullstack") {
        ctx.addIssue({
          code: "custom",
          path: ["execution", "mode"],
          message: "fullstack scenarios must declare execution.mode: fullstack",
        });
      }
    } else if (s.execution?.mode === "fullstack") {
      ctx.addIssue({
        code: "custom",
        path: ["type"],
        message: "execution.mode: fullstack requires type: fullstack",
      });
    }

    if (s.type === "machine-learning") {
      if (s.runtime !== "python") {
        ctx.addIssue({
          code: "custom",
          path: ["runtime"],
          message: "machine-learning scenarios must declare runtime: python",
        });
      }
      if (s.execution?.mode !== "python-ml") {
        ctx.addIssue({
          code: "custom",
          path: ["execution", "mode"],
          message: "machine-learning scenarios must declare execution.mode: python-ml",
        });
      }
      if (s.workspace.entry !== "main.py") {
        ctx.addIssue({
          code: "custom",
          path: ["workspace", "entry"],
          message: "machine-learning scenarios must set workspace.entry: main.py",
        });
      }
    } else if (s.execution?.mode === "python-ml") {
      ctx.addIssue({
        code: "custom",
        path: ["type"],
        message: "execution.mode: python-ml requires type: machine-learning",
      });
    }

    // experienceMax >= experienceMin (frozen §6 rule 3).
    if (experienceIndex(s.experienceMax) < experienceIndex(s.experienceMin)) {
      ctx.addIssue({
        code: "custom",
        path: ["experienceMax"],
        message: "experienceMax must be >= experienceMin",
      });
    }

    // entry must be one of the workspace files (frozen §6 rule 5).
    if (!s.workspace.files.some((f) => f.path === s.workspace.entry)) {
      ctx.addIssue({
        code: "custom",
        path: ["workspace", "entry"],
        message: `entry '${s.workspace.entry}' is not among workspace.files`,
      });
    }

    // Weight totals: scenario rubric, steps, and each step rubric sum to 100.
    if (sumWeights(s.rubric) !== 100) {
      ctx.addIssue({ code: "custom", path: ["rubric"], message: "scenario rubric weights must sum to 100" });
    }
    if (sumWeights(s.steps) !== 100) {
      ctx.addIssue({ code: "custom", path: ["steps"], message: "step weights must sum to 100" });
    }

    s.steps.forEach((step, i) => {
      const at = (key: string) => ["steps", i, key];
      const fullstackManualStep = s.type === "fullstack" && step.verify.harness === "none";
      // Machine-learning steps use the same manual/checkpoint-graded escape hatch as
      // fullstack today, since the Python runtime is not implemented yet (Phase 2).
      const mlManualStep = s.type === "machine-learning" && step.verify.harness === "none";
      const manualStep = fullstackManualStep || mlManualStep;

      if (step.rubric && sumWeights(step.rubric) !== 100) {
        ctx.addIssue({ code: "custom", path: at("rubric"), message: "step rubric weights must sum to 100" });
      }

      if (step.kind === "explain") {
        // explain ⇒ rubric verification, no harness, no tests (frozen §6 rule 7).
        if (step.verification !== "rubric") {
          ctx.addIssue({ code: "custom", path: at("verification"), message: "explain steps must use verification: rubric" });
        }
        if (step.verify.harness !== "none") {
          ctx.addIssue({ code: "custom", path: at("verify"), message: "explain steps must use harness: none" });
        }
        if (step.verify.tests && step.verify.tests.length > 0) {
          ctx.addIssue({ code: "custom", path: at("verify"), message: "explain steps must not declare tests" });
        }
        if (!step.rubric) {
          ctx.addIssue({ code: "custom", path: at("rubric"), message: "explain steps require a rubric" });
        }
      } else {
        // implement | debug | refactor ⇒ executable harness + tests (frozen §6 rule 8).
        if (step.verify.harness === "none" && !manualStep) {
          ctx.addIssue({ code: "custom", path: at("verify"), message: `${step.kind} steps require an executable harness` });
        }
        if (step.verification !== "automated-tests" && step.verification !== "hybrid") {
          ctx.addIssue({ code: "custom", path: at("verification"), message: `${step.kind} steps must use verification automated-tests or hybrid` });
        }
        if ((!step.verify.tests || step.verify.tests.length === 0) && !manualStep) {
          ctx.addIssue({ code: "custom", path: at("verify"), message: `${step.kind} steps must declare tests` });
        }
        // Machine-learning steps are script-based (`python main.py`, `pytest`), not
        // function-call based, so a "python" harness on an ML step never needs
        // functionName — this does NOT weaken the requirement for any other
        // scenario type using the python/node-vm/component harnesses.
        const mlScriptStep = s.type === "machine-learning" && step.verify.harness === "python";
        if (FUNCTION_NAME_HARNESSES.has(step.verify.harness) && !step.verify.functionName && !mlScriptStep) {
          ctx.addIssue({ code: "custom", path: at("verify"), message: `harness ${step.verify.harness} requires functionName` });
        }
      }

      // hybrid | rubric verification requires a rubric on the step.
      if ((step.verification === "hybrid" || step.verification === "rubric") && !step.rubric) {
        ctx.addIssue({ code: "custom", path: at("rubric"), message: `${step.verification} steps require a rubric` });
      }
    });
  });

export type Scenario = z.infer<typeof scenarioSchema>;
export type ScenarioStep = Scenario["steps"][number];
export type WorkspaceFileManifest = Scenario["workspace"]["files"][number];
export type RubricCriterion = z.infer<typeof rubricCriterionSchema>;
export type StepKind = (typeof STEP_KINDS)[number];
export type FileRole = (typeof FILE_ROLES)[number];
export type ScenarioType = (typeof SCENARIO_TYPES)[number];
