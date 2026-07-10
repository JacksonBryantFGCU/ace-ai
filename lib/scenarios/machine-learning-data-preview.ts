/**
 * ML dataset preview (Phase 4) — lightweight, CSV-only preview of the candidate's
 * `workspace/data/` files. Pure: no fs, no path traversal surface. The server
 * layer (`server/scenarios/machine-learning-data-preview.ts`) is the only place
 * that resolves a file name against disk, and it does so through the SAME
 * candidate-facing `LoadedScenario.files` list every other panel uses — so a
 * requested file that isn't already in that allowlist (a `tests/`/`solution/`
 * path, or an attempted traversal) simply isn't found, with no separate fs join
 * on user input.
 */

export const ML_DATA_PREVIEW_MAX_ROWS = 5;

export interface MlDataPreview {
  fileName: string;
  columns: string[];
  rows: Record<string, string>[];
  /** Number of data rows (excludes the header). Omitted when not cheaply known. */
  rowCount?: number;
  /** True when `rowCount` exceeds the number of rows actually returned. */
  truncated: boolean;
}

/** CSV files under the candidate's `workspace/data/` folder, sorted for stable display. */
export function listMlCsvFiles(files: readonly { path: string }[]): string[] {
  return files
    .map((file) => file.path)
    .filter((path) => path.startsWith("data/") && path.toLowerCase().endsWith(".csv"))
    .sort();
}

/** One RFC4180-lite CSV line: comma-separated, double-quoted fields with `""`
 *  escaping supported. Does not handle quoted fields spanning multiple lines. */
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells;
}

/** Build a bounded preview of one CSV's contents — header + up to `maxRows` data rows. */
export function buildCsvPreview(
  fileName: string,
  content: string,
  maxRows: number = ML_DATA_PREVIEW_MAX_ROWS,
): MlDataPreview {
  const lines = content.split(/\r\n|\r|\n/).filter((line) => line.length > 0);
  if (lines.length === 0) {
    return { fileName, columns: [], rows: [], rowCount: 0, truncated: false };
  }

  const columns = parseCsvLine(lines[0]!);
  const dataLines = lines.slice(1);
  const rows = dataLines.slice(0, maxRows).map((line) => {
    const cells = parseCsvLine(line);
    return Object.fromEntries(columns.map((column, i) => [column, cells[i] ?? ""]));
  });

  return {
    fileName,
    columns,
    rows,
    rowCount: dataLines.length,
    truncated: dataLines.length > maxRows,
  };
}
