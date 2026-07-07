import "server-only";

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { findScenarioDir } from "@/server/scenarios/load";

/**
 * Filesystem database source: reads a scenario's `database/schema.sql` and
 * optional `database/seed.sql`. Returns `undefined` when the scenario has no
 * `database/` folder, so non-database scenarios are entirely unaffected.
 *
 * Read-only, resolved on demand at verification time (the same authored files
 * the toolkit validates), mirroring the test source.
 */
export interface DatabaseSources {
  schema: string;
  seed?: string;
}

export const databaseSource = {
  resolve(scenarioSlug: string): DatabaseSources | undefined {
    const dir = findScenarioDir(scenarioSlug);
    if (!dir) return undefined;
    const schemaPath = join(dir, "database", "schema.sql");
    if (!existsSync(schemaPath)) return undefined;
    const seedPath = join(dir, "database", "seed.sql");
    return {
      schema: readFileSync(schemaPath, "utf8"),
      seed: existsSync(seedPath) ? readFileSync(seedPath, "utf8") : undefined,
    };
  },
};
