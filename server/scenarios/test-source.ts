import "server-only";

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parseScenario } from "@/lib/scenarios/parse";
import { findScenarioDir } from "@/server/scenarios/load";
import type { AuthoredTestFile, TestSource } from "@/lib/scenarios/engines/contracts";

/**
 * Filesystem test source: reads a step's authored `tests/` files (the SAME files
 * that validate the scenario during authoring) so the runtime executes them
 * verbatim. Read-only — never writes.
 *
 * `tests/` is stripped from the served scenario, so these are fetched on demand
 * (via a server action) only when a step is verified.
 */
export const filesystemTestSource: TestSource = {
  async resolve(scenarioSlug: string, stepId: string): Promise<AuthoredTestFile[]> {
    const dir = findScenarioDir(scenarioSlug);
    if (!dir) throw new Error(`scenario not found: '${scenarioSlug}'`);

    const raw = readFileSync(join(dir, "scenario.md"), "utf8");
    const { scenario } = parseScenario(raw);

    const step = scenario.steps.find((s) => s.id === stepId);
    if (!step) throw new Error(`step not found: '${stepId}' in '${scenarioSlug}'`);
    const tests = step.verify.tests ?? [];
    if (tests.length === 0) throw new Error(`step '${stepId}' declares no tests`);

    return tests.map((testPath) => {
      const abs = join(dir, testPath);
      if (!existsSync(abs)) throw new Error(`test file missing on disk: ${testPath}`);
      return { path: testPath, content: readFileSync(abs, "utf8") };
    });
  },
};

/** Active test source. Swap for a DB / remote source later with no upstream change. */
export const testSource: TestSource = filesystemTestSource;
