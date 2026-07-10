import { scenarioTypeOf } from "@/lib/scenarios/scenario-type";
import { ML_ENTRYPOINT, mlStepSolutionDir, mlStepTestPath } from "@/lib/scenarios/machine-learning";
import { diag, type AuthoredBundle, type Diagnostic } from "@/lib/scenarios/authoring/types";

const AT = "scenario.md";

function hasFile(bundle: AuthoredBundle, prefix: string): boolean {
  return Object.keys(bundle.files).some((path) => path.startsWith(prefix));
}

/**
 * Machine-learning-only contract checks (Phase 1: structure only — no Python
 * execution). Existing backend/fullstack scenarios are left alone; when
 * `type: machine-learning` is declared, authors get structure checks for the
 * Python workspace, dataset folder, authored per-step tests, and per-step
 * solution checkpoints. Mirrors `validateFullstackContract`.
 */
export function validateMachineLearningContract(bundle: AuthoredBundle): Diagnostic[] {
  const { scenario } = bundle;
  if (!scenario || scenarioTypeOf(scenario) !== "machine-learning") return [];

  const out: Diagnostic[] = [];

  if (scenario.type !== "machine-learning") {
    out.push(
      diag.error(
        "ml/missing-type",
        `${AT} → type`,
        "Machine-learning scenarios must explicitly declare `type: machine-learning`.",
        "Add `type: machine-learning` to the scenario frontmatter.",
      ),
    );
  }

  if (!(`workspace/${ML_ENTRYPOINT}` in bundle.files)) {
    out.push(
      diag.error(
        "ml/missing-entrypoint",
        `workspace/${ML_ENTRYPOINT}`,
        "Machine-learning scenarios must include a workspace/main.py entrypoint.",
        "Add workspace/main.py and declare it in `workspace.files` with `entry: main.py`.",
      ),
    );
  }

  if (!hasFile(bundle, "workspace/data/")) {
    out.push(
      diag.error(
        "ml/missing-data",
        "workspace/data",
        "Machine-learning scenarios must include a workspace/data/ folder with the candidate's dataset.",
        "Add dataset files (e.g. train.csv) under `workspace/data/` and declare them in `workspace.files`.",
      ),
    );
  }

  if (!hasFile(bundle, "tests/")) {
    out.push(
      diag.error(
        "ml/missing-tests",
        "tests",
        "Machine-learning scenarios must include authored-only tests under tests/.",
        "Add tests/step-1.test.py (and one per step) with authored-only checks.",
      ),
    );
  }

  if (!hasFile(bundle, "solution/")) {
    out.push(
      diag.error(
        "ml/missing-solution",
        "solution",
        "Machine-learning scenarios must include a reference solution under solution/.",
        "Add solution/step-1/main.py (and one per step) with the authored reference solution.",
      ),
    );
  }

  scenario.steps.forEach((step, index) => {
    const stepNumber = index + 1;
    const solutionDir = mlStepSolutionDir(stepNumber);
    const testPath = mlStepTestPath(stepNumber);

    if (!hasFile(bundle, `${solutionDir}/`)) {
      out.push(
        diag.error(
          "ml/missing-step-solution",
          `${AT} → steps.${step.id}`,
          `Step "${step.id}" (step ${stepNumber}) has no matching ${solutionDir}/.`,
          `Add ${solutionDir}/main.py with that step's reference solution.`,
        ),
      );
    }

    if (!(testPath in bundle.files)) {
      out.push(
        diag.error(
          "ml/missing-step-test",
          `${AT} → steps.${step.id}`,
          `Step "${step.id}" (step ${stepNumber}) has no matching ${testPath}.`,
          `Add ${testPath} with that step's authored-only tests.`,
        ),
      );
    }
  });

  return out;
}
