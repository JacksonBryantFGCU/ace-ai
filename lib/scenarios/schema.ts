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
    verification: z.object({ engine: z.enum(ENGINE_IDS) }).optional(),
    database: z.object({ engine: z.enum(DATABASE_ENGINES) }).optional(),
    workspace: z.object({
      files: z.array(workspaceFileSchema).min(1),
      entry: z.string().min(1),
    }),
    rubric: z.array(rubricCriterionSchema).min(1),
    source: z.enum(["authored", "adapted"]).optional(),
    status: z.enum(["draft", "review", "verified"]),
    visibility: z.enum(SCENARIO_VISIBILITIES).optional(),
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
        if (step.verify.harness === "none") {
          ctx.addIssue({ code: "custom", path: at("verify"), message: `${step.kind} steps require an executable harness` });
        }
        if (step.verification !== "automated-tests" && step.verification !== "hybrid") {
          ctx.addIssue({ code: "custom", path: at("verification"), message: `${step.kind} steps must use verification automated-tests or hybrid` });
        }
        if (!step.verify.tests || step.verify.tests.length === 0) {
          ctx.addIssue({ code: "custom", path: at("verify"), message: `${step.kind} steps must declare tests` });
        }
        if (FUNCTION_NAME_HARNESSES.has(step.verify.harness) && !step.verify.functionName) {
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
