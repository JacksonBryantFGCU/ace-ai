import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/scenarios/sandbox/container-sandbox-executor", () => ({
  createContainerSandboxExecutor: vi.fn(() => ({ kind: "container", label: "container", execute: vi.fn() })),
}));
vi.mock("@/server/scenarios/sandbox/local-trusted-executor", () => ({
  createLocalTrustedExecutor: vi.fn(() => ({ kind: "local-trusted", label: "local-trusted", execute: vi.fn() })),
}));

async function importFresh() {
  vi.resetModules();
  return import("@/server/scenarios/sandbox/execution-mode");
}

const ORIGINAL_ENV = process.env.ACE_EXECUTION_MODE;

describe("execution-mode", () => {
  beforeEach(() => {
    delete process.env.ACE_EXECUTION_MODE;
  });
  afterEach(() => {
    if (ORIGINAL_ENV === undefined) delete process.env.ACE_EXECUTION_MODE;
    else process.env.ACE_EXECUTION_MODE = ORIGINAL_ENV;
    vi.restoreAllMocks();
  });

  it("resolves to the container executor when ACE_EXECUTION_MODE is unset", async () => {
    const { resolveSandboxExecutor } = await importFresh();
    expect(resolveSandboxExecutor().kind).toBe("container");
  });

  it("resolves to the container executor for any value other than the exact opt-in string", async () => {
    process.env.ACE_EXECUTION_MODE = "local-trusted "; // trailing space — not an exact match
    const { resolveSandboxExecutor } = await importFresh();
    expect(resolveSandboxExecutor().kind).toBe("container");
  });

  it("resolves to the local-trusted executor only on an exact ACE_EXECUTION_MODE=local-trusted", async () => {
    process.env.ACE_EXECUTION_MODE = "local-trusted";
    const { resolveSandboxExecutor } = await importFresh();
    expect(resolveSandboxExecutor().kind).toBe("local-trusted");
  });

  it("isLocalTrustedModeEnabled reflects the exact env value", async () => {
    const { isLocalTrustedModeEnabled } = await importFresh();
    expect(isLocalTrustedModeEnabled({ NODE_ENV: "test", ACE_EXECUTION_MODE: "local-trusted" })).toBe(true);
    expect(isLocalTrustedModeEnabled({ NODE_ENV: "test", ACE_EXECUTION_MODE: "LOCAL-TRUSTED" })).toBe(false);
    expect(isLocalTrustedModeEnabled({ NODE_ENV: "test" })).toBe(false);
  });

  it("memoizes the resolved executor across calls until reset", async () => {
    const { resolveSandboxExecutor, resetSandboxExecutorCache } = await importFresh();
    const first = resolveSandboxExecutor();
    process.env.ACE_EXECUTION_MODE = "local-trusted"; // changing env mid-process must NOT switch modes
    const second = resolveSandboxExecutor();
    expect(second).toBe(first);
    expect(second.kind).toBe("container");

    resetSandboxExecutorCache();
    const third = resolveSandboxExecutor();
    expect(third.kind).toBe("local-trusted");
  });
});
