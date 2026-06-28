import type { TestCase } from "@/types/interview";
import type { TestResult } from "@/lib/code-exec/types";

/**
 * Python execution via Pyodide (WASM), loaded from the jsDelivr CDN. Ported from
 * the legacy `useCodeExecution`. Client-only, lazy singleton — Pyodide is ~10MB,
 * so `preloadPyodide()` can warm it while the candidate reads the problem.
 *
 * Runs on the main thread (unlike the JS worker): Pyodide-in-a-worker needs
 * extra setup, and a hard timeout for Python is deferred. Note this in the UI if
 * needed; infinite Python loops are the one case without a hard cap in Phase 5.
 */

const PYODIDE_VERSION = "v0.26.4";
const PYODIDE_INDEX = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`;

interface PyodideInterface {
  runPythonAsync: (code: string) => Promise<unknown>;
  globals: { set: (key: string, value: unknown) => void };
}

let _pyodide: PyodideInterface | null = null;
let _pyodidePromise: Promise<PyodideInterface> | null = null;

export function isPyodideReady(): boolean {
  return _pyodide !== null;
}

async function loadPyodide(): Promise<PyodideInterface> {
  const w = window as unknown as Record<string, unknown>;
  if (!w["loadPyodide"]) {
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${PYODIDE_INDEX}pyodide.js`;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Pyodide script"));
      document.head.appendChild(script);
    });
  }
  const factory = w["loadPyodide"] as (opts: Record<string, string>) => Promise<PyodideInterface>;
  return factory({ indexURL: PYODIDE_INDEX });
}

/** Begin loading Pyodide in the background (fire-and-forget). */
export function preloadPyodide(): void {
  if (_pyodide || _pyodidePromise) return;
  _pyodidePromise = loadPyodide();
  _pyodidePromise.then((p) => (_pyodide = p)).catch(() => {});
}

async function getPyodide(): Promise<PyodideInterface> {
  if (_pyodide) return _pyodide;
  if (!_pyodidePromise) _pyodidePromise = loadPyodide();
  _pyodide = await _pyodidePromise;
  return _pyodide;
}

export async function runPython(
  code: string,
  functionName: string,
  testCases: TestCase[],
): Promise<TestResult[]> {
  let pyodide: PyodideInterface;
  try {
    pyodide = await getPyodide();
  } catch {
    return testCases.map((tc) => ({
      passed: false,
      actual: "Error",
      expected: JSON.stringify(tc.expected),
      error: "Failed to load the Python runtime.",
    }));
  }

  // Define the user's function in the Python environment.
  try {
    await pyodide.runPythonAsync(code);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return testCases.map((tc) => ({
      passed: false,
      actual: "Error",
      expected: JSON.stringify(tc.expected),
      error,
    }));
  }

  const results: TestResult[] = [];
  for (const tc of testCases) {
    const expected = JSON.stringify(tc.expected);
    try {
      pyodide.globals.set("_input_json", JSON.stringify(tc.input));
      // Execute the function via JSON round-trip; round floats to avoid IEEE noise.
      const resultJson = (await pyodide.runPythonAsync(`
import json, math

def _round_floats(x):
    if isinstance(x, float):
        return round(x, 6)
    if isinstance(x, list):
        return [_round_floats(e) for e in x]
    if isinstance(x, dict):
        return {k: _round_floats(v) for k, v in x.items()}
    return x

_args = json.loads(_input_json)
_result = ${functionName}(*_args)
json.dumps(_round_floats(_result))
`)) as string;

      const expectedParsed = JSON.parse(expected);
      const roundedExpected = JSON.parse(
        JSON.stringify(expectedParsed, (_, v) =>
          typeof v === "number" && !Number.isInteger(v) ? Math.round(v * 1_000_000) / 1_000_000 : v,
        ),
      );

      // deepEqual is overkill here since both sides are JSON-normalized; compare strings.
      const actual = JSON.parse(resultJson) as unknown;
      const passed = JSON.stringify(actual) === JSON.stringify(roundedExpected);
      results.push({ passed, actual: resultJson, expected: JSON.stringify(roundedExpected) });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      results.push({ passed: false, actual: "Error", expected, error });
    }
  }
  return results;
}
