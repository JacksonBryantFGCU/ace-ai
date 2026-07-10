import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const spawnMock = vi.fn();

vi.mock("node:child_process", () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
}));

class FakeChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  killed = false;
  exitCode: number | null = null;
  signalCode: string | null = null;
  kill(signal?: string) {
    this.killed = true;
    this.signalCode = signal ?? "SIGTERM";
    return true;
  }
}

/** Queue one fake `docker` invocation's outcome. Each call to `spawn()`
 *  consumes the next queued outcome, in order. */
function queueDockerCall(outcome: { exitCode?: number; stdout?: string; stderr?: string; hang?: boolean; spawnThrows?: boolean }) {
  spawnMock.mockImplementationOnce(() => {
    if (outcome.spawnThrows) {
      throw new Error("spawn ENOENT");
    }
    const child = new FakeChildProcess();
    if (!outcome.hang) {
      queueMicrotask(() => {
        if (outcome.stdout) child.stdout.emit("data", Buffer.from(outcome.stdout));
        if (outcome.stderr) child.stderr.emit("data", Buffer.from(outcome.stderr));
        child.exitCode = outcome.exitCode ?? 0;
        child.emit("close", outcome.exitCode ?? 0);
      });
    }
    return child;
  });
}

async function importFresh() {
  vi.resetModules();
  return import("@/server/scenarios/sandbox/container-sandbox-executor");
}

