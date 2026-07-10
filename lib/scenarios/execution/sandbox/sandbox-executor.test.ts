import { describe, expect, it } from "vitest";
import {
  resolveSandboxLimits,
  validateSandboxRequest,
  SANDBOX_DEFAULT_TIMEOUT_MS,
  SANDBOX_MAX_TIMEOUT_MS,
  SANDBOX_DEFAULT_MEMORY_LIMIT_MB,
  SANDBOX_MAX_MEMORY_LIMIT_MB,
  SANDBOX_DEFAULT_CPU_LIMIT,
  SANDBOX_MAX_CPU_LIMIT,
  SANDBOX_DEFAULT_MAX_PROCESSES,
  SANDBOX_MAX_MAX_PROCESSES,
  SANDBOX_DEFAULT_MAX_OUTPUT_CHARS,
  SANDBOX_MAX_MAX_OUTPUT_CHARS,
  type SandboxExecutionRequest,
} from "@/lib/scenarios/execution/sandbox/sandbox-executor";

function baseRequest(overrides: Partial<SandboxExecutionRequest> = {}): SandboxExecutionRequest {
  return {
    workspacePath: "/tmp/some-workspace",
    command: ["python", "main.py"],
    timeoutMs: 10_000,
    ...overrides,
  };
}

describe("resolveSandboxLimits", () => {
  it("uses defaults when optional fields are omitted", () => {
    const limits = resolveSandboxLimits(baseRequest({ timeoutMs: 10_000 }));
    expect(limits.memoryLimitMb).toBe(SANDBOX_DEFAULT_MEMORY_LIMIT_MB);
    expect(limits.cpuLimit).toBe(SANDBOX_DEFAULT_CPU_LIMIT);
    expect(limits.maxProcesses).toBe(SANDBOX_DEFAULT_MAX_PROCESSES);
    expect(limits.maxOutputChars).toBe(SANDBOX_DEFAULT_MAX_OUTPUT_CHARS);
    expect(limits.networkAccess).toBe(false);
  });

  it("defaults timeoutMs when falsy (0)", () => {
    const limits = resolveSandboxLimits(baseRequest({ timeoutMs: 0 }));
    expect(limits.timeoutMs).toBe(SANDBOX_DEFAULT_TIMEOUT_MS);
  });

  it("clamps timeoutMs below the minimum (1_000ms)", () => {
    const limits = resolveSandboxLimits(baseRequest({ timeoutMs: 1 }));
    expect(limits.timeoutMs).toBe(1_000);
  });

  it("passes through a valid timeoutMs unchanged", () => {
    const limits = resolveSandboxLimits(baseRequest({ timeoutMs: 30_000 }));
    expect(limits.timeoutMs).toBe(30_000);
  });

  it("clamps timeoutMs at the maximum boundary", () => {
    const limits = resolveSandboxLimits(baseRequest({ timeoutMs: SANDBOX_MAX_TIMEOUT_MS }));
    expect(limits.timeoutMs).toBe(SANDBOX_MAX_TIMEOUT_MS);
  });

  it("clamps timeoutMs above the maximum", () => {
    const limits = resolveSandboxLimits(baseRequest({ timeoutMs: SANDBOX_MAX_TIMEOUT_MS + 50_000 }));
    expect(limits.timeoutMs).toBe(SANDBOX_MAX_TIMEOUT_MS);
  });

  it("clamps memoryLimitMb below the minimum (128)", () => {
    const limits = resolveSandboxLimits(baseRequest({ memoryLimitMb: 1 }));
    expect(limits.memoryLimitMb).toBe(128);
  });

  it("passes through a valid memoryLimitMb unchanged", () => {
    const limits = resolveSandboxLimits(baseRequest({ memoryLimitMb: 1_024 }));
    expect(limits.memoryLimitMb).toBe(1_024);
  });

  it("clamps memoryLimitMb at the maximum boundary", () => {
    const limits = resolveSandboxLimits(baseRequest({ memoryLimitMb: SANDBOX_MAX_MEMORY_LIMIT_MB }));
    expect(limits.memoryLimitMb).toBe(SANDBOX_MAX_MEMORY_LIMIT_MB);
  });

  it("clamps memoryLimitMb above the maximum", () => {
    const limits = resolveSandboxLimits(baseRequest({ memoryLimitMb: SANDBOX_MAX_MEMORY_LIMIT_MB + 5_000 }));
    expect(limits.memoryLimitMb).toBe(SANDBOX_MAX_MEMORY_LIMIT_MB);
  });

  it("clamps cpuLimit below the minimum (0.25)", () => {
    const limits = resolveSandboxLimits(baseRequest({ cpuLimit: 0.01 }));
    expect(limits.cpuLimit).toBe(0.25);
  });

  it("passes through a valid cpuLimit unchanged", () => {
    const limits = resolveSandboxLimits(baseRequest({ cpuLimit: 1.5 }));
    expect(limits.cpuLimit).toBe(1.5);
  });

  it("clamps cpuLimit at the maximum boundary", () => {
    const limits = resolveSandboxLimits(baseRequest({ cpuLimit: SANDBOX_MAX_CPU_LIMIT }));
    expect(limits.cpuLimit).toBe(SANDBOX_MAX_CPU_LIMIT);
  });

  it("clamps cpuLimit above the maximum", () => {
    const limits = resolveSandboxLimits(baseRequest({ cpuLimit: 10 }));
    expect(limits.cpuLimit).toBe(SANDBOX_MAX_CPU_LIMIT);
  });

  it("clamps maxProcesses below the minimum (8)", () => {
    const limits = resolveSandboxLimits(baseRequest({ maxProcesses: 1 }));
    expect(limits.maxProcesses).toBe(8);
  });

  it("passes through a valid maxProcesses unchanged", () => {
    const limits = resolveSandboxLimits(baseRequest({ maxProcesses: 32 }));
    expect(limits.maxProcesses).toBe(32);
  });

  it("clamps maxProcesses at the maximum boundary", () => {
    const limits = resolveSandboxLimits(baseRequest({ maxProcesses: SANDBOX_MAX_MAX_PROCESSES }));
    expect(limits.maxProcesses).toBe(SANDBOX_MAX_MAX_PROCESSES);
  });

  it("clamps maxProcesses above the maximum", () => {
    const limits = resolveSandboxLimits(baseRequest({ maxProcesses: 10_000 }));
    expect(limits.maxProcesses).toBe(SANDBOX_MAX_MAX_PROCESSES);
  });

  it("clamps maxOutputChars below the minimum (1_000)", () => {
    const limits = resolveSandboxLimits(baseRequest({ maxOutputChars: 10 }));
    expect(limits.maxOutputChars).toBe(1_000);
  });

  it("passes through a valid maxOutputChars unchanged", () => {
    const limits = resolveSandboxLimits(baseRequest({ maxOutputChars: 50_000 }));
    expect(limits.maxOutputChars).toBe(50_000);
  });

  it("clamps maxOutputChars at the maximum boundary", () => {
    const limits = resolveSandboxLimits(baseRequest({ maxOutputChars: SANDBOX_MAX_MAX_OUTPUT_CHARS }));
    expect(limits.maxOutputChars).toBe(SANDBOX_MAX_MAX_OUTPUT_CHARS);
  });

  it("clamps maxOutputChars above the maximum", () => {
    const limits = resolveSandboxLimits(baseRequest({ maxOutputChars: 10_000_000 }));
    expect(limits.maxOutputChars).toBe(SANDBOX_MAX_MAX_OUTPUT_CHARS);
  });

  it("networkAccess defaults to false and only true when exactly true", () => {
    expect(resolveSandboxLimits(baseRequest({ networkAccess: undefined })).networkAccess).toBe(false);
    expect(resolveSandboxLimits(baseRequest({ networkAccess: false })).networkAccess).toBe(false);
    expect(resolveSandboxLimits(baseRequest({ networkAccess: true })).networkAccess).toBe(true);
  });
});

