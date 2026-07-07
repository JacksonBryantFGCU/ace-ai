import { NO_CAPABILITIES, type EngineCapabilities } from "@/lib/scenarios/execution/capabilities";
import {
  notImplementedResult,
  notImplementedWorkspace,
  type ExecutionEngine,
} from "@/lib/scenarios/execution/engine";
import { ENGINE_COMPATIBILITY, type EngineId, type ExecutionProfile } from "@/lib/scenarios/execution/profile";

/**
 * A registered-but-not-implemented engine. It advertises its INTENDED
 * capabilities and compatibility (so the platform, UI, and toolkit can reason
 * about it today) but returns structured "not implemented" responses instead of
 * executing — never throwing. Implementing a language later means replacing its
 * placeholder with a real engine of the same id; nothing else changes.
 */
function createPlaceholderEngine(
  id: EngineId,
  displayName: string,
  capabilities: EngineCapabilities,
): ExecutionEngine {
  return {
    id,
    displayName,
    capabilities: () => capabilities,
    supports: (profile: ExecutionProfile) =>
      profile.engine === id && ENGINE_COMPATIBILITY[id].runtimes.includes(profile.runtime),
    validateWorkspace: async () => notImplementedWorkspace(displayName),
    verify: async () => notImplementedResult(id, displayName),
  };
}

export const pythonEngine = createPlaceholderEngine("python", "Python", {
  ...NO_CAPABILITIES,
  supportsFilesystem: true,
  supportsNetwork: true,
  supportsTerminal: true,
  supportsMultipleFiles: true,
});

export const javaEngine = createPlaceholderEngine("java", "Java", {
  ...NO_CAPABILITIES,
  supportsFilesystem: true,
  supportsTerminal: true,
  supportsMultipleFiles: true,
});

export const csharpEngine = createPlaceholderEngine("csharp", "C#", {
  ...NO_CAPABILITIES,
  supportsFilesystem: true,
  supportsTerminal: true,
  supportsMultipleFiles: true,
});

export const sqlEngine = createPlaceholderEngine("sql", "SQL", {
  ...NO_CAPABILITIES,
  supportsDatabase: true,
  supportsSnapshots: true,
  supportsMultipleFiles: true,
});

/** Every placeholder engine, in registration order. (Node is now a real engine.) */
export const PLACEHOLDER_ENGINES: ExecutionEngine[] = [pythonEngine, javaEngine, csharpEngine, sqlEngine];
