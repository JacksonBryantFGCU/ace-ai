import { describe, expect, it } from "vitest";
import { runMlScriptPreview } from "@/server/scenarios/machine-learning-preview";

/**
 * Real-Python integration tests for the ML preview runtime (mirrors
 * `server/scenarios/machine-learning-runtime.test.ts`'s "real python execution"
 * suite, but for the preview path — no pytest involved, so no availability
 * probe/skip is needed here, only a working `python`).
 */
describe("ML script preview — real python execution", () => {
  it("runs main.py and captures stdout", async () => {
    const result = await runMlScriptPreview({
      scenarioSlug: "ml-preview-fixture",
      workspaceFiles: { "main.py": "print('hello from preview')" },
    });
    expect(result.ok).toBe(true);
    expect(result.command).toBe("python main.py");
    expect(result.stdout).toContain("hello from preview");
    expect(result.artifacts).toEqual([]);
  });

  it("captures stderr and returns ok: false on a script exception", async () => {
    const result = await runMlScriptPreview({
      scenarioSlug: "ml-preview-fixture",
      workspaceFiles: { "main.py": "raise ValueError('boom')" },
    });
    expect(result.ok).toBe(false);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain("ValueError");
    expect(result.stderr).toContain("boom");
  });

  it(
    "returns ok: false and timedOut: true when main.py exceeds the timeout",
    async () => {
      const result = await runMlScriptPreview({
        scenarioSlug: "ml-preview-fixture",
        workspaceFiles: { "main.py": "import time\ntime.sleep(5)" },
        timeoutMs: 300,
      });
      expect(result.ok).toBe(false);
      expect(result.timedOut).toBe(true);
    },
    10_000,
  );

  it("detects a generated predictions.csv and previews its first rows", async () => {
    const script = [
      "with open('predictions.csv', 'w') as f:",
      "    f.write('customer_id,churn_prediction\\n')",
      "    for i in range(8):",
      "        f.write(f'CUST-{i},{i % 2}\\n')",
      "print('Saved predictions.csv')",
    ].join("\n");
    const result = await runMlScriptPreview({
      scenarioSlug: "ml-preview-fixture",
      workspaceFiles: { "main.py": script },
    });
    expect(result.ok).toBe(true);
    expect(result.stdout).toContain("Saved predictions.csv");
    expect(result.artifacts).toHaveLength(1);
    const artifact = result.artifacts[0]!;
    expect(artifact.path).toBe("predictions.csv");
    expect(artifact.kind).toBe("csv");
    expect(artifact.preview?.columns).toEqual(["customer_id", "churn_prediction"]);
    expect(artifact.preview?.rows).toHaveLength(5); // 8 data rows, capped at 5
    expect(artifact.preview?.truncated).toBe(true);
  });

  it("never exposes authored tests/solution files as artifacts, even if present in the run workspace", async () => {
    const result = await runMlScriptPreview({
      scenarioSlug: "ml-preview-fixture",
      workspaceFiles: {
        "main.py": "print('done')",
        "tests/step-1.test.py": "def test_x():\n    assert True\n",
      },
    });
    expect(result.artifacts).toEqual([]);
  });

  it("does not run pytest for a preview run", async () => {
    // A syntactically-invalid pytest test file would fail collection if pytest
    // ever ran here; the preview must ignore it and only execute main.py.
    const result = await runMlScriptPreview({
      scenarioSlug: "ml-preview-fixture",
      workspaceFiles: {
        "main.py": "print('only main.py runs')",
        "tests/step-1.test.py": "this is not valid python(((",
      },
    });
    expect(result.ok).toBe(true);
    expect(result.stdout).toContain("only main.py runs");
  });
});
