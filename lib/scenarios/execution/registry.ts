import type { ExecutionEngine } from "@/lib/scenarios/execution/engine";
import type { EngineId } from "@/lib/scenarios/execution/profile";

/**
 * The SINGLE source of truth for engine lookup. No scattered switch statements,
 * no duplicated mappings — the platform resolves every engine through one
 * registry, and adding a language means registering one new engine here.
 */
export class EngineRegistry {
  private readonly engines = new Map<EngineId, ExecutionEngine>();

  /** Register an engine. Registering the same id twice is a programmer error. */
  register(engine: ExecutionEngine): this {
    if (this.engines.has(engine.id)) {
      throw new Error(`An engine is already registered for id "${engine.id}".`);
    }
    this.engines.set(engine.id, engine);
    return this;
  }

  get(id: EngineId | null | undefined): ExecutionEngine | undefined {
    return id ? this.engines.get(id) : undefined;
  }

  has(id: EngineId): boolean {
    return this.engines.has(id);
  }

  list(): ExecutionEngine[] {
    return [...this.engines.values()];
  }
}

/** Build a registry from a set of engines (order-independent). */
export function createEngineRegistry(engines: ExecutionEngine[]): EngineRegistry {
  const registry = new EngineRegistry();
  for (const engine of engines) registry.register(engine);
  return registry;
}
