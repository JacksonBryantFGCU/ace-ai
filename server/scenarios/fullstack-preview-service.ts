import { randomUUID } from "node:crypto";
import { FullstackRuntimeStartupError } from "@/lib/scenarios/fullstack-runtime";
import { startFullstackRuntime } from "@/server/scenarios/fullstack-runtime";
import { loadScenario } from "@/server/scenarios/load";
import type { FullstackRuntimeHandle } from "@/lib/scenarios/fullstack-runtime";
import type { FullstackPreviewInfo, FullstackPreviewResult } from "@/lib/scenarios/fullstack-preview";
import type { SnapshotFile } from "@/lib/scenarios/verification";

const previews = new Map<string, FullstackRuntimeHandle>();

function toInfo(runtimeId: string, handle: FullstackRuntimeHandle): FullstackPreviewInfo {
  return {
    mode: "fullstack",
    runtimeId,
    frontendUrl: handle.frontendUrl,
    backendUrl: handle.backendUrl,
    previewUrl: handle.previewUrl,
    frontendStatus: "healthy",
    backendStatus: "healthy",
    logs: handle.logs(),
  };
}

export async function startFullstackPreviewOnServer(input: {
  scenarioSlug: string;
  files: SnapshotFile[];
}): Promise<FullstackPreviewResult> {
  let handle: FullstackRuntimeHandle | null = null;
  try {
    const loaded = await loadScenario(input.scenarioSlug, { includeAuthorOnly: false });
    handle = await startFullstackRuntime(loaded, { files: input.files });
    const runtimeId = randomUUID();
    previews.set(runtimeId, handle);
    return { ok: true, preview: toInfo(runtimeId, handle) };
  } catch (error) {
    if (handle) await handle.stop();
    return {
      ok: false,
      error: {
        message: error instanceof Error ? error.message : "Fullstack preview failed to start.",
        stage: error instanceof FullstackRuntimeStartupError ? error.stage : undefined,
        logs: handle?.logs(),
      },
    };
  }
}

export async function stopFullstackPreviewOnServer(runtimeId: string): Promise<void> {
  const handle = previews.get(runtimeId);
  previews.delete(runtimeId);
  if (handle) await handle.stop();
}

export async function getFullstackPreviewLogsOnServer(runtimeId: string): Promise<FullstackPreviewInfo | null> {
  const handle = previews.get(runtimeId);
  if (!handle) return null;
  return toInfo(runtimeId, handle);
}
