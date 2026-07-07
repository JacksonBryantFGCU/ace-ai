import { createEngineRegistry, type EngineRegistry } from "@/lib/scenarios/execution/registry";
import { ExecutionPlatform } from "@/lib/scenarios/execution/platform";
import { reactEngine } from "@/lib/scenarios/execution/engines/react-engine";
import { nodeEngine } from "@/lib/scenarios/execution/engines/node-engine";
import { PLACEHOLDER_ENGINES } from "@/lib/scenarios/execution/engines/placeholder";

/**
 * The canonical engine set, composed once. This is the SINGLE place the platform's
 * engines are wired together, shared by two entry points:
 *
 *   • the server singleton (`server/scenarios/execution-platform.ts`) — adds the
 *     `server-only` boundary so the platform never enters a client bundle;
 *   • the authoring toolkit (`scenario:check`, run under `tsx`) — which routes
 *     reference-solution validation through the very same platform, so engine
 *     selection at authoring time is identical to production.
 *
 * It deliberately carries NO `server-only` marker: the toolkit runs outside the
 * Next bundle (plain `tsx`), where importing `server-only` is unresolvable. The
 * boundary is enforced by the server singleton that re-exports this, mirroring how
 * `nodeEngine` (also un-marked) is guarded only at its composition root.
 */
export function createExecutionPlatform(): { registry: EngineRegistry; platform: ExecutionPlatform } {
  const registry = createEngineRegistry([reactEngine, nodeEngine, ...PLACEHOLDER_ENGINES]);
  return { registry, platform: new ExecutionPlatform(registry) };
}
