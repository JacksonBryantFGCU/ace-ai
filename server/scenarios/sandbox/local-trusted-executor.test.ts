import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const resolvePythonCommandMock = vi.fn();
const runProcessWithTimeoutMock = vi.fn();

vi.mock("@/server/scenarios/python-runtime", () => ({
  resolvePythonCommand: () => resolvePythonCommandMock(),
  runProcessWithTimeout: (spec: unknown) => runProcessWithTimeoutMock(spec),
}));

import { createLocalTrustedExecutor } from "@/server/scenarios/sandbox/local-trusted-executor";

describe("createLocalTrustedExecutor", () => {
  beforeEach(() => {
    resolvePythonCommandMock.mockReset();
    runProcessWithTimeoutMock.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reports itself as kind local-trusted with a dev-only label", () => {
    const executor = createLocalTrustedExecutor();
    expect(executor.kind).toBe("local-trusted");
    expect(executor.label).toMatch(/local-trusted/i);
    expect(executor.label).toMatch(/not sandboxed|dev only/i);
  });

  it("rejects an invalid request before resolving python", async () => {
    const executor = createLocalTrustedExecutor();
    const result = await executor.execute({ workspacePath: "not-absolute", command: [], timeoutMs: 1_000 });
    expect(result.status).toBe("sandbox-error");
    expect(resolvePythonCommandMock).not.toHaveBeenCalled();
  });

  it("returns sandbox-unavailable when no host python can be resolved", async () => {
    resolvePythonCommandMock.mockRejectedValue(new Error("no python found on PATH"));
    const executor = createLocalTrustedExecutor();
    const result = await executor.execute({ workspacePath: "/tmp/ws", command: ["python", "main.py"], timeoutMs: 1_000 });
    expect(result.status).toBe("sandbox-unavailable");
    expect(result.message).toContain("no python found");
  });

  it("substitutes the resolved host python executable for the logical command[0]", async () => {
    resolvePythonCommandMock.mockResolvedValue("/usr/bin/python3.11");
    runProcessWithTimeoutMock.mockResolvedValue({ exitCode: 0, stdout: "ok", stderr: "", durationMs: 5, timedOut: false });
    const executor = createLocalTrustedExecutor();
    await executor.execute({ workspacePath: "/tmp/ws", command: ["python", "main.py", "--flag"], timeoutMs: 1_000 });
    expect(runProcessWithTimeoutMock).toHaveBeenCalledWith(
      expect.objectContaining({ command: "/usr/bin/python3.11", args: ["main.py", "--flag"], cwd: "/tmp/ws" }),
    );
  });

  it("maps a successful run to status completed", async () => {
    resolvePythonCommandMock.mockResolvedValue("python");
    runProcessWithTimeoutMock.mockResolvedValue({ exitCode: 0, stdout: "ok", stderr: "", durationMs: 5, timedOut: false });
    const executor = createLocalTrustedExecutor();
    const result = await executor.execute({ workspacePath: "/tmp/ws", command: ["python", "main.py"], timeoutMs: 1_000 });
    expect(result.status).toBe("completed");
  });

  it("maps a non-zero exit to status failed", async () => {
    resolvePythonCommandMock.mockResolvedValue("python");
    runProcessWithTimeoutMock.mockResolvedValue({ exitCode: 1, stdout: "", stderr: "boom", durationMs: 5, timedOut: false });
    const executor = createLocalTrustedExecutor();
    const result = await executor.execute({ workspacePath: "/tmp/ws", command: ["python", "main.py"], timeoutMs: 1_000 });
    expect(result.status).toBe("failed");
    expect(result.exitCode).toBe(1);
  });

  it("maps a timed-out run to status timeout", async () => {
    resolvePythonCommandMock.mockResolvedValue("python");
    runProcessWithTimeoutMock.mockResolvedValue({ exitCode: null, stdout: "", stderr: "", durationMs: 1_000, timedOut: true });
    const executor = createLocalTrustedExecutor();
    const result = await executor.execute({ workspacePath: "/tmp/ws", command: ["python", "main.py"], timeoutMs: 1_000 });
    expect(result.status).toBe("timeout");
  });
});
