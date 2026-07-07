import "server-only";

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { parseScenario } from "@/lib/scenarios/parse";
import { checkpointTargetPath, normalizeSolutionImports, type CheckpointSource } from "@/lib/scenarios/checkpoints";
import type { CheckpointFile } from "@/lib/scenarios/types";
import { findScenarioDir } from "@/server/scenarios/load";

/**
 * Filesystem checkpoint source: reads a step's authored `solution/` files and
 * returns them as workspace-relative checkpoint files. The `solution/` files are
 * read-only here (never written), honoring "authored checkpoint files immutable".
 */
export const filesystemCheckpointSource: CheckpointSource = {
  async resolve(scenarioSlug: string, stepId: string): Promise<CheckpointFile[]> {
    const dir = findScenarioDir(scenarioSlug);
    if (!dir) throw new Error(`scenario not found: '${scenarioSlug}'`);

    const raw = readFileSync(join(dir, "scenario.md"), "utf8");
    const { scenario } = parseScenario(raw);

    const step = scenario.steps.find((s) => s.id === stepId);
    if (!step) throw new Error(`step not found: '${stepId}' in '${scenarioSlug}'`);
    if (!step.checkpoint || step.checkpoint.files.length === 0) {
      throw new Error(`step '${stepId}' has no checkpoint`);
    }

    return step.checkpoint.files.map((solutionPath) => {
      const abs = join(dir, solutionPath);
      if (!existsSync(abs)) {
        throw new Error(`checkpoint file missing on disk: ${solutionPath}`);
      }
      return {
        path: checkpointTargetPath(solutionPath),
        content: normalizeSolutionImports(readFileSync(abs, "utf8")),
      };
    });
  },
};

/**
 * The active checkpoint source. Swap this (or make it config-driven) to add
 * database / remote / generated sources later — nothing upstream changes.
 */
export const checkpointSource: CheckpointSource = filesystemCheckpointSource;
