import type { CodingProblem, ProgrammingLanguage } from "@/types/interview";
import type { TestResult } from "@/lib/code-exec/types";
import { LANGUAGES } from "@/lib/languages";
import { runJavaScript, runTypeScript } from "@/lib/code-exec/run-js";
import { runPython } from "@/lib/code-exec/pyodide";

/**
 * Public code-execution entry point. Dispatches by language: JavaScript/
 * TypeScript/Python run in the browser; deferred languages (Java/C++/Bash)
 * return an "unsupported" result until a real server sandbox exists.
 */
export function executeCode(
  language: ProgrammingLanguage,
  code: string,
  problem: CodingProblem,
): Promise<TestResult[]> {
  switch (language) {
    case "javascript":
      return runJavaScript(code, problem.functionName, problem.testCases);
    case "typescript":
      return runTypeScript(code, problem.functionName, problem.testCases);
    case "python":
      return runPython(code, problem.functionName, problem.testCases);
    default:
      return Promise.resolve(
        problem.testCases.map((tc) => ({
          passed: false,
          actual: "Error",
          expected: JSON.stringify(tc.expected),
          error: `${LANGUAGES[language]?.label ?? language} requires server-side execution, which isn't available in this version.`,
        })),
      );
  }
}
