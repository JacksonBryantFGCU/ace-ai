"use client";

import { useCallback, useState } from "react";
import type { CodingProblem, ProgrammingLanguage } from "@/types/interview";
import type { TestResult } from "@/lib/code-exec/types";
import { executeCode } from "@/lib/code-exec/execute";

/**
 * Thin client hook around `executeCode` — tracks running state and the latest
 * results, and reports whether all test cases passed (used to gate progression).
 */
export function useCodeExecution() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<TestResult[] | null>(null);

  const run = useCallback(
    async (language: ProgrammingLanguage, code: string, problem: CodingProblem) => {
      setRunning(true);
      try {
        const r = await executeCode(language, code, problem);
        setResults(r);
        return r;
      } finally {
        setRunning(false);
      }
    },
    [],
  );

  const reset = useCallback(() => setResults(null), []);

  const allPassed = results !== null && results.length > 0 && results.every((r) => r.passed);

  return { running, results, allPassed, run, reset };
}
