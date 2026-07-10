import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";

const spawnMock = vi.fn();

vi.mock("node:child_process", () => ({
  spawn: (...args: unknown[]) => spawnMock(...args),
}));

class FakeChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
}

function queueDockerCall(outcome: { exitCode?: number; stdout?: string; stderr?: string; spawnThrows?: boolean }) {
  spawnMock.mockImplementationOnce(() => {
    if (outcome.spawnThrows) throw new Error("spawn ENOENT");
    const child = new FakeChildProcess();
    queueMicrotask(() => {
      if (outcome.stdout) child.stdout.emit("data", Buffer.from(outcome.stdout));
      if (outcome.stderr) child.stderr.emit("data", Buffer.from(outcome.stderr));
      child.emit("close", outcome.exitCode ?? 0);
    });
    return child;
  });
}

async function importFresh() {
  vi.resetModules();
  return import("@/server/scenarios/sandbox/cleanup");
}

describe("cleanupOrphanedSandboxContainers", () => {
  beforeEach(() => {
    spawnMock.mockReset();
  });

  it("is a no-op when no labeled containers exist", async () => {
    const { cleanupOrphanedSandboxContainers } = await importFresh();
    queueDockerCall({ exitCode: 0, stdout: "" });
    const result = await cleanupOrphanedSandboxContainers();
    expect(result).toEqual({ ok: true, removed: [] });
    expect(spawnMock).toHaveBeenCalledTimes(1); // only the list call, no remove call
  });

  it("lists only label-scoped containers, then force-removes exactly those", async () => {
    const { cleanupOrphanedSandboxContainers } = await importFresh();
    queueDockerCall({ exitCode: 0, stdout: "abc123\ndef456\n" });
    queueDockerCall({ exitCode: 0, stdout: "abc123\ndef456\n" });

    const result = await cleanupOrphanedSandboxContainers();
    expect(result.ok).toBe(true);
    expect(result.removed).toEqual(["abc123", "def456"]);

    const [, listArgs] = spawnMock.mock.calls[0]! as [string, string[]];
    expect(listArgs.join(" ")).toContain("label=ace.ai.sandbox=true");
    const [, removeArgs] = spawnMock.mock.calls[1]! as [string, string[]];
    expect(removeArgs).toEqual(expect.arrayContaining(["rm", "-f", "abc123", "def456"]));
  });

  it("returns ok:false with a message when docker is unavailable, never throws", async () => {
    const { cleanupOrphanedSandboxContainers } = await importFresh();
    queueDockerCall({ exitCode: 1, stderr: "Cannot connect to the Docker daemon" });
    const result = await cleanupOrphanedSandboxContainers();
    expect(result.ok).toBe(false);
    expect(result.removed).toEqual([]);
    expect(result.message).toBeTruthy();
  });

  it("never throws even when spawn itself fails", async () => {
    const { cleanupOrphanedSandboxContainers } = await importFresh();
    queueDockerCall({ spawnThrows: true });
    await expect(cleanupOrphanedSandboxContainers()).resolves.toBeDefined();
  });
});
