import type { TestCase } from "@/types/interview";
import type { TestResult } from "@/lib/code-exec/types";
import { stripTypeScript } from "@/lib/code-exec/strip-typescript";

/**
 * Run JavaScript/TypeScript test cases in a Web Worker with a hard timeout.
 *
 * The candidate's code is *their own* and runs in *their own* browser session,
 * so this is not a server trust boundary — but running it in a terminable worker
 * (rather than on the main thread, as the legacy did) means an infinite loop
 * times out instead of freezing the tab. TypeScript is stripped to JS on the
 * main thread first; the worker only ever runs JS.
 */

const TIMEOUT_MS = 5000;

// Self-contained worker source (Blob — avoids bundler worker-file handling). It
// receives already-stripped JS and compares with a compact deepEqual that
// mirrors lib/code-exec/deep-equal.ts.
const WORKER_SOURCE = `
function deepEqual(a, b) {
  if (typeof a === "number" && typeof b === "number") {
    if (Number.isInteger(a) && Number.isInteger(b)) return a === b;
    return Math.abs(a - b) < 1e-6;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every(function (v, i) { return deepEqual(v, b[i]); });
  }
  if (typeof a === "object" && typeof b === "object" && a !== null && b !== null) {
    var ka = Object.keys(a).sort();
    var kb = Object.keys(b).sort();
    if (ka.join() !== kb.join()) return false;
    return ka.every(function (k) { return deepEqual(a[k], b[k]); });
  }
  return a === b;
}
self.onmessage = function (e) {
  var code = e.data.code, functionName = e.data.functionName, testCases = e.data.testCases;
  var results = testCases.map(function (tc) {
    var expected = JSON.stringify(tc.expected);
    try {
      var fn = new Function(code + "; return " + functionName + ";")();
      var result = fn.apply(null, tc.input);
      return { passed: deepEqual(result, tc.expected), actual: JSON.stringify(result), expected: expected };
    } catch (err) {
      return { passed: false, actual: "Error", expected: expected, error: (err && err.message) ? err.message : String(err) };
    }
  });
  self.postMessage(results);
};
`;

function timeoutResults(testCases: TestCase[]): TestResult[] {
  return testCases.map((tc) => ({
    passed: false,
    actual: "Timeout",
    expected: JSON.stringify(tc.expected),
    error: `Execution timed out after ${TIMEOUT_MS / 1000}s (possible infinite loop).`,
  }));
}

function errorResults(testCases: TestCase[], message: string): TestResult[] {
  return testCases.map((tc) => ({
    passed: false,
    actual: "Error",
    expected: JSON.stringify(tc.expected),
    error: message,
  }));
}

function runJsInWorker(
  code: string,
  functionName: string,
  testCases: TestCase[],
): Promise<TestResult[]> {
  return new Promise((resolve) => {
    let url: string;
    let worker: Worker;
    try {
      const blob = new Blob([WORKER_SOURCE], { type: "application/javascript" });
      url = URL.createObjectURL(blob);
      worker = new Worker(url);
    } catch {
      resolve(errorResults(testCases, "Could not start the code runner."));
      return;
    }

    let done = false;
    const finish = (results: TestResult[]) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve(results);
    };

    const timer = setTimeout(() => finish(timeoutResults(testCases)), TIMEOUT_MS);
    worker.onmessage = (e: MessageEvent<TestResult[]>) => finish(e.data);
    worker.onerror = (e) => finish(errorResults(testCases, e.message || "Worker error."));
    worker.postMessage({ code, functionName, testCases });
  });
}

/** Run JavaScript code (already JS). */
export function runJavaScript(
  code: string,
  functionName: string,
  testCases: TestCase[],
): Promise<TestResult[]> {
  return runJsInWorker(code, functionName, testCases);
}

/** Run TypeScript code by stripping types to JS first. */
export function runTypeScript(
  code: string,
  functionName: string,
  testCases: TestCase[],
): Promise<TestResult[]> {
  return runJsInWorker(stripTypeScript(code), functionName, testCases);
}
