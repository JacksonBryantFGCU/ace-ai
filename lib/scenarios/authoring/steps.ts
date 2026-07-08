import { checkpointTargetPath } from "@/lib/scenarios/checkpoints";
import { diag, type AuthoredBundle, type Diagnostic } from "@/lib/scenarios/authoring/types";

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Step validation: unique kebab ids, verification ⇒ tests (that exist), discussion
 * ⇒ rubric, checkpoints reference existing solution files (targeting editable
 * workspace files), hints are present + non-duplicate, and the interview can be
 * completed (linear navigation over at least one gradable step).
 */
export function validateSteps(bundle: AuthoredBundle): Diagnostic[] {
  const { scenario } = bundle;
  if (!scenario) return [];

  const out: Diagnostic[] = [];
  const steps = scenario.steps;
  const editablePaths = new Set(scenario.workspace.files.filter((f) => f.role === "edit").map((f) => f.path));
  const workspacePaths = new Set(scenario.workspace.files.map((f) => f.path));

  // Duplicate step ids.
  const seen = new Set<string>();
  for (const step of steps) {
    if (seen.has(step.id)) {
      out.push(
        diag.error(
          "steps/duplicate-id",
          `scenario.md → steps`,
          `step id "${step.id}" is used more than once.`,
          "Give every step a unique id — ids drive progress, checkpoints, and results.",
        ),
      );
    }
    seen.add(step.id);
  }

  if (steps.length === 0) {
    out.push(
      diag.error(
        "steps/none",
        `scenario.md → steps`,
        "the scenario has no steps.",
        "Add at least one step so the interview has something to do (and to complete).",
      ),
    );
  }

  steps.forEach((step, i) => {
    const at = `scenario.md → steps[${i}] (${step.id})`;
    const fullstackManualStep = scenario.type === "fullstack" && step.verify.harness === "none";

    if (!KEBAB.test(step.id)) {
      out.push(
        diag.bestPractice("steps/non-kebab-id", at, `step id "${step.id}" is not kebab-case.`, "Use kebab-case ids like `build-search` for readable results and folders."),
      );
    }

    // Verification steps must declare tests that exist.
    const needsTests = (step.verification === "automated-tests" || step.verification === "hybrid") && !fullstackManualStep;
    if (needsTests) {
      const tests = step.verify.tests ?? [];
      if (tests.length === 0) {
        out.push(
          diag.error(
            "steps/verification-without-tests",
            `${at}.verify.tests`,
            `verification "${step.verification}" declares no test files.`,
            "List the authored test file(s) under `verify.tests`, e.g. `[tests/step-1.test.tsx]`.",
          ),
        );
      }
      for (const testPath of tests) {
        if (!(testPath in bundle.files)) {
          out.push(
            diag.error(
              "steps/missing-test-file",
              `${at}.verify.tests`,
              `test file "${testPath}" is missing on disk.`,
              `Create ${testPath}, or fix the path in \`verify.tests\`.`,
            ),
          );
        }
      }
    }

    // Discussion steps must carry a usable rubric (schema requires presence; this
    // catches an empty/degenerate one).
    if (step.kind === "explain" || step.verification === "rubric") {
      if (!step.rubric || step.rubric.length === 0) {
        out.push(
          diag.error(
            "steps/discussion-without-rubric",
            `${at}.rubric`,
            "a discussion/rubric step has no rubric criteria.",
            "Add rubric criteria (weights summing to 100) so the discussion can be graded.",
          ),
        );
      }
    }

    // Checkpoint files must exist and target an editable workspace file.
    if (step.checkpoint) {
      for (const solutionPath of step.checkpoint.files) {
        if (!(solutionPath in bundle.files)) {
          out.push(
            diag.error(
              "steps/missing-checkpoint-file",
              `${at}.checkpoint`,
              `checkpoint file "${solutionPath}" is missing on disk.`,
              `Create ${solutionPath} (the reference solution applied when the candidate uses the checkpoint), or remove it.`,
            ),
          );
          continue;
        }
        const target = checkpointTargetPath(solutionPath);
        if (!workspacePaths.has(target)) {
          out.push(
            diag.warning(
              "steps/checkpoint-target-new-file",
              `${at}.checkpoint`,
              `checkpoint "${solutionPath}" applies to "${target}", which isn't a declared workspace file.`,
              `That's fine only if the step expects the candidate to create "${target}"; otherwise declare it in \`workspace.files\`.`,
            ),
          );
        } else if (!editablePaths.has(target)) {
          out.push(
            diag.warning(
              "steps/checkpoint-target-readonly",
              `${at}.checkpoint`,
              `checkpoint "${solutionPath}" overwrites readonly file "${target}".`,
              "Checkpoints should restore editable files; make the target `role: edit` or drop it from the checkpoint.",
            ),
          );
        }
      }
    }

    // Hints: present (best practice) + non-duplicate.
    const hints = step.hints ?? [];
    if (hints.length === 0 && needsTests) {
      out.push(
        diag.bestPractice(`${at}.hints`, at, "a gradable step has no hints.", "Add 2–3 progressive hints so a stuck candidate can be nudged rather than blocked."),
      );
    }
    const dupHint = hints.find((h, idx) => hints.indexOf(h) !== idx);
    if (dupHint) {
      out.push(
        diag.warning("steps/duplicate-hint", `${at}.hints`, `a hint is duplicated: "${dupHint.slice(0, 40)}…".`, "Make each hint reveal something new; remove the duplicate."),
      );
    }
  });

  // Completion reachability: at least one gradable step.
  const gradable = steps.filter(
    (s) => s.verification === "automated-tests" || s.verification === "hybrid" || s.verification === "rubric",
  );
  if (steps.length > 0 && gradable.length === 0) {
    out.push(
      diag.warning(
        "steps/no-gradable-step",
        `scenario.md → steps`,
        "no step is gradable (all `verification: none`).",
        "Give at least one step automated tests or a rubric, or the interview can't produce a score.",
      ),
    );
  }

  return out;
}
