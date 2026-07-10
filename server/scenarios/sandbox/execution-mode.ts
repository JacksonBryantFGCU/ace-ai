import { createContainerSandboxExecutor } from "@/server/scenarios/sandbox/container-sandbox-executor";
import { createLocalTrustedExecutor } from "@/server/scenarios/sandbox/local-trusted-executor";
import type { SandboxExecutor } from "@/lib/scenarios/execution/sandbox/sandbox-executor";

/**
 * The SINGLE place that decides which `SandboxExecutor` handles candidate
 * ML code. Every other module (preview, verification, authoring) calls
 * `resolveSandboxExecutor()` — none of them branch on env vars themselves.
 *
 * Default (no env var, or anything other than the exact opt-in value below):
 * the real container sandbox. The insecure local-trusted path requires an
 * EXACT, explicit `ACE_EXECUTION_MODE=local-trusted` — there is no fuzzy
 * matching, no "falls back if Docker looks unavailable" behavior. If Docker
 * genuinely isn't installed, the container executor's `execute()` returns a
 * structured `sandbox-unavailable` result with an actionable message
 * instead of silently downgrading to host execution.
 */
export const LOCAL_TRUSTED_MODE_VALUE = "local-trusted";
const EXECUTION_MODE_ENV_VAR = "ACE_EXECUTION_MODE";

export function isLocalTrustedModeEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[EXECUTION_MODE_ENV_VAR] === LOCAL_TRUSTED_MODE_VALUE;
}

let cached: SandboxExecutor | null = null;

/** Memoized — constructing an executor is cheap and stateless, but every
 *  caller should observe the SAME executor instance/mode for one process
 *  lifetime (avoids a mid-run env var change silently switching modes). */
export function resolveSandboxExecutor(): SandboxExecutor {
  cached ??= isLocalTrustedModeEnabled() ? createLocalTrustedExecutor() : createContainerSandboxExecutor();
  return cached;
}

/** Test-only: clear the memoized executor so tests can exercise both modes
 *  within one process. */
export function resetSandboxExecutorCache(): void {
  cached = null;
}