describe("createContainerSandboxExecutor", () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rejects an invalid request before ever spawning docker", async () => {
    const { createContainerSandboxExecutor } = await importFresh();
    const executor = createContainerSandboxExecutor();
    const result = await executor.execute({
      workspacePath: "relative/not/absolute",
      command: [],
      timeoutMs: 1_000,
    });
    expect(result.status).toBe("sandbox-error");
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it("returns sandbox-unavailable when the docker daemon is unreachable", async () => {
    const { createContainerSandboxExecutor } = await importFresh();
    queueDockerCall({ exitCode: 1, stderr: "Cannot connect to the Docker daemon at unix:///var/run/docker.sock" });
    const executor = createContainerSandboxExecutor();
    const result = await executor.execute({
      workspacePath: "/tmp/ws",
      command: ["python", "main.py"],
      timeoutMs: 1_000,
    });
    expect(result.status).toBe("sandbox-unavailable");
    expect(result.message).toBeTruthy();
    expect(result.message).not.toMatch(/at .*container-sandbox-executor/); // no raw stack trace
  });

  it("returns sandbox-unavailable when the pinned image is missing locally (never pulls automatically)", async () => {
    const { createContainerSandboxExecutor } = await importFresh();
    queueDockerCall({ exitCode: 0, stdout: "27.1.1" }); // docker info ok
    queueDockerCall({ exitCode: 1, stderr: "No such image" }); // image inspect fails
    const executor = createContainerSandboxExecutor();
    const result = await executor.execute({
      workspacePath: "/tmp/ws",
      command: ["python", "main.py"],
      timeoutMs: 1_000,
    });
    expect(result.status).toBe("sandbox-unavailable");
    expect(result.message).toMatch(/sandbox:build/);
    // Only 2 docker calls: info + image inspect — never a 3rd "pull".
    expect(spawnMock).toHaveBeenCalledTimes(2);
  });

  it("builds a docker run invocation with the required security flags and no shell", async () => {
    const { createContainerSandboxExecutor } = await importFresh();
    queueDockerCall({ exitCode: 0, stdout: "27.1.1" }); // info
    queueDockerCall({ exitCode: 0, stdout: "sha256:abc" }); // image inspect
    queueDockerCall({ exitCode: 0, stdout: "ok" }); // run

    const executor = createContainerSandboxExecutor();
    await executor.execute({
      workspacePath: "/tmp/some-isolated-workspace",
      command: ["python", "main.py"],
      timeoutMs: 5_000,
    });

    const runCall = spawnMock.mock.calls[2]!;
    const [bin, args] = runCall as [string, string[]];
    expect(bin).toBe("docker");
    expect(Array.isArray(args)).toBe(true); // argv array, never a shell string
    expect(args).toContain("--network");
    expect(args).toContain("none");
    expect(args).toContain("--read-only");
    expect(args).toContain("--cap-drop");
    expect(args).toContain("ALL");
    expect(args).toContain("no-new-privileges");
    expect(args).toContain("--user");
    expect(args).toContain("10001:10001");
    expect(args.join(" ")).toContain("/tmp/some-isolated-workspace:/workspace:rw");
    expect(args.join(" ")).not.toContain(process.cwd()); // never mounts the repo root
    expect(args).toContain("OPENBLAS_NUM_THREADS=1");
    expect(args).toContain("OMP_NUM_THREADS=1");
  });

  it("omits --network none when networkAccess is explicitly true", async () => {
    const { createContainerSandboxExecutor } = await importFresh();
    queueDockerCall({ exitCode: 0, stdout: "27.1.1" });
    queueDockerCall({ exitCode: 0, stdout: "sha256:abc" });
    queueDockerCall({ exitCode: 0, stdout: "ok" });

    const executor = createContainerSandboxExecutor();
    await executor.execute({
      workspacePath: "/tmp/ws",
      command: ["python", "main.py"],
      timeoutMs: 5_000,
      networkAccess: true,
    });

    const [, args] = spawnMock.mock.calls[2]! as [string, string[]];
    const networkIndex = args.indexOf("--network");
    expect(networkIndex === -1 || args[networkIndex + 1] !== "none").toBe(true);
  });

  it("maps a non-zero exit code from a real pytest failure to status: failed (not sandbox-error)", async () => {
    const { createContainerSandboxExecutor } = await importFresh();
    queueDockerCall({ exitCode: 0, stdout: "27.1.1" });
    queueDockerCall({ exitCode: 0, stdout: "sha256:abc" });
    queueDockerCall({ exitCode: 1, stdout: "1 failed", stderr: "AssertionError" });

    const executor = createContainerSandboxExecutor();
    const result = await executor.execute({
      workspacePath: "/tmp/ws",
      command: ["python", "-m", "pytest"],
      timeoutMs: 5_000,
    });
    expect(result.status).toBe("failed");
    expect(result.exitCode).toBe(1);
  });

  it("truncates stdout/stderr beyond maxOutputChars", async () => {
    const { createContainerSandboxExecutor } = await importFresh();
    queueDockerCall({ exitCode: 0, stdout: "27.1.1" });
    queueDockerCall({ exitCode: 0, stdout: "sha256:abc" });
    queueDockerCall({ exitCode: 0, stdout: "x".repeat(5_000) });

    const executor = createContainerSandboxExecutor();
    const result = await executor.execute({
      workspacePath: "/tmp/ws",
      command: ["python", "main.py"],
      timeoutMs: 5_000,
      maxOutputChars: 100, // clamped up to the 1,000-char minimum bound
    });
    expect(result.stdout.length).toBeLessThan(1_100);
    expect(result.stdout).toContain("truncated");
  });

  it("returns sandbox-error when spawning docker itself fails", async () => {
    const { createContainerSandboxExecutor } = await importFresh();
    queueDockerCall({ exitCode: 0, stdout: "27.1.1" });
    queueDockerCall({ exitCode: 0, stdout: "sha256:abc" });
    queueDockerCall({ spawnThrows: true });

    const executor = createContainerSandboxExecutor();
    const result = await executor.execute({
      workspacePath: "/tmp/ws",
      command: ["python", "main.py"],
      timeoutMs: 5_000,
    });
    expect(result.status).toBe("sandbox-error");
  });

  it("resetSandboxAvailabilityCache() forces a fresh docker info/image inspect probe", async () => {
    const { createContainerSandboxExecutor, resetSandboxAvailabilityCache } = await importFresh();
    queueDockerCall({ exitCode: 0, stdout: "27.1.1" });
    queueDockerCall({ exitCode: 0, stdout: "sha256:abc" });
    queueDockerCall({ exitCode: 0, stdout: "ok" });

    const executor = createContainerSandboxExecutor();
    await executor.execute({ workspacePath: "/tmp/ws", command: ["python", "main.py"], timeoutMs: 5_000 });
    expect(spawnMock).toHaveBeenCalledTimes(3);

    resetSandboxAvailabilityCache();

    queueDockerCall({ exitCode: 0, stdout: "27.1.1" });
    queueDockerCall({ exitCode: 0, stdout: "sha256:abc" });
    queueDockerCall({ exitCode: 0, stdout: "ok" });
    await executor.execute({ workspacePath: "/tmp/ws", command: ["python", "main.py"], timeoutMs: 5_000 });
    // Probed again (2 more calls) instead of reusing the memoized success.
    expect(spawnMock).toHaveBeenCalledTimes(6);
  });

  it("does NOT re-probe docker on a second execution within the same process (memoized)", async () => {
    const { createContainerSandboxExecutor } = await importFresh();
    queueDockerCall({ exitCode: 0, stdout: "27.1.1" });
    queueDockerCall({ exitCode: 0, stdout: "sha256:abc" });
    queueDockerCall({ exitCode: 0, stdout: "ok" });
    queueDockerCall({ exitCode: 0, stdout: "ok" }); // second run's docker run only

    const executor = createContainerSandboxExecutor();
    await executor.execute({ workspacePath: "/tmp/ws", command: ["python", "main.py"], timeoutMs: 5_000 });
    await executor.execute({ workspacePath: "/tmp/ws", command: ["python", "main.py"], timeoutMs: 5_000 });
    // 2 (info+inspect) + 1 (run) + 1 (run) = 4, not 6.
    expect(spawnMock).toHaveBeenCalledTimes(4);
  });
});
