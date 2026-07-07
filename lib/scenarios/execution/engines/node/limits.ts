/**
 * Configurable resource limits for the Node engine. Kept intentionally small for
 * v1: the timeouts + module cap are enforced today; the memory/recursion knobs
 * are declared extension points for the future worker/vm sandbox (see
 * docs/README.md) and are NOT
 * enforced yet — they exist so enabling them later needs no interface change.
 */
export interface NodeEngineLimits {
  /** Wall-clock budget for a single test (ms). Guards slow/hanging tests. */
  testTimeoutMs: number;
  /** Wall-clock budget for the whole run across all tests (ms). */
  totalTimeoutMs: number;
  /** Max distinct modules that may be linked in one run (guards import blow-ups). */
  maxModules: number;
  /** Reserved for the future sandbox — not enforced in v1. */
  maxMemoryMb?: number;
  /** Reserved for the future sandbox — not enforced in v1. */
  maxRecursionDepth?: number;
}

export const DEFAULT_NODE_LIMITS: NodeEngineLimits = {
  testTimeoutMs: 5_000,
  totalTimeoutMs: 15_000,
  maxModules: 100,
};

export function resolveLimits(overrides?: Partial<NodeEngineLimits>): NodeEngineLimits {
  return { ...DEFAULT_NODE_LIMITS, ...overrides };
}
