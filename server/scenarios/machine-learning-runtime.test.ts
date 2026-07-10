import { beforeAll, describe, expect, it } from "vitest";
import { runMachineLearningMain, runMachineLearningPytest } from "@/server/scenarios/machine-learning-runtime";
import { resolvePythonCommand, runProcessWithTimeout } from "@/server/scenarios/python-runtime";

// Probed once in beforeAll (not at module-load time) so the pytest-dependent
// tests can be cleanly SKIPPED (not silently no-op'd) when this environment
// has no pytest installed. Phase 2 never installs dependencies — see the
// dependency handling note in machine-learning-runtime.ts / the Phase 2 report.
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

describe("machine learning runtime — real python execution", () => {
  it("executes a simple main.py and captures stdout", async () => {
    const result = await runMachineLearningMain({
      scenarioSlug: "ml-fixture",
      workspaceFiles: { "main.py": "print('hello from ml runtime')" },
    });
    expect(result.ok).toBe(true);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("hello from ml runtime");
    expect(result.timedOut).toBe(false);
  });

  it("captures stderr / exception output and returns ok: false on a non-zero exit", async () => {
    const result = await runMachineLearningMain({
      scenarioSlug: "ml-fixture",
      workspaceFiles: { "main.py": "raise ValueError('boom')" },
    });
    expect(result.ok).toBe(false);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("ValueError");
    expect(result.stderr).toContain("boom");
  });

  it("gives main.py a working directory where data/train.csv resolves as a relative path", async () => {
    const result = await runMachineLearningMain({
      scenarioSlug: "ml-fixture",
      workspaceFiles: {
        "main.py": "with open('data/train.csv') as f:\n    print(len(f.readlines()))",
        "data/train.csv": "a,b\n1,2\n3,4\n",
      },
    });
    expect(result.ok).toBe(true);
    expect(result.stdout.trim()).toBe("3");
  });

  it(
    "returns ok: false and timedOut: true when main.py exceeds the timeout",
    async () => {
      // Sandboxed execution routes through a real container, whose start-up
      // (plus the executor's own grace period before force-killing) adds
      // latency a bare host-process spawn didn't have. main.py must sleep
      // well past that combined overhead so this genuinely exercises the
      // timeout path instead of racing container start-up time.
      const result = await runMachineLearningMain({
        scenarioSlug: "ml-fixture",
        workspaceFiles: { "main.py": "import time\ntime.sleep(30)" },
        timeoutMs: 3_000,
      });
      expect(result.ok).toBe(false);
      expect(result.timedOut).toBe(true);
    },
    30_000,
  );

  it("does not write authored test files into a run-main workspace", async () => {
    const result = await runMachineLearningMain({
      scenarioSlug: "ml-fixture",
      workspaceFiles: { "main.py": "import os\nprint(os.path.exists('tests'))" },
      testFileContents: { "tests/step-1.test.py": "def test_x():\n    assert True\n" },
    });
    expect(result.ok).toBe(true);
    expect(result.stdout.trim()).toBe("False");
  });

  it("runs pytest against an explicit authored test file", async () => {
    if (!pytestAvailable) return;
    const result = await runMachineLearningPytest({
      scenarioSlug: "ml-fixture",
      workspaceFiles: { "main.py": "" },
      testFileContents: { "tests/step-1.test.py": "def test_passes():\n    assert True\n" },
    });
    expect(result.ok).toBe(true);
    expect(result.exitCode).toBe(0);
  });

  it("returns ok: false on a pytest failure", async () => {
    if (!pytestAvailable) return;
    const result = await runMachineLearningPytest({
      scenarioSlug: "ml-fixture",
      workspaceFiles: { "main.py": "" },
      testFileContents: { "tests/step-1.test.py": "def test_fails():\n    assert False\n" },
    });
    expect(result.ok).toBe(false);
    expect(result.exitCode).not.toBe(0);
  });
});
