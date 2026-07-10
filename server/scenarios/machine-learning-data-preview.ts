import { loadScenario } from "@/server/scenarios/load";
import {
  buildCsvPreview,
  listMlCsvFiles,
  type MlDataPreview,
} from "@/lib/scenarios/machine-learning-data-preview";
import type { LoadedScenario } from "@/lib/scenarios/types";

/**
 * Server-side ML dataset preview (Phase 4). Resolves a requested `data/*.csv`
 * file ONLY against the scenario's already-served `LoadedScenario.files` — the
 * same candidate-facing allowlist `tests/`/`solution/` never enter. There is no
 * separate `fs.join(userInput)` anywhere here, so a traversal attempt (`../..`)
 * or an authored-only path simply isn't in the list and resolves to "not found",
 * not a filesystem read.
 */

export class MlDataPreviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MlDataPreviewError";
  }
}

/** CSV files available in an already-loaded scenario's candidate workspace. */
export function mlDataFilesOf(loaded: LoadedScenario): string[] {
  return listMlCsvFiles(loaded.files);
}

/** Build a bounded preview of one candidate-facing `data/*.csv` file. */
export function mlDataPreviewOf(loaded: LoadedScenario, fileName: string, maxRows?: number): MlDataPreview {
  const file = loaded.files.find((f) => f.path === fileName);
  if (!file) {
    throw new MlDataPreviewError(`Data file not found in this scenario's workspace: "${fileName}"`);
  }
  if (!file.path.startsWith("data/") || !file.path.toLowerCase().endsWith(".csv")) {
    throw new MlDataPreviewError(`Unsupported data file (only workspace/data/*.csv is previewable): "${fileName}"`);
  }
  return buildCsvPreview(file.path, file.content, maxRows);
}

export async function listMlDataFiles(scenarioSlug: string): Promise<string[]> {
  const loaded = await loadScenario(scenarioSlug, { includeAuthorOnly: false });
  return mlDataFilesOf(loaded);
}

export async function getMlDataPreview(
  scenarioSlug: string,
  fileName: string,
  maxRows?: number,
): Promise<MlDataPreview> {
  const loaded = await loadScenario(scenarioSlug, { includeAuthorOnly: false });
  return mlDataPreviewOf(loaded, fileName, maxRows);
}
