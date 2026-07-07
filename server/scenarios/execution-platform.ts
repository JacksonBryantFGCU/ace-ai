import "server-only";

import { createExecutionPlatform } from "@/lib/scenarios/execution/platform-factory";

/**
 * The process-wide Execution Platform: ONE registry with every engine registered
 * (React + Node implemented, the rest placeholders), fronted by the platform that
 * selects and delegates. The engine set is composed by the shared
 * `createExecutionPlatform` factory; this module only adds the `server-only`
 * boundary so the platform never enters a client bundle. Adding a language later
 * is a single `register` in the factory — no other file changes.
 */
const { registry, platform } = createExecutionPlatform();

export const engineRegistry = registry;
export const executionPlatform = platform;
