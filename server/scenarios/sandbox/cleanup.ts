import { spawn } from "node:child_process";
import { SANDBOX_CONTAINER_LABEL } from "@/server/scenarios/sandbox/container-sandbox-executor";

/**
 * Startup/maintenance cleanup for orphaned ACE.AI sandbox containers — e.g.
 * left behind by a killed Node process (`--rm` only removes a container
 * when the Docker client that started it observes it exit; a hard process
 * kill can orphan the container itself). Selects ONLY containers carrying
 * `SANDBOX_CONTAINER_LABEL` (`ace.ai.sandbox=true`) — never touches any
 * other container on the host, ACE.AI-owned or not.
 *
 * Safe to call with no containers running (a no-op) and safe to call
 * repeatedly. Never throws — a cleanup failure is logged/returned, not
 * fatal to whatever triggered it.
 */

function dockerBinary(): string {
  return process.env.ACE_DOCKER_BIN?.trim() || "docker";
}

function runDocker(args: string[]): Promise<{ exitCode: number | null; stdout: string; stderr: string }> {
  return new Promise((resolvePromise) => {
    let stdout = "";
    let stderr = "";
    let child;
    try {
      child = spawn(dockerBinary(), args, { windowsHide: true });
    } catch (error) {
      resolvePromise({ exitCode: null, stdout: "", stderr: error instanceof Error ? error.message : String(error) });
      return;
    }
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.once("error", (error) => {
      resolvePromise({ exitCode: null, stdout, stderr: stderr + (error instanceof Error ? error.message : String(error)) });
    });
    child.once("close", (code) => resolvePromise({ exitCode: code, stdout, stderr }));
  });
}

export interface OrphanCleanupResult {
  ok: boolean;
  removed: string[];
  message?: string;
}

/**
 * List every container (running or stopped) labeled as an ACE.AI sandbox
 * container and force-remove it. Intended for process startup / a periodic
 * maintenance task — NOT called per-execution (each execution already
 * cleans up its own container via `--rm` + an explicit `docker kill` on
 * timeout).
 */
export async function cleanupOrphanedSandboxContainers(): Promise<OrphanCleanupResult> {
  const list = await runDocker(["ps", "-a", "--filter", `label=${SANDBOX_CONTAINER_LABEL}`, "--format", "{{.ID}}"]);
  if (list.exitCode !== 0) {
    return { ok: false, removed: [], message: "Could not list sandbox containers (Docker unavailable)." };
  }

  const ids = list.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (ids.length === 0) return { ok: true, removed: [] };

  const remove = await runDocker(["rm", "-f", ...ids]);
  const removed = remove.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return { ok: remove.exitCode === 0, removed, message: remove.exitCode === 0 ? undefined : remove.stderr };
}