describe("validateSandboxRequest", () => {
  it("returns no errors for a valid request", () => {
    expect(validateSandboxRequest(baseRequest())).toEqual([]);
  });

  it("flags an empty workspacePath", () => {
    const errors = validateSandboxRequest(baseRequest({ workspacePath: "" }));
    expect(errors).toEqual([{ field: "workspacePath", message: expect.stringContaining("non-empty") }]);
  });

  it("flags a whitespace-only workspacePath", () => {
    const errors = validateSandboxRequest(baseRequest({ workspacePath: "   " }));
    expect(errors.some((e) => e.field === "workspacePath")).toBe(true);
  });

  it("flags a relative workspacePath", () => {
    const errors = validateSandboxRequest(baseRequest({ workspacePath: "relative/path" }));
    expect(errors).toEqual([{ field: "workspacePath", message: expect.stringContaining("absolute") }]);
  });

  it("accepts a POSIX absolute workspacePath", () => {
    expect(validateSandboxRequest(baseRequest({ workspacePath: "/abs/path" }))).toEqual([]);
  });

  it("accepts a Windows absolute workspacePath (backslash)", () => {
    expect(validateSandboxRequest(baseRequest({ workspacePath: "C:\\abs\\path" }))).toEqual([]);
  });

  it("accepts a Windows absolute workspacePath (forward slash)", () => {
    expect(validateSandboxRequest(baseRequest({ workspacePath: "C:/abs/path" }))).toEqual([]);
  });

  it("flags an empty command array", () => {
    const errors = validateSandboxRequest(baseRequest({ command: [] }));
    expect(errors).toEqual([{ field: "command", message: expect.stringContaining("non-empty argv") }]);
  });

  it("flags a non-array command", () => {
    const errors = validateSandboxRequest(baseRequest({ command: undefined as unknown as string[] }));
    expect(errors.some((e) => e.field === "command")).toBe(true);
  });

  it("flags non-string command args", () => {
    const errors = validateSandboxRequest(baseRequest({ command: ["python", 123 as unknown as string] }));
    expect(errors).toEqual([{ field: "command", message: expect.stringContaining("must be a string") }]);
  });

  it("flags timeoutMs of zero", () => {
    const errors = validateSandboxRequest(baseRequest({ timeoutMs: 0 }));
    expect(errors).toEqual([{ field: "timeoutMs", message: expect.stringContaining("positive") }]);
  });

  it("flags a negative timeoutMs", () => {
    const errors = validateSandboxRequest(baseRequest({ timeoutMs: -5 }));
    expect(errors.some((e) => e.field === "timeoutMs")).toBe(true);
  });

  it("flags a NaN timeoutMs", () => {
    const errors = validateSandboxRequest(baseRequest({ timeoutMs: NaN }));
    expect(errors.some((e) => e.field === "timeoutMs")).toBe(true);
  });

  it("flags an Infinity timeoutMs", () => {
    const errors = validateSandboxRequest(baseRequest({ timeoutMs: Infinity }));
    expect(errors.some((e) => e.field === "timeoutMs")).toBe(true);
  });

  it("returns every problem found, not just the first", () => {
    const errors = validateSandboxRequest({
      workspacePath: "",
      command: [],
      timeoutMs: -1,
    });
    expect(errors).toHaveLength(3);
    expect(errors.map((e) => e.field).sort()).toEqual(["command", "timeoutMs", "workspacePath"]);
  });
});
