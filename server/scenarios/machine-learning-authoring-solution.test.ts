import { beforeAll, describe, expect, it } from "vitest";
import { validateMachineLearningSolution } from "@/lib/scenarios/authoring/machine-learning-solution";
import { runMachineLearningPytest } from "@/server/scenarios/machine-learning-runtime";
import { resolvePythonCommand, runProcessWithTimeout } from "@/server/scenarios/python-runtime";
import type { AuthoredBundle } from "@/lib/scenarios/authoring/types";
import type { Scenario } from "@/lib/scenarios/schema";

/**
 * Negative integration coverage for the authoring-toolkit's ML solution
 * validator (the `solution/harness-not-runnable` fix) — proves the REAL
 * `python -m pytest` engine genuinely fails a broken reference solution, an
 * import error, and a checkpoint that borrows a later step's solution for an
 * earlier step. Uses hand-built in-memory `AuthoredBundle` fixtures ONLY —
 * never the real authored scenarios under `content/` (which stay untouched;
 * see `server/scenarios/{iris-species-classifier,house-price-regression,
 * support-ticket-categorizer,customer-churn-classifier}.test.ts` for the
 * POSITIVE real-engine proof on actual content).
 */

let pytestAvailable = false;

beforeAll(async () => {
  try {
    const python = await resolvePythonCommand();
    const probe = await runProcessWithTimeout({
      cwd: process.cwd(),
      command: python,
      args: ["-m", "pytest", "--version"],
      timeoutMs: 5_000,
    });
    pytestAvailable = probe.exitCode === 0;
  } catch {
    pytestAvailable = false;
  }
}, 15_000);

function fixtureScenario(overrides: Partial<Scenario> = {}): Scenario {
  return {
    id: "ml-negative-fixture",
    title: "ML Negative Fixture",
    summary: "Internal-only fixture used to prove the real ML authoring engine detects broken solutions.",
    category: "machine-learning-python",
    skills: ["python"],
    jobRoles: ["ml"],
    difficulty: "easy",
    experienceMin: "entry",
    experienceMax: "junior",
    estimatedMinutes: 30,
    stack: { languages: ["python"], harness: "python" },
    workspace: { files: [{ path: "main.py", role: "edit" }], entry: "main.py" },
    rubric: [{ criterion: "Correctness", weight: 100, detail: "Works." }],
    source: "authored",
    status: "verified",
    visibility: "internal",
    type: "machine-learning",
    version: 1,
    steps: [
      {
        id: "step-1",
        kind: "implement",
        prompt: "Step 1",
        verification: "automated-tests",
        verify: { harness: "python", tests: ["tests/step-1.test.py"] },
        weight: 50,
        checkpoint: { files: ["solution/step-1/main.py"] },
      },
      {
        id: "step-2",
        kind: "implement",
        prompt: "Step 2",
        verification: "automated-tests",
        verify: { harness: "python", tests: ["tests/step-2.test.py"] },
        weight: 50,
        checkpoint: { files: ["solution/step-2/main.py"] },
      },
    ],
    ...overrides,
  } as Scenario;
}

function fixtureBundle(files: Record<string, string>, scenario = fixtureScenario()): AuthoredBundle {
  return {
    slug: "ml-negative-fixture",
    category: "machine-learning-python",
    raw: "",
    frontmatter: {},
    scenario,
    schemaError: null,
    sections: {},
    files,
  };
}

describe("ML authoring solution validator — real pytest engine, negative cases", () => {
  it("fails a genuinely broken reference solution (an assertion the solution does not satisfy)", async () => {
    if (!pytestAvailable) return;
    const bundle = fixtureBundle({
      "tests/step-1.test.py": "def test_value():\n    from main import VALUE\n    assert VALUE == 42\n",
      "tests/step-2.test.py": "def test_value():\n    from main import VALUE\n    assert VALUE == 42\n",
      "solution/step-1/main.py": "VALUE = 42\n",
      // Step 2's "solution" is deliberately wrong.
      "solution/step-2/main.py": "VALUE = 1\n",
    });

    const diagnostics = await validateMachineLearningSolution(bundle, { runPytest: runMachineLearningPytest });
    const failures = diagnostics.filter((d) => d.code === "solution/tests-fail");
    expect(failures.length).toBeGreaterThan(0);
    expect(failures.some((d) => d.location.includes("step-2"))).toBe(true);
    // Step 1 alone (before step 2's broken checkpoint) still passes on its own.
    const step1Failure = failures.find((d) => d.location.includes("steps[0]"));
    expect(step1Failure).toBeUndefined();
  }, 30_000);

  it("fails on a real Python import error in the reference solution", async () => {
    if (!pytestAvailable) return;
    const bundle = fixtureBundle(
      {
        "tests/step-1.test.py": "def test_imports():\n    import main\n    assert True\n",
        "solution/step-1/main.py": "import this_module_does_not_exist\n",
      },
      fixtureScenario({
        steps: [
          {
            id: "step-1",
            kind: "implement",
            prompt: "Step 1",
            verification: "automated-tests",
            verify: { harness: "python", tests: ["tests/step-1.test.py"] },
            weight: 100,
            checkpoint: { files: ["solution/step-1/main.py"] },
          },
        ] as Scenario["steps"],
      }),
    );

    const diagnostics = await validateMachineLearningSolution(bundle, { runPytest: runMachineLearningPytest });
    const failures = diagnostics.filter((d) => d.code === "solution/tests-fail");
    expect(failures.length).toBeGreaterThan(0);
    expect(failures[0]!.message.toLowerCase()).toContain("modulenotfounderror");
  }, 30_000);

  it("verifies step 1 against step 1's OWN checkpoint, not a later step's — an incompatible step-2 checkpoint never fails step 1's diagnostic", async () => {
    if (!pytestAvailable) return;
    // step-2's checkpoint (FLAG=True) is deliberately INCOMPATIBLE with
    // step-1's test (which still requires FLAG=False) — a realistic authoring
    // mistake. The real engine must still report step 1 as passing (isolation:
    // it only ever runs step 1's checkpoint for step 1), even while step 2 and
    // final validation correctly fail because of the incompatibility.
    const bundle = fixtureBundle({
      "tests/step-1.test.py": "def test_flag_still_false():\n    from main import FLAG\n    assert FLAG is False\n",
      "tests/step-2.test.py": "def test_flag_now_true():\n    from main import FLAG\n    assert FLAG is True\n",
      "solution/step-1/main.py": "FLAG = False\n",
      "solution/step-2/main.py": "FLAG = True\n",
    });

    const diagnostics = await validateMachineLearningSolution(bundle, { runPytest: runMachineLearningPytest });
    const failures = diagnostics.filter((d) => d.code === "solution/tests-fail");

    // step-2 legitimately fails (its checkpoint breaks step 1's still-active
    // assertion) — that's correct cumulative enforcement, not a bug.
    expect(failures.some((d) => d.location.includes("steps[1]"))).toBe(true);
    // step-1's OWN diagnostic must never appear: it was verified with step 1's
    // checkpoint (FLAG=False), which does satisfy step 1's test in isolation.
    expect(failures.some((d) => d.location.includes("steps[0]"))).toBe(false);
  }, 30_000);
});
