import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PYTEST_STEP_TIMEOUT_MS,
  DEFAULT_RUN_MAIN_TIMEOUT_MS,
  ML_DETERMINISTIC_ENV,
  MachineLearningRuntimeError,
  redactWorkspacePath,
  runMachineLearningCommand,
  type MachineLearningRuntimeDependencies,
  type MachineLearningRuntimeFile,
} from "@/lib/scenarios/machine-learning-runtime";

function deps(overrides: Partial<MachineLearningRuntimeDependencies> = {}) {
  const preparedFiles: MachineLearningRuntimeFile[][] = [];
  const cleanedUp: string[] = [];
  const dependencies: MachineLearningRuntimeDependencies = {
    resolvePython: vi.fn(async () => "python"),
    prepareWorkspace: vi.fn(async (files) => {
      preparedFiles.push([...files]);
      return { root: "/tmp/fake-ml-workspace" };
    }),
    runProcess: vi.fn(async () => ({ exitCode: 0, stdout: "ok\n", stderr: "", durationMs: 5, timedOut: false })),
    cleanupWorkspace: vi.fn(async (dirs) => {
      cleanedUp.push(dirs.root);
    }),
    ...overrides,
  };
  return { dependencies, preparedFiles, cleanedUp };
}

describe("runMachineLearningCommand (pure orchestration, fake deps)", () => {
  it("runs `python main.py` by default and cleans up the workspace", async () => {
    const { dependencies, preparedFiles, cleanedUp } = deps();
    const result = await runMachineLearningCommand(
      { scenarioSlug: "ml-fixture", workspaceFiles: { "main.py": "print('hi')" } },
      dependencies,
    );
    expect(result.ok).toBe(true);
    expect(result.command).toBe("run-main");
    expect(dependencies.runProcess).toHaveBeenCalledWith(
      expect.objectContaining({ args: ["main.py"], timeoutMs: DEFAULT_RUN_MAIN_TIMEOUT_MS }),
    );
    expect(preparedFiles[0]).toEqual([{ path: "main.py", content: "print('hi')" }]);
    expect(cleanedUp).toEqual(["/tmp/fake-ml-workspace"]);
  });

  it("does not expose authored test files to a run-main command", async () => {
    const { dependencies, preparedFiles } = deps();
    await runMachineLearningCommand(
      {
        scenarioSlug: "ml-fixture",
        workspaceFiles: { "main.py": "print('hi')" },
        testFileContents: { "tests/step-1.test.py": "def test_x():\n    assert True\n" },
      },
      dependencies,
    );
    expect(preparedFiles[0]!.some((f) => f.path.startsWith("tests/"))).toBe(false);
  });

  it("copies only the selected authored test files for a pytest command", async () => {
    const { dependencies, preparedFiles } = deps();
    await runMachineLearningCommand(
      {
        scenarioSlug: "ml-fixture",
        workspaceFiles: { "main.py": "print('hi')" },
        command: "pytest",
        testFileContents: {
          "tests/step-1.test.py": "def test_a():\n    assert True\n",
          "tests/step-2.test.py": "def test_b():\n    assert True\n",
        },
        testFiles: ["tests/step-1.test.py"],
      },
      dependencies,
    );
    const paths = preparedFiles[0]!.map((f) => f.path);
    expect(paths).toContain("tests/step-1.test.py");
    expect(paths).not.toContain("tests/step-2.test.py");
  });

  it("builds a `python -m pytest` command over the selected test paths", async () => {
    const { dependencies } = deps();
    await runMachineLearningCommand(
      {
        scenarioSlug: "ml-fixture",
        workspaceFiles: { "main.py": "" },
        command: "pytest",
        testFileContents: { "tests/step-1.test.py": "def test_a():\n    assert True\n" },
      },
      dependencies,
    );
    expect(dependencies.runProcess).toHaveBeenCalledWith(
      expect.objectContaining({
        args: ["-m", "pytest", "-q", "--import-mode=importlib", "tests/step-1.test.py"],
        timeoutMs: DEFAULT_PYTEST_STEP_TIMEOUT_MS,
      }),
    );
  });

  it("rejects a pytest command with no test files selected", async () => {
    const { dependencies } = deps();
    await expect(
      runMachineLearningCommand({ scenarioSlug: "ml-fixture", workspaceFiles: {}, command: "pytest" }, dependencies),
    ).rejects.toThrow(MachineLearningRuntimeError);
  });

  it("marks the result ok: false on a non-zero exit code", async () => {
    const { dependencies } = deps({
      runProcess: vi.fn(async () => ({ exitCode: 1, stdout: "", stderr: "boom", durationMs: 3, timedOut: false })),
    });
    const result = await runMachineLearningCommand(
      { scenarioSlug: "ml-fixture", workspaceFiles: { "main.py": "" } },
      dependencies,
    );
    expect(result.ok).toBe(false);
    expect(result.exitCode).toBe(1);
  });

  it("marks the result ok: false and timedOut: true when the process times out", async () => {
    const { dependencies } = deps({
      runProcess: vi.fn(async () => ({ exitCode: null, stdout: "", stderr: "", durationMs: 15000, timedOut: true })),
    });
    const result = await runMachineLearningCommand(
      { scenarioSlug: "ml-fixture", workspaceFiles: { "main.py": "" } },
      dependencies,
    );
    expect(result.ok).toBe(false);
    expect(result.timedOut).toBe(true);
  });

  it("cleans up the workspace even when the process run fails", async () => {
    const { dependencies, cleanedUp } = deps({
      runProcess: vi.fn(async () => {
        throw new Error("spawn failed");
      }),
    });
    await expect(
      runMachineLearningCommand({ scenarioSlug: "ml-fixture", workspaceFiles: { "main.py": "" } }, dependencies),
    ).rejects.toThrow("spawn failed");
    expect(cleanedUp).toEqual(["/tmp/fake-ml-workspace"]);
  });

  it("passes deterministic environment overrides (fixed hash seed, no .pyc writes) to every spawned process", async () => {
    const { dependencies } = deps();
    await runMachineLearningCommand({ scenarioSlug: "ml-fixture", workspaceFiles: { "main.py": "" } }, dependencies);
    expect(dependencies.runProcess).toHaveBeenCalledWith(expect.objectContaining({ env: ML_DETERMINISTIC_ENV }));
    expect(ML_DETERMINISTIC_ENV.PYTHONHASHSEED).toBe("0");
  });

  it("redacts the disposable temp workspace's absolute host path out of stdout/stderr", async () => {
    const { dependencies } = deps({
      runProcess: vi.fn(async () => ({
        exitCode: 1,
        stdout: 'File "/tmp/fake-ml-workspace/main.py", line 3, in <module>\n',
        stderr: "Traceback in /tmp/fake-ml-workspace/main.py near main.py\n",
        durationMs: 5,
        timedOut: false,
      })),
    });
    const result = await runMachineLearningCommand(
      { scenarioSlug: "ml-fixture", workspaceFiles: { "main.py": "" } },
      dependencies,
    );
    expect(result.stdout).not.toContain("/tmp/fake-ml-workspace");
    expect(result.stderr).not.toContain("/tmp/fake-ml-workspace");
    expect(result.stdout).toContain("<workspace>/main.py");
  });
});

describe("redactWorkspacePath", () => {
  it("replaces every occurrence of the workspace root using backslash separators", () => {
    const text = 'File "C:\\tmp\\ws1\\main.py", line 3 (also mentioned again: C:\\tmp\\ws1\\main.py)';
    const redacted = redactWorkspacePath(text, "C:\\tmp\\ws1");
    expect(redacted).not.toContain("C:\\tmp\\ws1");
    expect(redacted).toBe('File "<workspace>\\main.py", line 3 (also mentioned again: <workspace>\\main.py)');
  });

  it("replaces every occurrence of the workspace root using forward-slash separators", () => {
    const text = 'File "/tmp/ws1/main.py", line 3';
    const redacted = redactWorkspacePath(text, "/tmp/ws1");
    expect(redacted).not.toContain("/tmp/ws1");
    expect(redacted).toBe('File "<workspace>/main.py", line 3');
  });

  it("leaves text with no workspace-path occurrences unchanged", () => {
    expect(redactWorkspacePath("nothing to redact here", "/tmp/ws1")).toBe("nothing to redact here");
  });

  it("is a no-op on empty text", () => {
    expect(redactWorkspacePath("", "/tmp/ws1")).toBe("");
  });
});
